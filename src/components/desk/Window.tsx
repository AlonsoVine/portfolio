"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { useHoverable } from "./interact";
import { RoundedBox } from "./primitives";
import { WINDOW } from "./Room";
import { drawNightSky, drawSoftDot, drawTabby, type DeskCopy } from "./screens";
import { purr } from "./sfx";
import { useCanvasTexture } from "./useCanvasTexture";

const WALL = "#3a3640";
const FRAME = "#e6e1d6";
const OAK = "#8f6038";

/**
 * Gato atigrado durmiendo hecho un ovillo: respira despacio. Al acariciarlo ronronea, levanta un poco
 * la cabeza, gira una oreja y mueve la punta de la cola.
 */
function Cat({ t, position, rotation, reduceMotion }: { t: DeskCopy; position: [number, number, number]; rotation?: [number, number, number]; reduceMotion: boolean }) {
  const fur = useCanvasTexture(256, 256, drawTabby);
  const body = useRef<Group>(null);
  const head = useRef<Group>(null);
  const ear = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const petted = useRef(-10);
  const hover = useHoverable(t.interact.cat, () => {
    if (performance.now() / 1000 - petted.current < 1.6) return;
    petted.current = performance.now() / 1000;
    purr();
  });
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const s = performance.now() / 1000 - petted.current;
    const pet = s < 1.8 ? Math.sin((Math.PI * s) / 1.8) : 0;
    if (body.current) body.current.scale.y = reduceMotion ? 1 : 1 + Math.sin(time * 1.6) * 0.025;
    if (head.current) head.current.rotation.x = -pet * 0.25;
    if (ear.current) ear.current.rotation.z = s < 0.5 ? Math.sin(s * 40) * 0.25 * (1 - s / 0.5) : 0;
    if (tail.current) tail.current.rotation.y = reduceMotion ? 0 : Math.sin(time * 0.7) * 0.04 + pet * Math.sin(s * 9) * 0.12;
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
      {/* Cola que rodea el cuerpo por delante hasta tapar el hocico */}
      <group ref={tail} position={[0, 0.018, 0]}>
        <mesh rotation={[Math.PI / 2, 0, -0.5]} scale={[1, 1.15, 1]} castShadow>
          <torusGeometry args={[0.11, 0.016, 10, 40, Math.PI * 0.95]} />
          {coat}
        </mesh>
      </group>
      {/* Cabeza apoyada sobre las patas, con los ojos cerrados */}
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
        {/* Ojos cerrados: dos rayitas curvas */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.02, 0.027, 0.041]} rotation={[0.35, s * 0.45, Math.PI + s * 0.15]}>
            <torusGeometry args={[0.008, 0.0013, 4, 10, Math.PI * 0.8]} />
            <meshBasicMaterial color="#2a1a10" />
          </mesh>
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
 * Ventana en la pared derecha con fondo de muro: jambas, marco blanco de dos hojas, cristal y un alféizar de roble
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
    <group position={[1.05, WINDOW.y, WINDOW.z]} rotation={[0, -Math.PI / 2, 0]}>
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

      <Cat t={t} position={[0.12, -H / 2, -0.02]} rotation={[0, 0.2, 0]} reduceMotion={reduceMotion} />
    </group>
  );
}
