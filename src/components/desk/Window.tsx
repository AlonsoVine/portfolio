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
const TAIL_N = 96;
const o = new Object3D();
function placeTail(mesh: InstancedMesh, time: number, love: number, idle: number) {
  for (let i = 0; i < TAIL_N; i += 1) {
    const u = i / (TAIL_N - 1);
    const a = Math.PI * (1.12 - 0.9 * u);
    const tip = Math.max(0, (u - 0.5) / 0.5);
    // Con cariño, la punta se alza en gancho y se mece despacio, como un gato a gusto
    const lift = love * tip * tip * 0.07;
    const sway = (love * 0.022 + idle * 0.004) * tip * Math.sin(time * (love ? 3.2 : 0.8) - u * 5);
    o.position.set(Math.cos(a) * (0.112 + sway), 0.017 + lift, Math.sin(a) * (0.096 + sway) + 0.004);
    o.scale.setScalar(0.019 * (1 - u * 0.3));
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

const GINGER = "#e08a45";
const CREAM = "#f6e6cc";
const INK = "#2b1c14";

/**
 * Gato naranja tumbado en el alféizar, en estilo de peluche: cabeza grande y redonda, mofletes, ojos grandes y
 * brillantes. Respira despacio y parpadea. Al acariciarlo ronronea, entorna los ojos de gusto (dos arquitos) y
 * levanta la cabeza; cada tercera caricia además alza la punta de la cola y la mece con cariño.
 */
function Cat({ t, position, rotation, reduceMotion }: { t: DeskCopy; position: [number, number, number]; rotation?: [number, number, number]; reduceMotion: boolean }) {
  const fur = useCanvasTexture(256, 256, drawTabby);
  const body = useRef<Group>(null);
  const head = useRef<Group>(null);
  const ear = useRef<Group>(null);
  const open = useRef<(Group | null)[]>([]);
  const shut = useRef<(Group | null)[]>([]);
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
    const pet = s < 2.2 ? Math.sin((Math.PI * s) / 2.2) : 0;
    const l = now - loved.current;
    const love = l < 3 ? Math.sin((Math.PI * l) / 3) : 0;
    if (body.current) body.current.scale.y = reduceMotion ? 1 : 1 + Math.sin(time * 1.6) * 0.025;
    if (head.current) head.current.rotation.x = -pet * 0.18;
    if (ear.current) ear.current.rotation.z = s < 0.5 ? Math.sin(s * 40) * 0.25 * (1 - s / 0.5) : 0;
    // Al acariciarlo cierra los ojos de gusto; si no, parpadea de vez en cuando
    const blink = !reduceMotion && time % 4.7 < 0.14;
    const happy = pet > 0.25;
    for (const e of open.current) if (e) e.visible = !happy && !blink;
    for (const e of shut.current) if (e) e.visible = happy || blink;
    if (tail.current && (!reduceMotion || love)) placeTail(tail.current, time, love, reduceMotion ? 0 : 1);
  });
  const coat = <meshStandardMaterial map={fur} color="#ffffff" roughness={0.9} />;
  const plain = <meshStandardMaterial color={GINGER} roughness={0.9} />;
  const cream = <meshStandardMaterial color={CREAM} roughness={0.9} />;
  const ink = <meshBasicMaterial color={INK} />;
  return (
    <group position={position} rotation={rotation} {...hover}>
      <group ref={body}>
        {/* Cuerpo de hogaza, cadera y pecho claro */}
        <mesh position={[-0.01, 0.052, 0]} scale={[0.115, 0.058, 0.085]} castShadow>
          <sphereGeometry args={[1, 32, 20]} />
          {coat}
        </mesh>
        <mesh position={[-0.065, 0.056, -0.012]} scale={[0.06, 0.055, 0.065]} castShadow>
          <sphereGeometry args={[1, 24, 16]} />
          {coat}
        </mesh>
        <mesh position={[0.07, 0.04, 0.035]} scale={[0.045, 0.04, 0.045]}>
          <sphereGeometry args={[1, 20, 14]} />
          {cream}
        </mesh>
      </group>
      <instancedMesh ref={tail} args={[undefined, undefined, TAIL_N]} castShadow>
        <sphereGeometry args={[1, 20, 14]} />
        {plain}
      </instancedMesh>
      {/* Patitas delanteras, asomando bajo la cabeza */}
      {[0, 1].map((i) => (
        <mesh key={i} position={[0.1 + i * 0.012, 0.012, 0.075 + i * 0.022]} rotation={[0, 0.6, 0]} scale={[1.5, 0.8, 1]}>
          <sphereGeometry args={[0.014, 14, 10]} />
          {cream}
        </mesh>
      ))}
      {/* Cabeza grande y redonda, de cara a la habitación */}
      <group ref={head} position={[0.09, 0.075, 0.045]} rotation={[0, 0.5, 0]}>
        <mesh scale={[1.12, 0.95, 0.95]} castShadow>
          <sphereGeometry args={[0.056, 32, 24]} />
          {plain}
        </mesh>
        {/* Mofletes y hocico claros */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.02, -0.02, 0.038]} scale={[1.2, 0.85, 0.8]}>
            <sphereGeometry args={[0.02, 16, 12]} />
            {cream}
          </mesh>
        ))}
        <mesh position={[0, -0.03, 0.04]} scale={[1.2, 0.7, 0.8]}>
          <sphereGeometry args={[0.016, 14, 10]} />
          {cream}
        </mesh>
        {/* Nariz rosa y boquita en «w» */}
        <mesh position={[0, -0.011, 0.056]} rotation={[0.3, 0, 0]} scale={[1.4, 0.9, 0.7]}>
          <sphereGeometry args={[0.0045, 10, 8]} />
          <meshStandardMaterial color="#f08a9a" roughness={0.5} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.005, -0.019, 0.055]} rotation={[0, 0, Math.PI + s * 0.3]}>
            <torusGeometry args={[0.005, 0.0011, 4, 10, Math.PI]} />
            {ink}
          </mesh>
        ))}
        {/* Ojos grandes y brillantes; al cerrarlos quedan dos arquitos de gusto */}
        {[-1, 1].map((s, i) => (
          <group key={s} position={[s * 0.024, 0.006, 0.046]} rotation={[0, s * 0.32, 0]}>
            <group
              ref={(g) => {
                open.current[i] = g;
              }}
            >
              <mesh scale={[1, 1.12, 0.5]}>
                <sphereGeometry args={[0.0105, 18, 14]} />
                <meshStandardMaterial color="#1c140f" roughness={0.1} />
              </mesh>
              <mesh position={[0.0035 * -s, 0.004, 0.005]}>
                <sphereGeometry args={[0.0032, 8, 6]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh position={[0.003 * s, -0.004, 0.005]}>
                <sphereGeometry args={[0.0015, 6, 4]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
            <group
              ref={(g) => {
                shut.current[i] = g;
              }}
              visible={false}
            >
              <mesh position={[0, -0.002, 0.002]}>
                <torusGeometry args={[0.008, 0.0016, 4, 12, Math.PI]} />
                {ink}
              </mesh>
            </group>
          </group>
        ))}
        {/* Bigotes finos */}
        {[-1, 1].flatMap((s) =>
          [-1, 1].map((k) => (
            <mesh key={`${s}${k}`} position={[s * 0.045, -0.018 + k * 0.004, 0.036]} rotation={[0, s * 0.35, Math.PI / 2 + s * k * 0.12]}>
              <cylinderGeometry args={[0.0005, 0.0005, 0.04, 4]} />
              <meshBasicMaterial color="#fff6e8" transparent opacity={0.8} />
            </mesh>
          )),
        )}
        {/* Orejas redondeadas con el interior rosa */}
        {[-1, 1].map((s) => (
          <group key={s} ref={s === 1 ? ear : undefined} position={[s * 0.034, 0.046, -0.006]} rotation={[-0.15, 0, -s * 0.36]}>
            <mesh scale={[1, 1, 0.6]} castShadow>
              <coneGeometry args={[0.024, 0.038, 16]} />
              {plain}
            </mesh>
            <mesh position={[0, -0.003, 0.005]} scale={[0.62, 0.7, 0.3]}>
              <coneGeometry args={[0.024, 0.038, 16]} />
              <meshStandardMaterial color="#f2a9b0" roughness={0.8} />
            </mesh>
          </group>
        ))}
      </group>
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

      {/* Al fondo del alféizar y en espejo: así mira hacia la silla */}
      <group position={[0.15, -H / 2, -0.02]} scale={[-1, 1, 1]}>
        <Cat t={t} position={[0, 0, 0]} rotation={[0, 0.2, 0]} reduceMotion={reduceMotion} />
      </group>
    </group>
  );
}
