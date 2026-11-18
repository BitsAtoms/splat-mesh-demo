import {
  Box3,
  BufferGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  type Material,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from "three";

export interface TailJoint {
  joint: Group;
  /** Curvatura en reposo; la animación oscila alrededor de este valor. */
  baseX: number;
}

/** Rata construida con primitivas. Las partes articuladas se exponen para animarlas. */
export interface RatRig {
  /** Nodo raíz: se escala a la altura de la rata y se mueve con el jugador. */
  root: Group;
  body: Group;
  head: Group;
  legFL: Group;
  legFR: Group;
  legBL: Group;
  legBR: Group;
  tail: TailJoint[];
}

const TAIL_SEGMENTS = 12;
const TAIL_SEGMENT_LENGTH = 0.14;

/**
 * Crea el modelo de la rata. Mira hacia -Z y mide exactamente 1 unidad de alto,
 * así `root.scale = altura en metros`.
 */
export function createRat(): RatRig {
  const material = (color: number, roughness: number) => new MeshStandardMaterial({ color, roughness });
  const fur = material(0x8d867e, 0.95);
  const darkFur = material(0x6e6760, 0.95);
  const belly = material(0xd9d0c4, 0.95);
  const pink = material(0xf2a3ad, 0.55);
  const eye = material(0x0d0d0f, 0.15);
  const eyeShine = material(0xffffff, 0.2);

  // Casi todo son esferas deformadas.
  const sphere = new SphereGeometry(1, 28, 18);
  const blob = (
    parent: Group,
    [sx, sy, sz]: [number, number, number],
    mat: Material,
    [x, y, z]: [number, number, number],
  ) => {
    const mesh = new Mesh(sphere, mat);
    mesh.scale.set(sx, sy, sz);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  const model = new Group();
  const body = new Group();
  model.add(body);
  blob(body, [0.36, 0.33, 0.62], fur, [0, 0.42, 0.18]); // tronco
  blob(body, [0.29, 0.22, 0.5], belly, [0, 0.32, 0.12]); // barriga
  blob(body, [0.15, 0.19, 0.22], darkFur, [-0.22, 0.38, 0.5]); // ancas
  blob(body, [0.15, 0.19, 0.22], darkFur, [0.22, 0.38, 0.5]);

  const head = new Group();
  head.position.set(0, 0.52, -0.42);
  body.add(head);
  blob(head, [0.24, 0.22, 0.3], fur, [0, 0, -0.12]); // cráneo
  blob(head, [0.13, 0.12, 0.22], fur, [0, -0.05, -0.38]); // hocico
  blob(head, [0.055, 0.045, 0.045], pink, [0, -0.03, -0.6]); // nariz

  for (const side of [-1, 1]) {
    blob(head, [0.045, 0.05, 0.045], eye, [side * 0.13, 0.07, -0.28]);
    blob(head, [0.014, 0.014, 0.014], eyeShine, [side * 0.145, 0.09, -0.315]);

    const ear = new Group();
    ear.position.set(side * 0.16, 0.17, -0.04);
    ear.rotation.set(-0.15, side * 0.35, side * -0.35);
    const outer = new Mesh(new CylinderGeometry(0.15, 0.15, 0.03, 24), fur);
    outer.rotation.x = Math.PI / 2;
    const inner = new Mesh(new CylinderGeometry(0.11, 0.11, 0.012, 24), pink);
    inner.rotation.x = Math.PI / 2;
    inner.position.z = -0.018;
    ear.add(outer, inner);
    head.add(ear);
  }

  // Bigotes: tres líneas por lado, desde el hocico hacia fuera.
  const whiskers: number[] = [];
  for (const side of [-1, 1]) {
    for (const [dy, dz] of [
      [0.04, 0.02],
      [0, 0],
      [-0.04, -0.02],
    ]) {
      whiskers.push(side * 0.08, -0.06, -0.5, side * 0.42, -0.06 + dy, -0.46 + dz);
    }
  }
  const whiskerGeometry = new BufferGeometry();
  whiskerGeometry.setAttribute("position", new Float32BufferAttribute(whiskers, 3));
  head.add(new LineSegments(whiskerGeometry, new LineBasicMaterial({ color: 0xe8e2da })));

  // Cada pata cuelga de un grupo en la cadera, que es el que rota al andar.
  const leg = (x: number, y: number, z: number, length: number) => {
    const hip = new Group();
    hip.position.set(x, y, z);
    const radius = 0.055;
    const shin = new Mesh(new CapsuleGeometry(radius, length, 4, 10), darkFur);
    shin.position.y = -(length / 2 + radius);
    hip.add(shin);
    blob(hip, [0.06, 0.03, 0.095], pink, [0, -(length + 2 * radius) + 0.03, -0.04]); // pie
    body.add(hip);
    return hip;
  };
  const legFL = leg(-0.18, 0.26, -0.22, 0.14);
  const legFR = leg(0.18, 0.26, -0.22, 0.14);
  const legBL = leg(-0.22, 0.3, 0.52, 0.18);
  const legBR = leg(0.22, 0.3, 0.52, 0.18);

  // Cola: cadena de articulaciones, cada una hija de la anterior, cada vez más fina.
  const tail: TailJoint[] = [];
  let parent = body;
  for (let i = 0; i < TAIL_SEGMENTS; i++) {
    const joint = new Group();
    if (i === 0) joint.position.set(0, 0.36, 0.78);
    else joint.position.z = TAIL_SEGMENT_LENGTH;
    parent.add(joint);

    const radiusStart = 0.05 - (0.038 * i) / TAIL_SEGMENTS;
    const radiusEnd = 0.05 - (0.038 * (i + 1)) / TAIL_SEGMENTS;
    const piece = new Mesh(new CylinderGeometry(radiusEnd, radiusStart, TAIL_SEGMENT_LENGTH + 0.01, 10), pink);
    piece.rotation.x = Math.PI / 2;
    piece.position.z = TAIL_SEGMENT_LENGTH / 2;
    joint.add(piece);

    const baseX = i === 0 ? 0.18 : -0.03;
    joint.rotation.x = baseX;
    tail.push({ joint, baseX });
    parent = joint;
  }

  // Normalizar a 1 unidad de alto.
  model.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(model);
  model.scale.setScalar(1 / bounds.max.y);

  const root = new Group();
  root.add(model);
  return { root, body, head, legFL, legFR, legBL, legBR, tail };
}
