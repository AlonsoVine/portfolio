"use client";


import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, type Color, type MeshBasicMaterial, type PointLight, type Texture } from "three";
import { AMBER, hdr, ICE, MAGENTA, VIOLET } from "./palette";
import { drawFabric, drawMatEdge, drawNeonSign, drawPegboard, drawSoftDot, drawStrip, drawWood, type DeskCopy } from "./screens";
import { Dust, RoundedBox } from "./primitives";
import { useCanvasTexture } from "./useCanvasTexture";

export const WALL_Z = -0.6;

export function Desk() {
  const wood = useCanvasTexture(1024, 512, drawWood, { tileX: 2 });
  const peg = useCanvasTexture(512, 512, drawPegboard, { tileX: 10, tileY: 5 });
  const fabric = useCanvasTexture(256, 256, drawFabric, { tileX: 14, tileY: 5.2 });
  const edge = useCanvasTexture(1500, 560, drawMatEdge);

  return (
    <group>
      <RoundedBox args={[2.6, 0.045, 0.92]} radius={0.012} position={[0, -0.0225, -0.14]} receiveShadow>
        <meshStandardMaterial map={wood} bumpMap={wood} bumpScale={0.6} color="#c9a184" roughness={0.5} metalness={0} />
      </RoundedBox>
      <RoundedBox args={[1.5, 0.004, 0.56]} radius={0.002} smoothness={2} position={[-0.02, 0.002, 0.06]} receiveShadow>
        <meshStandardMaterial map={fabric} bumpMap={fabric} bumpScale={0.35} color="#45474e" roughness={0.95} />
      </RoundedBox>
      {/* Costura del borde */}
      <mesh position={[-0.02, 0.0041, 0.06]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 0.56]} />
        <meshStandardMaterial map={edge} transparent roughness={0.8} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.7, WALL_Z]} receiveShadow>
        <planeGeometry args={[4.2, 1.9]} />
        <meshStandardMaterial map={peg} bumpMap={peg} bumpScale={1.5} color="#8a8496" roughness={1} />
      </mesh>
    </group>
  );
}

function Wash({ position, scale, color, map, opacity }: { position: [number, number, number]; scale: [number, number]; color: string; map: Texture; opacity: number }) {
  return (
    <mesh position={position} scale={[scale[0], scale[1], 1]}>
      <planeGeometry />
      <meshBasicMaterial map={map} color={color} transparent opacity={opacity} blending={AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

/**
 * Iluminación ambiental de la pared: tira LED con el degradado frío → violeta → magenta → cálido,
 * barras verticales detrás de la ultrawide y el rótulo de neón con el nombre, como en el hero.
 */
export function Leds({ t, reduceMotion }: { t: DeskCopy; reduceMotion: boolean }) {
  const strip = useCanvasTexture(512, 4, drawStrip, { tileX: 1 });
  const dot = useCanvasTexture(128, 128, drawSoftDot);
  const signDraw = useMemo(() => drawNeonSign(t.firstName, t.lastName), [t]);
  const sign = useCanvasTexture(1024, 200, signDraw);
  const signMat = useRef<MeshBasicMaterial>(null);
  const stripMat = useRef<MeshBasicMaterial>(null);
  const lights = useRef<(PointLight | null)[]>([]);
  const base = useMemo(() => [1.4, 1.2, 0.9], []);
  const signColor = useMemo<Color>(() => hdr("#ffffff", 1.7), []);

  useFrame(({ clock }, delta) => {
    if (reduceMotion) return;
    const map = stripMat.current?.map;
    if (map) map.offset.x = (map.offset.x + delta * 0.03) % 1;
    const tt = clock.elapsedTime;
    // Zumbido del neón: parpadeo casi imperceptible y algún fallo esporádico
    const glitch = Math.sin(tt * 37) > 0.995 ? 0.55 : 1;
    if (signMat.current) signMat.current.color.copy(signColor).multiplyScalar((0.94 + Math.sin(tt * 2.3) * 0.04) * glitch);
    lights.current.forEach((l, i) => {
      if (l) l.intensity = base[i] * (0.9 + Math.sin(tt * 0.7 + i * 2) * 0.1);
    });
  });

  return (
    <group>
      {/* Tira LED horizontal tras los monitores */}
      <mesh position={[0, 0.035, WALL_Z + 0.02]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.006, 1.7, 4, 8]} />
        <meshBasicMaterial ref={stripMat} map={strip} color={hdr("#ffffff", 3)} toneMapped={false} />
      </mesh>
      {/* Barras verticales detrás de la ultrawide: izquierda fría, derecha cálida */}
      {(
        [
          [-0.34, ICE],
          [0.34, AMBER],
        ] as const
      ).map(([x, c]) => (
        <group key={x} position={[x, 0, -0.5]}>
          <mesh position={[0, 0.13, 0]}>
            <capsuleGeometry args={[0.011, 0.2, 4, 12]} />
            <meshBasicMaterial color={hdr(c, 4)} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.01, 0]}>
            <cylinderGeometry args={[0.022, 0.026, 0.02, 20]} />
            <meshStandardMaterial color="#16171c" roughness={0.4} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 0.66, WALL_Z + 0.012]}>
        <planeGeometry args={[0.6, 0.117]} />
        <meshBasicMaterial ref={signMat} map={sign} color={signColor} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Placa de metacrilato del rótulo */}
      <RoundedBox args={[0.64, 0.14, 0.006]} radius={0.003} position={[0, 0.66, WALL_Z + 0.006]}>
        <meshPhysicalMaterial color="#0c0d12" roughness={0.12} transparent opacity={0.35} />
      </RoundedBox>

      <Wash map={dot} position={[-0.75, 0.3, WALL_Z + 0.004]} scale={[1.5, 1.1]} color={ICE} opacity={0.26} />
      <Wash map={dot} position={[0.78, 0.3, WALL_Z + 0.004]} scale={[1.5, 1.1]} color={AMBER} opacity={0.24} />
      <Wash map={dot} position={[0, 0.12, WALL_Z + 0.005]} scale={[1.9, 0.5]} color={MAGENTA} opacity={0.2} />
      <Wash map={dot} position={[0, 0.66, WALL_Z + 0.003]} scale={[1.3, 0.5]} color={VIOLET} opacity={0.18} />

      <pointLight ref={(l) => void (lights.current[0] = l)} position={[-0.38, 0.16, -0.46]} color={ICE} intensity={base[0]} distance={1.6} decay={1.6} />
      <pointLight ref={(l) => void (lights.current[1] = l)} position={[0.38, 0.16, -0.46]} color={AMBER} intensity={base[1]} distance={1.6} decay={1.6} />
      <pointLight ref={(l) => void (lights.current[2] = l)} position={[0, 0.06, -0.5]} color={MAGENTA} intensity={base[2]} distance={1.1} decay={1.6} />

      {!reduceMotion && <Dust map={dot} />}
    </group>
  );
}
