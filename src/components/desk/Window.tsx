"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import { type BufferAttribute, type BufferGeometry, Float32BufferAttribute, type Group, type Mesh, Vector3 } from "three";
import { useHoverable } from "./interact";
import { RoundedBox } from "./primitives";
import { WINDOW } from "./Room";
import { drawNightSky, drawSoftDot, drawTabby, type DeskCopy } from "./screens";
import { purr } from "./sfx";
import { useCanvasTexture } from "./useCanvasTexture";

const WALL = "#3a3640";
const FRAME = "#e6e1d6";
const OAK = "#8f6038";

// Cola: un tubo continuo que se estrecha hasta una punta redonda y rodea el cuerpo por detrás y por delante.
// Se reconstruye cada fotograma (pocos vértices) para que pueda ondear sin verse a trozos.
const SEG = 72;
const RAD = 14;
const CENTERS = new Float32Array((SEG + 1) * 3);
const T = new Vector3();
const N = new Vector3();
const B = new Vector3();
const UP = new Vector3(0, 1, 0);

function initTail(geo: BufferGeometry) {
  const verts = (SEG + 1) * (RAD + 1);
  const uv = new Float32Array(verts * 2);
  const index: number[] = [];
  for (let i = 0; i <= SEG; i += 1)
    for (let j = 0; j <= RAD; j += 1) {
      const k = i * (RAD + 1) + j;
      // A lo largo, las rayas de la textura quedan como anillos; alrededor, se evita la tripa clara del lienzo
      uv[k * 2] = i / SEG;
      uv[k * 2 + 1] = 0.1 + 0.5 * (j / RAD);
      if (i < SEG && j < RAD) index.push(k, k + RAD + 1, k + 1, k + 1, k + RAD + 1, k + RAD + 2);
    }
  geo.setIndex(index);
  geo.setAttribute("position", new Float32BufferAttribute(verts * 3, 3));
  geo.setAttribute("normal", new Float32BufferAttribute(verts * 3, 3));
  geo.setAttribute("uv", new Float32BufferAttribute(uv, 2));
}

function placeTail(geo: BufferGeometry, time: number, love: number, idle: number) {
  for (let i = 0; i <= SEG; i += 1) {
    const u = i / SEG;
    const tip = Math.max(0, (u - 0.45) / 0.55);
    // Con cariño la punta se alza, se separa del cuerpo y se mece; solo oscila hacia atrás desde su sitio,
    // así nunca se acerca a la cara más que en reposo
    const wave = 0.5 - 0.5 * Math.cos(time * (love ? 3.2 : 0.8) - u * 4);
    const a = Math.PI * (1.3 - 0.88 * u + (love * 0.14 + idle * 0.02) * tip * wave);
    const out = love * tip * (0.012 + 0.006 * wave);
    CENTERS[i * 3] = Math.cos(a) * (0.112 + out);
    CENTERS[i * 3 + 1] = 0.017 + love * tip * tip * 0.045;
    CENTERS[i * 3 + 2] = Math.sin(a) * (0.098 + out) + 0.004;
  }
  const pos = geo.getAttribute("position") as BufferAttribute;
  const nor = geo.getAttribute("normal") as BufferAttribute;
  for (let i = 0; i <= SEG; i += 1) {
    const u = i / SEG;
    const i0 = Math.max(0, i - 1) * 3;
    const i1 = Math.min(SEG, i + 1) * 3;
    T.set(CENTERS[i1] - CENTERS[i0], CENTERS[i1 + 1] - CENTERS[i0 + 1], CENTERS[i1 + 2] - CENTERS[i0 + 2]).normalize();
    N.crossVectors(T, UP).normalize();
    B.crossVectors(N, T);
    const end = u > 0.92 ? Math.sqrt(Math.max(0, (1 - u) / 0.08)) : 1;
    const r = 0.018 * (1 - u * 0.35) * end;
    for (let j = 0; j <= RAD; j += 1) {
      const th = (j / RAD) * Math.PI * 2;
      const nx = Math.cos(th) * N.x + Math.sin(th) * B.x;
      const ny = Math.cos(th) * N.y + Math.sin(th) * B.y;
      const nz = Math.cos(th) * N.z + Math.sin(th) * B.z;
      const k = i * (RAD + 1) + j;
      pos.setXYZ(k, CENTERS[i * 3] + nx * r, CENTERS[i * 3 + 1] + ny * r, CENTERS[i * 3 + 2] + nz * r);
      nor.setXYZ(k, nx, ny, nz);
    }
  }
  pos.needsUpdate = true;
  nor.needsUpdate = true;
}

const LOOK = new Vector3();
const GINGER = "#e08a45";
const CREAM = "#f6e6cc";
const INK = "#2b1c14";

/**
 * Gato naranja tumbado en el alféizar, en estilo de peluche: cabeza grande y redonda, mofletes, ojos grandes y
 * brillantes. Respira despacio y parpadea. Al acariciarlo ronronea, entorna los ojos de gusto (dos arquitos) y
 * levanta la cabeza; cada tercera caricia además alza la punta de la cola y la mece con cariño.
 */
function Cat({ t, position, rotation, reduceMotion }: { t: DeskCopy; position: [number, number, number]; rotation?: [number, number, number]; reduceMotion: boolean }) {
  const fur = useCanvasTexture(512, 512, drawTabby);
  const body = useRef<Group>(null);
  const head = useRef<Group>(null);
  const ear = useRef<Group>(null);
  const open = useRef<(Group | null)[]>([]);
  const shut = useRef<(Group | null)[]>([]);
  const pupils = useRef<(Group | null)[]>([]);
  const tail = useRef<Mesh>(null);
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
    initTail(tail.current.geometry);
    placeTail(tail.current.geometry, 0, 0, 0);
    tail.current.geometry.computeBoundingSphere();
  }, []);
  useFrame(({ clock, camera }) => {
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
    // Las pupilas siguen a la cámara: el gato te mira mientras recorres la habitación
    for (const p of pupils.current) {
      if (!p?.parent) continue;
      p.parent.worldToLocal(LOOK.copy(camera.position)).normalize();
      p.position.set(LOOK.x * 0.0032, LOOK.y * 0.0032, 0);
    }
    if (tail.current && (!reduceMotion || love)) placeTail(tail.current.geometry, time, love, reduceMotion ? 0 : 1);
  });
  const coat = <meshStandardMaterial map={fur} bumpMap={fur} bumpScale={0.22} color="#ffffff" roughness={0.88} />;
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
      <mesh ref={tail} castShadow>
        <bufferGeometry />
        {coat}
      </mesh>
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
          {coat}
        </mesh>
        {/* Hocico como el de antes: dos almohadillas claras bajo la nariz y la barbilla */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.0125, -0.02, 0.046]} scale={[1, 0.8, 0.8]}>
            <sphereGeometry args={[0.0145, 16, 12]} />
            {cream}
          </mesh>
        ))}
        <mesh position={[0, -0.03, 0.041]} scale={[1, 0.7, 0.8]}>
          <sphereGeometry args={[0.0125, 14, 10]} />
          {cream}
        </mesh>
        <mesh position={[0, -0.0095, 0.0575]} rotation={[0.4, 0, 0]} scale={[1.35, 0.85, 0.6]}>
          <sphereGeometry args={[0.005, 10, 8]} />
          <meshStandardMaterial color="#e07f8c" roughness={0.5} />
        </mesh>
        {/* Ojos grandes: iris ámbar, pupila redonda que te sigue y dos brillos fijos; de gusto, dos arquitos */}
        {[-1, 1].map((s, i) => (
          <group key={s} position={[s * 0.024, 0.006, 0.046]} rotation={[0, s * 0.32, -s * 0.08]}>
            <group
              ref={(g) => {
                open.current[i] = g;
              }}
            >
              <mesh scale={[1, 1.12, 0.5]}>
                <sphereGeometry args={[0.0108, 20, 16]} />
                <meshStandardMaterial color="#d9a531" roughness={0.15} emissive="#6b4a0c" emissiveIntensity={0.5} />
              </mesh>
              <mesh position={[0, 0, 0.0052]} scale={[1, 1.1, 0.25]}>
                <sphereGeometry args={[0.0107, 20, 16]} />
                <meshBasicMaterial color="#3a250c" transparent opacity={0.35} />
              </mesh>
              <group
                ref={(g) => {
                  pupils.current[i] = g;
                }}
              >
                <mesh position={[0, 0, 0.0047]} scale={[1, 1.1, 0.3]}>
                  <sphereGeometry args={[0.0074, 18, 14]} />
                  <meshBasicMaterial color="#120b06" />
                </mesh>
              </group>
              <mesh position={[0.0038 * -s, 0.0045, 0.0062]}>
                <sphereGeometry args={[0.0031, 10, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh position={[0.003 * s, -0.0042, 0.0058]}>
                <sphereGeometry args={[0.0014, 8, 6]} />
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
