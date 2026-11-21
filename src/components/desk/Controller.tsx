"use client";

import { useMemo } from "react";
import { ExtrudeGeometry, Shape, Vector2 } from "three";
import { hdr } from "./palette";
import { RoundedBox } from "./primitives";
import { drawFaceButton, drawXboxLogo } from "./screens";
import { useCanvasTexture } from "./useCanvasTexture";

type Placed = { position: [number, number, number]; rotation?: [number, number, number] };

const MM = 0.001;
const DEPTH = 0.014;
const BEVEL = 0.008;
/** Altura de la cara superior plana, donde van sticks y botones. */
const TOP = DEPTH + BEVEL * 2;

// Media silueta vista desde arriba, en mm: y crece hacia el jugador. Se refleja para cerrar la forma
const HALF: [number, number][] = [
  [0, -27],
  [26, -28],
  [44, -25],
  [55, -16],
  [59, -2],
  [61, 14],
  [61, 30],
  [57, 42],
  [47, 49],
  [36, 46],
  [29, 36],
  [21, 24],
  [10, 19],
  [0, 18],
];

function bodyGeometry() {
  const right = HALF.map(([x, y]) => new Vector2(x * MM, y * MM));
  const left = [...HALF]
    .reverse()
    .slice(1, -1)
    .map(([x, y]) => new Vector2(-x * MM, y * MM));
  const shape = new Shape();
  shape.moveTo(right[0].x, right[0].y);
  shape.splineThru([...right.slice(1), ...left, right[0]]);
  const g = new ExtrudeGeometry(shape, {
    depth: DEPTH,
    curveSegments: 64,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL * 0.9,
    bevelSegments: 8,
  });
  // De planta (XY) a tumbado sobre la mesa: la extrusión pasa a ser la altura
  g.rotateX(Math.PI / 2);
  g.translate(0, DEPTH + BEVEL, 0);
  g.computeVertexNormals();
  return g;
}

const WHITE = { color: "#eceef1", roughness: 0.48, metalness: 0, clearcoat: 0.2, clearcoatRoughness: 0.6 } as const;
const BLACK = { color: "#16171b", roughness: 0.7 } as const;

function Stick({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, TOP, z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.0125, 0.0022, 10, 36]} />
        <meshStandardMaterial {...BLACK} />
      </mesh>
      <mesh position={[0, 0.004, 0]}>
        <cylinderGeometry args={[0.006, 0.0075, 0.008, 20]} />
        <meshStandardMaterial {...BLACK} />
      </mesh>
      {/* Seta cóncava con borde de goma */}
      <mesh position={[0, 0.0095, 0]}>
        <cylinderGeometry args={[0.0108, 0.0102, 0.0035, 32]} />
        <meshStandardMaterial color="#1b1c21" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.0113, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.0098, 0.0012, 8, 36]} />
        <meshStandardMaterial color="#25262c" roughness={0.85} />
      </mesh>
    </group>
  );
}

const FACE = [
  { l: "Y", c: "#f4c430", p: [0, -1] },
  { l: "X", c: "#3b8cff", p: [-1, 0] },
  { l: "B", c: "#ff4d4f", p: [1, 0] },
  { l: "A", c: "#43d65a", p: [0, 1] },
] as const;

function FaceButton({ l, c, x, z }: { l: string; c: string; x: number; z: number }) {
  const draw = useMemo(() => drawFaceButton(l, c), [l, c]);
  const tex = useCanvasTexture(64, 64, draw);
  return (
    <group position={[x, TOP, z]}>
      <mesh scale={[1, 0.55, 1]}>
        <sphereGeometry args={[0.0055, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color="#121317" roughness={0.12} clearcoat={1} />
      </mesh>
      <mesh position={[0, 0.0031, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.0042, 24]} />
        <meshBasicMaterial map={tex} color={hdr("#ffffff", 1.4)} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Mando de Xbox blanco: silueta extruida con bisel generoso, gatillos, bumpers, sticks, cruceta y botonera. */
export function Controller({ position, rotation }: Placed) {
  const body = useMemo(() => bodyGeometry(), []);
  const logo = useCanvasTexture(128, 128, drawXboxLogo);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={body} castShadow receiveShadow>
        <meshPhysicalMaterial {...WHITE} />
      </mesh>

      {/* Bumpers y gatillos siguiendo los hombros */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.034, 0, -0.03]} rotation={[0, -s * 0.22, 0]}>
          <RoundedBox args={[0.036, 0.009, 0.012]} radius={0.004} position={[0, TOP - 0.006, -0.002]} castShadow>
            <meshPhysicalMaterial {...WHITE} />
          </RoundedBox>
          <RoundedBox args={[0.026, 0.02, 0.016]} radius={0.006} position={[s * 0.004, 0.012, -0.004]} rotation={[0.35, 0, 0]} castShadow>
            <meshPhysicalMaterial {...WHITE} roughness={0.55} />
          </RoundedBox>
        </group>
      ))}

      <Stick x={-0.034} z={-0.011} />
      <Stick x={0.017} z={0.013} />

      {/* Cruceta: disco metálico con la cruz encima */}
      <group position={[-0.017, TOP, 0.013]}>
        <mesh position={[0, 0.0008, 0]}>
          <cylinderGeometry args={[0.0105, 0.0105, 0.0016, 32]} />
          <meshStandardMaterial color="#9a9ea8" roughness={0.25} metalness={0.9} />
        </mesh>
        {[0, Math.PI / 2].map((r) => (
          <RoundedBox key={r} args={[0.0165, 0.0035, 0.0055]} radius={0.0014} position={[0, 0.0024, 0]} rotation={[0, r, 0]}>
            <meshStandardMaterial {...BLACK} roughness={0.5} />
          </RoundedBox>
        ))}
      </group>

      {FACE.map((b) => (
        <FaceButton key={b.l} l={b.l} c={b.c} x={0.036 + b.p[0] * 0.0105} z={-0.011 + b.p[1] * 0.0105} />
      ))}

      {/* Vista, menú y compartir */}
      {[-0.011, 0.011].map((x) => (
        <mesh key={x} position={[x, TOP + 0.0008, -0.011]}>
          <cylinderGeometry args={[0.003, 0.003, 0.0016, 20]} />
          <meshStandardMaterial {...BLACK} />
        </mesh>
      ))}
      <RoundedBox args={[0.0055, 0.0016, 0.0035]} radius={0.0007} position={[0, TOP + 0.0008, -0.001]}>
        <meshStandardMaterial {...BLACK} />
      </RoundedBox>

      {/* Botón Xbox con el logo iluminado */}
      <group position={[0, TOP - 0.0015, -0.027]}>
        <mesh position={[0, 0.001, 0]}>
          <cylinderGeometry args={[0.0078, 0.0078, 0.002, 32]} />
          <meshStandardMaterial color="#d8dade" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.0022, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.0072, 32]} />
          <meshBasicMaterial map={logo} color={hdr("#ffffff", 2.6)} toneMapped={false} />
        </mesh>
      </group>
      <RoundedBox args={[0.009, 0.0035, 0.002]} radius={0.001} position={[0, TOP * 0.55, -0.0345]}>
        <meshStandardMaterial {...BLACK} />
      </RoundedBox>
    </group>
  );
}

