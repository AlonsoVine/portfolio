"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { type InstancedMesh, type MeshBasicMaterial, Object3D } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { hdr, ICE, MINT, VIOLET } from "./palette";
import { drawLegends, drawStrip } from "./screens";
import { useCanvasTexture } from "./useCanvasTexture";

type Placed = { position: [number, number, number]; rotation?: [number, number, number] };

// Distribución TKL ISO-ES: anchos en unidades de tecla; 0.5/0.25 en la fila de funciones son huecos
const ROWS: { w: number; l: string }[][] = [
  "Esc:1 _:1 F1:1 F2:1 F3:1 F4:1 _:0.5 F5:1 F6:1 F7:1 F8:1 _:0.5 F9:1 F10:1 F11:1 F12:1",
  "º:1 1:1 2:1 3:1 4:1 5:1 6:1 7:1 8:1 9:1 0:1 ':1 ¡:1 ⌫:2",
  "⇥:1.5 Q:1 W:1 E:1 R:1 T:1 Y:1 U:1 I:1 O:1 P:1 `:1 +:1 ↵:1.5",
  "⇪:1.75 A:1 S:1 D:1 F:1 G:1 H:1 J:1 K:1 L:1 Ñ:1 ´:1 Ç:1.25",
  "⇧:1.25 <:1 Z:1 X:1 C:1 V:1 B:1 N:1 M:1 ,:1 .:1 -:1 ⇧:2.75",
  "Ctrl:1.25 ⊞:1.25 Alt:1.25 :6.25 AltGr:1.25 Fn:1.25 ☰:1.25 Ctrl:1.25",
].map((row) =>
  row.split(" ").map((k) => {
    const i = k.lastIndexOf(":");
    return { l: k.slice(0, i), w: Number(k.slice(i + 1)) };
  }),
);
const NAV: [number, number, string][] = [
  [0, 0, "Impr"], [1, 0, "Bloq"], [2, 0, "Pausa"],
  [0, 1.25, "Ins"], [1, 1.25, "Inicio"], [2, 1.25, "RePág"],
  [0, 2.25, "Supr"], [1, 2.25, "Fin"], [2, 2.25, "AvPág"],
  [1, 4.25, "↑"], [0, 5.25, "←"], [1, 5.25, "↓"], [2, 5.25, "→"],
];
const U = 0.0188;
const COLS = 18.5;
const DEPTH = 6.5;

type Key = { x: number; z: number; w: number; label: string };
const KEYS: Key[] = (() => {
  const keys: Key[] = [];
  ROWS.forEach((row, r) => {
    let x = 0;
    for (const k of row) {
      if (k.l !== "_") keys.push({ x: x + k.w / 2, z: r === 0 ? 0 : r + 0.25, w: k.w, label: k.l });
      x += k.w;
    }
  });
  NAV.forEach(([c, r, label]) => keys.push({ x: 15.5 + c + 0.5, z: r, w: 1, label }));
  return keys;
})();

const LEGEND_PX = 64;
const legendsDraw = drawLegends(KEYS, LEGEND_PX);

export function Keyboard({ position, rotation, reduceMotion }: Placed & { reduceMotion: boolean }) {
  const keysRef = useRef<InstancedMesh>(null);
  const glowMat = useRef<MeshBasicMaterial>(null);
  const legends = useCanvasTexture(COLS * LEGEND_PX, DEPTH * LEGEND_PX, legendsDraw);
  const glow = useCanvasTexture(512, 4, drawStrip, { tileX: 1 });
  const geometry = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 2, 0.18), []);
  const width = COLS * U;
  const depth = DEPTH * U;

  useLayoutEffect(() => {
    const mesh = keysRef.current;
    if (!mesh) return;
    const o = new Object3D();
    KEYS.forEach((k, i) => {
      o.position.set(k.x * U - width / 2, 0.026, k.z * U - depth / 2 + U / 2);
      o.scale.set(k.w * U - 0.0028, 0.01, U - 0.0028);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [width, depth]);

  useFrame((_, delta) => {
    const map = glowMat.current?.map;
    if (map && !reduceMotion) map.offset.x = (map.offset.x - delta * 0.06) % 1;
  });

  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[width + 0.018, 0.02, depth + 0.018]} radius={0.007} position={[0, 0.011, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#0d0e12" roughness={0.35} metalness={0.5} />
      </RoundedBox>
      {/* Retroiluminación que asoma entre las teclas, recorriendo el degradado */}
      <mesh position={[0, 0.0212, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial ref={glowMat} map={glow} color={hdr("#ffffff", 2.4)} toneMapped={false} />
      </mesh>
      <instancedMesh ref={keysRef} args={[geometry, undefined, KEYS.length]} castShadow>
        <meshStandardMaterial color="#121318" roughness={0.42} metalness={0.15} />
      </instancedMesh>
      <mesh position={[0, 0.0312, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial map={legends} color={hdr("#ffffff", 1.6)} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Reposamuñecas */}
      <RoundedBox args={[width, 0.016, 0.07]} radius={0.008} smoothness={4} position={[0, 0.008, depth / 2 + 0.055]} castShadow receiveShadow>
        <meshStandardMaterial color="#141419" roughness={0.95} />
      </RoundedBox>
      <pointLight position={[0, 0.05, 0]} color={VIOLET} intensity={0.25} distance={0.35} />
    </group>
  );
}

/**
 * Ratón vertical: cuerpo de huevo inclinado sobre una base con aleta para el meñique,
 * botones en la cara derecha, rueda arriba y un hueco para el pulgar a la izquierda.
 */
export function Mouse({ position, rotation }: Placed) {
  const soft = { color: "#2a2c33", roughness: 0.62, metalness: 0.08 } as const;
  const gloss = { color: "#34363e", roughness: 0.22, metalness: 0.35 } as const;
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0.004, 0.004, 0.002]} scale={[0.66, 1, 1]} castShadow receiveShadow>
        <cylinderGeometry args={[0.052, 0.054, 0.008, 40]} />
        <meshStandardMaterial {...soft} />
      </mesh>
      <group position={[0, 0.006, 0]} rotation={[0, 0, -0.42]}>
        <mesh position={[0, 0.036, 0]} scale={[0.6, 1, 1.3]} castShadow>
          <sphereGeometry args={[0.042, 40, 28]} />
          <meshStandardMaterial {...soft} />
        </mesh>
        {/* Botones: dos placas brillantes sobre la cara derecha */}
        {[0.016, -0.014].map((z, i) => (
          <mesh key={z} position={[0.019, 0.05, z]} rotation={[0, 0, -0.1]} scale={[0.25, 0.75, 0.55]}>
            <sphereGeometry args={[0.042, 32, 20]} />
            <meshStandardMaterial {...gloss} color={i === 0 ? "#3a3c45" : "#31333b"} />
          </mesh>
        ))}
        <mesh position={[0.012, 0.066, 0.002]} rotation={[0, 0, Math.PI / 2 - 0.1]}>
          <cylinderGeometry args={[0.007, 0.007, 0.006, 24]} />
          <meshStandardMaterial color="#3a3c44" roughness={0.6} />
        </mesh>
        <mesh position={[0.016, 0.066, 0.002]} rotation={[0, 0, Math.PI / 2 - 0.1]}>
          <torusGeometry args={[0.0072, 0.0006, 6, 24]} />
          <meshBasicMaterial color={hdr(ICE, 2)} toneMapped={false} />
        </mesh>
        {/* Hueco del pulgar y botones laterales */}
        <mesh position={[-0.024, 0.024, 0.002]} scale={[0.3, 0.32, 0.9]}>
          <sphereGeometry args={[0.04, 24, 16]} />
          <meshStandardMaterial color="#0e0f13" roughness={0.9} />
        </mesh>
        {[0.012, -0.004].map((z) => (
          <RoundedBox key={z} args={[0.004, 0.006, 0.012]} radius={0.0018} position={[-0.026, 0.04, z]}>
            <meshStandardMaterial {...gloss} />
          </RoundedBox>
        ))}
      </group>
    </group>
  );
}

const FACE = [
  { c: "#f4c430", p: [0.035, -0.018] },
  { c: "#2f7de1", p: [0.025, -0.008] },
  { c: "#e0333a", p: [0.045, -0.008] },
  { c: "#3fb54a", p: [0.035, 0.002] },
] as const;

/** Mando de Xbox: cuerpo, empuñaduras, gatillos, sticks, cruceta, botonera y el botón Xbox encendido. */
export function Controller({ position, rotation }: Placed) {
  const white = { color: "#eef0f3", roughness: 0.42, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.5 } as const;
  const dark = { color: "#1e2026", roughness: 0.55 } as const;
  return (
    <group position={position} rotation={rotation}>
      <group position={[0, 0.02, 0]}>
        <RoundedBox args={[0.12, 0.03, 0.062]} radius={0.014} smoothness={5} position={[0, 0, -0.006]} castShadow>
          <meshPhysicalMaterial {...white} />
        </RoundedBox>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * 0.047, -0.002, 0.028]} rotation={[Math.PI / 2, 0, s * 0.42]} castShadow>
              <capsuleGeometry args={[0.019, 0.04, 8, 20]} />
              <meshPhysicalMaterial {...white} />
            </mesh>
            {/* Gatillo y bumper */}
            <RoundedBox args={[0.03, 0.016, 0.014]} radius={0.006} position={[s * 0.042, 0.004, -0.04]} castShadow>
              <meshStandardMaterial {...dark} />
            </RoundedBox>
            <RoundedBox args={[0.036, 0.008, 0.01]} radius={0.003} position={[s * 0.04, 0.012, -0.036]}>
              <meshPhysicalMaterial {...white} />
            </RoundedBox>
          </group>
        ))}
        {(
          [
            [-0.036, -0.012],
            [0.017, 0.01],
          ] as const
        ).map(([x, z]) => (
          <group key={x} position={[x, 0.016, z]}>
            <mesh>
              <cylinderGeometry args={[0.008, 0.009, 0.01, 20]} />
              <meshStandardMaterial {...dark} />
            </mesh>
            <mesh position={[0, 0.006, 0]}>
              <cylinderGeometry args={[0.0115, 0.0115, 0.004, 28]} />
              <meshStandardMaterial {...dark} roughness={0.85} />
            </mesh>
          </group>
        ))}
        {/* Cruceta */}
        <group position={[-0.017, 0.0155, 0.01]}>
          <mesh>
            <cylinderGeometry args={[0.011, 0.011, 0.002, 24]} />
            <meshStandardMaterial color="#c9ccd2" roughness={0.3} metalness={0.6} />
          </mesh>
          {[0, Math.PI / 2].map((r) => (
            <RoundedBox key={r} args={[0.017, 0.004, 0.0055]} radius={0.0015} position={[0, 0.002, 0]} rotation={[0, r, 0]}>
              <meshStandardMaterial {...dark} />
            </RoundedBox>
          ))}
        </group>
        {FACE.map(({ c, p }) => (
          <mesh key={c} position={[p[0], 0.0155, p[1]]}>
            <sphereGeometry args={[0.0052, 16, 10]} />
            <meshPhysicalMaterial color="#1a1b20" roughness={0.1} clearcoat={1} emissive={c} emissiveIntensity={0.55} />
          </mesh>
        ))}
        {[-0.011, 0.011].map((x) => (
          <mesh key={x} position={[x, 0.0152, -0.012]}>
            <cylinderGeometry args={[0.0028, 0.0028, 0.002, 16]} />
            <meshStandardMaterial {...dark} />
          </mesh>
        ))}
        <mesh position={[0, 0.0152, -0.026]}>
          <cylinderGeometry args={[0.0075, 0.0075, 0.002, 28]} />
          <meshBasicMaterial color={hdr("#ffffff", 3)} toneMapped={false} />
        </mesh>
      </group>
      <pointLight position={[0, 0.05, -0.02]} color={MINT} intensity={0.04} distance={0.15} />
    </group>
  );
}
