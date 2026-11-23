"use client";


import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, type Color, type MeshBasicMaterial, Path, type PointLight, Shape, ShapeGeometry } from "three";
import { AMBER, hdr, ICE, MAGENTA, VIOLET } from "./palette";
import { drawEdgeFalloff, drawFabric, drawFloorFalloff, drawMatEdge, drawNeonSign, drawPegboard, drawSoftDot, drawStrip, drawUnderglow, drawWood, drawWoodRough, type DeskCopy } from "./screens";
import { Dust, RoundedBox, SoftPlanes, type SoftPlane } from "./primitives";
import { useCanvasTexture } from "./useCanvasTexture";
import { useHoverable } from "./interact";
import { zap } from "./sfx";

export const WALL_Z = -0.6;
/** Hueco de la ventana en la pared derecha (x = 1,05): centro en z e y, ancho, alto y grosor del muro. */
export const WINDOW = { z: -0.07, y: 0.5, w: 0.62, h: 0.56, depth: 0.16 };

// Pared derecha con el hueco de la ventana recortado; en coordenadas del plano, x local es la z del mundo
const RIGHT_WALL = (() => {
  const s = new Shape();
  s.moveTo(-0.9, -1.2);
  s.lineTo(0.9, -1.2);
  s.lineTo(0.9, 1.2);
  s.lineTo(-0.9, 1.2);
  s.closePath();
  const x = WINDOW.z - 0.25;
  const y = WINDOW.y - 0.45;
  const hole = new Path();
  hole.moveTo(x - WINDOW.w / 2, y - WINDOW.h / 2);
  hole.lineTo(x - WINDOW.w / 2, y + WINDOW.h / 2);
  hole.lineTo(x + WINDOW.w / 2, y + WINDOW.h / 2);
  hole.lineTo(x + WINDOW.w / 2, y - WINDOW.h / 2);
  hole.closePath();
  s.holes.push(hole);
  return new ShapeGeometry(s);
})();

export function Desk() {
  const wood = useCanvasTexture(1024, 512, drawWood, { tileX: 2 });
  const woodRough = useCanvasTexture(1024, 512, drawWoodRough, { tileX: 2, color: false });
  const peg = useCanvasTexture(512, 512, drawPegboard, { tileX: 5, tileY: 5 });
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
      {/* Justo de pared a pared: si sobresale, se vería por la ventana */}
      <mesh position={[0, 0.45, WALL_Z]} receiveShadow>
        <planeGeometry args={[2.1, 2.4]} />
        <meshStandardMaterial map={peg} bumpMap={peg} bumpScale={0.4} color="#9a95a3" roughness={0.9} />
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
      <mesh position={[-1.05, 0.45, 0.25]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[1.8, 2.4]} />
        <meshLambertMaterial color="#3a3640" />
      </mesh>
      <mesh geometry={RIGHT_WALL} position={[1.05, 0.45, 0.25]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <meshLambertMaterial color="#3a3640" />
      </mesh>
    </group>
  );
}

const LEFT: SoftPlane["r"] = [0, Math.PI / 2, 0];
const RIGHT: SoftPlane["r"] = [0, -Math.PI / 2, 0];
/** Halos que las tiras LED dejan en suelo y paredes: todos en una sola malla aditiva. */
const WASHES: SoftPlane[] = [
  { p: [-0.75, 0.16, WALL_Z + 0.004], s: [1.4, 0.8], c: ICE, o: 0.2 },
  { p: [0.78, 0.16, WALL_Z + 0.004], s: [1.4, 0.8], c: AMBER, o: 0.18 },
  { p: [0, 0.12, WALL_Z + 0.005], s: [1.9, 0.5], c: MAGENTA, o: 0.035 },
  { p: [0, 0.66, WALL_Z + 0.003], s: [1.3, 0.5], c: VIOLET, o: 0.15 },
  { p: [-1.045, 0.22, -0.42], r: LEFT, s: [1.0, 0.9], c: ICE, o: 0.3 },
  { p: [-1.045, 0.4, -0.15], r: LEFT, s: [1.9, 1.5], c: ICE, o: 0.16 },
  { p: [-1.045, 0.25, -0.45], r: LEFT, s: [0.8, 0.7], c: VIOLET, o: 0.06 },
  { p: [1.045, 0.4, -0.3], r: RIGHT, s: [1.4, 1.1], c: AMBER, o: 0.12 },
  { p: [1.046, 0.62, 0.12], r: RIGHT, s: [1.1, 1.2], c: AMBER, o: 0.1 },
];

/**
 * Iluminación ambiental de la pared: tira LED con el degradado frío → violeta → magenta → cálido,
 * barras verticales detrás de la ultrawide y el rótulo de neón con el nombre, como en el hero.
 */
const FLICKER_S = 1.1;

export function Leds({ t, reduceMotion }: { t: DeskCopy; reduceMotion: boolean }) {
  const knock = useRef(-10);
  const hover = useHoverable(t.interact.neon, () => {
    knock.current = performance.now() / 1000;
    zap();
  });
  const strip = useCanvasTexture(512, 4, drawStrip, { tileX: 1 });
  const dot = useCanvasTexture(256, 256, drawSoftDot);
  // Dos ciclos hielo/ámbar a lo largo de la mesa que fluyen como la retroiluminación del teclado
  const under = useCanvasTexture(256, 4, drawUnderglow, { tileX: 2 });
  const falloff = useCanvasTexture(128, 64, drawFloorFalloff, { color: false });
  const edgeFade = useCanvasTexture(128, 32, drawEdgeFalloff, { color: false });
  const signDraw = useMemo(() => drawNeonSign(t.firstName, t.lastName), [t]);
  const sign = useCanvasTexture(1024, 320, signDraw);
  const signMat = useRef<MeshBasicMaterial>(null);
  const stripMat = useRef<MeshBasicMaterial>(null);
  const underMat = useRef<MeshBasicMaterial>(null);
  const lights = useRef<(PointLight | null)[]>([]);
  const base = useMemo(() => [1.4, 1.2], []);
  const signColor = useMemo<Color>(() => hdr("#ffffff", 1.35), []);

  useFrame(({ clock }, delta) => {
    if (reduceMotion) return;
    const map = stripMat.current?.map;
    if (map) map.offset.x = (map.offset.x + delta * 0.03) % 1;
    const flow = underMat.current?.map;
    if (flow) flow.offset.x = (flow.offset.x - delta * 0.05) % 1;
    const tt = clock.elapsedTime;
    // Zumbido del neón: parpadeo casi imperceptible y algún fallo esporádico
    // Fallo esporádico del neón: azar por tramos de 0,1 s, de media uno cada ~12 s
    const h = Math.sin(Math.floor(tt * 10) * 12.9898) * 43758.5453;
    let glitch = h - Math.floor(h) > 0.992 ? 0.6 : 1;
    // Tras el golpecito el tubo falla unos instantes y vuelve a prender
    const since = performance.now() / 1000 - knock.current;
    if (since < FLICKER_S) {
      const r = Math.sin(Math.floor(since * 16) * 78.233) * 43758.5453;
      glitch = since > FLICKER_S * 0.8 || r - Math.floor(r) > 0.5 ? 1 : 0.08;
    }
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
      <mesh position={[0, 0.66, WALL_Z + 0.012]} {...hover}>
        <planeGeometry args={[0.72, 0.225]} />
        <meshBasicMaterial ref={signMat} map={sign} color={signColor} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Rótulo montado directo en la pared con cuatro separadores metálicos, sin placa */}
      {[-0.27, 0.27].flatMap((x) =>
        [-0.04, 0.04].map((y) => (
          <mesh key={`${x}${y}`} position={[x, 0.66 + y, WALL_Z + 0.006]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0035, 0.0035, 0.012, 10]} />
            <meshStandardMaterial color="#9a9aa0" roughness={0.3} metalness={0.9} />
          </mesh>
        )),
      )}

      {/* Luz bajo la mesa: tira pegada al borde inferior del faldón, visible bajo el canto, que tiñe el faldón y el suelo */}
      <mesh position={[0, -0.1035, 0.2815]} rotation={[-0.5, 0, 0]}>
        <planeGeometry args={[1.98, 0.005]} />
        <meshBasicMaterial ref={underMat} map={under} color={hdr("#ffffff", 4)} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.077, 0.2808]}>
        <planeGeometry args={[2.0, 0.056]} />
        <meshBasicMaterial map={under} alphaMap={edgeFade} transparent opacity={0.6} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.7475, 0.18]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.1, 0.95]} />
        <meshBasicMaterial map={under} alphaMap={falloff} transparent opacity={0.17} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <SoftPlanes map={dot} items={WASHES} additive />

      <pointLight ref={(l) => void (lights.current[0] = l)} position={[-0.38, 0.16, -0.46]} color={ICE} intensity={base[0]} distance={1.6} decay={1.6} />
      <pointLight ref={(l) => void (lights.current[1] = l)} position={[0.38, 0.16, -0.46]} color={AMBER} intensity={base[1]} distance={1.6} decay={1.6} />

      {!reduceMotion && <Dust map={dot} count={30} />}
    </group>
  );
}
