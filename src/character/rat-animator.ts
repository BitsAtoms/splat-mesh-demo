import { Vector3 } from "three";
import type { GameState } from "../state";
import type { RatRig } from "./rat-model";

/** Anima la rata a partir de cómo se mueve el jugador: patas, balanceo, cabeza y cola. */
export class RatAnimator {
  /** Fase del ciclo de paso; avanza según la distancia recorrida. */
  private gaitPhase = 0;
  private readonly lastPosition = new Vector3();

  constructor(private readonly rig: RatRig) {}

  update(dt: number, state: GameState, airborne: boolean): void {
    const { player, settings } = state;
    const { root, body, head, tail, legFL, legFR, legBL, legBR } = this.rig;
    const height = settings.height;

    root.scale.setScalar(height);
    root.position.copy(player.position);
    root.rotation.y = player.facingYaw;

    // Velocidad horizontal real (medida, no la pedida), para que no "patine" contra paredes.
    const safeDt = Math.max(dt, 1e-4);
    const speed = Math.min(
      Math.hypot((player.position.x - this.lastPosition.x) / safeDt, (player.position.z - this.lastPosition.z) / safeDt),
      50,
    );
    this.lastPosition.copy(player.position);
    /** 0 = quieta, 1 = andando a velocidad normal o más. */
    const motion = Math.min(1, speed / Math.max(0.1, settings.speed * 0.5));
    this.gaitPhase += dt * (speed / height) * 2.2;

    const time = performance.now() / 1000;
    const blend = Math.min(1, dt * 14);
    const approach = (current: number, target: number) => current + (target - current) * blend;

    // Patas en diagonal (delantera izq. con trasera der.); en el aire se estiran.
    const swing = Math.sin(this.gaitPhase) * 0.75 * motion;
    legFL.rotation.x = approach(legFL.rotation.x, airborne ? 0.8 : swing);
    legBR.rotation.x = approach(legBR.rotation.x, airborne ? -0.8 : swing);
    legFR.rotation.x = approach(legFR.rotation.x, airborne ? 0.8 : -swing);
    legBL.rotation.x = approach(legBL.rotation.x, airborne ? -0.8 : -swing);

    // Rebote al andar o respiración en reposo.
    body.position.y =
      !airborne && motion > 0.05
        ? Math.abs(Math.cos(this.gaitPhase)) * 0.035 * motion
        : Math.sin(time * 2.2) * 0.006;
    const bodyPitch = airborne
      ? player.velocity.y > 0
        ? 0.18
        : -0.12
      : Math.sin(this.gaitPhase * 2) * 0.03 * motion;
    body.rotation.x = approach(body.rotation.x, bodyPitch);

    // La cabeza husmea solo cuando está quieta.
    head.rotation.x = Math.sin(time * 3.1) * 0.04 * (1 - motion);
    head.rotation.y = Math.sin(time * 0.9) * 0.12 * (1 - motion);

    // Ola que recorre la cola, más rápida y amplia al moverse.
    const amplitude = 0.12 + 0.18 * motion;
    tail.forEach(({ joint, baseX }, i) => {
      joint.rotation.y = Math.sin(time * (2 + 4 * motion) - i * 0.55) * amplitude * (0.4 + i / tail.length);
      joint.rotation.x = baseX + (i === 0 ? -body.rotation.x : 0) + (airborne ? -0.02 : 0);
    });
  }
}
