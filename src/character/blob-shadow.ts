import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, Ray, Vector3 } from "three";
import type { ColliderLayer } from "../world/collider-layer";

/** Sombra difusa bajo la rata, proyectada sobre el collider. Ayuda a percibir la altura al saltar. */
export class BlobShadow {
  readonly mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly ray = new Ray(new Vector3(), new Vector3(0, -1, 0));

  constructor() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(0,0,0,0.55)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    this.mesh = new Mesh(
      new PlaneGeometry(1, 1),
      new MeshBasicMaterial({ map: new CanvasTexture(canvas), transparent: true, depthWrite: false }),
    );
    this.mesh.renderOrder = 1;
  }

  update(enabled: boolean, position: Vector3, facingYaw: number, height: number, collider: ColliderLayer): void {
    this.mesh.visible = enabled;
    if (!enabled) return;

    this.ray.origin.copy(position);
    this.ray.origin.y += 0.2 * height;
    const hit = collider.raycast(this.ray, 40 * height);
    if (!hit) {
      this.mesh.visible = false;
      return;
    }

    // Cuanto más lejos del suelo, más grande y más tenue.
    const gap = Math.max(0, hit.distance - 0.2 * height);
    this.mesh.position.copy(hit.point);
    this.mesh.position.y += 0.003 + 0.01 * height;
    this.mesh.position.x += -Math.sin(facingYaw) * 0.15 * height;
    this.mesh.position.z += -Math.cos(facingYaw) * 0.15 * height;
    this.mesh.rotation.set(-Math.PI / 2, 0, facingYaw);
    const spread = 1 + (gap / height) * 0.3;
    this.mesh.scale.set(height * 1.2 * spread, height * 2.6 * spread, 1);
    this.mesh.material.opacity = Math.max(0, 1 - gap / (4 * height));
  }
}
