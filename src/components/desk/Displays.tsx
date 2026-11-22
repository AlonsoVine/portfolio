"use client";

import { useMemo, useState } from "react";
import { AdditiveBlending, BackSide, ExtrudeGeometry, type Object3D, Shape } from "three";
import { AMBER, hdr } from "./palette";
import { drawCv, drawGames, drawLaptopDeck, drawProjects, type DeskCopy } from "./screens";
import { RoundedBox } from "./primitives";
import { useCanvasTexture } from "./useCanvasTexture";

type Placed = { position: [number, number, number]; rotation?: [number, number, number] };

// El brillo de las pantallas roza el umbral del bloom: solo los textos más claros desprenden halo
const SCREEN = hdr("#ffffff", 1.12);
const BLACK_GLOSS = { color: "#0b0c10", roughness: 0.22, metalness: 0.4 } as const;
const SHELL = { color: "#15161b", roughness: 0.45, metalness: 0.25 } as const;
// Cristal: negro en aditivo, así solo suma los reflejos del entorno y de las luces sobre la imagen
const GLASS_PROPS = { color: "#000000", roughness: 0.1, metalness: 0, transparent: true, blending: AdditiveBlending, depthWrite: false } as const;

function Glass({ w, h, z }: { w: number; h: number; z: number }) {
  return (
    <mesh position={[0, 0, z]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial {...GLASS_PROPS} />
    </mesh>
  );
}

/** Sección de corona circular extruida: carcasa curva de la ultrawide. */
function arcPanel(r: number, thickness: number, theta: number, height: number) {
  const a0 = Math.PI / 2 - theta / 2;
  const a1 = Math.PI / 2 + theta / 2;
  const s = new Shape();
  s.absarc(0, 0, r + thickness, a0, a1, false);
  s.absarc(0, 0, r, a1, a0, true);
  const g = new ExtrudeGeometry(s, {
    depth: height,
    curveSegments: 64,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 4,
  });
  // Extruido en Z → vertical, centrado en altura
  g.rotateX(-Math.PI / 2);
  g.translate(0, -height / 2, 0);
  return g;
}

const UW = { w: 0.8, h: 0.34, r: 1.1, y: 0.31 };

export function Ultrawide({ t, position }: { t: DeskCopy } & Placed) {
  const draw = useMemo(() => drawCv(t), [t]);
  const map = useCanvasTexture(2048, 870, draw);
  const theta = UW.w / UW.r;
  const shell = useMemo(() => arcPanel(UW.r, 0.02, theta + 0.022, UW.h + 0.016), [theta]);
  return (
    <group position={position}>
      <group position={[0, UW.y, UW.r]}>
        <mesh geometry={shell} castShadow receiveShadow>
          <meshStandardMaterial {...BLACK_GLOSS} />
        </mesh>
        {/* La escala negativa invierte la U del interior del cilindro para que el texto no salga en espejo */}
        <mesh scale={[-1, 1, 1]}>
          <cylinderGeometry args={[UW.r - 0.005, UW.r - 0.005, UW.h, 96, 1, true, Math.PI - theta / 2, theta]} />
          <meshBasicMaterial map={map} color={SCREEN} side={BackSide} toneMapped={false} />
        </mesh>
        <mesh scale={[-1, 1, 1]}>
          <cylinderGeometry args={[UW.r - 0.0058, UW.r - 0.0058, UW.h, 96, 1, true, Math.PI - theta / 2, theta]} />
          <meshStandardMaterial {...GLASS_PROPS} side={BackSide} />
        </mesh>
        <RoundedBox args={[0.34, 0.2, 0.06]} radius={0.025} position={[0, -0.01, -UW.r - 0.05]} castShadow>
          <meshStandardMaterial {...SHELL} />
        </RoundedBox>
        <mesh position={[0, -UW.h / 2 - 0.006, -UW.r + 0.0045]}>
          <boxGeometry args={[0.035, 0.004, 0.002]} />
          <meshBasicMaterial color={hdr("#cfd6e6", 0.6)} />
        </mesh>
      </group>
      {/* Pie: columna con anillo rojo y base en V */}
      <RoundedBox args={[0.05, 0.27, 0.035]} radius={0.012} position={[0, 0.14, -0.1]} castShadow>
        <meshStandardMaterial {...SHELL} />
      </RoundedBox>
      <mesh position={[0, 0.045, -0.1]}>
        <torusGeometry args={[0.032, 0.004, 8, 32]} />
        <meshBasicMaterial color={hdr("#ff2b3a", 0.7)} />
      </mesh>
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[0.03, 0.012, 0.26]} radius={0.005} position={[s * 0.07, 0.006, -0.05]} rotation={[0, s * 0.62, 0]} castShadow>
          <meshStandardMaterial {...SHELL} />
        </RoundedBox>
      ))}
      <rectAreaLight position={[0, UW.y, 0.02]} rotation={[0, Math.PI, 0]} width={UW.w} height={UW.h} intensity={3.2} color="#a9c9ff" />
    </group>
  );
}

const ALU = { color: "#5d6168", roughness: 0.3, metalness: 0.7, envMapIntensity: 0.6 } as const;
const ZENBOOK = { color: "#1b2131", roughness: 0.38, metalness: 0.55 } as const;

export function Laptop({ t, position, rotation }: { t: DeskCopy } & Placed) {
  const draw = useMemo(() => drawGames(t), [t]);
  const map = useCanvasTexture(1024, 632, draw);
  const deck = useCanvasTexture(1536, 1030, drawLaptopDeck);
  return (
    <group position={position} rotation={rotation} scale={1.2}>
      {/* Soporte de aluminio: base, brazo trasero y bandeja inclinada */}
      <RoundedBox args={[0.22, 0.006, 0.2]} radius={0.003} position={[0, 0.003, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...ALU} />
      </RoundedBox>
      <RoundedBox args={[0.05, 0.13, 0.012]} radius={0.004} position={[0, 0.065, -0.085]} rotation={[-0.25, 0, 0]} castShadow>
        <meshStandardMaterial {...ALU} />
      </RoundedBox>
      <group position={[0, 0.1, 0]} rotation={[0.28, 0, 0]}>
        <RoundedBox args={[0.24, 0.006, 0.22]} radius={0.003} castShadow>
          <meshStandardMaterial {...ALU} />
        </RoundedBox>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.08, 0.006, 0.108]}>
            <boxGeometry args={[0.03, 0.012, 0.006]} />
            <meshStandardMaterial color="#2a2c33" roughness={0.8} />
          </mesh>
        ))}
        <group position={[0, 0.011, 0]}>
          <RoundedBox args={[0.32, 0.014, 0.215]} radius={0.005} castShadow receiveShadow>
            <meshStandardMaterial {...ZENBOOK} />
          </RoundedBox>
          <mesh position={[0, 0.0072, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.31, 0.205]} />
            <meshStandardMaterial map={deck} roughness={0.5} metalness={0.3} emissiveMap={deck} emissive={hdr("#ffffff", 0.18)} />
          </mesh>
          {/* Bisagra: la pantalla queda casi vertical, ligeramente echada hacia atrás */}
          <group position={[0, 0.007, -0.105]} rotation={[-0.36, 0, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.005, 0.005, 0.26, 16]} />
              <meshStandardMaterial {...ZENBOOK} />
            </mesh>
            <group position={[0, 0.103, -0.002]}>
              <RoundedBox args={[0.32, 0.205, 0.007]} radius={0.0035} castShadow>
                <meshStandardMaterial {...ZENBOOK} />
              </RoundedBox>
              <mesh position={[0, 0, 0.0036]}>
                <planeGeometry args={[0.312, 0.197]} />
                <meshStandardMaterial {...BLACK_GLOSS} />
              </mesh>
              <mesh position={[0, 0.003, 0.0038]}>
                <planeGeometry args={[0.3, 0.185]} />
                <meshBasicMaterial map={map} color={SCREEN} toneMapped={false} />
              </mesh>
              <Glass w={0.3} h={0.185} z={0.0042} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

const HP_WHITE = { color: "#e6e7ec", roughness: 0.35, metalness: 0.1 } as const;
const SILVER = { color: "#c7cad1", roughness: 0.3, metalness: 0.8 } as const;

export function SideMonitor({ t, position, rotation }: { t: DeskCopy } & Placed) {
  const draw = useMemo(() => drawProjects(t), [t]);
  const map = useCanvasTexture(1024, 560, draw);
  // El objetivo del foco tiene que estar en la escena para que su posición cuente
  const [lampTarget, setLampTarget] = useState<Object3D | null>(null);
  return (
    <group position={position} rotation={rotation}>
      <group position={[0, 0.285, 0]}>
        <RoundedBox args={[0.546, 0.316, 0.016]} radius={0.004} castShadow>
          <meshStandardMaterial {...BLACK_GLOSS} />
        </RoundedBox>
        <RoundedBox args={[0.55, 0.32, 0.022]} radius={0.005} position={[0, 0, -0.012]} castShadow>
          <meshStandardMaterial {...HP_WHITE} />
        </RoundedBox>
        <RoundedBox args={[0.55, 0.018, 0.02]} radius={0.004} position={[0, -0.164, 0.001]}>
          <meshStandardMaterial {...SILVER} />
        </RoundedBox>
        <mesh position={[0, -0.164, 0.0115]}>
          <circleGeometry args={[0.005, 20]} />
          <meshStandardMaterial color="#5b5e66" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.006, 0.0085]}>
          <planeGeometry args={[0.536, 0.296]} />
          <meshBasicMaterial map={map} color={SCREEN} toneMapped={false} />
        </mesh>
        <Glass w={0.536} h={0.296} z={0.009} />
        <rectAreaLight position={[0, 0, 0.02]} rotation={[0, Math.PI, 0]} width={0.53} height={0.29} intensity={3} color={AMBER} />

        {/* Lámpara de monitor con luz asimétrica hacia la mesa */}
        <group position={[0, 0.172, 0.012]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <capsuleGeometry args={[0.01, 0.44, 4, 16]} />
            <meshStandardMaterial color="#1c1d22" roughness={0.35} metalness={0.6} />
          </mesh>
          <mesh position={[0, -0.008, 0.006]} rotation={[0.9, 0, 0]}>
            <planeGeometry args={[0.42, 0.007]} />
            <meshBasicMaterial color={hdr("#ffe2b0", 5)} toneMapped={false} />
          </mesh>
          <RoundedBox args={[0.03, 0.02, 0.05]} radius={0.006} position={[0, -0.002, -0.03]}>
            <meshStandardMaterial color="#1c1d22" roughness={0.35} metalness={0.6} />
          </RoundedBox>
          <object3D ref={setLampTarget} position={[-0.05, -0.5, 0.45]} />
          <spotLight
            target={lampTarget ?? undefined}
            position={[0, -0.01, 0.02]}
            angle={0.95}
            penumbra={0.9}
            intensity={2.6}
            distance={1.4}
            decay={1.4}
            color="#ffd9a0"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0004}
            shadow-radius={6}
          />
        </group>
      </group>
      <RoundedBox args={[0.045, 0.2, 0.018]} radius={0.007} position={[0, 0.1, -0.04]} rotation={[-0.12, 0, 0]} castShadow>
        <meshStandardMaterial {...SILVER} />
      </RoundedBox>
      <mesh position={[0, 0.005, -0.02]} scale={[1.5, 1, 1]} castShadow receiveShadow>
        <cylinderGeometry args={[0.075, 0.08, 0.01, 40]} />
        <meshStandardMaterial {...SILVER} />
      </mesh>
    </group>
  );
}
