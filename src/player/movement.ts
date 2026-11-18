import type { Vector3 } from "three";
import { PHYSICS } from "../config";
import type { GameState } from "../state";
import type { Input } from "./input";

/**
 * Dirección horizontal deseada según WASD/flechas, relativa al yaw de la cámara.
 * Normalizada, o (0,0,0) si no se pulsa nada.
 */
export function wishDirection(input: Input, yaw: number, out: Vector3): Vector3 {
  out.set(0, 0, 0);
  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);
  if (input.isDown("KeyW", "ArrowUp")) {
    out.x += forwardX;
    out.z += forwardZ;
  }
  if (input.isDown("KeyS", "ArrowDown")) {
    out.x -= forwardX;
    out.z -= forwardZ;
  }
  if (input.isDown("KeyD", "ArrowRight")) {
    out.x += rightX;
    out.z += rightZ;
  }
  if (input.isDown("KeyA", "ArrowLeft")) {
    out.x -= rightX;
    out.z -= rightZ;
  }
  if (out.lengthSq() > 0) out.normalize();
  return out;
}

/**
 * Orienta el cuerpo de la rata. En 1ª persona mira siempre donde mira la cámara;
 * en 3ª persona gira suavemente hacia la dirección en la que avanza.
 */
export function updateFacing(state: GameState, input: Input, dt: number, scratch: Vector3): void {
  const { player, look, settings } = state;
  if (!settings.thirdPerson) {
    player.facingYaw = look.yaw;
    return;
  }
  const direction = wishDirection(input, look.yaw, scratch);
  if (direction.lengthSq() === 0) return;
  let delta = Math.atan2(-direction.x, -direction.z) - player.facingYaw;
  delta = Math.atan2(Math.sin(delta), Math.cos(delta)); // ángulo más corto, en [-π, π]
  player.facingYaw += delta * Math.min(1, dt * PHYSICS.turnRate);
}
