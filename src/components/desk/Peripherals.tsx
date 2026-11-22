"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  type InstancedMesh,
  type MeshBasicMaterial,
  Object3D,
  SphereGeometry,
} from "three";
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
        <meshBasicMaterial ref={glowMat} map={glow} color={hdr("#ffffff", 1.1)} toneMapped={false} />
      </mesh>
      <instancedMesh ref={keysRef} args={[geometry, undefined, KEYS.length]} castShadow>
        <meshStandardMaterial color="#16171c" roughness={0.55} metalness={0.05} />
      </instancedMesh>
      <mesh position={[0, 0.0315, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial map={legends} color={hdr("#ffffff", 0.85)} transparent depthWrite={false} />
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

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// Medidas de un ratón diestro corriente: 12 × 6,2 × 4 cm
const MOUSE_SCALE: [number, number, number] = [0.031, 0.032, 0.06];
const MOUSE_LIFT = 0.0088;

/** Esfera unitaria esculpida: base plana, frontal estrecho, joroba trasera y cintura para el pulgar. */
function mouseShell() {
  const g = new SphereGeometry(1, 96, 64);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    const z = pos.getZ(i);
    y = y < 0 ? y * 0.15 : y * (0.8 + 0.25 * smooth(-0.6, 0.5, z));
    x *= 1 - 0.12 * Math.max(0, -z);
    x *= 1 - 0.08 * Math.exp(-(((z - 0.05) / 0.35) ** 2)) * smooth(-0.1, 0.4, y);
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

/** Los dos botones: el trozo frontal de la carcasa, separado por la ranura central y el hueco de la rueda. */
function mouseButtons(shell: SphereGeometry) {
  const flat = shell.toNonIndexed();
  const pos = flat.attributes.position;
  const nor = flat.attributes.normal;
  const keepP: number[] = [];
  const keepN: number[] = [];
  for (let t = 0; t < pos.count; t += 3) {
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let k = 0; k < 3; k += 1) {
      cx += pos.getX(t + k) / 3;
      cy += pos.getY(t + k) / 3;
      cz += pos.getZ(t + k) / 3;
    }
    const slot = Math.abs(cx) < 0.16 && cz > -0.62 && cz < -0.2;
    if (cy > 0.3 && cz < 0.12 && Math.abs(cx) > 0.035 && !slot) {
      for (let k = 0; k < 3; k += 1) {
        keepP.push(pos.getX(t + k), pos.getY(t + k), pos.getZ(t + k));
        keepN.push(nor.getX(t + k), nor.getY(t + k), nor.getZ(t + k));
      }
    }
  }
  flat.dispose();
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(keepP, 3));
  g.setAttribute("normal", new Float32BufferAttribute(keepN, 3));
  // Un pelo por encima de la carcasa: entre los dos asoma el cuerpo oscuro y se lee la junta
  g.scale(1.008, 1.012, 1.004);
  return g;
}

const SHELL = mouseShell();
const BUTTONS = mouseButtons(SHELL);
/** Altura de la carcasa en el eje central para una z unitaria (para asentar la rueda). */
const shellTop = (z: number) => Math.sqrt(1 - z * z) * (0.8 + 0.25 * smooth(-0.6, 0.5, z));

/** Ratón inalámbrico clásico: carcasa esculpida, botones partidos, rueda de goma en su hueco y patines. */
export function Mouse({ position, rotation }: Placed) {
  const wheelZ = -0.42;
  const wheelY = MOUSE_LIFT + shellTop(wheelZ) * MOUSE_SCALE[1] - 0.0018;
  return (
    <group position={position} rotation={rotation}>
      <group position={[0, MOUSE_LIFT, 0]} scale={MOUSE_SCALE}>
        {/* Cuerpo: plástico más mate y algo más oscuro que los botones */}
        <mesh geometry={SHELL} castShadow receiveShadow>
          <meshStandardMaterial color="#0e0f12" roughness={0.7} />
        </mesh>
        <mesh geometry={BUTTONS} castShadow>
          <meshStandardMaterial color="#3a3c45" roughness={0.36} metalness={0.1} />
        </mesh>
      </group>
      {/* Rueda: goma estriada sobre eje, con el hueco negro debajo */}
      <mesh position={[0, wheelY - 0.0012, wheelZ * MOUSE_SCALE[2]]}>
        <boxGeometry args={[0.0072, 0.004, 0.017]} />
        <meshStandardMaterial color="#050506" roughness={1} />
      </mesh>
      <mesh position={[0, wheelY, wheelZ * MOUSE_SCALE[2]]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.0056, 0.0056, 0.0048, 40]} />
        <meshStandardMaterial color="#2a2b31" roughness={0.9} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * 0.0026, wheelY, wheelZ * MOUSE_SCALE[2]]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.0049, 0.0049, 0.0006, 32]} />
          <meshStandardMaterial color="#6d717c" roughness={0.35} metalness={0.8} />
        </mesh>
      ))}
      {/* Botón de DPI tras la rueda, con su piloto tenue */}
      <RoundedBox args={[0.004, 0.0016, 0.007]} radius={0.0007} position={[0, wheelY + 0.0011, -0.0105]} rotation={[-0.12, 0, 0]}>
        <meshStandardMaterial color="#0d0e11" roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, wheelY + 0.0021, -0.0105]} rotation={[-Math.PI / 2 - 0.12, 0, 0]}>
        <circleGeometry args={[0.0007, 12]} />
        <meshBasicMaterial color={ICE} />
      </mesh>
      {/* Botones laterales para el pulgar */}
      {[-0.002, 0.016].map((z) => (
        <RoundedBox key={z} args={[0.002, 0.005, 0.015]} radius={0.0009} position={[-0.0285, 0.016, z]} rotation={[0, -0.08, 0.25]}>
          <meshStandardMaterial color="#26272e" roughness={0.4} />
        </RoundedBox>
      ))}
      {/* Patines de PTFE: el ratón apoya sobre ellos, no sobre la carcasa */}
      {[-0.045, 0.045].map((z) => (
        <RoundedBox key={z} args={[0.03, 0.0012, 0.006]} radius={0.0005} position={[0, 0.0046, z]}>
          <meshStandardMaterial color="#d8d6d0" roughness={0.3} />
        </RoundedBox>
      ))}
    </group>
  );
}
