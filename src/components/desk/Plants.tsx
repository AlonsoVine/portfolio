"use client";

import { useFrame } from "@react-three/fiber";
import { createContext, type ReactNode, useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  AdditiveBlending,
  BoxGeometry,
  CapsuleGeometry,
  LatheGeometry,
  type MeshPhysicalMaterial,
  type ShaderMaterial,
  type SpriteMaterial,
  TorusGeometry,
  Vector2,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type PointLight,
  Euler,
  Matrix4,
  BufferGeometry,
  IcosahedronGeometry,
  type InstancedMesh,
  Object3D,
  PlaneGeometry,
  Quaternion,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  type Texture,
  TubeGeometry,
  Vector3,
} from "three";
import { hdr } from "./palette";
import { RoundedBox } from "./primitives";
import { drawNoise, drawPothosLeaf, drawSnakeLeaf, drawSoftDot, type Draw } from "./screens";
import { Steam, type SteamDrive } from "./Steam";
import { useHoverable } from "./interact";
import { blow } from "./sfx";
import type { DeskCopy } from "./screens";
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
  const uv: number[] = [];
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, x * x * 0.5 - y * y * 0.12);
    uv.push(x + 0.5, y);
  }
  g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

const BLADE = bladeGeometry();
const HEART = heartGeometry();
function padGeometry() {
  // Gota de follaje: icosaedro subdividido, abollado con ruido y con normales suaves (nada de gemas facetadas)
  const g = mergeVertices(new IcosahedronGeometry(1, 2));
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const k = 1 + 0.16 * Math.sin(x * 7.1 + y * 3.3) * Math.cos(z * 5.7 - y * 2.1);
    pos.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  return g;
}
const PAD = padGeometry();

const leafKey = () => "leaf";
type Uniform = { value: number };
// Reloj común de todas las hojas y el «roce» de la planta que las agita (lo alimenta Sway)
const LEAF_TIME: Uniform = { value: 0 };
const SwayContext = createContext<{ rustle: { current: Uniform }; calm: boolean }>({ rustle: { current: { value: 0 } }, calm: false });

// Cada hoja se mece por su cuenta: la fase sale de su posición, la base queda fija y la punta es la que más se mueve
const leafVertex = (shader: { vertexShader: string; uniforms: Record<string, Uniform> }, rustle: Uniform, flex: Uniform) => {
  shader.uniforms.uTime = LEAF_TIME;
  shader.uniforms.uRustle = rustle;
  shader.uniforms.uFlex = flex;
  shader.vertexShader = `uniform float uTime;\nuniform float uRustle;\nuniform float uFlex;\n${shader.vertexShader}`.replace(
    "#include <begin_vertex>",
    `#include <begin_vertex>
    #ifdef USE_INSTANCING
      float ph = dot(instanceMatrix[3].xyz, vec3(917.0, 573.0, 331.0));
      float w = uFlex * smoothstep(-0.2, 1.0, position.y);
      float breeze = 0.035 + uRustle * 0.4;
      transformed.x += (sin(uTime * 1.7 + ph) * breeze + sin(uTime * 9.3 + ph * 1.7) * uRustle * 0.5) * w;
      transformed.z += (sin(uTime * 1.3 + ph * 0.7) * breeze + cos(uTime * 11.1 + ph) * uRustle * 0.6) * w;
    #endif`,
  );
};

// Translucidez barata: la cara en sombra recoge algo de la luz que atraviesa la hoja
const translucent = (shader: { fragmentShader: string }) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <lights_fragment_end>",
    `#include <lights_fragment_end>
    // Normal en espacio mundo: la contraluz viene de la pared azul y no gira con la cabeza
    vec3 leafN = inverseTransformDirection(normal, viewMatrix);
    reflectedLight.indirectDiffuse += diffuseColor.rgb * vec3(0.12, 0.18, 0.12) * max(dot(-leafN, normalize(vec3(-1.0, 0.4, -0.3))), 0.0);`,
  );
};

function Instances({
  geometry,
  items,
  roughness = 0.7,
  side,
  map,
  flex = 1,
}: {
  geometry: BufferGeometry;
  items: Instance[];
  roughness?: number;
  side?: typeof DoubleSide;
  map?: Texture;
  /** Cuánto se doblan las hojas con la brisa y al tocarlas: 0 las deja quietas (el musgo). */
  flex?: number;
}) {
  const ref = useRef<InstancedMesh>(null);
  const { rustle, calm } = useContext(SwayContext);
  const bend = useRef<Uniform>({ value: flex });
  const compile = (shader: { vertexShader: string; fragmentShader: string; uniforms: Record<string, Uniform> }) => {
    translucent(shader);
    leafVertex(shader, rustle.current, bend.current);
  };
  useFrame(({ clock }) => {
    LEAF_TIME.value = calm ? 0 : clock.elapsedTime;
    bend.current.value = flex;
  });
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
      <meshStandardMaterial roughness={roughness} side={side} map={map} onBeforeCompile={compile} customProgramCacheKey={leafKey} />
    </instancedMesh>
  );
}

type Stem = { points: Vec3[]; r0: number; r1: number };

/**
 * Tallos de una planta en una sola malla: un tubo por tramo, que adelgaza hacia la punta,
 * todos fusionados. Una llamada de dibujo por planta y sin codos visibles entre tramos.
 */
function stemsGeometry(stems: Stem[]) {
  const c = new Vector3();
  const parts = stems.map(({ points, r0, r1 }) => {
    const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)));
    const seg = Math.max(6, points.length * 6);
    const radial = 7;
    const g = new TubeGeometry(curve, seg, 1, radial, false);
    const pos = g.attributes.position;
    for (let i = 0; i <= seg; i += 1) {
      const t = i / seg;
      curve.getPointAt(t, c);
      const r = r0 + (r1 - r0) * t;
      for (let j = 0; j <= radial; j += 1) {
        const k = i * (radial + 1) + j;
        pos.setXYZ(k, c.x + (pos.getX(k) - c.x) * r, c.y + (pos.getY(k) - c.y) * r, c.z + (pos.getZ(k) - c.z) * r);
      }
    }
    return g;
  });
  const merged = mergeGeometries(parts) ?? new BufferGeometry();
  parts.forEach((g) => g.dispose());
  return merged;
}

function Stems({ stems, color, roughness = 0.85 }: { stems: Stem[]; color: string; roughness?: number }) {
  const geometry = useMemo(() => stemsGeometry(stems), [stems]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
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

// Colina de tierra que asoma por encima del borde de la maceta
const MOUND = { y: 0.0235, rx: 0.044, ry: 0.0105, rz: 0.028 };
const moundY = (x: number, z: number) => MOUND.y + MOUND.ry * Math.sqrt(Math.max(0, 1 - (x / MOUND.rx) ** 2 - (z / MOUND.rz) ** 2));

// Cojines de musgo de varios verdes que tapizan la colina, más tupidos hacia el tronco
const MOSS: Instance[] = (() => {
  const r = rng(11);
  const greens = ["#4f6b2c", "#3f5a24", "#5d7a30", "#6b8a38", "#36501f"];
  return Array.from({ length: 90 }, () => {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.95;
    const x = Math.cos(a) * d * MOUND.rx;
    const z = Math.sin(a) * d * MOUND.rz;
    const s = 0.0028 + r() * 0.0042;
    return {
      p: [x, moundY(x, z) - s * 0.15, z] as Vec3,
      r: [(r() - 0.5) * 0.4, r() * 3, (r() - 0.5) * 0.4] as Vec3,
      s: [s * 1.5, s * 0.55, s * 1.5] as Vec3,
      c: greens[Math.floor(r() * greens.length)],
    };
  });
})();

const BONSAI_STEMS: Stem[] = [
  ...[0, 1.6, 3.4, 4.8].map((a) => ({
    points: [
      [0.004, 0.039, 0],
      [0.004 + Math.cos(a) * 0.009, 0.0355, Math.sin(a) * 0.007],
      [0.004 + Math.cos(a) * 0.017, 0.0325, Math.sin(a) * 0.012],
    ] as Vec3[],
    r0: 0.0045,
    r1: 0.0016,
  })),
  { points: BONSAI_TRUNK, r0: 0.0075, r1: 0.0026 },
  ...BONSAI_BRANCHES.map((points) => ({ points, r0: 0.0028, r1: 0.0011 })),
];

function Bonsai({ position }: { position: Vec3 }) {
  return (
    <group position={position} rotation={[0, 0.25, 0]}>
      {/* Maceta esmaltada en azul cobalto: cuerpo, labio superior más claro y un filete dorado */}
      <RoundedBox args={[0.1, 0.02, 0.066]} radius={0.004} position={[0, 0.0135, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#20324f" roughness={0.28} clearcoat={0.8} clearcoatRoughness={0.25} />
      </RoundedBox>
      <RoundedBox args={[0.106, 0.0048, 0.072]} radius={0.0022} position={[0, 0.0238, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#2d4c78" roughness={0.22} clearcoat={0.9} clearcoatRoughness={0.2} />
      </RoundedBox>
      <mesh position={[0, 0.0105, 0]}>
        <boxGeometry args={[0.1006, 0.0012, 0.0666]} />
        <meshStandardMaterial color="#c9a24a" roughness={0.3} metalness={1} />
      </mesh>
      {/* Patas en nube */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <RoundedBox key={`${sx}${sz}`} args={[0.014, 0.0045, 0.011]} radius={0.002} position={[sx * 0.039, 0.0024, sz * 0.024]}>
            <meshStandardMaterial color="#1a2840" roughness={0.4} />
          </RoundedBox>
        )),
      )}
      {/* Tierra: colina que asoma del borde, con su musgo */}
      <mesh position={[0, MOUND.y, 0]} scale={[MOUND.rx, MOUND.ry, MOUND.rz]} receiveShadow>
        <sphereGeometry args={[1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#3a2a1e" roughness={1} />
      </mesh>
      <Instances geometry={PAD} items={MOSS} roughness={1} flex={0} />
      {/* Nebari (raíces abiertas), tronco y ramas en una sola malla */}
      <Stems stems={BONSAI_STEMS} color="#5a4434" roughness={0.95} />
      <Instances geometry={PAD} items={BONSAI_FOLIAGE} roughness={0.85} flex={0.35} />
    </group>
  );
}

// ——— Poto dorado: la «planta del dinero», con guías de hojas acorazonadas que caen por la maceta ———

const POTHOS_GREENS = ["#2f5f24", "#3a6e2a", "#467d30", "#558a36", "#2a5420"];

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
  // Guías que rebosan por el canto exterior de la jardinera y cuelgan por fuera, de largos distintos
  [2.3, 2.65, 3.0, 3.35, 3.7, 4.0].forEach((phi, k) => {
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    const end = [0.004, 0.022, 0.01, 0.038, 0.006, 0.028][k];
    const pts: Vec3[] = [
      [c * 0.012, 0.074, s * 0.012],
      [c * 0.034, 0.08, s * 0.034],
      [c * 0.05, 0.074, s * 0.05],
      [c * 0.057, 0.055, s * 0.057],
      [c * 0.058 + s * 0.006, (0.055 + end) / 2, s * 0.058 - c * 0.006],
      [c * 0.056 + s * 0.012, end, s * 0.056 - c * 0.012],
    ];
    vines.push(pts);
    along(pts, 8, 0.024);
  });
  // Corona: hojas grandes que salen del centro de la maceta
  // Hojas más pequeñas y a alturas desiguales: una mata, no una lechuga
  for (let i = 0; i < 30; i += 1) {
    const a = i * 2.39996 + r() * 0.3;
    const d = 0.006 + Math.sqrt(i / 30) * 0.042;
    leaf([Math.cos(a) * d, 0.07 + (1 - d / 0.048) * 0.04 + r() * 0.025, Math.sin(a) * d], [Math.cos(a), Math.sin(a)], -0.35 - (d / 0.048) * 0.8 - r() * 0.3, 0.03 + r() * 0.016);
  }
  return { vines, leaves };
})();

const POTHOS_STEMS: Stem[] = POTHOS.vines.map((points) => ({ points, r0: 0.0018, r1: 0.0011 }));

function Pothos({ position }: { position: Vec3 }) {
  const variegated = useCanvasTexture(128, 128, drawPothosLeaf);
  return (
    <group position={position}>
      <Stems stems={POTHOS_STEMS} color="#6f8f3a" roughness={0.6} />
      <Instances geometry={HEART} items={POTHOS.leaves} roughness={0.38} side={DoubleSide} map={variegated} />
    </group>
  );
}

// ——— Sansevieria: hojas en espada, erguidas, para la esquina del fondo (protección en el feng shui) ———

const BLADES: Instance[] = (() => {
  const r = rng(53);
  const items: Instance[] = [];
  // Crece de rizomas: varias rosetas repartidas por la tierra, cada una un abanico de 3-5 hojas abrazadas en la base
  const clumps: { a: number; d: number; tall: number; n: number }[] = [
    { a: 0.4, d: 0.012, tall: 0.46, n: 5 },
    { a: 2.3, d: 0.036, tall: 0.36, n: 4 },
    { a: 3.9, d: 0.04, tall: 0.31, n: 4 },
    { a: 5.3, d: 0.034, tall: 0.27, n: 3 },
    { a: 1.3, d: 0.044, tall: 0.2, n: 3 },
  ];
  clumps.forEach(({ a, d, tall, n }) => {
    const cx = Math.cos(a) * d;
    const cz = Math.sin(a) * d;
    const fan = a + Math.PI / 2 + (r() - 0.5) * 0.8;
    for (let j = 0; j < n; j += 1) {
      const rel = j - (n - 1) / 2;
      const o = rel * 0.0055;
      const px = cx + Math.cos(fan) * o;
      const pz = cz + Math.sin(fan) * o;
      // Las hojas del borde del abanico se abren hacia su lado; la roseta entera se inclina hacia fuera de la maceta
      const lx = Math.cos(fan) * Math.sign(rel) * Math.abs(rel) * 0.1 + Math.cos(a) * d * 2.2;
      const lz = Math.sin(fan) * Math.sign(rel) * Math.abs(rel) * 0.1 + Math.sin(a) * d * 2.2;
      const lean = Math.hypot(lx, lz) + 0.03 + r() * 0.05;
      const dir = Math.atan2(lz, lx);
      const w = 0.022 + r() * 0.012 - Math.abs(rel) * 0.003;
      items.push({
        p: [px, 0.07, pz],
        r: [-lean, Math.atan2(-Math.cos(dir), -Math.sin(dir)) + Math.PI, (r() - 0.5) * 0.25],
        s: [w, tall * (1 - Math.abs(rel) * 0.16) * (0.92 + r() * 0.16), w],
        c: r() > 0.5 ? "#ffffff" : "#e6ecd8",
      });
    }
  });
  return items;
})();

function SnakePlant({ position }: { position: Vec3 }) {
  const leafTex = useCanvasTexture(64, 256, drawSnakeLeaf);
  return (
    <group position={position} rotation={[0, 0.5, 0]}>
      <Instances geometry={BLADE} items={BLADES} roughness={0.5} side={DoubleSide} map={leafTex} flex={0.3} />
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
  const greens = ["#3e6b2a", "#4b7a30", "#58873a", "#35602a", "#6a9440"];
  // Abanico hacia la izquierda y hacia delante: lo que mira al usuario, no a la pared
  [-2.2, -2.9, 2.6, 1.9, 3.3, -1.6, -2.55, 2.25, -1.9, 2.95].forEach((phi, k) => {
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    const h = 0.55 + r() * 0.2 - (k > 3 ? 0.12 : 0);
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
    const n = 30;
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
        leaflets.push({ p: [p.x, p.y, p.z], r: [e.x, e.y, e.z], s: [0.012 + r() * 0.01, len * 1.35, 0.018], c: greens[Math.floor(r() * greens.length)] });
      }
    }
  });
  return { canes, leaflets };
})();

const ARECA_STEMS: Stem[] = ARECA.canes.map((points) => ({ points, r0: 0.0034, r1: 0.0012 }));

function Areca({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <Stems stems={ARECA_STEMS} color="#8a9a4a" roughness={0.6} />
      <Instances geometry={BLADE} items={ARECA.leaflets} roughness={0.5} side={DoubleSide} />
    </group>
  );
}

// Jardinera triple de cerámica mate: tres compartimentos a lo largo del canto izquierdo
const TROUGH = { x: -0.93, z: -0.2, len: 0.5, w: 0.13, h: 0.09, wall: 0.008 };
const SOIL = TROUGH.h - 0.01;
const CELLS = [-1, 0, 1].map((i) => TROUGH.z + (i * TROUGH.len) / 3);

// Cada material de la jardinera en una sola malla: cerámica (base, laterales y tabiques), patas y tierra
const PLANTER = (() => {
  const { w, h, wall, len } = TROUGH;
  const box = (sx: number, sy: number, sz: number, x: number, y: number, z: number, r = 0.003) => new RoundedBoxGeometry(sx, sy, sz, 2, r).translate(x, y, z);
  const merge = (parts: BufferGeometry[]) => {
    const g = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    return g;
  };
  return {
    ceramic: merge([
      box(w, wall, len, 0, wall / 2 + 0.006, 0),
      ...[-1, 1].map((sx) => box(wall, h - 0.006, len, sx * (w / 2 - wall / 2), h / 2 + 0.003, 0)),
      ...[-1, -1 / 3, 1 / 3, 1].map((k) => box(w, h - 0.006, wall, 0, h / 2 + 0.003, (k * (len - wall)) / 2)),
    ]),
    // Patas de roble: la jardinera no apoya directamente en la mesa
    feet: merge([-1, 1].map((sz) => box(w * 0.85, 0.006, 0.03, 0, 0.003, sz * (len / 2 - 0.05), 0.002))),
    soil: merge(CELLS.map((cz) => new PlaneGeometry(w - wall * 2, len / 3 - wall).rotateX(-Math.PI / 2).translate(0, SOIL, cz - TROUGH.z))),
  };
})();

function Planter() {
  return (
    <group position={[TROUGH.x, 0, TROUGH.z]}>
      <mesh geometry={PLANTER.ceramic} castShadow receiveShadow>
        <meshStandardMaterial color="#cdc8bd" roughness={0.72} />
      </mesh>
      <mesh geometry={PLANTER.feet}>
        <meshStandardMaterial color="#8a6442" roughness={0.6} />
      </mesh>
      <mesh geometry={PLANTER.soil} receiveShadow>
        <meshStandardMaterial color="#2a2019" roughness={1} />
      </mesh>
    </group>
  );
}

/**
 * Rincón verde a la izquierda (el «dragón verde» del feng shui, elemento madera): una jardinera triple
 * con las plantas de alta a baja hacia el usuario (areca, sansevieria, poto) y el bonsái delante.
 */
/**
 * Planta que se mece al rozarla: muelle amortiguado con pivote en la tierra. Pasar el puntero la empuja
 * un poco; un clic, más.
 */
export function Sway({ label, position, stiffness = 26, calm = false, children }: { label: string; position: Vec3; stiffness?: number; calm?: boolean; children: ReactNode }) {
  const g = useRef<Group>(null);
  const s = useRef({ x: 0, z: 0, vx: 0, vz: 0, energy: 0 });
  const rustle = useRef<Uniform>({ value: 0 });
  const ctx = useMemo(() => ({ rustle, calm }), [calm]);
  const push = (k: number) => {
    const a = Math.random() * Math.PI * 2;
    s.current.vx += Math.cos(a) * k * 0.4;
    s.current.vz += Math.sin(a) * k * 0.4;
    s.current.energy = Math.min(1, s.current.energy + k * 0.8);
  };
  const hover = useHoverable(label, () => push(0.55), () => push(0.22));
  useFrame(({ gl }, delta) => {
    const m = s.current;
    const node = g.current;
    if (!node || Math.abs(m.x) + Math.abs(m.z) + Math.abs(m.vx) + Math.abs(m.vz) + m.energy < 1e-4) return;
    const dt = Math.min(delta, 0.05);
    const damp = 2 * 0.25 * Math.sqrt(stiffness);
    m.vx += (-stiffness * m.x - damp * m.vx) * dt;
    m.vz += (-stiffness * m.z - damp * m.vz) * dt;
    m.x += m.vx * dt;
    m.z += m.vz * dt;
    m.energy *= Math.exp(-dt * 1.4);
    if (m.energy < 1e-3) m.energy = 0;
    rustle.current.value = m.energy * 0.45;
    node.rotation.set(m.x * 0.35, 0, m.z * 0.35);
    gl.shadowMap.needsUpdate = true;
  });
  return (
    <SwayContext.Provider value={ctx}>
      <group ref={g} position={position} {...hover}>
        {children}
      </group>
    </SwayContext.Provider>
  );
}

export function Plants({ t, reduceMotion }: { t: DeskCopy; reduceMotion: boolean }) {
  const label = t.interact.plant;
  return (
    <group>
      <Planter />
      <Sway label={label} position={[TROUGH.x, SOIL - 0.087, CELLS[0]]} stiffness={14} calm={reduceMotion}>
        <Areca position={[0, 0, 0]} />
      </Sway>
      <Sway label={label} position={[TROUGH.x, SOIL - 0.07, CELLS[1]]} stiffness={30} calm={reduceMotion}>
        <SnakePlant position={[0, 0, 0]} />
      </Sway>
      <Sway label={label} position={[TROUGH.x, SOIL - 0.058 * 1.3, CELLS[2]]} stiffness={20} calm={reduceMotion}>
        <group scale={1.3}>
          <Pothos position={[0, 0, 0]} />
        </group>
      </Sway>
      {/* En la misma línea que la jardinera y con el lado largo paralelo a ella, junto al canto de la mesa */}
      <Sway label={label} position={[TROUGH.x, 0, 0.25]} stiffness={60} calm={reduceMotion}>
        <group rotation={[0, Math.PI / 2, 0]} scale={1.15}>
          <Bonsai position={[0, 0, 0]} />
        </group>
      </Sway>
      {/* Clavado al fondo del cajón central, entre la sansevieria y el poto: el mástil se pierde entre las hojas */}
      <Lantern position={[TROUGH.x - 0.04, SOIL, CELLS[1] + 0.06]} rotation={[0, -Math.PI / 4, 0]} />
      <Incense t={t} position={[TROUGH.x, 0, 0.125]} reduceMotion={reduceMotion} />
      <Candle t={t} position={[TROUGH.x + 0.045, 0, 0.08]} reduceMotion={reduceMotion} />
    </group>
  );
}

const STICK = 0.15;
const BURN_SECONDS = 600;

/** Recogeceniza de latón en forma de flor de loto: dos coronas de pétalos abiertos y el cáliz central. */
const LOTUS = (() => {
  const m = new Matrix4();
  const q = new Quaternion();
  const parts: BufferGeometry[] = [];
  const ring = (count: number, r: number, tilt: number, len: number, y: number, turn: number) => {
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 + turn;
      const g = new SphereGeometry(1, 16, 8);
      // Pétalo: elipsoide plano y alargado, inclinado hacia arriba desde el centro
      g.scale(len, 0.0018, len * 0.45);
      g.translate(len * 0.85, 0, 0);
      g.applyMatrix4(m.compose(new Vector3(Math.cos(a) * r, y, -Math.sin(a) * r), q.setFromEuler(new Euler(0, a, tilt, "YXZ")), new Vector3(1, 1, 1)));
      parts.push(g);
    }
  };
  ring(8, 0.004, 0.22, 0.016, 0.003, 0);
  ring(8, 0.003, 0.62, 0.012, 0.005, Math.PI / 8);
  const cup = new CylinderGeometry(0.009, 0.006, 0.008, 24);
  cup.translate(0, 0.006, 0);
  parts.push(cup);
  const base = new CylinderGeometry(0.012, 0.014, 0.003, 32);
  base.translate(0, 0.0015, 0);
  parts.push(base);
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return merged;
})();

/** Vela de cera junto al incienso: llama viva con su punto de luz cálida sobre la mesa. */
const OUT_S = 5;
const WAX_R = 0.0175;
const WAX_H = 0.05;
const DIP = 0.005;

// Cuerpo de cera con el borde fundido: el canto sube un poco y el centro se hunde alrededor de la mecha
const WAX = (() => {
  const pts = [
    [0, 0],
    [WAX_R, 0],
    [WAX_R, WAX_H - 0.006],
    [WAX_R * 1.012, WAX_H - 0.0015],
    [WAX_R * 0.96, WAX_H],
    [WAX_R * 0.8, WAX_H - 0.0022],
    [WAX_R * 0.4, WAX_H - DIP * 0.9],
    [0, WAX_H - DIP],
  ].map(([x, y]) => new Vector2(x, y));
  const g = new LatheGeometry(pts, 48);
  g.computeVertexNormals();
  return g;
})();

// Goterones de cera que bajan por el costado desde el borde
const DRIPS = (() => {
  const parts = [
    [0.4, 0.014],
    [1.9, 0.008],
    [3.3, 0.019],
    [4.6, 0.006],
  ].map(([a, len]) => {
    const d = new CapsuleGeometry(0.0017, len, 4, 10);
    d.scale(1, 1, 0.6);
    d.translate(0, WAX_H - 0.002 - len / 2, WAX_R * 0.985);
    d.rotateY(a);
    return d;
  });
  const m = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return m;
})();

// Palmatoria de latón: plato con reborde, cazoleta para la vela y asa de anilla para llevarla
const HOLDER = (() => {
  const dish = new LatheGeometry(
    [
      [0, 0],
      [0.03, 0],
      [0.0325, 0.0015],
      [0.0322, 0.0048],
      [0.0302, 0.0044],
      [0.028, 0.003],
      [0, 0.0028],
    ].map(([x, y]) => new Vector2(x, y)),
    56,
  );
  const cup = new LatheGeometry(
    [
      [0.0105, 0.0028],
      [0.0205, 0.004],
      [0.0215, 0.012],
      [0.0198, 0.0126],
      [0.0188, 0.0105],
    ].map(([x, y]) => new Vector2(x, y)),
    48,
  );
  const ring = new TorusGeometry(0.0085, 0.0018, 10, 32);
  ring.translate(0.039, 0.007, 0);
  const thumb = new CylinderGeometry(0.006, 0.006, 0.0014, 20);
  thumb.translate(0.041, 0.0162, 0);
  const parts = [dish, cup, ring, thumb];
  const m = mergeGeometries(parts.map((g) => g.toNonIndexed()), false);
  parts.forEach((g) => g.dispose());
  m.computeVertexNormals();
  return m;
})();

// Brillo de la cera a lo largo del perfil del torno: nada abajo, cálido en el borde y la cara superior
const drawWaxGlow: Draw = (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, h, 0, 0);
  g.addColorStop(0, "#000000");
  g.addColorStop(0.2, "#000000");
  g.addColorStop(0.4, "#ffffff");
  g.addColorStop(1, "#ffffff");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};

// Llama: lágrima con la base azulada, el núcleo cálido y los bordes que se desvanecen; nada de esfera cegadora
const FLAME = (() => {
  const pts: Vector2[] = [];
  for (let i = 0; i <= 16; i += 1) {
    const y = i / 16;
    pts.push(new Vector2(Math.sqrt(y) * (1 - y) ** 1.35 * 1.25, y));
  }
  return new LatheGeometry(pts, 24);
})();

const flameVert = /* glsl */ `
  uniform float uTime;
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    vY = position.y;
    vec3 p = position;
    // La punta se mece más que la base
    float sway = sin(uTime * 7.3 + p.y * 2.0) * 0.08 + sin(uTime * 13.1) * 0.04;
    p.x += sway * p.y * p.y;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const flameFrag = /* glsl */ `
  uniform float uGain;
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    float face = abs(dot(normalize(vN), normalize(vV)));
    float body = pow(face, 1.6) * (1.0 - smoothstep(0.45, 1.0, vY)) * smoothstep(0.0, 0.12, vY);
    vec3 outer = vec3(1.0, 0.36, 0.05);
    vec3 core = vec3(1.0, 0.78, 0.4);
    vec3 col = mix(outer, core, pow(face, 4.0) * (1.0 - vY * 0.7));
    // Base azul y algo oscura junto a la mecha, como en una vela de verdad
    float blue = (1.0 - smoothstep(0.04, 0.3, vY)) * (1.0 - face * 0.6);
    col = mix(col, vec3(0.25, 0.4, 1.0), blue * 0.85);
    gl_FragColor = vec4(col * uGain, clamp(body * 1.6, 0.0, 1.0));
  }
`;

function Candle({ t, position, reduceMotion }: { t: DeskCopy; position: Vec3; reduceMotion: boolean }) {
  const noise = useCanvasTexture(128, 128, drawNoise, { tileX: 1, color: false });
  const glow = useCanvasTexture(128, 128, drawSoftDot);
  const waxGlow = useCanvasTexture(8, 128, drawWaxGlow);
  const flame = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const wax = useRef<MeshPhysicalMaterial>(null);
  const halo = useRef<SpriteMaterial>(null);
  const flameMat = useRef<ShaderMaterial>(null);
  const blownAt = useRef(-100);
  const smoke = useRef<SteamDrive>({ gain: 0, stir: 0.3 });
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uGain: { value: 1.05 } }), []);
  const hover = useHoverable(t.interact.blow, () => {
    const now = performance.now() / 1000;
    if (now - blownAt.current < OUT_S + 0.6) return;
    blownAt.current = now;
    blow();
  });
  useFrame(({ clock }) => {
    const tt = clock.elapsedTime;
    // Apagada: la llama se encoge en un instante, queda un hilo de humo y a los pocos segundos vuelve a prender
    const since = performance.now() / 1000 - blownAt.current;
    const lit = since < 0.15 ? 1 - since / 0.15 : since < OUT_S ? 0 : Math.min(1, (since - OUT_S) / 0.6);
    smoke.current.gain = since < OUT_S ? Math.max(0, 1 - since / 3.5) ** 1.5 : 0;
    // Titileo de llama: varias ondas sin relación entre sí más algún bajón breve, para que no se note el ciclo
    const wave = reduceMotion ? 0 : Math.sin(tt * 9.1) * 0.5 + Math.sin(tt * 13.7 + 1.3) * 0.3 + Math.sin(tt * 4.3 + 0.7) * 0.2;
    const dip = reduceMotion ? 0 : Math.max(0, Math.sin(tt * 1.7) * Math.sin(tt * 0.63 + 2)) ** 6 * 0.35;
    const f = 0.82 + wave * 0.12 - dip;
    if (flameMat.current) flameMat.current.uniforms.uTime.value = reduceMotion ? 0 : tt;
    if (flame.current) {
      flame.current.visible = lit > 0.01;
      flame.current.scale.set(0.012 * (1 - wave * 0.04) * lit, 0.03 * f * lit, 0.012 * (1 - wave * 0.04) * lit);
    }
    // La cera de arriba se transluce con la llama, como cuando el pabilo calienta el borde
    if (wax.current) wax.current.emissiveIntensity = 0.18 * f * lit;
    if (halo.current) halo.current.opacity = 0.09 * f * lit;
    if (light.current) light.current.intensity = 0.5 * f * lit;
  });
  const base = 0.0105;
  const top = base + WAX_H;
  const wick = top - DIP;
  return (
    <group position={position} {...hover}>
      <mesh geometry={HOLDER} castShadow receiveShadow>
        <meshStandardMaterial color="#c9a24a" roughness={0.3} metalness={1} />
      </mesh>
      <group position={[0, base, 0]}>
        <mesh geometry={WAX} castShadow receiveShadow>
          <meshPhysicalMaterial ref={wax} color="#f1e6d2" roughness={0.5} sheen={0.5} sheenColor="#fff3dc" emissive="#ff9b4a" emissiveMap={waxGlow} emissiveIntensity={0.15} />
        </mesh>
        <mesh geometry={DRIPS} castShadow>
          <meshPhysicalMaterial color="#f3e9d6" roughness={0.35} sheen={0.5} sheenColor="#fff3dc" />
        </mesh>
      </group>
      {/* Pabilo algo doblado y con la punta quemada */}
      <mesh position={[0.0004, wick + 0.0028, 0]} rotation={[0, 0, -0.18]}>
        <cylinderGeometry args={[0.00045, 0.0005, 0.0058, 6]} />
        <meshStandardMaterial color="#1a1412" roughness={1} />
      </mesh>
      <group position={[0, wick + 0.0035, 0]}>
        <group ref={flame} scale={[0.012, 0.03, 0.012]}>
          <mesh geometry={FLAME}>
            <shaderMaterial ref={flameMat} vertexShader={flameVert} fragmentShader={flameFrag} uniforms={uniforms} transparent depthWrite={false} side={DoubleSide} toneMapped={false} />
          </mesh>
        </group>
        {/* Halo tenue alrededor de la llama, en vez de deslumbrar */}
        <sprite position={[0, 0.012, 0]} scale={[0.045, 0.045, 1]}>
          <spriteMaterial ref={halo} map={glow} color="#ff9a4d" transparent opacity={0.16} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      </group>
      <pointLight ref={light} position={[0, top + 0.05, 0]} color="#ff9a4d" intensity={0.5} distance={0.45} decay={2} />
      {!reduceMotion && <Steam position={[0, wick + 0.006, 0]} height={0.16} width={0.02} noise={noise} color="#c9ccd4" opacity={0.5} drive={smoke} />}
    </group>
  );
}

/** Varilla de incienso en un platillo de piedra: se consume despacio, con la brasa viva y un hilo de humo. */
function Incense({ t: copy, position, reduceMotion }: { t: DeskCopy; position: Vec3; reduceMotion: boolean }) {
  const noise = useCanvasTexture(128, 128, drawNoise, { tileX: 1, color: false });
  const stick = useRef<Mesh>(null);
  const tip = useRef<Group>(null);
  const ember = useRef<MeshBasicMaterial>(null);
  // Pasar la mano por el humo lo agita; un clic además aviva la brasa y suelta una bocanada
  const smoke = useRef<SteamDrive>({ gain: 1, stir: 0 });
  const hover = useHoverable(
    copy.interact.smoke,
    () => {
      smoke.current.stir = 1.6;
      smoke.current.gain = 1.8;
    },
    () => {
      smoke.current.stir = Math.max(smoke.current.stir, 1);
    },
  );

  useFrame(({ clock }, delta) => {
    const sm = smoke.current;
    sm.stir *= Math.exp(-delta * 0.8);
    sm.gain += (1 - sm.gain) * Math.min(1, delta * 0.7);
    const t = clock.elapsedTime;
    // Empieza ya algo quemada y vuelve a empezar cuando se agota: el ciclo es tan lento que no se nota
    const left = reduceMotion ? 0.7 : 0.85 - 0.5 * ((t / BURN_SECONDS) % 1);
    const h = STICK * left;
    if (stick.current) {
      stick.current.scale.y = h;
      stick.current.position.y = h / 2;
    }
    if (tip.current) tip.current.position.y = h;
    if (ember.current) {
      const flicker = reduceMotion ? 1 : 0.8 + 0.2 * Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1);
      const glow = flicker * (1 + (sm.gain - 1) * 0.8);
      ember.current.color.setRGB(3.2 * glow, 0.9 * glow, 0.25 * glow);
    }
  });

  return (
    <group position={position} {...hover}>
      {/* Loto de latón: los pétalos recogen la ceniza y el cáliz sujeta la varilla */}
      <mesh geometry={LOTUS} castShadow receiveShadow>
        <meshStandardMaterial color="#d4ad55" roughness={0.28} metalness={1} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.0101, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.0085, 24]} />
        <meshStandardMaterial color="#8d8a86" roughness={1} />
      </mesh>
      <group position={[0, 0.012, 0]}>
        {/* Mango de bambú sin perfume y, encima, la pasta de incienso que se va consumiendo */}
        <mesh position={[0, -0.002, 0]}>
          <cylinderGeometry args={[0.0008, 0.0008, 0.02, 6]} />
          <meshStandardMaterial color="#c9a36a" roughness={0.8} />
        </mesh>
        <mesh ref={stick}>
          <cylinderGeometry args={[0.0013, 0.0014, 1, 8]} />
          <meshStandardMaterial color="#5a2d1f" roughness={0.95} />
        </mesh>
        <group ref={tip}>
          {/* Ceniza gris pegada sobre la brasa */}
          <mesh position={[0, 0.003, 0]}>
            <cylinderGeometry args={[0.0011, 0.0013, 0.004, 8]} />
            <meshStandardMaterial color="#9a958e" roughness={1} />
          </mesh>
          <mesh position={[0, 0.0007, 0]}>
            <sphereGeometry args={[0.0016, 10, 8]} />
            <meshBasicMaterial ref={ember} toneMapped={false} />
          </mesh>
          <Steam position={[0, 0.005, 0]} height={0.24} width={0.028} noise={noise} color="#d8dce6" opacity={0.34} drive={smoke} />
        </group>
      </group>
    </group>
  );
}

// ——— Farolillo de jardín ———

const LANTERN_AT: Vec3 = [0.082, 0.3, 0];

/** Todo el hierro del farolillo (mástil en cayado, tejadillo, marcos y montantes) en una sola malla. */
const IRON = (() => {
  const post = new TubeGeometry(
    new CatmullRomCurve3([
      new Vector3(0, 0, 0),
      new Vector3(0, 0.3, 0),
      new Vector3(0.006, 0.36, 0),
      new Vector3(0.04, 0.385, 0),
      new Vector3(0.075, 0.37, 0),
      new Vector3(0.082, 0.345, 0),
    ]),
    48,
    0.0032,
    8,
  );
  const [x, y, z] = LANTERN_AT;
  const at = <T extends BufferGeometry>(g: T, dx: number, dy: number, dz: number) => g.translate(x + dx, y + dy, z + dz);
  const roof = new ConeGeometry(0.034, 0.022, 4);
  roof.rotateY(Math.PI / 4);
  const parts: BufferGeometry[] = [
    post,
    at(new CylinderGeometry(0.0025, 0.0025, 0.014, 8), 0, 0.033, 0),
    at(roof, 0, 0.019, 0),
    at(new BoxGeometry(0.042, 0.004, 0.042), 0, 0.006, 0),
    at(new BoxGeometry(0.038, 0.005, 0.038), 0, -0.05, 0),
    ...[-1, 1].flatMap((a) => [-1, 1].map((b) => at(new BoxGeometry(0.003, 0.054, 0.003), a * 0.0165, -0.022, b * 0.0165))),
  ];
  // Las primitivas de three salen indexadas y con las mismas atributos: se pueden fundir sin más
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return merged;
})();

/** Farolillo de jardín de hierro negro con cristal esmerilado: luz cálida que cae sobre las plantas. */
function Lantern({ position, rotation }: { position: Vec3; rotation?: Vec3 }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={IRON} castShadow>
        <meshStandardMaterial color="#17171a" roughness={0.45} metalness={0.7} />
      </mesh>
      <group position={LANTERN_AT}>
        {/* Cristal esmerilado iluminado desde dentro, con la bombilla al fondo */}
        <mesh position={[0, -0.022, 0]}>
          <boxGeometry args={[0.032, 0.052, 0.032]} />
          <meshStandardMaterial color="#f4e6cf" roughness={0.4} emissive="#ffc98f" emissiveIntensity={1.4} />
        </mesh>
        <mesh position={[0, -0.022, 0]}>
          <sphereGeometry args={[0.009, 12, 8]} />
          <meshBasicMaterial color={hdr("#ffd8a8", 2.2)} toneMapped={false} />
        </mesh>
        <pointLight position={[0, -0.03, 0]} color="#ffc98f" intensity={1.2} distance={0.6} decay={1.8} />
      </group>
    </group>
  );
}

// ——— Poto colgante de la balda ———

const HANGING: { vines: Vec3[][]; leaves: Instance[] } = (() => {
  const r = rng(91);
  const vines: Vec3[][] = [];
  const leaves: Instance[] = [];
  // Guías que salen de la maceta, pasan por el canto de la balda y caen a distintas alturas
  (
    [
      [-0.06, -0.14],
      [-0.035, -0.26],
      [-0.01, -0.19],
      [0.015, -0.32],
      [0.04, -0.21],
      [0.065, -0.11],
    ] as const
  ).forEach(([x, end]) => {
    const pts: Vec3[] = [
      [x * 0.15, 0.048, 0.004],
      [x * 0.45, 0.055, 0.03],
      [x * 0.75, 0.04, 0.058],
      [x * 0.9, 0.0, 0.07 + r() * 0.006],
      [x * 1.05 + (r() - 0.5) * 0.02, end * 0.55, 0.072 + r() * 0.012],
      [x * 1.15 + (r() - 0.5) * 0.03, end, 0.068 + r() * 0.015],
    ];
    vines.push(pts);
    const curve = new CatmullRomCurve3(pts.map((p) => new Vector3(...p)));
    const n = Math.round(-end * 45) + 4;
    for (let i = 0; i < n; i += 1) {
      const t = 0.12 + (i / n) * 0.88;
      const p = curve.getPoint(t);
      const side = i % 2 ? 1 : -1;
      // Arriba las hojas se abren hacia delante; en la caída cuelgan con la punta hacia abajo
      const hanging = p.y < 0.02;
      leaves.push({
        p: [p.x + side * 0.007, p.y, p.z + 0.004],
        r: [hanging ? Math.PI - 0.5 + r() * 0.5 : -1.0 + r() * 0.4, Math.atan2(-side * 0.6, -1) + (r() - 0.5) * 0.6, (r() - 0.5) * 0.8],
        s: Array(3).fill(0.019 * (1.1 - t * 0.35) * (0.85 + r() * 0.3)) as Vec3,
        c: POTHOS_GREENS[Math.floor(r() * POTHOS_GREENS.length)],
      });
    }
  });
  // Mata de la maceta
  for (let i = 0; i < 16; i += 1) {
    const a = i * 2.39996;
    const d = 0.004 + Math.sqrt(i / 16) * 0.024;
    leaves.push({
      p: [Math.cos(a) * d, 0.05 + (1 - d / 0.028) * 0.025, Math.sin(a) * d],
      r: [-0.6 - (d / 0.028) * 0.6, Math.atan2(-Math.cos(a), -Math.sin(a)), (r() - 0.5) * 0.6],
      s: Array(3).fill(0.026 + r() * 0.01) as Vec3,
      c: POTHOS_GREENS[Math.floor(r() * POTHOS_GREENS.length)],
    });
  }
  return { vines, leaves };
})();

const HANGING_STEMS: Stem[] = HANGING.vines.map((points) => ({ points, r0: 0.0015, r1: 0.001 }));

/** Poto en una maceta pequeña de cerámica: sus guías rebosan por el canto de la balda y cuelgan. */
export function HangingPothos({ position }: { position: Vec3 }) {
  const variegated = useCanvasTexture(128, 128, drawPothosLeaf);
  return (
    <group position={position}>
      <mesh position={[0, 0.022, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.024, 0.044, 28]} />
        <meshStandardMaterial color="#cfc6b4" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.042, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.027, 24]} />
        <meshStandardMaterial color="#3a2a1e" roughness={1} />
      </mesh>
      <Stems stems={HANGING_STEMS} color="#6f8f3a" roughness={0.6} />
      <Instances geometry={HEART} items={HANGING.leaves} roughness={0.38} side={DoubleSide} map={variegated} />
    </group>
  );
}
