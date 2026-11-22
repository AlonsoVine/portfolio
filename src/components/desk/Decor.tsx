"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { DoubleSide, type Group } from "three";
import { RoundedBox } from "./primitives";
import { drawCalendar, drawClockFace, drawRug, drawSoftDot } from "./screens";
import { useCanvasTexture } from "./useCanvasTexture";

type Vec3 = [number, number, number];

/** Alfombra de lana bajo la mesa, donde la vista alcanza el suelo: que mirar abajo no sea un vacío negro. */
export function Rug() {
  const map = useCanvasTexture(1024, 640, drawRug);
  return (
    <mesh position={[0.05, -0.7495, 0.12]} rotation={[-Math.PI / 2, 0, 0.03]} receiveShadow>
      <planeGeometry args={[1.85, 1.12]} />
      <meshStandardMaterial map={map} bumpMap={map} bumpScale={0.6} color="#76604e" roughness={1} alphaTest={0.4} />
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
// Lomos uno junto a otro desde el extremo izquierdo de la balda
const SHELVED = BOOKS.map((b, i) => ({ ...b, x: -0.215 + BOOKS.slice(0, i).reduce((acc, p) => acc + p.w + 0.002, 0) + b.w / 2 }));

/** Balda flotante de roble con libros, una pila tumbada con un jarrón y una cámara de carrete. */
export function Shelf({ position }: { position: Vec3 }) {
  const dot = useCanvasTexture(128, 128, drawSoftDot);
  return (
    <group position={position}>
      <RoundedBox args={[0.5, 0.024, 0.14]} radius={0.004} position={[0, 0, 0.07]} castShadow receiveShadow>
        <meshStandardMaterial color="#9b6b43" roughness={0.6} />
      </RoundedBox>
      {/* Sombra de la balda y sus objetos sobre la pared */}
      <mesh position={[0, -0.05, 0.002]} scale={[0.62, 0.16, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={dot} color="#000000" transparent opacity={0.55} depthWrite={false} />
      </mesh>

      {SHELVED.map((b) => (
        <group key={b.x} position={[b.x + (b.lean ? 0.03 : 0), 0.012, 0.075]} rotation={[0, 0, b.lean ?? 0]}>
          <RoundedBox args={[b.w, b.h, 0.105]} radius={0.002} position={[0, b.h / 2, 0]} castShadow>
            <meshStandardMaterial color={b.c} roughness={0.75} />
          </RoundedBox>
          {/* Bloque de páginas asomando por delante */}
          <mesh position={[0, b.h / 2, 0.0528]}>
            <planeGeometry args={[b.w * 0.55, b.h * 0.92]} />
            <meshStandardMaterial color="#d9d0bd" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Pila tumbada con un jarrón de cerámica encima */}
      <RoundedBox args={[0.13, 0.022, 0.095]} radius={0.002} position={[0.035, 0.023, 0.072]} rotation={[0, 0.08, 0]} castShadow>
        <meshStandardMaterial color="#a2482f" roughness={0.75} />
      </RoundedBox>
      <RoundedBox args={[0.12, 0.018, 0.09]} radius={0.002} position={[0.038, 0.043, 0.072]} rotation={[0, -0.05, 0]} castShadow>
        <meshStandardMaterial color="#e1d7c3" roughness={0.75} />
      </RoundedBox>
      <group position={[0.04, 0.052, 0.072]}>
        <mesh position={[0, 0.03, 0]} scale={[1, 1.25, 1]} castShadow>
          <sphereGeometry args={[0.026, 24, 16]} />
          <meshStandardMaterial color="#d6cbb8" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.067, 0]}>
          <cylinderGeometry args={[0.009, 0.012, 0.018, 20]} />
          <meshStandardMaterial color="#d6cbb8" roughness={0.55} />
        </mesh>
        {/* Espigas secas */}
        {[-0.25, 0.05, 0.3].map((a, i) => (
          <mesh key={a} position={[Math.sin(a) * 0.04, 0.11 + i * 0.006, 0]} rotation={[0, 0, -a]}>
            <cylinderGeometry args={[0.0008, 0.001, 0.09 + i * 0.012, 5]} />
            <meshStandardMaterial color="#c9ab7a" roughness={0.9} />
          </mesh>
        ))}
      </group>

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
export function WallClock({ position, radius = 0.085 }: { position: Vec3; radius?: number }) {
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
  const W = 0.2;
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
