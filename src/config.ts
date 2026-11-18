/** Ajustes que se pueden cambiar desde el panel, el teclado o `scene.json`. */
export interface Settings {
  /** Gira el splat 180° en X (convención OpenCV: Y hacia abajo). */
  flipSplat: boolean;
  flipCollider: boolean;
  /** Altura de la rata en metros. Escala la cápsula de colisión, la cámara y el modelo. */
  height: number;
  /** Altura del salto como múltiplo de `height`. */
  jumpMul: number;
  thirdPerson: boolean;
  /** Multiplicador de la distancia de la cámara en tercera persona (rueda del ratón). */
  camZoom: number;
  /** Velocidad al caminar, en m/s. */
  speed: number;
  /** Aceleración vertical en m/s² (negativa = hacia abajo). */
  gravity: number;
  /** Modo vuelo: se mueve libremente y sin colisiones. */
  fly: boolean;
  showCollider: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  flipSplat: true,
  flipCollider: false,
  height: 0.25,
  jumpMul: 1.5,
  thirdPerson: true,
  camZoom: 1,
  speed: 1.5,
  gravity: -15,
  fly: false,
  showCollider: false,
};

export const PHYSICS = {
  /** Radio de la cápsula = max(minRadius, height * radiusFactor). */
  minRadius: 0.015,
  radiusFactor: 0.45,
  /** La cápsula es horizontal: va desde -back·height (cola) hasta +front·height (hocico). */
  capsuleFront: 0.82,
  capsuleBack: 0.5,
  /** Subpasos de física por fotograma: nunca se avanza más de esta fracción del radio por subpaso. */
  maxStepRadiusFraction: 0.4,
  minSubsteps: 5,
  maxSubsteps: 80,
  /** Paso de tiempo máximo por fotograma (s), para no atravesar paredes tras un tirón. */
  maxFrameDt: 0.1,
  /** Si cae esta distancia (m) por debajo del collider, vuelve al inicio. */
  fallResetDepth: 20,
  walkSprintMultiplier: 2,
  flySprintMultiplier: 3,
  /** En vuelo: velocidad = max(1, speed) * flySpeedFactor. */
  flySpeedFactor: 1.5,
  /** Rapidez con la que el cuerpo de la rata gira hacia la dirección de avance. */
  turnRate: 10,
} as const;

export const CAMERA = {
  fov: 70,
  near: 0.02,
  far: 2000,
  maxPixelRatio: 2,
  /** Ángulo máximo de cabeceo (rad) para no dar la vuelta por encima/debajo. */
  maxPitch: Math.PI / 2 - 0.01,
  sensitivityLocked: 0.0022,
  sensitivityDrag: 0.004,
  zoomMin: 0.3,
  zoomMax: 6,
  zoomWheelFactor: 0.001,
} as const;

export function capsuleRadius(settings: Settings): number {
  return Math.max(PHYSICS.minRadius, settings.height * PHYSICS.radiusFactor);
}

export function jumpHeight(settings: Settings): number {
  return settings.height * settings.jumpMul;
}
