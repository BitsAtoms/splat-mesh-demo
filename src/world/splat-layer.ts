import type { Scene } from "three";
import { SplatMesh } from "@sparkjsdev/spark";

/** El Gaussian Splat visible. Solo hay uno a la vez: cargar otro sustituye al anterior. */
export class SplatLayer {
  private mesh: SplatMesh | null = null;
  /** Identifica la carga más reciente, para descartar cargas antiguas que terminen tarde. */
  private loadId = 0;

  constructor(private readonly scene: Scene) {}

  /**
   * Sustituye el splat actual por uno nuevo y espera a que Spark lo procese.
   * Lanza si el archivo no se puede leer. Devuelve false si mientras tanto
   * empezó otra carga (este resultado ya no es el visible).
   */
  async load(bytes: Uint8Array | ArrayBuffer, fileName: string, flipped: boolean): Promise<boolean> {
    const id = ++this.loadId;
    this.clear();
    const mesh = new SplatMesh({ fileBytes: bytes, fileName });
    this.mesh = mesh;
    this.setFlipped(flipped);
    this.scene.add(mesh);
    try {
      await mesh.initialized;
    } catch (error) {
      if (id !== this.loadId) return false;
      this.clear();
      throw error;
    }
    return id === this.loadId;
  }

  /** Gira 180° alrededor de X (los splats en convención OpenCV vienen con Y hacia abajo). */
  setFlipped(flipped: boolean): void {
    if (!this.mesh) return;
    this.mesh.quaternion.set(flipped ? 1 : 0, 0, 0, flipped ? 0 : 1);
    this.mesh.updateMatrixWorld(true);
  }

  private clear(): void {
    if (!this.mesh) return;
    this.scene.remove(this.mesh);
    this.mesh.dispose();
    this.mesh = null;
  }
}
