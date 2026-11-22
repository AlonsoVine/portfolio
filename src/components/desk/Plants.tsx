"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import {
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Euler,
  Matrix4,
  type BufferGeometry,
  IcosahedronGeometry,
  type InstancedMesh,
  LatheGeometry,
  Object3D,
  PlaneGeometry,
  Quaternion,
  Shape,
  ShapeGeometry,
  type Texture,
  Vector2,
  Vector3,
} from "three";
import { ICE } from "./palette";
import { RoundedBox } from "./primitives";
import { drawSnakeLeaf } from "./screens";
import { useCanvasTexture } from "./useCanvasTexture";

type Vec3 = [number, number, number];
type Instance = { p: Vec3; r: Vec3; s: Vec3; c: string };

// Aleatorio con semilla: las plantas salen idénticas en cada visita
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bladeGeometry() {
  // Hoja de sansevieria: espada larga en canal (sección en V) que se afila en la punta y se arquea un poco
  const g = new PlaneGeometry(1, 1, 2, 12);
  g.translate(0, 0.5, 0);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const v = pos.getY(i);
    const w = (1 - v ** 5) * (0.75 + 0.25 * Math.sin(Math.PI * v));
    const x = pos.getX(i) * w;
    pos.setX(i, x);
    pos.setZ(i, -Math.abs(x) * 0.45 + v * v * 0.08);
  }
  g.computeVertexNormals();
  return g;
}

function heartGeometry() {
  // Hoja acorazonada del poto: base escotada, punta en gota y un poco cóncava
  const s = new Shape();
  s.moveTo(0, 0.08);
  s.bezierCurveTo(0.2, -0.06, 0.55, 0.12, 0.46, 0.45);
  s.bezierCurveTo(0.38, 0.72, 0.12, 0.88, 0, 1);
  s.bezierCurveTo(-0.12, 0.88, -0.38, 0.72, -0.46, 0.45);
  s.bezierCurveTo(-0.55, 0.12, -0.2, -0.06, 0, 0.08);
  const g = new ShapeGeometry(s, 10);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, x * x * 0.5 - y * y * 0.12);
  }
  g.computeVertexNormals();
  return g;
}

const BLADE = bladeGeometry();
const HEART = heartGeometry();
const PAD = new IcosahedronGeometry(1, 0);


function Instances({
  geometry,
  items,
  roughness = 0.7,
  side,
  map,
}: {
  geometry: BufferGeometry;
  items: Instance[];
  roughness?: number;
  side?: typeof DoubleSide;
  map?: Texture;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new Object3D();
    o.rotation.order = "YXZ";
    const c = new Color();
    items.forEach((it, i) => {
      o.position.set(...it.p);
      o.rotation.set(...it.r);
      o.scale.set(...it.s);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, c.set(it.c));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, items.length]} castShadow receiveShadow>
      <meshStandardMaterial roughness={roughness} side={side} map={map} />
    </instancedMesh>
  );
}

const UP = new Vector3(0, 1, 0);
type Segment = { p: Vec3; q: Quaternion; len: number; r0: number; r1: number };

/** Tramos cónicos que siguen una polilínea: tronco y ramas con grosor decreciente. */
function segments(points: Vec3[], r0: number, r1: number): Segment[] {
  return points.slice(1).map((b, i) => {
    const a = new Vector3(...points[i]);
    const d = new Vector3(...b).sub(a);
    const len = d.length();
    const mid = a.clone().addScaledVector(d, 0.5);
    const k0 = i / (points.length - 1);
    const k1 = (i + 1) / (points.length - 1);
    return {
      p: [mid.x, mid.y, mid.z],
      q: new Quaternion().setFromUnitVectors(UP, d.normalize()),
      len,
      r0: r0 + (r1 - r0) * k0,
      r1: r0 + (r1 - r0) * k1,
    };
  });
}

function Branch({ points, r0, r1, color, roughness = 0.85 }: { points: Vec3[]; r0: number; r1: number; color: string; roughness?: number }) {
  const segs = useMemo(() => segments(points, r0, r1), [points, r0, r1]);
  return (
    <>
      {segs.map((s, i) => (
        <group key={i}>
          <mesh position={s.p} quaternion={s.q} castShadow>
            <cylinderGeometry args={[s.r1, s.r0, s.len, 9, 1]} />
            <meshStandardMaterial color={color} roughness={roughness} />
          </mesh>
          {/* Codo redondeado entre tramos */}
          {i > 0 && (
            <mesh position={points[i]}>
              <sphereGeometry args={[s.r0, 9, 6]} />
              <meshStandardMaterial color={color} roughness={roughness} />
            </mesh>
          )}
        </group>
      ))}
    </>
  );
}

// ——— Bonsái: tronco sinuoso (moyogi), almohadillas de follaje y maceta esmaltada baja ———

const BONSAI_TRUNK: Vec3[] = [
  [0.004, 0.026, 0],
  [0.014, 0.05, 0.004],
  [-0.006, 0.078, -0.002],
  [0.006, 0.1, 0.003],
  [-0.002, 0.118, 0],
];
const BONSAI_BRANCHES: Vec3[][] = [
  [[0.012, 0.055, 0.004], [0.036, 0.066, 0.008], [0.05, 0.07, 0.01]],
  [[-0.004, 0.08, -0.002], [-0.028, 0.088, -0.006], [-0.044, 0.094, -0.004]],
  [[0.004, 0.1, 0.003], [0.024, 0.11, -0.01]],
];
const BONSAI_PADS: { c: Vec3; r: Vec3 }[] = [
  { c: [0.05, 0.078, 0.01], r: [0.026, 0.011, 0.022] },
  { c: [-0.044, 0.101, -0.004], r: [0.024, 0.01, 0.02] },
  { c: [0.024, 0.118, -0.01], r: [0.02, 0.009, 0.018] },
  { c: [-0.002, 0.13, 0], r: [0.026, 0.013, 0.022] },
];

const BONSAI_FOLIAGE: Instance[] = (() => {
  const r = rng(7);
  const greens = ["#2f5a24", "#3b6b2a", "#4a7d31", "#284d1f", "#55893a"];
  return BONSAI_PADS.flatMap((pad) =>
    Array.from({ length: 34 }, () => {
      // Más denso arriba, como una nube podada; la cara inferior queda plana
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r());
      const h = (r() * 0.8 + 0.2) * (1 - d * 0.6);
      const s = 0.0045 + r() * 0.0035;
      return {
        p: [pad.c[0] + Math.cos(a) * d * pad.r[0], pad.c[1] + h * pad.r[1], pad.c[2] + Math.sin(a) * d * pad.r[2]] as Vec3,
        r: [r() * 3, r() * 3, r() * 3] as Vec3,
        s: [s, s * 0.7, s] as Vec3,
        c: greens[Math.floor(r() * greens.length)],
      };
    }),
  );
})();

const MOSS: Instance[] = (() => {
  const r = rng(11);
  return Array.from({ length: 26 }, () => {
    const s = 0.003 + r() * 0.004;
    return {
      p: [(r() - 0.5) * 0.085, 0.0255, (r() - 0.5) * 0.05] as Vec3,
      r: [0, r() * 3, 0] as Vec3,
      s: [s * 1.6, s * 0.5, s * 1.6] as Vec3,
      c: r() > 0.5 ? "#4f6b2c" : "#3f5a24",
    };
  });
})();

function Bonsai({ position }: { position: Vec3 }) {
  return (
    <group position={position} rotation={[0, 0.25, 0]}>
      {/* Maceta rectangular esmaltada en azul cobalto con patas */}
      <RoundedBox args={[0.1, 0.022, 0.066]} radius={0.004} position={[0, 0.014, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#20324f" roughness={0.28} clearcoat={0.8} clearcoatRoughness={0.25} />
      </RoundedBox>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <RoundedBox key={`${sx}${sz}`} args={[0.012, 0.004, 0.01]} radius={0.0015} position={[sx * 0.04, 0.002, sz * 0.025]}>
            <meshStandardMaterial color="#1a2840" roughness={0.4} />
          </RoundedBox>
        )),
      )}
      <mesh position={[0, 0.0248, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.092, 0.058]} />
        <meshStandardMaterial color="#3a2a1e" roughness={1} />
      </mesh>
      <Instances geometry={PAD} items={MOSS} roughness={1} />
      {/* Nebari: raíces que se abren en la base */}
      {[0, 1.6, 3.4, 4.8].map((a) => (
        <Branch
          key={a}
          points={[
            [0.004, 0.034, 0],
            [0.004 + Math.cos(a) * 0.014, 0.026, Math.sin(a) * 0.01],
          ]}
          r0={0.0045}
          r1={0.0018}
          color="#5a4434"
          roughness={0.95}
        />
      ))}
      <Branch points={BONSAI_TRUNK} r0={0.0075} r1={0.0028} color="#5a4434" roughness={0.95} />
      {BONSAI_BRANCHES.map((b, i) => (
        <Branch key={i} points={b} r0={0.0028} r1={0.0012} color="#5e4838" roughness={0.95} />
      ))}
      <Instances geometry={PAD} items={BONSAI_FOLIAGE} roughness={0.85} />
    </group>
  );
}

// ——— Poto dorado: la «planta del dinero», con guías de hojas acorazonadas que caen por la maceta ———

const POTHOS_GREENS = ["#3f7a2e", "#4d8a34", "#5c9a3a", "#7da844", "#3a6e2a"];

const POTHOS: { vines: Vec3[][]; leaves: Instance[] } = (() => {
  const r = rng(31);
  const vines: Vec3[][] = [];
  const leaves: Instance[] = [];
  const leaf = (p: Vec3, out: [number, number], tilt: number, size: number) => {
    leaves.push({
      p,
      // Primero se inclina la hoja y luego se orienta hacia fuera (orden YXZ)
      r: [tilt, Math.atan2(-out[0], -out[1]), (r() - 0.5) * 0.8],
      s: [size, size, size],
      c: POTHOS_GREENS[Math.floor(r() * POTHOS_GREENS.length)],
    });
  };
  const along = (pts: Vec3[], n: number, size: number, from = 0.1) => {
    const curve = new CatmullRomCurve3(pts.map((p) => new Vector3(...p)));
    for (let i = 0; i < n; i += 1) {
      const t = from + (i / n) * (1 - from);
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const side = i % 2 ? 1 : -1;
      const nx = -tan.z * side;
      const nz = tan.x * side;
      leaf([p.x + nx * 0.008, p.y + 0.003, p.z + nz * 0.008], [tan.x + nx * 0.8, tan.z + nz * 0.8], -1.1 + r() * 0.4, size * (1.1 - t * 0.45) * (0.85 + r() * 0.3));
    }
  };
  // Guías colgantes hacia delante y hacia fuera, lejos del portátil, cada una con un brote lateral
  [1.6, 2.0, 2.4, 2.8, 3.2, 3.6].forEach((phi, k) => {
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    const reach = 0.09 + (k % 3) * 0.025 + r() * 0.02;
    const pts: Vec3[] = [
      [c * 0.012, 0.075, s * 0.012],
      [c * 0.038, 0.08, s * 0.038],
      [c * 0.05, 0.055, s * 0.05],
      [c * 0.062, 0.024, s * 0.062],
      [c * reach, 0.006, s * reach],
      [c * (reach + 0.04) + s * 0.015, 0.004, s * (reach + 0.04) - c * 0.015],
    ];
    vines.push(pts);
    along(pts, 9, 0.026);
    if (k % 2 === 0) {
      const fork: Vec3[] = [pts[3], [c * (reach - 0.01) - s * 0.03, 0.005, s * (reach - 0.01) + c * 0.03], [c * reach - s * 0.06, 0.004, s * reach + c * 0.06]];
      vines.push(fork);
      along(fork, 4, 0.02, 0.2);
    }
  });
  // Tallos que trepan: dan altura y volumen a la mata
  [0.4, 2.6, 4.6].forEach((phi, k) => {
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    const h = 0.15 + k * 0.03;
    const pts: Vec3[] = [
      [c * 0.008, 0.06, s * 0.008],
      [c * 0.02, 0.06 + h * 0.4, s * 0.02],
      [c * 0.03 - s * 0.01, 0.06 + h * 0.75, s * 0.03 + c * 0.01],
      [c * 0.045, 0.06 + h, s * 0.045],
    ];
    vines.push(pts);
    along(pts, 7, 0.034, 0.15);
  });
  // Corona: hojas grandes que salen del centro de la maceta
  for (let i = 0; i < 16; i += 1) {
    const a = i * 2.39996;
    const d = 0.006 + r() * 0.026;
    leaf([Math.cos(a) * d, 0.07 + r() * 0.045, Math.sin(a) * d], [Math.cos(a), Math.sin(a)], -0.6 - r() * 0.6, 0.036 + r() * 0.014);
  }
  return { vines, leaves };
})();

const TERRACOTTA = new LatheGeometry(
  [
    [0, 0],
    [0.03, 0],
    [0.031, 0.002],
    [0.036, 0.048],
    [0.041, 0.049],
    [0.042, 0.062],
    [0.038, 0.062],
    [0.037, 0.05],
    [0, 0.05],
  ].map(([x, y]) => new Vector2(x, y)),
  40,
);

function Pothos({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh geometry={TERRACOTTA} castShadow receiveShadow>
        <meshStandardMaterial color="#b0643f" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.058, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.037, 28]} />
        <meshStandardMaterial color="#2c221a" roughness={1} />
      </mesh>
      {POTHOS.vines.map((v, i) => (
        <Branch key={i} points={v} r0={0.0016} r1={0.001} color="#6f8f3a" roughness={0.6} />
      ))}
      <Instances geometry={HEART} items={POTHOS.leaves} roughness={0.38} side={DoubleSide} />
    </group>
  );
}

// ——— Sansevieria: hojas en espada, erguidas, para la esquina del fondo (protección en el feng shui) ———

const BLADES: Instance[] = (() => {
  const r = rng(53);
  return Array.from({ length: 11 }, (_, i) => {
    const a = i * 2.39996 + r() * 0.4;
    const d = 0.004 + r() * 0.018;
    const h = 0.2 + r() * 0.14 - d * 2;
    const w = 0.026 + r() * 0.012;
    return {
      p: [Math.cos(a) * d, 0.07, Math.sin(a) * d] as Vec3,
      // Las de fuera se abren más; todas giran sobre sí mismas para no parecer clonadas
      r: [-(0.04 + d * 6 + r() * 0.08), Math.atan2(-Math.cos(a), -Math.sin(a)) + Math.PI, (r() - 0.5) * 0.2] as Vec3,
      s: [w, h, w] as Vec3,
      c: r() > 0.5 ? "#ffffff" : "#e6ecd8",
    };
  });
})();

function SnakePlant({ position }: { position: Vec3 }) {
  const leafTex = useCanvasTexture(64, 256, drawSnakeLeaf);
  return (
    <group position={position} rotation={[0, 0.5, 0]}>
      {/* Macetero cilíndrico de cemento, sobrio y pesado */}
      <mesh position={[0, 0.037, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.046, 0.04, 0.074, 40]} />
        <meshStandardMaterial color="#6d6c69" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.0745, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.041, 0.046, 40]} />
        <meshStandardMaterial color="#7a7975" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.042, 28]} />
        <meshStandardMaterial color="#2c221a" roughness={1} />
      </mesh>
      <Instances geometry={BLADE} items={BLADES} roughness={0.5} side={DoubleSide} map={leafTex} />
    </group>
  );
}

// ——— Palmera areca: cañas arqueadas con frondes de foliolos colgantes, la más alta, en la esquina ———

const ARECA: { canes: Vec3[][]; leaflets: Instance[] } = (() => {
  const r = rng(77);
  const canes: Vec3[][] = [];
  const leaflets: Instance[] = [];
  const up = new Vector3(0, 1, 0);
  const m = new Matrix4();
  const q = new Quaternion();
  const e = new Euler();
  const greens = ["#4f8a33", "#5f9a3a", "#6aa53f", "#477d2e", "#7bb247"];
  // Abanico hacia la izquierda y hacia delante: lo que mira al usuario, no a la pared
  [-2.2, -2.9, 2.6, 1.9, 3.3, -1.6].forEach((phi, k) => {
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    const h = 0.42 + r() * 0.16 - (k > 3 ? 0.1 : 0);
    const spread = 0.12 + r() * 0.08;
    const pts: Vec3[] = [
      [c * 0.006, 0.09, s * 0.006],
      [c * spread * 0.2, 0.09 + h * 0.45, s * spread * 0.2],
      [c * spread * 0.6, 0.09 + h * 0.85, s * spread * 0.6],
      [c * spread, 0.09 + h, s * spread],
      [c * spread * 1.45, 0.09 + h * 0.86, s * spread * 1.45],
    ];
    canes.push(pts);
    const curve = new CatmullRomCurve3(pts.map((p) => new Vector3(...p)));
    const n = 22;
    for (let i = 0; i < n; i += 1) {
      const t = 0.42 + (i / n) * 0.56;
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const perp = new Vector3().crossVectors(tan, up).normalize();
      for (const side of [-1, 1]) {
        // Foliolo: sale perpendicular al raquis, un poco hacia la punta y caído por su peso
        const y = perp.clone().multiplyScalar(side).addScaledVector(tan, 0.45).addScaledVector(up, -0.35 - r() * 0.3).normalize();
        const z = up.clone().addScaledVector(y, -y.y).normalize();
        const x = new Vector3().crossVectors(y, z);
        m.makeBasis(x, y, z);
        q.setFromRotationMatrix(m);
        e.setFromQuaternion(q, "YXZ");
        const len = (0.05 + r() * 0.012) * Math.sin(Math.PI * (0.15 + (i / n) * 0.8));
        leaflets.push({ p: [p.x, p.y, p.z], r: [e.x, e.y, e.z], s: [0.013, len * 1.25, 0.013], c: greens[Math.floor(r() * greens.length)] });
      }
    }
  });
  return { canes, leaflets };
})();

function Areca({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      {/* Macetero alto de cerámica mate blanca */}
      <mesh position={[0, 0.045, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.05, 0.043, 0.09, 40]} />
        <meshStandardMaterial color="#e4e0d8" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.087, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.047, 28]} />
        <meshStandardMaterial color="#2c221a" roughness={1} />
      </mesh>
      {ARECA.canes.map((c, i) => (
        <Branch key={i} points={c} r0={0.0032} r1={0.0012} color="#8a9a4a" roughness={0.6} />
      ))}
      <Instances geometry={BLADE} items={ARECA.leaflets} roughness={0.5} side={DoubleSide} />
    </group>
  );
}

/**
 * Rincón verde a la izquierda (el «dragón verde» del feng shui, elemento madera):
 * de fondo a frente y de alto a bajo: areca en la esquina, sansevieria, poto y bonsái.
 * Cada una asoma por encima o al lado de la anterior vista desde la silla.
 */
export function Plants() {
  return (
    <group>
      <Areca position={[-0.97, 0, -0.47]} />
      <SnakePlant position={[-0.985, 0, -0.24]} />
      <group position={[-0.885, 0, 0.02]} scale={1.3}>
        <Pothos position={[0, 0, 0]} />
      </group>
      <group position={[-0.8, 0, 0.2]} scale={1.15}>
        <Bonsai position={[0, 0, 0]} />
      </group>
      {/* Contraluz frío desde la pared azul: recorta las hojas y les da volumen */}
      <pointLight position={[-0.8, 0.5, -0.35]} intensity={0.45} distance={0.9} decay={1.5} color={ICE} />
    </group>
  );
}
