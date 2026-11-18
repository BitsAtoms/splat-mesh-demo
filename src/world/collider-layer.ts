import {
  type Box3,
  type BufferGeometry,
  DoubleSide,
  Group,
  type Intersection,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  Ray,
  type Scene,
  Vector3,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { MeshBVH } from "three-mesh-bvh";

export interface ColliderInfo {
  triangles: number;
  size: Vector3;
  bounds: Box3;
}

const DOWN = new Vector3(0, -1, 0);

/**
 * Malla de colisión: un GLB se reduce a una única geometría (solo posiciones,
 * en coordenadas de mundo) con un BVH para consultas rápidas. También muestra
 * una versión en alambre opcional para depurar.
 */
export class ColliderLayer {
  private readonly loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  /** Escena del GLB original; se guarda para poder reconstruir al cambiar el giro. */
  private source: Object3D | null = null;
  private geometry: BufferGeometry | null = null;
  private wireframe: Mesh<BufferGeometry, MeshBasicMaterial> | null = null;
  private wireframeVisible = false;
  private loadId = 0;
  private readonly ray = new Ray();

  bvh: MeshBVH | null = null;

  constructor(private readonly scene: Scene) {}

  get bounds(): Box3 | null {
    return this.geometry?.boundingBox ?? null;
  }

  /**
   * Parsea un GLB/GLTF y construye la colisión. Lanza si el archivo no es válido.
   * Devuelve null si mientras tanto empezó otra carga.
   */
  async load(data: ArrayBuffer, flipped: boolean): Promise<ColliderInfo | null> {
    const id = ++this.loadId;
    const gltf = await this.loader.parseAsync(data, "");
    if (id !== this.loadId) return null;
    this.source = gltf.scene;
    return this.rebuild(flipped);
  }

  /** Reconstruye la colisión a partir del último GLB cargado (p. ej. al cambiar el giro). */
  rebuild(flipped: boolean): ColliderInfo | null {
    if (!this.source) return null;

    const root = new Group();
    root.add(this.source);
    if (flipped) root.quaternion.set(1, 0, 0, 0);
    root.updateMatrixWorld(true);

    const parts: BufferGeometry[] = [];
    root.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh || !mesh.geometry?.attributes?.position) return;
      let part = mesh.geometry.clone();
      // Para colisionar solo hacen falta posiciones; quitar el resto permite fusionar todas las mallas.
      for (const name of Object.keys(part.attributes)) if (name !== "position") part.deleteAttribute(name);
      part.morphAttributes = {};
      if (part.index) part = part.toNonIndexed();
      part.applyMatrix4(mesh.matrixWorld);
      parts.push(part);
    });
    root.remove(this.source);

    if (!parts.length) throw new Error("El GLB no contiene mallas.");
    const merged = mergeGeometries(parts, false);
    for (const part of parts) part.dispose();
    if (!merged) throw new Error("No se pudieron combinar las mallas del GLB.");

    this.disposeCollision();
    merged.computeBoundingBox();
    this.geometry = merged;
    this.bvh = new MeshBVH(merged);
    this.wireframe = new Mesh(
      merged,
      new MeshBasicMaterial({ color: 0x33ffaa, wireframe: true, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    this.wireframe.visible = this.wireframeVisible;
    this.scene.add(this.wireframe);

    const bounds = merged.boundingBox!;
    return {
      triangles: merged.attributes.position.count / 3,
      size: bounds.getSize(new Vector3()),
      bounds,
    };
  }

  setWireframeVisible(visible: boolean): void {
    this.wireframeVisible = visible;
    if (this.wireframe) this.wireframe.visible = visible;
  }

  /** Primer impacto del rayo contra el collider (ambas caras), o null. */
  raycast(ray: Ray, far = Infinity): Intersection | null {
    return this.bvh?.raycastFirst(ray, DoubleSide, 0, far) ?? null;
  }

  /**
   * Busca un punto de inicio razonable: el suelo bajo el origen o, si no hay,
   * bajo el centro del collider. Si no encuentra suelo, lo pone encima de todo.
   */
  findDefaultSpawn(target: Vector3): Vector3 {
    const bounds = this.bounds;
    if (!bounds) return target.set(0, 0, 0);
    for (const candidate of [new Vector3(0, 0, 0), bounds.getCenter(new Vector3())]) {
      this.ray.set(candidate.add(new Vector3(0, 0.5, 0)), DOWN);
      const hit = this.raycast(this.ray);
      if (hit) return target.copy(hit.point).add(new Vector3(0, 0.05, 0));
    }
    return target.set(0, bounds.max.y + 0.5, 0);
  }

  private disposeCollision(): void {
    if (this.wireframe) {
      this.scene.remove(this.wireframe);
      this.wireframe.material.dispose();
      this.wireframe = null;
    }
    this.geometry?.dispose();
    this.geometry = null;
    this.bvh = null;
  }
}
