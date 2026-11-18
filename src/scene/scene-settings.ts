import { DEFAULT_SETTINGS, type Settings } from "../config";
import type { GameState } from "../state";
import type { SceneSettings } from "./manifest";

/** Aplica los ajustes de scene.json. Ignora claves desconocidas y valores de tipo incorrecto. */
export function applySceneSettings(state: GameState, input: SceneSettings = {}): void {
  const settings = state.settings as unknown as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const value = input[key];
    if (value !== undefined && typeof value === typeof DEFAULT_SETTINGS[key]) settings[key] = value;
  }
  if (Array.isArray(input.spawn)) {
    state.spawn.position.fromArray(input.spawn);
    state.spawn.custom = true;
  }
  if (typeof input.yaw === "number") state.spawn.yaw = input.yaw;
  if (typeof input.pitch === "number") state.look.pitch = input.pitch;
  state.look.yaw = state.player.facingYaw = state.spawn.yaw;
}

/** Ajustes actuales en el formato de scene.json, redondeados a milímetros. */
export function exportSceneSettings(state: GameState): SceneSettings {
  const round = (n: number) => Math.round(n * 1e3) / 1e3;
  const { settings, spawn, look } = state;
  return {
    flipSplat: settings.flipSplat,
    flipCollider: settings.flipCollider,
    height: round(settings.height),
    jumpMul: round(settings.jumpMul),
    speed: round(settings.speed),
    thirdPerson: settings.thirdPerson,
    camZoom: round(settings.camZoom),
    spawn: spawn.position.toArray().map(round) as [number, number, number],
    yaw: round(spawn.yaw),
    pitch: round(look.pitch),
  };
}
