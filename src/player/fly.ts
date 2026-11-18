import { type Camera, Vector3 } from "three";
import { PHYSICS } from "../config";
import type { GameState } from "../state";
import type { Input } from "./input";

const UP = new Vector3(0, 1, 0);
const forward = new Vector3();
const right = new Vector3();
const direction = new Vector3();

/** Un subpaso en modo vuelo: movimiento libre en la dirección de la cámara, sin colisión. */
export function flyStep(dt: number, state: GameState, input: Input, camera: Camera): void {
  const { player, settings } = state;
  const sprint = input.sprinting ? PHYSICS.flySprintMultiplier : 1;

  camera.getWorldDirection(forward);
  right.crossVectors(forward, UP).normalize();
  direction.set(0, 0, 0);
  if (input.isDown("KeyW", "ArrowUp")) direction.add(forward);
  if (input.isDown("KeyS", "ArrowDown")) direction.sub(forward);
  if (input.isDown("KeyD", "ArrowRight")) direction.add(right);
  if (input.isDown("KeyA", "ArrowLeft")) direction.sub(right);
  if (input.isDown("Space", "KeyE")) direction.add(UP);
  if (input.isDown("KeyQ", "ControlLeft")) direction.sub(UP);
  if (direction.lengthSq()) direction.normalize();

  player.position.addScaledVector(direction, Math.max(1, settings.speed) * PHYSICS.flySpeedFactor * sprint * dt);
  player.velocity.set(0, 0, 0);
  // En vuelo Espacio sirve para subir: que no quede un salto pendiente al volver a caminar.
  input.consumeJump();
}
