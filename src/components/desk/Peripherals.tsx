"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { AdditiveBlending, CylinderGeometry, type InstancedMesh, type MeshBasicMaterial, Object3D } from "three";
import { hdr, ICE, VIOLET } from "./palette";
import { drawLegends, drawSoftDot, drawStrip } from "./screens";
import { RoundedBox } from "./primitives";
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
  const spill = useCanvasTexture(128, 128, drawSoftDot);
  // Tecla con perfil real: tronco de pirámide (base 1, cara superior 0.8) con caras planas
  const geometry = useMemo(() => {
    const g = new CylinderGeometry(0.8 / Math.SQRT2, 1 / Math.SQRT2, 1, 4, 1).rotateY(Math.PI / 4).toNonIndexed();
    g.computeVertexNormals();
    return g;
  }, []);
  const width = COLS * U;
  const depth = DEPTH * U;

  useLayoutEffect(() => {
    const mesh = keysRef.current;
    if (!mesh) return;
    const o = new Object3D();
    KEYS.forEach((k, i) => {
      o.position.set(k.x * U - width / 2, 0.026, k.z * U - depth / 2 + U / 2);
      o.scale.set(k.w * U - 0.0022, 0.0105, U - 0.0022);
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
      <RoundedBox args={[width + 0.018, 0.02, depth + 0.018]} radius={0.0035} position={[0, 0.011, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#0d0e12" roughness={0.35} metalness={0.5} />
      </RoundedBox>
      {/* Retroiluminación que asoma entre las teclas, recorriendo el degradado */}
      <mesh position={[0, 0.0212, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial ref={glowMat} map={glow} color={hdr("#ffffff", 2.4)} toneMapped={false} />
      </mesh>
      <instancedMesh ref={keysRef} args={[geometry, undefined, KEYS.length]} castShadow>
        <meshStandardMaterial color="#16171c" roughness={0.55} metalness={0.05} />
      </instancedMesh>
      <mesh position={[0, 0.0315, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial map={legends} color={hdr("#ffffff", 1.6)} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Reposamuñecas */}
      <RoundedBox args={[width, 0.016, 0.07]} radius={0.008} smoothness={4} position={[0, 0.008, depth / 2 + 0.055]} castShadow receiveShadow>
        <meshStandardMaterial color="#141419" roughness={0.95} />
      </RoundedBox>
      {/* Reflejo del RGB sobre el tapete alrededor del teclado */}
      <mesh position={[0, 0.0045, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 1.7, depth * 2.6]} />
        <meshBasicMaterial map={spill} color={VIOLET} transparent opacity={0.4} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight position={[0, 0.05, 0]} color={VIOLET} intensity={0.35} distance={0.4} />
    </group>
  );
}

/** Ratón clásico: carcasa ovalada con la joroba atrás, raya entre botones, rueda iluminada y halo LED en la base. */
export function Mouse({ position, rotation }: Placed) {
  const shell = { color: "#1d1e24", roughness: 0.5, metalness: 0.15, clearcoat: 0.4, clearcoatRoughness: 0.35 } as const;
  return (
    <group position={position} rotation={rotation}>
      <group rotation={[0.08, 0, 0]}>
        <mesh position={[0, 0.016, 0.004]} scale={[0.031, 0.02, 0.06]} castShadow receiveShadow>
          <sphereGeometry args={[1, 48, 32]} />
          <meshPhysicalMaterial {...shell} />
        </mesh>
        <mesh position={[0, 0.0352, -0.024]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.0058, 0.0058, 0.0055, 24]} />
          <meshStandardMaterial color="#2c2e36" roughness={0.75} />
        </mesh>
        <mesh position={[0, 0.0352, -0.024]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.0059, 0.0007, 6, 28]} />
          <meshBasicMaterial color={hdr(ICE, 2.4)} toneMapped={false} />
        </mesh>
        {/* Logo trasero y halo de la base */}
        <mesh position={[0, 0.03, 0.04]} rotation={[-1.05, 0, 0]}>
          <circleGeometry args={[0.0045, 20]} />
          <meshBasicMaterial color={hdr(VIOLET, 2.2)} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.0045, 0.004]} rotation={[Math.PI / 2, 0, 0]} scale={[0.0305, 0.0595, 0.03]}>
          <torusGeometry args={[1, 0.035, 6, 64]} />
          <meshBasicMaterial color={hdr(VIOLET, 2.6)} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
