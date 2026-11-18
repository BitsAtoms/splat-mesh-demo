import {
  Color,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { SparkRenderer } from "@sparkjsdev/spark";
import { CAMERA } from "../config";

/** Renderer, escena, cámara y elementos fijos (luces, rejilla). */
export class Viewer {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  /** Rejilla de referencia; se coloca a la altura del suelo del collider. */
  readonly grid = new GridHelper(20, 20, 0x444444, 0x2a2a2a);

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, CAMERA.maxPixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.camera = new PerspectiveCamera(CAMERA.fov, window.innerWidth / window.innerHeight, CAMERA.near, CAMERA.far);
    // Yaw primero y luego pitch: así la cámara nunca se inclina de lado.
    this.camera.rotation.order = "YXZ";

    this.scene.background = new Color(0x111114);
    // SparkRenderer se encarga de ordenar y dibujar los Gaussian Splats.
    this.scene.add(new SparkRenderer({ renderer: this.renderer }));
    // Las luces solo afectan al modelo de la rata; el splat ya trae su iluminación horneada.
    this.scene.add(new HemisphereLight(0xffffff, 0x444444, 1.2));
    this.scene.add(new DirectionalLight(0xffffff, 1).translateX(3).translateY(6).translateZ(2));
    this.scene.add(this.grid);

    window.addEventListener("resize", () => this.onResize());
  }

  setNear(near: number): void {
    this.camera.near = near;
    this.camera.updateProjectionMatrix();
  }

  setAnimationLoop(callback: () => void): void {
    this.renderer.setAnimationLoop(callback);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
