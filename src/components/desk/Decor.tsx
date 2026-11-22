"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BufferGeometry, Color, DoubleSide, Euler, Float32BufferAttribute, type Group, Matrix4, PlaneGeometry, Quaternion, Vector3 } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HangingPothos } from "./Plants";
import { RoundedBox } from "./primitives";
import { drawCalendar, drawClockFace, drawFantasyMap, drawRug, drawSoftDot } from "./screens";
import { useCanvasTexture } from "./useCanvasTexture";

type Vec3 = [number, number, number];

/** Alfombra de lana bajo la mesa, donde la vista alcanza el suelo: que mirar abajo no sea un vacío negro. */
export function Rug() {
  const map = useCanvasTexture(1024, 640, drawRug);
  return (
    <mesh position={[0.05, -0.7495, 0.12]} rotation={[-Math.PI / 2, 0, 0.03]} receiveShadow>
      <planeGeometry args={[1.85, 1.12]} />
      <meshStandardMaterial map={map} bumpMap={map} bumpScale={0.6} color="#94493a" roughness={1} alphaTest={0.4} />
    </mesh>
  );
}

const BOOKS: { w: number; h: number; c: string; lean?: number }[] = [
  { w: 0.024, h: 0.165, c: "#6e3328" },
  { w: 0.019, h: 0.15, c: "#2f4a5a" },
  { w: 0.028, h: 0.172, c: "#c8b48c" },
  { w: 0.021, h: 0.142, c: "#3d5a3a" },
  { w: 0.018, h: 0.158, c: "#1f1f24", lean: -0.2 },
];
// Balda, libros, cantos de páginas y la pila tumbada comparten material: una sola malla con color por vértice
const SHELF_WOOD = (() => {
  const m = new Matrix4();
  const q = new Quaternion();
  const c = new Color();
  const parts: BufferGeometry[] = [];
  const add = (g: BufferGeometry, hex: string, p: Vec3, r: Vec3 = [0, 0, 0], pivot: Vec3 = [0, 0, 0]) => {
    const flat = g.index ? g.toNonIndexed() : g;
    flat.translate(...pivot);
    flat.applyMatrix4(m.compose(new Vector3(...p), q.setFromEuler(new Euler(...r)), new Vector3(1, 1, 1)));
    c.set(hex);
    const n = flat.attributes.position.count;
    flat.setAttribute("color", new Float32BufferAttribute(Array.from({ length: n }, () => [c.r, c.g, c.b]).flat(), 3));
    parts.push(flat);
  };
  add(new RoundedBoxGeometry(0.5, 0.024, 0.14, 3, 0.004), "#9b6b43", [0, 0, 0.07]);
  let x = -0.215;
  BOOKS.forEach((b) => {
    const at: Vec3 = [x + b.w / 2 + (b.lean ? 0.03 : 0), 0.012, 0.075];
    const r: Vec3 = [0, 0, b.lean ?? 0];
    x += b.w + 0.002;
    add(new RoundedBoxGeometry(b.w, b.h, 0.105, 2, 0.002), b.c, at, r, [0, b.h / 2, 0]);
    // Bloque de páginas asomando por delante
    add(new PlaneGeometry(b.w * 0.55, b.h * 0.92), "#d9d0bd", at, r, [0, b.h / 2, 0.0528]);
  });
  add(new RoundedBoxGeometry(0.13, 0.022, 0.095, 2, 0.002), "#a2482f", [0.035, 0.023, 0.072], [0, 0.08, 0]);
  add(new RoundedBoxGeometry(0.12, 0.018, 0.09, 2, 0.002), "#e1d7c3", [0.038, 0.043, 0.072], [0, -0.05, 0]);
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return merged;
})();

/** Balda flotante de roble con libros, una pila tumbada con un poto colgante y una cámara de carrete. */
export function Shelf({ position }: { position: Vec3 }) {
  const dot = useCanvasTexture(128, 128, drawSoftDot);
  return (
    <group position={position}>
      <mesh geometry={SHELF_WOOD} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.72} />
      </mesh>
      {/* Sombra de la balda y sus objetos sobre la pared */}
      <mesh position={[0, -0.05, 0.002]} scale={[0.62, 0.16, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={dot} color="#000000" transparent opacity={0.55} depthWrite={false} />
      </mesh>

      {/* Poto colgante sobre la pila: sus guías caen por delante de la balda */}
      <HangingPothos position={[0.04, 0.052, 0.072]} />

      {/* Cámara de carrete: cuerpo negro, tapa cromada y objetivo */}
      <group position={[0.175, 0.012, 0.075]} rotation={[0, -0.35, 0]}>
        <RoundedBox args={[0.085, 0.05, 0.032]} radius={0.004} position={[0, 0.025, 0]} castShadow>
          <meshStandardMaterial color="#1a1a1d" roughness={0.6} />
        </RoundedBox>
        <RoundedBox args={[0.086, 0.014, 0.033]} radius={0.003} position={[0, 0.052, 0]}>
          <meshStandardMaterial color="#b9b8b4" roughness={0.3} metalness={0.9} />
        </RoundedBox>
        <mesh position={[0, 0.026, 0.026]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.017, 0.019, 0.022, 28]} />
          <meshStandardMaterial color="#232326" roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.026, 0.0375]}>
          <circleGeometry args={[0.012, 28]} />
          <meshStandardMaterial color="#0c1218" roughness={0.05} metalness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

/** Reloj de pared con marco de nogal: marca la hora real. */
export function WallClock({ position, radius = 0.093 }: { position: Vec3; radius?: number }) {
  const face = useCanvasTexture(256, 256, drawClockFace);
  const dot = useCanvasTexture(128, 128, drawSoftDot);
  const hour = useRef<Group>(null);
  const minute = useRef<Group>(null);
  const second = useRef<Group>(null);

  useFrame(() => {
    const d = new Date();
    const s = d.getSeconds() + d.getMilliseconds() / 1000;
    const m = d.getMinutes() + s / 60;
    const h = (d.getHours() % 12) + m / 60;
    if (hour.current) hour.current.rotation.z = -(h / 12) * Math.PI * 2;
    if (minute.current) minute.current.rotation.z = -(m / 60) * Math.PI * 2;
    // La aguja de segundos avanza a saltos, como un reloj de cuarzo
    if (second.current) second.current.rotation.z = -(Math.floor(s) / 60) * Math.PI * 2;
  });

  const hand = (len: number, width: number, z: number, color: string, tail = 0) => (
    <mesh position={[0, (len - tail) / 2, z]}>
      <boxGeometry args={[width, len + tail, 0.0015]} />
      <meshStandardMaterial color={color} roughness={0.4} />
    </mesh>
  );

  return (
    <group position={position}>
      <mesh position={[0.01, -0.012, 0.001]} scale={[radius * 2.9, radius * 2.9, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={dot} color="#000000" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[radius * 1.1, radius * 1.1, 0.024, 64, 1, true]} />
        <meshStandardMaterial color="#4a2f1f" roughness={0.5} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0.024]}>
        <torusGeometry args={[radius * 1.05, radius * 0.06, 12, 64]} />
        <meshStandardMaterial color="#5a3a26" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0, 0.006]}>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial map={face} roughness={0.7} />
      </mesh>
      <group ref={hour}>{hand(radius * 0.52, radius * 0.07, 0.009, "#1d1c1f", radius * 0.1)}</group>
      <group ref={minute}>{hand(radius * 0.78, radius * 0.045, 0.0105, "#1d1c1f", radius * 0.12)}</group>
      <group ref={second}>{hand(radius * 0.84, radius * 0.015, 0.012, "#c4552d", radius * 0.2)}</group>
      <mesh position={[0, 0, 0.0135]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.05, radius * 0.05, 0.003, 16]} />
        <meshStandardMaterial color="#c4552d" roughness={0.4} />
      </mesh>
      {/* Cristal: solo un brillo leve del entorno */}
      <mesh position={[0, 0, 0.02]}>
        <circleGeometry args={[radius, 48]} />
        <meshStandardMaterial color="#000000" roughness={0.05} metalness={1} transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Calendario de pared colgado de un clavo, con el mes en curso y el día de hoy rodeado. */
export function WallCalendar({ position, lang }: { position: Vec3; lang: string }) {
  const draw = useMemo(() => drawCalendar(lang), [lang]);
  // Se repinta cada hora: el día marcado cambia solo a medianoche
  const map = useCanvasTexture(360, 500, draw, { refreshMs: 3_600_000 });
  const dot = useCanvasTexture(128, 128, drawSoftDot);
  const W = 0.218;
  const H = W * (500 / 360);
  return (
    <group position={position}>
      <mesh position={[0.008, -0.012, 0.001]} scale={[W * 1.5, H * 1.25, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={dot} color="#000000" transparent opacity={0.45} depthWrite={false} />
      </mesh>
      {/* Cartón trasero y hojas apiladas */}
      <mesh position={[0, 0, 0.004]}>
        <boxGeometry args={[W, H, 0.004]} />
        <meshStandardMaterial color="#d8cfbf" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.0065]}>
        <planeGeometry args={[W * 0.985, H * 0.985]} />
        <meshStandardMaterial map={map} roughness={0.85} />
      </mesh>
      {/* Espiral de alambre arriba y el clavo del que cuelga */}
      <mesh position={[0, H / 2 - 0.004, 0.008]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.0028, 0.0028, W * 0.9, 12]} />
        <meshStandardMaterial color="#2a2a2e" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={[0, H / 2 + 0.012, 0.006]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0025, 0.0025, 0.012, 10]} />
        <meshStandardMaterial color="#8a8780" roughness={0.3} metalness={0.9} />
      </mesh>
    </group>
  );
}

/** Cuadro enmarcado con un mapa de fantasía a tinta sobre pergamino: marco de nogal, paspartú y cristal. */
export function MapFrame({ position, rotation }: { position: Vec3; rotation?: Vec3 }) {
  const map = useCanvasTexture(1024, 720, drawFantasyMap);
  const dot = useCanvasTexture(128, 128, drawSoftDot);
  const W = 0.56;
  const H = W * (720 / 1024);
  const F = 0.026;
  const M = 0.03;
  const OW = W + M * 2 + F * 2;
  const OH = H + M * 2 + F * 2;
  const bars: Vec3[] = [
    [0, OH / 2 - F / 2, OW],
    [0, -OH / 2 + F / 2, OW],
  ];
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0.01, -0.015, 0.001]} scale={[OW * 1.25, OH * 1.3, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={dot} color="#000000" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      {bars.map(([x, y, len]) => (
        <RoundedBox key={y} args={[len, F, 0.022]} radius={0.003} position={[x, y, 0.011]} castShadow>
          <meshStandardMaterial color="#3e2718" roughness={0.5} />
        </RoundedBox>
      ))}
      {[-1, 1].map((sx) => (
        <RoundedBox key={sx} args={[F, OH - F * 2, 0.022]} radius={0.003} position={[(sx * (OW - F)) / 2, 0, 0.011]} castShadow>
          <meshStandardMaterial color="#3e2718" roughness={0.5} />
        </RoundedBox>
      ))}
      <mesh position={[0, 0, 0.004]}>
        <planeGeometry args={[OW - F * 2, OH - F * 2]} />
        <meshStandardMaterial color="#efe7d6" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial map={map} roughness={0.9} />
      </mesh>
      {/* Cristal: solo un reflejo leve del entorno */}
      <mesh position={[0, 0, 0.018]}>
        <planeGeometry args={[OW - F * 2, OH - F * 2]} />
        <meshStandardMaterial color="#000000" roughness={0.05} metalness={1} transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
  );
}
