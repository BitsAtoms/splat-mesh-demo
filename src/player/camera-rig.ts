import { type PerspectiveCamera, Ray, Vector3 } from "three";
import type { GameState } from "../state";
import type { ColliderLayer } from "../world/collider-layer";

/** Coloca la cámara en 1ª persona (en la cabeza) o en 3ª persona (detrás, sin atravesar paredes). */
export class CameraRig {
  /** Distancia actual en 3ª persona; se acerca al instante pero se aleja suavemente. */
  private distance = 1;
  private readonly pivot = new Vector3();
  private readonly lookDirection = new Vector3();
  private readonly ray = new Ray();

  update(dt: number, camera: PerspectiveCamera, state: GameState, collider: ColliderLayer): void {
    const { player, look, settings } = state;
    const height = settings.height;
    camera.rotation.set(look.pitch, look.yaw, 0);

    if (!settings.thirdPerson) {
      camera.position.copy(player.position);
      camera.position.y += height * 0.72;
      camera.position.x += -Math.sin(player.facingYaw) * height * 0.85;
      camera.position.z += -Math.cos(player.facingYaw) * height * 0.85;
      return;
    }

    this.pivot.copy(player.position);
    this.pivot.y += height * 0.6;
    this.lookDirection.set(
      -Math.sin(look.yaw) * Math.cos(look.pitch),
      Math.sin(look.pitch),
      -Math.cos(look.yaw) * Math.cos(look.pitch),
    );

    // Distancia deseada; si hay una pared entre la rata y la cámara, se acerca.
    let target = Math.max(0.12, height * 4.5) * settings.camZoom;
    this.ray.origin.copy(this.pivot);
    this.ray.direction.copy(this.lookDirection).negate();
    const hit = collider.raycast(this.ray, target);
    if (hit) target = Math.max(height * 0.3, hit.distance - Math.max(0.02, height * 0.15));

    this.distance = target < this.distance ? target : this.distance + (target - this.distance) * Math.min(1, dt * 6);
    camera.position.copy(this.pivot).addScaledVector(this.lookDirection, -this.distance);
  }
}
