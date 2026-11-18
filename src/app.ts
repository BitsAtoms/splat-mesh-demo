import { Vector3 } from "three";
import { CAMERA, PHYSICS, capsuleRadius } from "./config";
import { Viewer } from "./core/viewer";
import { BlobShadow } from "./character/blob-shadow";
import { RatAnimator } from "./character/rat-animator";
import { createRat, type RatRig } from "./character/rat-model";
import { CameraRig } from "./player/camera-rig";
import { flyStep } from "./player/fly";
import { Input, type KeyAction } from "./player/input";
import { updateFacing } from "./player/movement";
import { walkStep } from "./player/walk";
import { toArrayBuffer } from "./scene/download";
import { downloadCollider, downloadSplat, fetchManifest } from "./scene/manifest";
import { applySceneSettings, exportSceneSettings } from "./scene/scene-settings";
import { createGameState, resetPlayer, type GameState } from "./state";
import { detectFileKind, setupDropZone } from "./ui/drop-zone";
import { Panel, type PanelSettingKey } from "./ui/panel";
import { ColliderLayer, type ColliderInfo } from "./world/collider-layer";
import { SplatLayer } from "./world/splat-layer";

declare global {
  interface Window {
    /** Acceso rápido desde la consola del navegador para depurar. */
    __debug?: unknown;
  }
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Conecta todos los módulos: estado, mundo, jugador, rata, interfaz y bucle principal. */
export class App {
  private readonly state: GameState = createGameState();
  private readonly viewer: Viewer;
  private readonly splat: SplatLayer;
  private readonly collider: ColliderLayer;
  private readonly input: Input;
  private readonly panel: Panel;
  private readonly rat: RatRig;
  private readonly ratAnimator: RatAnimator;
  private readonly shadow = new BlobShadow();
  private readonly cameraRig = new CameraRig();
  private readonly scratch = new Vector3();
  private lastFrameTime = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    this.viewer = new Viewer(canvas);
    this.splat = new SplatLayer(this.viewer.scene);
    this.collider = new ColliderLayer(this.viewer.scene);

    this.rat = createRat();
    this.ratAnimator = new RatAnimator(this.rat);
    this.viewer.scene.add(this.rat.root, this.shadow.mesh);

    this.input = new Input(canvas, {
      onAction: (action) => this.onAction(action),
      onLook: (deltaYaw, deltaPitch) => {
        const look = this.state.look;
        look.yaw += deltaYaw;
        look.pitch = Math.max(-CAMERA.maxPitch, Math.min(CAMERA.maxPitch, look.pitch + deltaPitch));
      },
      onWheel: (deltaY) => {
        const settings = this.state.settings;
        if (!settings.thirdPerson) return false;
        const zoom = settings.camZoom * Math.exp(deltaY * CAMERA.zoomWheelFactor);
        settings.camZoom = Math.max(CAMERA.zoomMin, Math.min(CAMERA.zoomMax, zoom));
        return true;
      },
      onPointerLockChange: () => this.syncView(),
    });

    this.panel = new Panel(this.state.settings, {
      onSettingChange: (key) => this.onSettingChange(key),
      onReset: () => this.respawn(),
      onSplatFile: (file) => void this.loadSplatFile(file),
      onColliderFile: (file) => void this.loadColliderFile(file),
      exportSettings: () => JSON.stringify(exportSceneSettings(this.state)),
    });

    setupDropZone((file) => {
      const kind = detectFileKind(file.name);
      if (kind === "splat") void this.loadSplatFile(file);
      else if (kind === "collider") void this.loadColliderFile(file);
      else this.panel.setStatus(`Formato no reconocido: ${file.name}`, true);
    });

    window.__debug = { character: this.rat.root, player: this.state.player, settings: this.state.settings };
  }

  start(): void {
    this.syncView();
    this.panel.setStatus("Carga tu .spz y tu .glb para empezar.");
    void this.loadBundledScene();
    this.viewer.setAnimationLoop(() => this.frame());
  }

  // ---------------------------------------------------------------- bucle

  private frame(): void {
    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, PHYSICS.maxFrameDt);
    this.lastFrameTime = now;

    const { state, input, collider } = this;
    const { player, settings } = state;
    updateFacing(state, input, dt, this.scratch);

    // Subpasos: en cada uno la rata avanza como mucho una fracción de su radio, para no atravesar paredes finas.
    const bvh = settings.fly ? null : collider.bvh;
    const bounds = collider.bounds;
    // Cota superior de la distancia recorrida en este fotograma (con el sprint más rápido de los dos modos).
    const sprint = input.sprinting ? Math.max(PHYSICS.walkSprintMultiplier, PHYSICS.flySprintMultiplier) : 1;
    const travel = (settings.speed * sprint + player.velocity.length() + 1) * dt;
    const steps = Math.min(
      PHYSICS.maxSubsteps,
      Math.max(PHYSICS.minSubsteps, Math.ceil(travel / (capsuleRadius(settings) * PHYSICS.maxStepRadiusFraction))),
    );
    for (let i = 0; i < steps; i++) {
      if (bvh && bounds) {
        if (walkStep(dt / steps, state, input, bvh, bounds)) this.respawn();
      } else {
        flyStep(dt / steps, state, input, this.viewer.camera);
      }
    }

    const hasCollider = collider.bvh !== null;
    this.ratAnimator.update(dt, state, !settings.fly && hasCollider && !player.onGround);
    this.shadow.update(settings.thirdPerson && hasCollider, player.position, player.facingYaw, settings.height, collider);
    this.cameraRig.update(dt, this.viewer.camera, state, collider);
    this.viewer.render();
    this.panel.setPosition(player.position.x, player.position.y, player.position.z);
  }

  // ---------------------------------------------------------------- carga de archivos

  /** Carga la escena descrita en scene.json, si existe. */
  private async loadBundledScene(): Promise<void> {
    const manifest = await fetchManifest();
    if (!manifest) return;

    this.panel.hideDropHint();
    this.panel.showBundleNote(manifest.title);
    applySceneSettings(this.state, manifest.settings);
    this.syncView();

    const onProgress = (message: string) => this.panel.setStatus(message);
    try {
      let ok = true;
      const colliderBytes = await downloadCollider(manifest, onProgress);
      if (colliderBytes) {
        const name = manifest.collider!.split("/").pop()!;
        ok = (await this.loadCollider(toArrayBuffer(colliderBytes), name)) && ok;
      }
      const splat = await downloadSplat(manifest, onProgress);
      if (splat) ok = (await this.loadSplat(splat.bytes, splat.name)) && ok;
      // Si algo falló, se deja visible el mensaje de error en lugar de «Escena lista».
      if (ok) this.panel.setStatus("Escena lista. Haz clic en la escena para jugar.");
    } catch (error) {
      console.error(error);
      this.panel.setStatus(`No se pudo cargar la escena incluida: ${errorMessage(error)}`, true);
    }
  }

  private async loadSplatFile(file: File): Promise<void> {
    this.panel.setStatus(`Leyendo ${file.name}…`);
    await this.loadSplat(await file.arrayBuffer(), file.name);
  }

  private async loadColliderFile(file: File): Promise<void> {
    await this.loadCollider(await file.arrayBuffer(), file.name);
  }

  /** Devuelve true si el splat se cargó y es el visible. */
  private async loadSplat(bytes: Uint8Array | ArrayBuffer, name: string): Promise<boolean> {
    this.panel.setStatus(`Procesando splat ${name}…`);
    try {
      if (!(await this.splat.load(bytes, name, this.state.settings.flipSplat))) return false;
    } catch (error) {
      console.error(error);
      this.panel.setStatus(`Error cargando el splat: ${errorMessage(error)}`, true);
      return false;
    }
    this.panel.setSplatName(name);
    this.panel.setStatus(`Splat cargado: ${name}`);
    if (!this.collider.bvh && !this.state.spawn.custom) this.respawn();
    this.panel.hideDropHint();
    return true;
  }

  /** Devuelve true si el collider se cargó y es el activo. */
  private async loadCollider(data: ArrayBuffer, name: string): Promise<boolean> {
    this.panel.setStatus(`Procesando collider ${name}…`);
    let info: ColliderInfo | null;
    try {
      info = await this.collider.load(data, this.state.settings.flipCollider);
    } catch (error) {
      this.showColliderError(error);
      return false;
    }
    if (!info) return false;
    this.onColliderReady(info);
    this.panel.setColliderName(name);
    this.panel.hideDropHint();
    return true;
  }

  private rebuildCollider(): void {
    try {
      const info = this.collider.rebuild(this.state.settings.flipCollider);
      if (info) this.onColliderReady(info);
    } catch (error) {
      this.showColliderError(error);
    }
  }

  private onColliderReady({ triangles, size, bounds }: ColliderInfo): void {
    this.viewer.grid.position.y = bounds.min.y;
    this.panel.setStatus(
      `Collider listo: ${triangles.toLocaleString()} triángulos · ` +
        `${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)} m`,
    );
    if (!this.state.spawn.custom) this.collider.findDefaultSpawn(this.state.spawn.position);
    this.respawn();
    this.syncView();
  }

  private showColliderError(error: unknown): void {
    console.error(error);
    const message = errorMessage(error);
    this.panel.setStatus(
      message.includes("DRACO")
        ? "El GLB usa compresión Draco, que este visor no puede decodificar. Reexpórtalo sin Draco (p. ej. en Blender o con gltf-transform)."
        : `Error cargando el GLB: ${message}`,
      true,
    );
  }

  // ---------------------------------------------------------------- acciones y ajustes

  private onAction(action: KeyAction): void {
    const { settings, player, spawn, look } = this.state;
    switch (action) {
      case "toggleFly":
        settings.fly = !settings.fly;
        player.velocity.set(0, 0, 0);
        this.syncView();
        break;
      case "toggleCollider":
        settings.showCollider = !settings.showCollider;
        this.collider.setWireframeVisible(settings.showCollider);
        this.syncView();
        break;
      case "reset":
        this.respawn();
        break;
      case "setSpawn":
        spawn.position.copy(player.position);
        spawn.yaw = look.yaw;
        spawn.custom = true;
        this.panel.setStatus("Punto de inicio guardado aquí.");
        break;
      case "toggleView":
        settings.thirdPerson = !settings.thirdPerson;
        this.syncView();
        break;
      case "togglePanel":
        this.panel.toggleVisible();
        break;
    }
  }

  private onSettingChange(key: PanelSettingKey): void {
    const settings = this.state.settings;
    switch (key) {
      case "flipSplat":
        this.splat.setFlipped(settings.flipSplat);
        break;
      case "flipCollider":
        // El punto de inicio guardado ya no corresponde a la geometría girada: se recalcula.
        this.state.spawn.custom = false;
        this.rebuildCollider();
        break;
      case "showCollider":
        this.collider.setWireframeVisible(settings.showCollider);
        break;
      default:
        this.syncView();
    }
  }

  private respawn(): void {
    resetPlayer(this.state, this.collider.bvh !== null);
  }

  /** Aplica a la vista y al panel los ajustes que no se leen en cada fotograma. */
  private syncView(): void {
    const settings = this.state.settings;
    this.panel.sync({ settings, pointerLocked: this.input.pointerLocked, hasCollider: this.collider.bvh !== null });
    this.rat.root.visible = settings.thirdPerson;
    this.viewer.setNear(Math.max(0.004, settings.height * 0.06));
  }
}
