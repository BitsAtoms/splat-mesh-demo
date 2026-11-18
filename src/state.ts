import { Vector3 } from "three";
import { DEFAULT_SETTINGS, type Settings } from "./config";

export interface PlayerState {
  position: Vector3;
  velocity: Vector3;
  onGround: boolean;
  /** Hacia dónde mira el cuerpo de la rata (rad). En 1ª persona coincide con `look.yaw`. */
  facingYaw: number;
}

/** Orientación de la cámara, controlada con el ratón. */
export interface LookState {
  yaw: number;
  pitch: number;
}

export interface SpawnPoint {
  position: Vector3;
  yaw: number;
  /**
   * true si el punto lo fijó `scene.json` o la tecla P. En ese caso no se
   * recalcula automáticamente al cargar un collider.
   */
  custom: boolean;
}

export interface GameState {
  settings: Settings;
  player: PlayerState;
  look: LookState;
  spawn: SpawnPoint;
}

export function createGameState(): GameState {
  return {
    settings: { ...DEFAULT_SETTINGS },
    player: { position: new Vector3(), velocity: new Vector3(), onGround: false, facingYaw: 0 },
    look: { yaw: 0, pitch: -0.15 },
    spawn: { position: new Vector3(), yaw: 0, custom: false },
  };
}

/** Devuelve al jugador al punto de inicio. Sin collider no hay suelo fiable, así que va al origen. */
export function resetPlayer(state: GameState, hasCollider: boolean): void {
  const { player, spawn, look } = state;
  player.position.copy(spawn.position);
  player.velocity.set(0, 0, 0);
  look.yaw = spawn.yaw;
  player.facingYaw = spawn.yaw;
  if (!hasCollider) player.position.set(0, 0, 0);
}
