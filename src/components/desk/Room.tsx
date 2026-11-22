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
      <RoundedBox args={[2.1, 0.045, 0.92]} radius={0.012} position={[0, -0.0225, -0.14]} receiveShadow>
        <meshStandardMaterial map={wood} bumpMap={wood} bumpScale={0.15} color="#c9a184" roughness={0.5} metalness={0} />
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
        <meshLambertMaterial map={peg} bumpMap={peg} bumpScale={1.5} color="#8a8496" />
      </mesh>
      {/* Suelo: al mirar hacia abajo se intuye, en vez de un vacío negro */}
      <mesh position={[0, -0.75, 0.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.2, 2]} />
        <meshLambertMaterial color="#1a1716" />
      </mesh>
      {/* Paredes laterales: el escritorio está en un hueco, no flotando en el vacío */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.05, 0.6, 0.25]} rotation={[0, -s * (Math.PI / 2), 0]} receiveShadow>
          <planeGeometry args={[1.8, 1.9]} />
          <meshLambertMaterial color="#3a3640" />
        </mesh>
      ))}
    </group>
  );
}

function Wash({
  position,
  rotation,
  scale,
  color,
  map,
  opacity,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale: [number, number];
  color: string;
  map: Texture;
  opacity: number;
}) {
  return (
    <mesh position={position} rotation={rotation} scale={[scale[0], scale[1], 1]}>
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
  const base = useMemo(() => [1.4, 1.2, 2.4], []);
  const signColor = useMemo<Color>(() => hdr("#ffffff", 1.7), []);

  useFrame(({ clock }, delta) => {
    if (reduceMotion) return;
    const map = stripMat.current?.map;
    if (map) map.offset.x = (map.offset.x + delta * 0.03) % 1;
    const tt = clock.elapsedTime;
    // Zumbido del neón: parpadeo casi imperceptible y algún fallo esporádico
    // Fallo esporádico del neón: azar por tramos de 0,1 s, de media uno cada ~12 s
    const h = Math.sin(Math.floor(tt * 10) * 12.9898) * 43758.5453;
    const glitch = h - Math.floor(h) > 0.992 ? 0.6 : 1;
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
      <Wash map={dot} position={[-1.045, 0.35, -0.25]} rotation={[0, Math.PI / 2, 0]} scale={[1.7, 1.3]} color={ICE} opacity={0.42} />
      <Wash map={dot} position={[-1.045, 0.25, -0.45]} rotation={[0, Math.PI / 2, 0]} scale={[0.8, 0.7]} color={VIOLET} opacity={0.1} />
      <Wash map={dot} position={[1.045, 0.4, -0.3]} rotation={[0, -Math.PI / 2, 0]} scale={[1.4, 1.1]} color={AMBER} opacity={0.2} />
      <Wash map={dot} position={[1.046, 0.62, 0.12]} rotation={[0, -Math.PI / 2, 0]} scale={[1.1, 1.2]} color={AMBER} opacity={0.14} />

      <pointLight ref={(l) => void (lights.current[0] = l)} position={[-0.38, 0.16, -0.46]} color={ICE} intensity={base[0]} distance={1.6} decay={1.6} />
      <pointLight ref={(l) => void (lights.current[1] = l)} position={[0.38, 0.16, -0.46]} color={AMBER} intensity={base[1]} distance={1.6} decay={1.6} />
      <pointLight ref={(l) => void (lights.current[2] = l)} position={[0, 0.03, -0.5]} color={MAGENTA} intensity={base[2]} distance={1.1} decay={1.6} />

      {!reduceMotion && <Dust map={dot} />}
    </group>
  );
}
