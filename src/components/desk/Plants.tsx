"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import {
  Color,
  DoubleSide,
  type BufferGeometry,
  IcosahedronGeometry,
  type InstancedMesh,
  LatheGeometry,
  Object3D,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector2,
  Vector3,
} from "three";
import { RoundedBox } from "./primitives";

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

function leafGeometry() {
  // Hoja lanceolada: ancha en el centro, punta afilada y curvada hacia fuera
  const g = new PlaneGeometry(1, 1, 2, 8);
  g.translate(0, 0.5, 0);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const v = pos.getY(i);
    const w = Math.sin(Math.PI * Math.min(1, v * 1.15)) ** 0.8 * (1 - v * 0.35);
    pos.setX(i, pos.getX(i) * w);
    pos.setZ(i, v * v * 0.35 - Math.abs(pos.getX(i)) * 0.4);
  }
  g.computeVertexNormals();
  return g;
}

const LEAF = leafGeometry();
const PAD = new IcosahedronGeometry(1, 0);
const JADE_LEAF = new SphereGeometry(1, 10, 6);
const NODE = new SphereGeometry(1, 12, 4);

function Instances({
  geometry,
  items,
  roughness = 0.7,
  side,
}: {
  geometry: BufferGeometry;
  items: Instance[];
  roughness?: number;
  side?: typeof DoubleSide;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new Object3D();
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
      <meshStandardMaterial roughness={roughness} side={side} />
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

// ——— Crásula (árbol de jade): hojas carnosas y redondas, la planta de la prosperidad ———

const JADE_STEMS: Vec3[][] = [
  [[0, 0.05, 0], [0.006, 0.08, 0.004], [0.022, 0.11, 0.01]],
  [[0.004, 0.07, 0.002], [-0.016, 0.098, -0.006], [-0.03, 0.118, -0.012]],
  [[0.006, 0.08, 0.004], [0.004, 0.11, -0.016], [0.0, 0.13, -0.022]],
  [[0, 0.05, 0], [-0.012, 0.076, 0.016], [-0.02, 0.1, 0.026]],
];

const JADE_LEAVES: Instance[] = (() => {
  const r = rng(23);
  return JADE_STEMS.flatMap((stem) => {
    const tip = new Vector3(...stem[stem.length - 1]);
    const prev = new Vector3(...stem[stem.length - 2]);
    return Array.from({ length: 18 }, (_, i) => {
      // Rosetas en cruz al final de cada rama: pares opuestos que giran 90°
      const k = i / 18;
      const along = prev.clone().lerp(tip, 0.4 + k * 0.7);
      const a = (i % 2) * Math.PI + Math.floor(i / 2) * (Math.PI / 2) + r() * 0.4;
      const out = 0.009 + r() * 0.006;
      const s = 0.009 + r() * 0.004;
      const tint = r();
      return {
        p: [along.x + Math.cos(a) * out, along.y + (r() - 0.3) * 0.012, along.z + Math.sin(a) * out] as Vec3,
        r: [0.5 + r() * 0.5, -a, 0.3] as Vec3,
        s: [s * 0.62, s * 0.26, s] as Vec3,
        c: tint > 0.75 ? "#5b7d3a" : tint > 0.3 ? "#4d7a3c" : "#3f6c35",
      };
    });
  });
})();

const POT_PROFILE = [
  new Vector2(0, 0),
  new Vector2(0.03, 0),
  new Vector2(0.033, 0.003),
  new Vector2(0.04, 0.05),
  new Vector2(0.043, 0.053),
  new Vector2(0.043, 0.056),
  new Vector2(0.039, 0.056),
  new Vector2(0.036, 0.05),
  new Vector2(0, 0.05),
];
const POT = new LatheGeometry(POT_PROFILE, 40);

function Jade({ position }: { position: Vec3 }) {
  return (
    <group position={position} rotation={[0, -0.4, 0]}>
      {/* Maceta redonda de gres crema: el feng shui pide formas suaves para el metal y el agua */}
      <mesh geometry={POT} castShadow receiveShadow>
        <meshStandardMaterial color="#d9d2c4" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.049, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.037, 28]} />
        <meshStandardMaterial color="#2f241c" roughness={1} />
      </mesh>
      {JADE_STEMS.map((s, i) => (
        <Branch key={i} points={s} r0={0.0045} r1={0.0025} color="#6b5a3e" roughness={0.7} />
      ))}
      <Instances geometry={JADE_LEAF} items={JADE_LEAVES} roughness={0.45} />
    </group>
  );
}

// ——— Bambú de la suerte: tres tallos (felicidad) en jarrón de cristal con agua y guijarros ———

const STALKS = [
  { x: -0.008, z: 0.004, h: 0.34 },
  { x: 0.01, z: 0.006, h: 0.27 },
  { x: 0.001, z: -0.011, h: 0.21 },
];

const BAMBOO_LEAVES: Instance[] = (() => {
  const r = rng(41);
  const greens = ["#4d8c2f", "#5a9a36", "#447f2a", "#68a63e"];
  return STALKS.flatMap((st) =>
    Array.from({ length: 9 }, (_, i) => {
      const a = i * 2.4 + r() * 0.5;
      const y = st.h - 0.012 - (i % 3) * 0.022 + r() * 0.01;
      const len = 0.06 + r() * 0.035;
      return {
        p: [st.x, y, st.z] as Vec3,
        r: [0.55 + r() * 0.45, a, 0] as Vec3,
        s: [len * 0.2, len, len] as Vec3,
        c: greens[Math.floor(r() * greens.length)],
      };
    }),
  );
})();

const NODES: Instance[] = STALKS.flatMap((st) =>
  Array.from({ length: Math.floor((st.h - 0.04) / 0.055) }, (_, i) => ({
    p: [st.x, 0.06 + i * 0.055, st.z] as Vec3,
    r: [0, 0, 0] as Vec3,
    s: [0.0068, 0.003, 0.0068] as Vec3,
    c: "#9fb85a",
  })),
);

const PEBBLES: Instance[] = (() => {
  const r = rng(5);
  return Array.from({ length: 22 }, () => {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.026;
    const s = 0.004 + r() * 0.003;
    return {
      p: [Math.cos(a) * d, 0.006 + r() * 0.008, Math.sin(a) * d] as Vec3,
      r: [r() * 3, r() * 3, r() * 3] as Vec3,
      s: [s * 1.3, s * 0.8, s] as Vec3,
      c: r() > 0.5 ? "#e8e4dc" : "#c9c4ba",
    };
  });
})();

function Bamboo({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <Instances geometry={PAD} items={PEBBLES} roughness={0.5} />
      {/* Agua: lámina apenas teñida */}
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.029, 0.029, 0.086, 32, 1, true]} />
        <meshStandardMaterial color="#9fd6e6" transparent opacity={0.12} roughness={0.05} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.088, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.029, 32]} />
        <meshStandardMaterial color="#9fd6e6" transparent opacity={0.28} roughness={0.02} metalness={0.2} depthWrite={false} />
      </mesh>
      {/* Jarrón de vidrio grueso */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.032, 0.03, 0.12, 40, 1, true]} />
        <meshPhysicalMaterial color="#dff4f0" transparent opacity={0.22} roughness={0.04} clearcoat={1} side={DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.003, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.006, 32]} />
        <meshPhysicalMaterial color="#cfece6" transparent opacity={0.4} roughness={0.05} />
      </mesh>
      {STALKS.map((st) => (
        <mesh key={st.h} position={[st.x, st.h / 2 + 0.005, st.z]} castShadow>
          <cylinderGeometry args={[0.0052, 0.0058, st.h, 12]} />
          <meshStandardMaterial color="#7fa241" roughness={0.45} />
        </mesh>
      ))}
      <Instances geometry={NODE} items={NODES} roughness={0.5} />
      <Instances geometry={LEAF} items={BAMBOO_LEAVES} roughness={0.55} side={DoubleSide} />
    </group>
  );
}

/**
 * Rincón verde a la izquierda (el «dragón verde» del feng shui, elemento madera):
 * de fondo a frente y de alto a bajo, bambú en la esquina de la riqueza, crásula y bonsái.
 */
export function Plants() {
  return (
    <group>
      <Bamboo position={[-0.985, 0, -0.2]} />
      <Jade position={[-0.87, 0, 0.0]} />
      <group position={[-0.8, 0, 0.2]} scale={1.15}>
        <Bonsai position={[0, 0, 0]} />
      </group>
      {/* Luz cálida tenue sobre el rincón: sin ella las hojas se pierden en la penumbra */}
      <pointLight position={[-0.82, 0.42, 0.05]} intensity={0.35} distance={0.7} decay={1.6} color="#ffe2b8" />
    </group>
  );
}
