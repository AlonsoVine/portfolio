"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackSide, DoubleSide, type Mesh, type MeshBasicMaterial, type Object3D, type Texture } from "three";
import {
  drawCv,
  drawGames,
  drawPhone,
  drawProjects,
  drawRgb,
  drawSteam,
  drawTablet,
  screenTexture,
  type ScreenCopy,
} from "./screens";

type Vec3 = [number, number, number];
type Placed = { position: Vec3; rotation?: Vec3 };

const PLASTIC = { roughness: 0.55, metalness: 0.05 };

function useDispose(tex: Texture) {
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

function Glass({ map, w, h, z = 0.002 }: { map: Texture; w: number; h: number; z?: number }) {
  return (
    <mesh position={[0, 0, z]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}

export function Desk() {
  return (
    <group>
      <mesh position={[0, -0.025, -0.13]} receiveShadow>
        <boxGeometry args={[2.6, 0.05, 0.9]} />
        <meshStandardMaterial color="#5a3d2b" roughness={0.7} />
      </mesh>
      {/* Alfombrilla de chuletas */}
      <RoundedBox args={[1.45, 0.004, 0.5]} radius={0.002} position={[0, 0.002, 0.06]} receiveShadow>
        <meshStandardMaterial color="#15161c" roughness={0.95} />
      </RoundedBox>
      <mesh position={[0, 0.6, -0.62]} receiveShadow>
        <planeGeometry args={[4, 1.8]} />
        <meshStandardMaterial color="#1d1a22" roughness={1} />
      </mesh>
    </group>
  );
}

const UW = { w: 0.8, h: 0.34, r: 1.1 };

export function Ultrawide({ copy, position }: { copy: ScreenCopy } & Placed) {
  const map = useDispose(useMemo(() => screenTexture(2048, 870, drawCv(copy), true), [copy]));
  const theta = UW.w / UW.r;
  const start = Math.PI - theta / 2;
  return (
    <group position={position}>
      {/* El cilindro se centra en su eje: la pantalla queda a UW.r por delante */}
      <group position={[0, 0.3, UW.r]}>
        <mesh>
          <cylinderGeometry args={[UW.r, UW.r, UW.h, 64, 1, true, start, theta]} />
          <meshBasicMaterial map={map} side={BackSide} toneMapped={false} />
        </mesh>
        <mesh castShadow>
          <cylinderGeometry args={[UW.r + 0.012, UW.r + 0.012, UW.h + 0.024, 64, 1, true, start - 0.012, theta + 0.024]} />
          <meshStandardMaterial color="#121317" side={DoubleSide} {...PLASTIC} />
        </mesh>
      </group>
      <RoundedBox args={[0.06, 0.2, 0.04]} radius={0.015} position={[0, 0.1, -0.06]} castShadow>
        <meshStandardMaterial color="#1b1c21" {...PLASTIC} />
      </RoundedBox>
      <RoundedBox args={[0.34, 0.02, 0.2]} radius={0.008} position={[0, 0.01, -0.05]} castShadow>
        <meshStandardMaterial color="#1b1c21" {...PLASTIC} />
      </RoundedBox>
      <mesh position={[0, 0.2, -0.081]}>
        <boxGeometry args={[0.02, 0.06, 0.005]} />
        <meshStandardMaterial color="#c2272d" emissive="#c2272d" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

/** Barras LED detrás de la ultrawide: el contraluz rojo/rosa de las fotos. */
export function BackLeds() {
  return (
    <group>
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.11, -0.47]}>
          <capsuleGeometry args={[0.012, 0.18, 4, 12]} />
          <meshBasicMaterial color="#ff4b5c" toneMapped={false} />
        </mesh>
      ))}
      <pointLight position={[0, 0.15, -0.5]} color="#ff3d5e" intensity={1.6} distance={1.4} decay={1.4} />
      <pointLight position={[-0.45, 0.1, -0.45]} color="#ff40c8" intensity={0.9} distance={1} decay={1.4} />
    </group>
  );
}

export function Laptop({ copy, position, rotation }: { copy: ScreenCopy } & Placed) {
  const map = useDispose(useMemo(() => screenTexture(1024, 640, drawGames(copy)), [copy]));
  return (
    <group position={position} rotation={rotation}>
      {/* Soporte de aluminio */}
      <mesh position={[0, 0.05, 0.02]} rotation={[0.35, 0, 0]} castShadow>
        <boxGeometry args={[0.22, 0.008, 0.24]} />
        <meshStandardMaterial color="#b9bcc4" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.03, -0.06]} castShadow>
        <boxGeometry args={[0.18, 0.06, 0.01]} />
        <meshStandardMaterial color="#9ea1a8" metalness={0.7} roughness={0.35} />
      </mesh>
      <group position={[0, 0.06, 0.02]} rotation={[0.35, 0, 0]}>
        <RoundedBox args={[0.32, 0.014, 0.22]} radius={0.005} position={[0, 0.011, 0]} castShadow>
          <meshStandardMaterial color="#1f2433" {...PLASTIC} />
        </RoundedBox>
        <mesh position={[0, 0.019, -0.015]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.28, 0.1]} />
          <meshStandardMaterial color="#0c0e14" roughness={0.8} />
        </mesh>
        {/* Bisagra en el borde trasero; la pantalla se abre ~105° */}
        <group position={[0, 0.018, -0.11]} rotation={[-0.25, 0, 0]}>
          <group position={[0, 0.1, 0]}>
            <RoundedBox args={[0.32, 0.205, 0.008]} radius={0.004} castShadow>
              <meshStandardMaterial color="#1f2433" {...PLASTIC} />
            </RoundedBox>
            <Glass map={map} w={0.3} h={0.185} z={0.0045} />
          </group>
        </group>
      </group>
      <pointLight position={[0, 0.25, 0.15]} color="#c08bff" intensity={0.35} distance={0.6} />
    </group>
  );
}

export function SideMonitor({ copy, position, rotation }: { copy: ScreenCopy } & Placed) {
  const map = useDispose(useMemo(() => screenTexture(1024, 580, drawProjects(copy)), [copy]));
  // El objetivo del foco tiene que estar en la escena para que su posición cuente
  const [lampTarget, setLampTarget] = useState<Object3D | null>(null);
  return (
    <group position={position} rotation={rotation}>
      <group position={[0, 0.27, 0]}>
        <RoundedBox args={[0.55, 0.32, 0.02]} radius={0.006} castShadow>
          <meshStandardMaterial color="#d9dadf" {...PLASTIC} />
        </RoundedBox>
        <mesh position={[0, -0.155, 0.0105]}>
          <planeGeometry args={[0.55, 0.012]} />
          <meshStandardMaterial color="#e9eaee" {...PLASTIC} />
        </mesh>
        <Glass map={map} w={0.53} h={0.29} z={0.011} />
        {/* Lámpara de monitor */}
        <group position={[0, 0.175, 0.01]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <capsuleGeometry args={[0.009, 0.42, 4, 12]} />
            <meshStandardMaterial color="#202227" {...PLASTIC} />
          </mesh>
          <mesh position={[0, -0.009, 0.004]} rotation={[0.6, 0, 0]}>
            <planeGeometry args={[0.4, 0.006]} />
            <meshBasicMaterial color="#ffe6a8" toneMapped={false} />
          </mesh>
          <object3D ref={setLampTarget} position={[0, -0.45, 0.35]} />
          <spotLight
            target={lampTarget ?? undefined}
            position={[0, 0, 0.03]}
            angle={0.9}
            penumbra={0.8}
            intensity={2.2}
            distance={1.2}
            color="#ffd98a"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0005}
          />
        </group>
      </group>
      <mesh position={[0, 0.06, -0.02]} castShadow>
        <boxGeometry args={[0.04, 0.12, 0.02]} />
        <meshStandardMaterial color="#c9cad0" {...PLASTIC} />
      </mesh>
      <RoundedBox args={[0.2, 0.012, 0.14]} radius={0.005} position={[0, 0.006, 0]} castShadow>
        <meshStandardMaterial color="#c9cad0" {...PLASTIC} />
      </RoundedBox>
    </group>
  );
}

// Disposición aproximada de un TKL: filas en unidades de tecla (1u), con huecos marcados como 0
const ROWS: number[][] = [
  [1, 0.5, 1, 1, 1, 1, 0.25, 1, 1, 1, 1, 0.25, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
  [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
  [1.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75],
  [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25],
];
const U = 0.019;


function keyLayout() {
  const keys: { x: number; z: number; w: number }[] = [];
  ROWS.forEach((row, r) => {
    let x = 0;
    row.forEach((w, i) => {
      // En la fila de funciones los anchos pequeños son separaciones, no teclas
      const gap = r === 0 && (i === 1 || w === 0.25);
      if (!gap) keys.push({ x: x + w / 2, z: r + (r === 0 ? 0 : 0.25), w });
      x += w;
    });
  });
  const nav = [
    [0, 0], [1, 0], [2, 0],
    [0, 1.25], [1, 1.25], [2, 1.25],
    [0, 2.25], [1, 2.25], [2, 2.25],
    [1, 4.25], [0, 5.25], [1, 5.25], [2, 5.25],
  ];
  nav.forEach(([c, r]) => keys.push({ x: 15.25 + c + 0.5, z: r, w: 1 }));
  return keys;
}

const KEYS = keyLayout();

export function Keyboard({ position, rotation }: Placed) {
  const rgb = useDispose(useMemo(() => screenTexture(256, 8, drawRgb), []));
  const width = 18.25 * U;
  const depth = 5.5 * U;
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[width + 0.016, 0.02, depth + 0.02]} radius={0.006} position={[0, 0.01, 0]} castShadow>
        <meshStandardMaterial color="#0f1014" {...PLASTIC} />
      </RoundedBox>
      <mesh position={[0, 0.0205, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial map={rgb} toneMapped={false} />
      </mesh>
      {KEYS.map((k, i) => (
        <RoundedBox
          key={i}
          args={[k.w * U - 0.003, 0.009, U - 0.003]}
          radius={0.002}
          smoothness={2}
          position={[k.x * U - width / 2, 0.026, k.z * U - depth / 2 + U / 2]}
        >
          <meshStandardMaterial color="#17181d" {...PLASTIC} />
        </RoundedBox>
      ))}
      <RoundedBox args={[width, 0.014, 0.075]} radius={0.007} position={[0, 0.007, depth / 2 + 0.06]} castShadow>
        <meshStandardMaterial color="#121317" roughness={0.9} />
      </RoundedBox>
      <pointLight position={[0, 0.05, 0]} color="#9a7bff" intensity={0.25} distance={0.35} />
    </group>
  );
}

/** Ratón vertical: un huevo inclinado con la cara de agarre hacia la izquierda. */
export function Mouse({ position, rotation }: Placed) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.035, 0]} rotation={[0, 0, -0.35]} scale={[0.75, 1, 1.4]} castShadow>
        <sphereGeometry args={[0.04, 32, 24]} />
        <meshStandardMaterial color="#1a1b20" {...PLASTIC} />
      </mesh>
      <mesh position={[-0.015, 0.045, -0.02]} rotation={[0, 0, -0.35]}>
        <cylinderGeometry args={[0.006, 0.006, 0.012, 16]} />
        <meshStandardMaterial color="#3a3c44" {...PLASTIC} />
      </mesh>
    </group>
  );
}

export function Phone({ copy, position, rotation }: { copy: ScreenCopy } & Placed) {
  const map = useDispose(useMemo(() => screenTexture(360, 760, drawPhone(copy)), [copy]));
  return (
    <group position={position} rotation={rotation}>
      {/* Soporte: base y respaldo con tira LED */}
      <RoundedBox args={[0.085, 0.03, 0.07]} radius={0.012} position={[0, 0.015, 0]} castShadow>
        <meshStandardMaterial color="#14151a" {...PLASTIC} />
      </RoundedBox>
      <mesh position={[0, 0.032, 0.015]}>
        <boxGeometry args={[0.06, 0.004, 0.006]} />
        <meshBasicMaterial color="#46ffb4" toneMapped={false} />
      </mesh>
      <group position={[0, 0.105, -0.01]} rotation={[-0.2, 0, 0]}>
        <RoundedBox args={[0.077, 0.165, 0.009]} radius={0.004} castShadow>
          <meshStandardMaterial color="#0d0e12" metalness={0.3} roughness={0.3} />
        </RoundedBox>
        <Glass map={map} w={0.07} h={0.155} z={0.0048} />
      </group>
    </group>
  );
}

const STEAM_PUFFS = 7;

export function Coffee({ position }: Placed) {
  const puff = useDispose(useMemo(() => screenTexture(64, 64, drawSteam), []));
  const puffs = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    puffs.current.forEach((m, i) => {
      if (!m) return;
      const p = (t * 0.28 + i / STEAM_PUFFS) % 1;
      m.position.set(Math.sin(t * 1.3 + i * 2.1) * 0.012 * p, 0.09 + p * 0.16, Math.cos(t + i) * 0.006 * p);
      m.scale.setScalar(0.03 + p * 0.07);
      m.quaternion.copy(camera.quaternion);
      (m.material as MeshBasicMaterial).opacity = Math.sin(Math.PI * p) * 0.22;
    });
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.003, 0]} receiveShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.006, 24]} />
        <meshStandardMaterial color="#b0485c" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.046, 0]} castShadow>
        <cylinderGeometry args={[0.048, 0.04, 0.08, 32, 1, true]} />
        <meshStandardMaterial color="#8a7a2e" roughness={0.45} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.008, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.004, 32]} />
        <meshStandardMaterial color="#8a7a2e" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.074, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.046, 32]} />
        <meshStandardMaterial color="#2a160b" roughness={0.15} />
      </mesh>
      {Array.from({ length: STEAM_PUFFS }, (_, i) => (
        <mesh key={i} ref={(m) => void (puffs.current[i] = m)}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={puff} transparent depthWrite={false} opacity={0} />
        </mesh>
      ))}
    </group>
  );
}

const FACE = [
  { c: "#f4c430", p: [0.033, 0.028] },
  { c: "#2f7de1", p: [0.022, 0.017] },
  { c: "#e0333a", p: [0.044, 0.017] },
  { c: "#3fb54a", p: [0.033, 0.006] },
] as const;

/** Mando de Xbox de juguete: cuerpo, dos empuñaduras, sticks, botonera y el botón Xbox iluminado. */
export function Controller({ position, rotation }: Placed) {
  const white = <meshStandardMaterial color="#eef0f3" roughness={0.5} />;
  const dark = <meshStandardMaterial color="#25272d" {...PLASTIC} />;
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.12, 0.03, 0.065]} radius={0.014} position={[0, 0.02, -0.005]} castShadow>
        {white}
      </RoundedBox>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.048, 0.02, 0.028]} rotation={[Math.PI / 2, 0, s * 0.45]} castShadow>
          <capsuleGeometry args={[0.019, 0.04, 6, 16]} />
          {white}
        </mesh>
      ))}
      {[
        [-0.036, 0.008],
        [0.017, -0.012],
      ].map(([x, z]) => (
        <group key={x} position={[x, 0.037, z]}>
          <mesh>
            <cylinderGeometry args={[0.006, 0.007, 0.01, 16]} />
            {dark}
          </mesh>
          <mesh position={[0, 0.006, 0]}>
            <cylinderGeometry args={[0.011, 0.011, 0.004, 20]} />
            {dark}
          </mesh>
        </group>
      ))}
      <mesh position={[-0.017, 0.036, -0.012]}>
        <cylinderGeometry args={[0.01, 0.01, 0.004, 4]} />
        {dark}
      </mesh>
      {FACE.map(({ c, p }) => (
        <mesh key={c} position={[p[0], 0.036, -p[1] + 0.01]}>
          <sphereGeometry args={[0.005, 12, 8]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.25} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0.036, -0.026]}>
        <cylinderGeometry args={[0.007, 0.007, 0.004, 20]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </group>
  );
}

export function Tablet({ position, rotation }: Placed) {
  const map = useDispose(useMemo(() => screenTexture(512, 760, drawTablet), []));
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.17, 0.008, 0.25]} radius={0.004} position={[0, 0.004, 0]} castShadow>
        <meshStandardMaterial color="#20232b" {...PLASTIC} />
      </RoundedBox>
      <mesh position={[0, 0.0085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.155, 0.232]} />
        <meshBasicMaterial map={map} toneMapped={false} />
      </mesh>
    </group>
  );
}
