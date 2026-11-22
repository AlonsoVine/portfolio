"use client";

import { useMemo } from "react";
import { Vector2 } from "three";
import { hdr, ICE } from "./palette";
import { drawNoise, drawPhone, drawTablet, type DeskCopy } from "./screens";
import { RoundedBox } from "./primitives";
import { Steam } from "./Steam";
import { useCanvasTexture } from "./useCanvasTexture";

type Placed = { position: [number, number, number]; rotation?: [number, number, number] };

const SCREEN = hdr("#ffffff", 1.08);
const GLASS = { color: "#05060a", roughness: 0.08, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 } as const;
const CLOCK_REFRESH_MS = 20_000;

export function Phone({ t, lang, position, rotation }: { t: DeskCopy; lang: string } & Placed) {
  const draw = useMemo(() => drawPhone(t, lang), [t, lang]);
  const map = useCanvasTexture(360, 800, draw, { refreshMs: CLOCK_REFRESH_MS });
  return (
    <group position={position} rotation={rotation}>
      {/* Soporte: base con tira LED y respaldo inclinado */}
      <RoundedBox args={[0.09, 0.022, 0.08]} radius={0.01} smoothness={4} position={[0, 0.011, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#121318" roughness={0.4} metalness={0.4} />
      </RoundedBox>
      <mesh position={[0, 0.0225, 0.028]}>
        <boxGeometry args={[0.07, 0.002, 0.004]} />
        <meshBasicMaterial color={hdr(ICE, 1.2)} toneMapped={false} />
      </mesh>
      <RoundedBox args={[0.06, 0.12, 0.008]} radius={0.004} position={[0, 0.07, -0.03]} rotation={[-0.32, 0, 0]} castShadow>
        <meshStandardMaterial color="#121318" roughness={0.4} metalness={0.4} />
      </RoundedBox>
      <RoundedBox args={[0.08, 0.012, 0.02]} radius={0.004} position={[0, 0.026, 0.012]}>
        <meshStandardMaterial color="#121318" roughness={0.4} metalness={0.4} />
      </RoundedBox>
      <group position={[0, 0.105, -0.012]} rotation={[-0.3, 0, 0]}>
        <RoundedBox args={[0.077, 0.165, 0.0085]} radius={0.0042} smoothness={4} castShadow>
          <meshStandardMaterial color="#2a2d36" roughness={0.25} metalness={0.85} />
        </RoundedBox>
        <mesh position={[0, 0, 0.0043]}>
          <planeGeometry args={[0.074, 0.162]} />
          <meshPhysicalMaterial {...GLASS} />
        </mesh>
        <mesh position={[0, 0, 0.0045]}>
          <planeGeometry args={[0.07, 0.155]} />
          <meshBasicMaterial map={map} color={SCREEN} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.071, 0.0047]}>
          <circleGeometry args={[0.0018, 16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      </group>
    </group>
  );
}

/** Tablet sobre su funda, con un borde levantado para que quede ligeramente inclinada hacia la silla. */
export function Tablet({ t, lang, position, rotation }: { t: DeskCopy; lang: string } & Placed) {
  const draw = useMemo(() => drawTablet(t, lang), [t, lang]);
  const map = useCanvasTexture(540, 800, draw, { refreshMs: CLOCK_REFRESH_MS });
  return (
    <group position={position} rotation={rotation}>
      <group rotation={[0.07, 0, 0]} position={[0, 0.008, 0]}>
        {/* Funda */}
        <RoundedBox args={[0.188, 0.012, 0.27]} radius={0.006} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial color="#1b1d26" roughness={0.85} />
        </RoundedBox>
        <RoundedBox args={[0.174, 0.007, 0.256]} radius={0.0035} smoothness={4} position={[0, 0.008, 0]} castShadow>
          <meshStandardMaterial color="#3a3d46" roughness={0.3} metalness={0.85} />
        </RoundedBox>
        <mesh position={[0, 0.0117, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.17, 0.252]} />
          <meshPhysicalMaterial {...GLASS} />
        </mesh>
        <mesh position={[0, 0.0119, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.158, 0.236]} />
          <meshBasicMaterial map={map} color={SCREEN} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}


/** Perfil de la taza para el torno: exterior, borde y paredes interiores. */
const MUG = (() => {
  const p: [number, number][] = [
    [0, 0],
    [0.036, 0],
    [0.039, 0.003],
    [0.042, 0.02],
    [0.046, 0.06],
    [0.0475, 0.084],
    [0.046, 0.087],
    [0.0435, 0.085],
    [0.042, 0.06],
    [0.038, 0.02],
    [0.034, 0.008],
    [0, 0.008],
  ];
  return p.map(([x, y]) => new Vector2(x, y));
})();

export function Coffee({ position, reduceMotion }: Placed & { reduceMotion: boolean }) {
  const noise = useCanvasTexture(128, 128, drawNoise, { tileX: 1, color: false });
  return (
    <group position={position}>
      {/* Posavasos de mandala */}
      <mesh position={[0, 0.003, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.062, 0.062, 0.006, 48]} />
        <meshStandardMaterial color="#9b3a55" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.0062, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.03, 0.055, 48]} />
        <meshStandardMaterial color="#d38b4a" roughness={0.6} />
      </mesh>
      <group position={[0, 0.006, 0]}>
        <mesh castShadow receiveShadow>
          <latheGeometry args={[MUG, 48]} />
          <meshStandardMaterial color="#8c7a2c" roughness={0.32} side={2} />
        </mesh>
        {/* Café con algo de crema y reflejo */}
        <mesh position={[0, 0.074, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.0428, 40]} />
          <meshStandardMaterial color="#140904" roughness={0.1} envMapIntensity={0.35} />
        </mesh>
        <mesh position={[0, 0.0742, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.033, 0.0428, 40]} />
          <meshStandardMaterial color="#5a3519" roughness={0.6} transparent opacity={0.55} />
        </mesh>
        <mesh position={[0.046, 0.045, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <torusGeometry args={[0.018, 0.0055, 12, 32, Math.PI]} />
          <meshStandardMaterial color="#8c7a2c" roughness={0.32} />
        </mesh>
      </group>
      {!reduceMotion && (
        <>
          <Steam position={[0.004, 0.075, 0]} height={0.2} width={0.055} noise={noise} />
          <Steam position={[-0.008, 0.075, 0.006]} height={0.15} width={0.045} seed={1} noise={noise} />
        </>
      )}
    </group>
  );
}
