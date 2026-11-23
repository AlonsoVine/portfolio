"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import { type Group, type InstancedMesh, Object3D } from "three";
import { useHoverable } from "./interact";
import { RoundedBox } from "./primitives";
import { WINDOW } from "./Room";
import { drawNightSky, drawSoftDot, drawTabby, type DeskCopy } from "./screens";
import { purr } from "./sfx";
import { useCanvasTexture } from "./useCanvasTexture";

const WALL = "#3a3640";
const FRAME = "#e6e1d6";
const OAK = "#8f6038";

// Cola: una cadena de esferas que rodea el cuerpo por delante; así la punta puede levantarse y ondear sola
const TAIL_N = 34;
const o = new Object3D();
function placeTail(mesh: InstancedMesh, time: number, love: number, idle: number) {
  for (let i = 0; i < TAIL_N; i += 1) {
    const u = i / (TAIL_N - 1);
    const a = Math.PI * (1.12 - 0.98 * u);
    const tip = Math.max(0, (u - 0.5) / 0.5);
    // Con cariño, la punta se alza en gancho y se mece despacio, como un gato a gusto
    const lift = love * tip * tip * 0.07;
    const sway = (love * 0.022 + idle * 0.004) * tip * Math.sin(time * (love ? 3.2 : 0.8) - u * 5);
    o.position.set(Math.cos(a) * (0.118 + sway), 0.016 + lift, Math.sin(a) * (0.1 + sway) + 0.005);
    o.scale.setScalar(0.0175 * (1 - u * 0.4));
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

/**
 * Gato atigrado tumbado en el alféizar, hecho un ovillo y con los ojos entornados: respira despacio y parpadea de
 * vez en cuando. Al acariciarlo ronronea, levanta la cabeza y cierra los ojos de gusto; cada tercera caricia
 * además levanta la punta de la cola y la mece con cariño.
 */
function Cat({ t, position, rotation, reduceMotion }: { t: DeskCopy; position: [number, number, number]; rotation?: [number, number, number]; reduceMotion: boolean }) {
  const fur = useCanvasTexture(256, 256, drawTabby);
  const body = useRef<Group>(null);
  const head = useRef<Group>(null);
  const ear = useRef<Group>(null);
  const eyes = useRef<(Group | null)[]>([]);
  const tail = useRef<InstancedMesh>(null);
  const petted = useRef(-10);
  const loved = useRef(-10);
  const pets = useRef(0);
  const hover = useHoverable(t.interact.cat, () => {
    const now = performance.now() / 1000;
    if (now - petted.current < 1.6) return;
    petted.current = now;
    pets.current += 1;
    if (pets.current % 3 === 0) loved.current = now;
    purr();
  });
  useLayoutEffect(() => {
    if (!tail.current) return;
    placeTail(tail.current, 0, 0, 0);
    tail.current.computeBoundingSphere();
  }, []);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const now = performance.now() / 1000;
    const s = now - petted.current;
    const pet = s < 1.8 ? Math.sin((Math.PI * s) / 1.8) : 0;
    const l = now - loved.current;
    const love = l < 3 ? Math.sin((Math.PI * l) / 3) : 0;
    if (body.current) body.current.scale.y = reduceMotion ? 1 : 1 + Math.sin(time * 1.6) * 0.025;
    if (head.current) head.current.rotation.x = 0.1 - pet * 0.25;
    if (ear.current) ear.current.rotation.z = s < 0.5 ? Math.sin(s * 40) * 0.25 * (1 - s / 0.5) : 0;
    // Ojos entornados; al acariciarlo los cierra de gusto y, de tanto en tanto, parpadea
    const blink = !reduceMotion && time % 5.3 < 0.16 ? 0.1 : 1;
    const open = Math.min(blink, 1 - pet * 0.88);
    for (const e of eyes.current) if (e) e.scale.y = open;
    if (tail.current && (!reduceMotion || love)) placeTail(tail.current, time, love, reduceMotion ? 0 : 1);
  });
  const coat = <meshStandardMaterial map={fur} roughness={0.95} />;
  const cream = <meshStandardMaterial color="#ecd6b6" roughness={0.95} />;
  return (
    <group position={position} rotation={rotation} {...hover}>
      <group ref={body}>
        {/* Lomo enroscado y cadera */}
        <mesh position={[0, 0.055, 0]} scale={[0.125, 0.062, 0.092]} castShadow>
          <sphereGeometry args={[1, 32, 20]} />
          {coat}
        </mesh>
        <mesh position={[-0.06, 0.06, -0.015]} scale={[0.065, 0.06, 0.07]} castShadow>
          <sphereGeometry args={[1, 24, 16]} />
          {coat}
        </mesh>
      </group>
      <instancedMesh ref={tail} args={[undefined, undefined, TAIL_N]} castShadow>
        <sphereGeometry args={[1, 12, 8]} />
        {coat}
      </instancedMesh>
      {/* Cabeza apoyada sobre las patas */}
      <group ref={head} position={[0.105, 0.062, 0.05]} rotation={[0.1, 0.35, 0]}>
        <mesh position={[0, 0.02, 0]} scale={[1.08, 0.9, 0.95]} castShadow>
          <sphereGeometry args={[0.05, 28, 20]} />
          {coat}
        </mesh>
        {/* Carrillos, barbilla y nariz */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.011, 0.006, 0.041]} scale={[1, 0.8, 0.8]}>
            <sphereGeometry args={[0.013, 14, 10]} />
            {cream}
          </mesh>
        ))}
        <mesh position={[0, -0.006, 0.036]} scale={[1, 0.7, 0.8]}>
          <sphereGeometry args={[0.012, 12, 8]} />
          {cream}
        </mesh>
        <mesh position={[0, 0.013, 0.051]} rotation={[0.4, 0, 0]} scale={[1.3, 0.8, 0.6]}>
          <sphereGeometry args={[0.0045, 8, 6]} />
          <meshStandardMaterial color="#b86a6a" roughness={0.6} />
        </mesh>
        {/* Ojos de color ámbar verdoso con la pupila en rendija y un brillo */}
        {[-1, 1].map((s, i) => (
          <group
            key={s}
            ref={(g) => {
              eyes.current[i] = g;
            }}
            position={[s * 0.019, 0.029, 0.042]}
            rotation={[-0.1, s * 0.38, -s * 0.18]}
          >
            <mesh scale={[1.3, 0.75, 0.45]}>
              <sphereGeometry args={[0.0095, 16, 12]} />
              <meshStandardMaterial color="#b9c43c" roughness={0.15} emissive="#4a5210" emissiveIntensity={0.6} />
            </mesh>
            <mesh position={[0, 0, 0.0035]} scale={[0.28, 0.68, 0.3]}>
              <sphereGeometry args={[0.0095, 10, 8]} />
              <meshBasicMaterial color="#0b0805" />
            </mesh>
            <mesh position={[0.003, 0.0028, 0.0045]}>
              <sphereGeometry args={[0.0013, 6, 4]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
        {[-1, 1].map((s) => (
          <group key={s} ref={s === 1 ? ear : undefined} position={[s * 0.029, 0.058, -0.004]} rotation={[-0.1, 0, -s * 0.38]}>
            <mesh rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.55]} castShadow>
              <coneGeometry args={[0.021, 0.04, 4]} />
              {coat}
            </mesh>
            <mesh position={[0, -0.003, 0.006]} rotation={[0, Math.PI / 4, 0]} scale={[0.6, 0.7, 0.3]}>
              <coneGeometry args={[0.021, 0.04, 4]} />
              <meshStandardMaterial color="#d99a8c" roughness={0.9} />
            </mesh>
          </group>
        ))}
      </group>
      {/* Patas delanteras recogidas bajo la cabeza */}
      <mesh position={[0.1, 0.014, 0.08]} rotation={[0, 0.9, Math.PI / 2]}>
        <capsuleGeometry args={[0.012, 0.045, 4, 10]} />
        {cream}
      </mesh>
    </group>
  );
}

/**
 * Ventana en la pared izquierda con fondo de muro: jambas, marco blanco de dos hojas, cristal y un alféizar de roble
 * donde duerme el gato. Detrás, la noche de la ciudad a cierta distancia, para que al mover la vista haya paralaje.
 */
export function Window({ t, reduceMotion }: { t: DeskCopy; reduceMotion: boolean }) {
  const sky = useCanvasTexture(1024, 768, drawNightSky);
  const dot = useCanvasTexture(128, 128, drawSoftDot);
  const { w: W, h: H, depth: D } = WINDOW;
  const P = 0.1;
  const F = 0.034;
  const glassZ = -D + 0.035;
  const bar = (args: [number, number, number], position: [number, number, number]) => (
    <RoundedBox args={args} radius={0.003} position={position} castShadow>
      <meshStandardMaterial color={FRAME} roughness={0.5} />
    </RoundedBox>
  );
  return (
    // Origen en el centro del hueco, sobre el plano del muro; z local hacia la habitación
    <group position={[-1.05, WINDOW.y, WINDOW.z]} rotation={[0, Math.PI / 2, 0]}>
      {/* Jambas y dintel: el grosor del muro */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * W) / 2, 0, -D / 2]} rotation={[0, -s * (Math.PI / 2), 0]} receiveShadow>
          <planeGeometry args={[D, H]} />
          <meshLambertMaterial color={WALL} />
        </mesh>
      ))}
      <mesh position={[0, H / 2, -D / 2]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshLambertMaterial color={WALL} />
      </mesh>

      {/* Alféizar de roble que vuela sobre la habitación, con su moldura debajo */}
      <RoundedBox args={[W + 0.09, 0.03, D + P]} radius={0.004} position={[0, -H / 2 - 0.015, (P - D) / 2]} castShadow receiveShadow>
        <meshStandardMaterial color={OAK} roughness={0.55} />
      </RoundedBox>
      <RoundedBox args={[W + 0.05, 0.035, 0.016]} radius={0.003} position={[0, -H / 2 - 0.048, 0.008]} castShadow>
        <meshStandardMaterial color={OAK} roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, -H / 2 - 0.08, 0.001]} scale={[W + 0.2, 0.1, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={dot} color="#000000" transparent opacity={0.45} depthWrite={false} />
      </mesh>

      {/* Marco de dos hojas con travesaño */}
      <group position={[0, 0, glassZ]}>
        {bar([W, F, 0.045], [0, H / 2 - F / 2, 0])}
        {bar([W, F, 0.045], [0, -H / 2 + F / 2, 0])}
        {bar([F, H, 0.045], [-W / 2 + F / 2, 0, 0])}
        {bar([F, H, 0.045], [W / 2 - F / 2, 0, 0])}
        {bar([F * 0.8, H, 0.04], [0, 0, 0])}
        {bar([W, F * 0.6, 0.03], [0, H * 0.18, 0])}
        {/* Manilla */}
        <RoundedBox args={[0.008, 0.05, 0.01]} radius={0.003} position={[F * 0.4 + 0.006, -0.02, 0.028]}>
          <meshStandardMaterial color="#c9c6be" roughness={0.25} metalness={0.9} />
        </RoundedBox>
        <mesh>
          <planeGeometry args={[W - F, H - F]} />
          <meshStandardMaterial color="#a9bce0" transparent opacity={0.07} roughness={0.05} depthWrite={false} />
        </mesh>
      </group>

      {/* La noche, lejos tras el cristal */}
      <mesh position={[0, 0.15, -D - 0.7]}>
        <planeGeometry args={[2.6, 1.95]} />
        <meshBasicMaterial map={sky} toneMapped={false} />
      </mesh>

      {/* En espejo: así mira hacia la silla, que en esta pared queda al otro lado */}
      <group position={[-0.12, -H / 2, -0.02]} scale={[-1, 1, 1]}>
        <Cat t={t} position={[0, 0, 0]} rotation={[0, 0.2, 0]} reduceMotion={reduceMotion} />
      </group>
    </group>
  );
}
