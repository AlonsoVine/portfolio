"use client";


import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, type Color, type MeshBasicMaterial, type PointLight, type Texture } from "three";
import { AMBER, hdr, ICE, MAGENTA, VIOLET } from "./palette";
import { drawFabric, drawMatEdge, drawNeonSign, drawPegboard, drawSoftDot, drawStrip, drawUnderglow, drawWood, drawWoodRough, type DeskCopy } from "./screens";
import { Dust, RoundedBox } from "./primitives";
import { useCanvasTexture } from "./useCanvasTexture";

export const WALL_Z = -0.6;

export function Desk() {
  const wood = useCanvasTexture(1024, 512, drawWood, { tileX: 2 });
  const woodRough = useCanvasTexture(1024, 512, drawWoodRough, { tileX: 2, color: false });
  const peg = useCanvasTexture(512, 512, drawPegboard, { tileX: 10, tileY: 5 });
  const fabric = useCanvasTexture(512, 512, drawFabric, { tileX: 7, tileY: 2.6 });
  const edge = useCanvasTexture(750, 280, drawMatEdge);
  const dot = useCanvasTexture(128, 128, drawSoftDot);
  const shade = (o: number) => <meshBasicMaterial map={dot} color="#000000" transparent opacity={o} depthWrite={false} />;

  return (
    <group>
      <RoundedBox args={[2.1, 0.045, 0.92]} radius={0.012} position={[0, -0.0225, -0.14]} receiveShadow>
        <meshStandardMaterial map={wood} roughnessMap={woodRough} roughness={0.85} bumpMap={woodRough} bumpScale={-0.06} color="#d6b293" metalness={0} />
      </RoundedBox>
      <RoundedBox args={[1.5, 0.004, 0.53]} radius={0.0018} smoothness={3} position={[-0.02, 0.002, 0.045]} receiveShadow>
        <meshPhysicalMaterial map={fabric} color="#6e7078" roughness={1} sheen={0.45} sheenRoughness={0.8} sheenColor="#5a5f6a" />
      </RoundedBox>
      {/* Costura del borde */}
      <mesh position={[-0.02, 0.0041, 0.045]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 0.53]} />
        <meshStandardMaterial map={edge} transparent roughness={0.8} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.45, WALL_Z]} receiveShadow>
        <planeGeometry args={[4.2, 2.4]} />
        <meshLambertMaterial map={peg} bumpMap={peg} bumpScale={1.5} color="#8a8496" />
      </mesh>
      {/* Oclusión en las uniones: donde la mesa toca la pared y en las esquinas apenas llega luz */}
      <mesh position={[0, 0.0006, WALL_Z]} rotation={[-Math.PI / 2, 0, 0]} scale={[2.3, 0.2, 1]}>
        <planeGeometry />
        {shade(0.5)}
      </mesh>
      <mesh position={[0, 0, WALL_Z + 0.001]} scale={[2.3, 0.22, 1]}>
        <planeGeometry />
        {shade(0.45)}
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 1.05, 0.6, WALL_Z + 0.001]} scale={[0.36, 2.2, 1]}>
            <planeGeometry />
            {shade(0.4)}
          </mesh>
          <mesh position={[s * 1.049, 0.6, WALL_Z]} rotation={[0, -s * (Math.PI / 2), 0]} scale={[0.36, 2.2, 1]}>
            <planeGeometry />
            {shade(0.4)}
          </mesh>
        </group>
      ))}

      {/* Estructura: faldón bajo el canto y patas de acero hasta el suelo */}
      <RoundedBox args={[2.02, 0.06, 0.02]} radius={0.004} position={[0, -0.075, 0.27]}>
        <meshStandardMaterial color="#141417" roughness={0.5} metalness={0.6} />
      </RoundedBox>
      {[-0.97, 0.97].flatMap((x) =>
        [0.24, -0.5].map((z) => (
          <RoundedBox key={`${x}${z}`} args={[0.05, 0.705, 0.05]} radius={0.006} position={[x, -0.3975, z]}>
            <meshStandardMaterial color="#1b1c20" roughness={0.45} metalness={0.7} />
          </RoundedBox>
        )),
      )}

      {/* Suelo: al mirar hacia abajo se intuye, en vez de un vacío negro */}
      <mesh position={[0, -0.75, 0.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.2, 2]} />
        <meshLambertMaterial color="#2a2522" />
      </mesh>
      {/* Paredes laterales: el escritorio está en un hueco, no flotando en el vacío */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.05, 0.45, 0.25]} rotation={[0, -s * (Math.PI / 2), 0]} receiveShadow>
          <planeGeometry args={[1.8, 2.4]} />
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
  const dot = useCanvasTexture(256, 256, drawSoftDot);
  const under = useCanvasTexture(256, 4, drawUnderglow, { tileX: 1 });
  const signDraw = useMemo(() => drawNeonSign(t.firstName, t.lastName), [t]);
  const sign = useCanvasTexture(1024, 200, signDraw);
  const signMat = useRef<MeshBasicMaterial>(null);
  const stripMat = useRef<MeshBasicMaterial>(null);
  const lights = useRef<(PointLight | null)[]>([]);
  const base = useMemo(() => [1.4, 1.2, 0.25], []);
  const signColor = useMemo<Color>(() => hdr("#ffffff", 1.35), []);

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
      <mesh position={[0, 0.66, WALL_Z + 0.012]}>
        <planeGeometry args={[0.6, 0.117]} />
        <meshBasicMaterial ref={signMat} map={sign} color={signColor} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Placa de metacrilato del rótulo */}
      <RoundedBox args={[0.64, 0.14, 0.006]} radius={0.003} position={[0, 0.66, WALL_Z + 0.006]}>
        <meshPhysicalMaterial color="#0c0d12" roughness={0.12} transparent opacity={0.35} />
      </RoundedBox>

      {/* Luz bajo la mesa: tira oculta tras el canto delantero; solo se ve su reflejo en el suelo, de hielo a ámbar */}
      <mesh position={[0, -0.047, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.96, 0.008]} />
        <meshBasicMaterial map={under} color={hdr("#ffffff", 2.2)} toneMapped={false} />
      </mesh>
      {[
        [-0.62, ICE],
        [-0.22, "#a9c4ff"],
        [0.22, "#ffcf9e"],
        [0.62, AMBER],
      ].map(([x, c]) => (
        <Wash key={x as number} map={dot} position={[x as number, -0.748, 0.2]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.75, 0.55]} color={c as string} opacity={0.26} />
      ))}
      <Wash map={dot} position={[-0.75, 0.3, WALL_Z + 0.004]} scale={[1.5, 1.1]} color={ICE} opacity={0.16} />
      <Wash map={dot} position={[0.78, 0.3, WALL_Z + 0.004]} scale={[1.5, 1.1]} color={AMBER} opacity={0.15} />
      <Wash map={dot} position={[0, 0.12, WALL_Z + 0.005]} scale={[1.9, 0.5]} color={MAGENTA} opacity={0.06} />
      <Wash map={dot} position={[0, 0.66, WALL_Z + 0.003]} scale={[1.3, 0.5]} color={VIOLET} opacity={0.11} />
      <Wash map={dot} position={[-1.045, 0.35, -0.25]} rotation={[0, Math.PI / 2, 0]} scale={[1.7, 1.3]} color={ICE} opacity={0.42} />
      <Wash map={dot} position={[-1.045, 0.25, -0.45]} rotation={[0, Math.PI / 2, 0]} scale={[0.8, 0.7]} color={VIOLET} opacity={0.06} />
      <Wash map={dot} position={[1.045, 0.4, -0.3]} rotation={[0, -Math.PI / 2, 0]} scale={[1.4, 1.1]} color={AMBER} opacity={0.12} />
      <Wash map={dot} position={[1.046, 0.62, 0.12]} rotation={[0, -Math.PI / 2, 0]} scale={[1.1, 1.2]} color={AMBER} opacity={0.14} />

      <pointLight ref={(l) => void (lights.current[0] = l)} position={[-0.38, 0.16, -0.46]} color={ICE} intensity={base[0]} distance={1.6} decay={1.6} />
      <pointLight ref={(l) => void (lights.current[1] = l)} position={[0.38, 0.16, -0.46]} color={AMBER} intensity={base[1]} distance={1.6} decay={1.6} />
      <pointLight ref={(l) => void (lights.current[2] = l)} position={[0, 0.1, -0.5]} color={MAGENTA} intensity={base[2]} distance={0.6} decay={1.6} />

      {!reduceMotion && <Dust map={dot} count={30} />}
    </group>
  );
}
