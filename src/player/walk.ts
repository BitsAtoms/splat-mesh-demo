import { Box3, Line3, Vector3 } from "three";
import type { MeshBVH } from "three-mesh-bvh";
import { PHYSICS, capsuleRadius, jumpHeight } from "../config";
import type { GameState } from "../state";
import type { Input } from "./input";
import { wishDirection } from "./movement";

// Objetos reutilizados en cada subpaso para no generar basura.
const segment = new Line3();
const segmentStartBefore = new Vector3();
const segmentBounds = new Box3();
const pointOnTriangle = new Vector3();
const pointOnSegment = new Vector3();
const correction = new Vector3();
const wish = new Vector3();

/**
 * Un subpaso de física caminando, con colisión contra el BVH.
 *
 * La rata es una cápsula horizontal (alargada de la cola al hocico) a la altura
 * de su radio sobre los pies. Tras moverla, se empuja fuera de cada triángulo
 * que la atraviesa. Si el empujón resultante va hacia arriba, está en el suelo.
 *
 * Devuelve true si la rata se ha caído fuera del mundo y hay que reiniciarla.
 */
export function walkStep(
  dt: number,
  state: GameState,
  input: Input,
  bvh: MeshBVH,
  worldBounds: Box3,
): boolean {
  const { player, settings } = state;
  const height = settings.height;
  const radius = capsuleRadius(settings);
  const sprint = input.sprinting ? PHYSICS.walkSprintMultiplier : 1;

  // Gravedad y salto. En el suelo se aplica solo un paso de gravedad, para que se pegue a las bajadas.
  const jump = input.consumeJump();
  if (player.onGround) {
    player.velocity.y = settings.gravity * dt;
    if (jump) player.velocity.y = Math.sqrt(2 * -settings.gravity * jumpHeight(settings));
  } else {
    player.velocity.y += settings.gravity * dt;
  }
  player.position.addScaledVector(player.velocity, dt);
  player.position.addScaledVector(wishDirection(input, state.look.yaw, wish), settings.speed * sprint * dt);

  // Cápsula orientada según el cuerpo de la rata.
  const forwardX = -Math.sin(player.facingYaw);
  const forwardZ = -Math.cos(player.facingYaw);
  const { x, y, z } = player.position;
  segment.start.set(
    x - forwardX * PHYSICS.capsuleBack * height,
    y + radius,
    z - forwardZ * PHYSICS.capsuleBack * height,
  );
  segment.end.set(
    x + forwardX * PHYSICS.capsuleFront * height,
    y + radius,
    z + forwardZ * PHYSICS.capsuleFront * height,
  );
  segmentStartBefore.copy(segment.start);

  segmentBounds.makeEmpty();
  segmentBounds.expandByPoint(segment.start);
  segmentBounds.expandByPoint(segment.end);
  segmentBounds.min.addScalar(-radius);
  segmentBounds.max.addScalar(radius);

  bvh.shapecast({
    intersectsBounds: (box) => box.intersectsBox(segmentBounds),
    intersectsTriangle: (triangle) => {
      const distance = triangle.closestPointToSegment(segment, pointOnTriangle, pointOnSegment);
      if (distance < radius) {
        const depth = radius - distance;
        const push = pointOnSegment.sub(pointOnTriangle).normalize();
        segment.start.addScaledVector(push, depth);
        segment.end.addScaledVector(push, depth);
      }
    },
  });

  // Corrección total aplicada a la cápsula. Si empuja hacia arriba más que lo que bajó por gravedad, hay suelo.
  correction.copy(segment.start).sub(segmentStartBefore);
  player.onGround = correction.y > Math.abs(dt * player.velocity.y * 0.25);
  const length = Math.max(0, correction.length() - 1e-5);
  correction.normalize().multiplyScalar(length);
  player.position.add(correction);

  if (player.onGround) {
    player.velocity.set(0, 0, 0);
  } else {
    // Quitar la componente de la velocidad que va contra la superficie (deslizar por paredes y techos).
    correction.normalize();
    player.velocity.addScaledVector(correction, -correction.dot(player.velocity));
  }

  return player.position.y < worldBounds.min.y - PHYSICS.fallResetDepth;
}
