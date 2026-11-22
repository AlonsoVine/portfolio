"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import {
  CatmullRomCurve3,
  Euler,
  type Group,
  LatheGeometry,
  Quaternion,
  SRGBColorSpace,
  TextureLoader,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { hdr, ICE } from "./palette";
import { drawLatte, drawMugGlaze, drawMugRough, drawNoise, drawPhone, drawTablet, PHONE_BUTTONS, type DeskCopy } from "./screens";
import { showHover, useHoverable } from "./interact";
import { clink } from "./sfx";
import { RoundedBox } from "./primitives";
import { Steam, type SteamDrive } from "./Steam";
import { useCanvasTexture } from "./useCanvasTexture";

type Placed = { position: [number, number, number]; rotation?: [number, number, number] };

const SCREEN = hdr("#ffffff", 1.08);
const GLASS = { color: "#05060a", roughness: 0.08, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 } as const;
const CLOCK_REFRESH_MS = 20_000;

const LINKS = {
  linkedin: "https://www.linkedin.com/in/alonso-vi%C3%B1%C3%A9-barrancos/",
  github: "https://github.com/AlonsoVine",
} as const;
type LinkId = keyof typeof LINKS;
const PHONE_W = 0.07;
const PHONE_H = 0.155;
const linkAt = (e: ThreeEvent<PointerEvent | MouseEvent>): LinkId | null => {
  if (!e.uv || e.uv.x < 0.08 || e.uv.x > 0.92) return null;
  const y = 1 - e.uv.y;
  return (Object.keys(PHONE_BUTTONS) as LinkId[]).find((k) => y >= PHONE_BUTTONS[k][0] && y <= PHONE_BUTTONS[k][1]) ?? null;
};

/** Móvil en su soporte, girado hacia la silla: la pantalla lleva a LinkedIn y GitHub. */
export function Phone({ t, lang, position, rotation }: { t: DeskCopy; lang: string } & Placed) {
  const draw = useMemo(() => drawPhone(t, lang), [t, lang]);
  const map = useCanvasTexture(360, 800, draw, { refreshMs: CLOCK_REFRESH_MS });
  const [hot, setHot] = useState<LinkId | null>(null);
  const point = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const id = linkAt(e);
    setHot(id);
    showHover(id ? t.interact[id] : null);
  };
  return (
    <group position={position} rotation={rotation} scale={1.3}>
      {/* Soporte: base con tira LED y respaldo inclinado */}
      <RoundedBox args={[0.09, 0.022, 0.08]} radius={0.01} smoothness={4} position={[0, 0.011, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#121318" roughness={0.4} metalness={0.4} />
      </RoundedBox>
      <mesh position={[0, 0.0225, 0.028]}>
        <boxGeometry args={[0.07, 0.002, 0.004]} />
        <meshBasicMaterial color={hdr(ICE, 1.2)} toneMapped={false} />
      </mesh>
      <RoundedBox args={[0.06, 0.12, 0.008]} radius={0.004} position={[0, 0.07, -0.03]} rotation={[-0.32, 0, 0]} castShadow>
        <meshStandardMaterial color="#121318" roughness={0.4} metalness={0.4} />
      </RoundedBox>
      <RoundedBox args={[0.08, 0.012, 0.02]} radius={0.004} position={[0, 0.026, 0.012]}>
        <meshStandardMaterial color="#121318" roughness={0.4} metalness={0.4} />
      </RoundedBox>
      <group position={[0, 0.105, -0.012]} rotation={[-0.3, 0, 0]}>
        <RoundedBox args={[0.077, 0.165, 0.0085]} radius={0.0042} smoothness={4} castShadow>
          <meshStandardMaterial color="#2a2d36" roughness={0.25} metalness={0.85} />
        </RoundedBox>
        <mesh position={[0, 0, 0.0043]}>
          <planeGeometry args={[0.074, 0.162]} />
          <meshPhysicalMaterial {...GLASS} />
        </mesh>
        <mesh
          position={[0, 0, 0.0045]}
          onPointerMove={point}
          onPointerOver={point}
          onPointerOut={() => {
            setHot(null);
            showHover(null);
          }}
          onClick={(e) => {
            e.stopPropagation();
            const id = linkAt(e);
            if (id) window.open(LINKS[id], "_blank", "noopener,noreferrer");
          }}
        >
          <planeGeometry args={[PHONE_W, PHONE_H]} />
          <meshBasicMaterial map={map} color={SCREEN} toneMapped={false} />
        </mesh>
        {/* Brillo del botón bajo el puntero */}
        {hot && (
          <mesh position={[0, (0.5 - (PHONE_BUTTONS[hot][0] + PHONE_BUTTONS[hot][1]) / 2) * PHONE_H, 0.0046]}>
            <planeGeometry args={[PHONE_W * 0.84, (PHONE_BUTTONS[hot][1] - PHONE_BUTTONS[hot][0]) * PHONE_H]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.16} depthWrite={false} toneMapped={false} />
          </mesh>
        )}
        <mesh position={[0, 0.071, 0.0047]}>
          <circleGeometry args={[0.0018, 16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      </group>
    </group>
  );
}

const PHOTO_URL = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/desk/tablet-retrato.webp`;
const SCREEN_W = 0.158;
const SCREEN_H = 0.236;
const PHOTO_H = SCREEN_W * (781 / 640);
// En la mano: a unos 38 cm del ojo siguiendo la mirada en reposo, con la pantalla de cara a la silla
const HOLD_POS = new Vector3(0.025, 0.383, 0.445);
const HOLD_ROT = new Quaternion().setFromEuler(new Euler(Math.PI / 2 - 0.27 - 0.07, 0, 0));
const LIFT_S = 1.1;
const HOLD_S = 3.4;
const restPos = new Vector3();
const restRot = new Quaternion();
const restEuler = new Euler();
const smoother = (k: number) => k * k * k * (k * (k * 6 - 15) + 10);

type TabletPhase = "rest" | "up" | "hold" | "down";

/**
 * Tablet sobre su funda, con un borde levantado para que quede ligeramente inclinada hacia la silla.
 * Al pulsarla se levanta hasta la cara, se queda un momento enseñando el retrato y vuelve a la mesa.
 */
export function Tablet({ t, lang, position, rotation = [0, 0, 0] }: { t: DeskCopy; lang: string } & Placed) {
  const draw = useMemo(() => drawTablet(lang), [lang]);
  const map = useCanvasTexture(540, 800, draw, { refreshMs: CLOCK_REFRESH_MS });
  // La textura existe desde el principio para que el material se compile ya con ella durante la carga
  const [photo] = useState(() => {
    const tex = new TextureLoader().load(PHOTO_URL);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  });
  useEffect(() => () => photo.dispose(), [photo]);
  const body = useRef<Group>(null);
  const anim = useRef<{ phase: TabletPhase; t: number }>({ phase: "rest", t: 0 });

  useFrame(({ gl }, delta) => {
    const a = anim.current;
    const g = body.current;
    if (!g || a.phase === "rest") return;
    a.t += Math.min(delta, 0.05);
    let k = 1;
    if (a.phase === "up") {
      k = Math.min(1, a.t / LIFT_S);
      if (k === 1) Object.assign(a, { phase: "hold", t: 0 });
    } else if (a.phase === "hold") {
      if (a.t > HOLD_S) Object.assign(a, { phase: "down", t: 0 });
    } else {
      k = 1 - Math.min(1, a.t / LIFT_S);
      if (k === 0) a.phase = "rest";
    }
    restPos.set(position[0], position[1], position[2]);
    restRot.setFromEuler(restEuler.set(rotation[0], rotation[1], rotation[2]));
    const e = smoother(k);
    // Primero sube y luego se acerca (al bajar, al revés): así no barre la taza ni el ratón
    const lift = 1 - (1 - k) ** 3;
    g.position.set(
      restPos.x + (HOLD_POS.x - restPos.x) * e,
      restPos.y + (HOLD_POS.y - restPos.y) * lift,
      restPos.z + (HOLD_POS.z - restPos.z) * e,
    );
    g.quaternion.slerpQuaternions(restRot, HOLD_ROT, e);
    // El mapa de sombras es estático: mientras la tablet se mueve hay que rehacerlo
    gl.shadowMap.needsUpdate = true;
  });

  const toggle = () => {
    const a = anim.current;
    if (a.phase === "rest") Object.assign(a, { phase: "up", t: 0 });
    else if (a.phase === "hold") Object.assign(a, { phase: "down", t: 0 });
    // A medio camino da media vuelta desde donde esté, sin saltos
    else Object.assign(a, { phase: a.phase === "up" ? "down" : "up", t: Math.max(0, LIFT_S - a.t) });
  };

  const hover = useHoverable(t.interact.lift, toggle);

  return (
    <group
      ref={body}
      position={position}
      rotation={rotation}
      {...hover}
    >
      <group rotation={[0.07, 0, 0]} position={[0, 0.008, 0]}>
        {/* Funda */}
        <RoundedBox args={[0.188, 0.012, 0.27]} radius={0.006} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial color="#1b1d26" roughness={0.85} />
        </RoundedBox>
        <RoundedBox args={[0.174, 0.007, 0.256]} radius={0.0035} smoothness={4} position={[0, 0.008, 0]} castShadow>
          <meshStandardMaterial color="#3a3d46" roughness={0.3} metalness={0.85} />
        </RoundedBox>
        <mesh position={[0, 0.0117, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.17, 0.252]} />
          <meshPhysicalMaterial {...GLASS} />
        </mesh>
        <mesh position={[0, 0.0119, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[SCREEN_W, SCREEN_H]} />
          <meshBasicMaterial map={map} color={SCREEN} toneMapped={false} />
        </mesh>
        {/* Retrato recortado de fondo de pantalla, apoyado en el borde inferior */}
        <mesh position={[0, 0.0121, SCREEN_H / 2 - PHOTO_H / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[SCREEN_W, PHOTO_H]} />
          <meshBasicMaterial map={photo} color={SCREEN} toneMapped={false} transparent depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

/** Perfil de la taza para el torno: exterior, borde y paredes interiores. */
// Taza de gres hecha a torno: barriga suave, marcas de los dedos al subir el barro y pie de anillo
const MUG_H = 0.092;
const WALL = 0.0045;
const radius = (y: number) => 0.037 + 0.0075 * Math.sin(Math.PI * Math.min(1, (y / MUG_H) ** 0.85) * 0.9) + 0.0003 * Math.sin(y * 880 + 2.5 * Math.sin(y * 97)) * (0.6 + 0.4 * Math.sin(y * 53));
const COFFEE_Y = 0.074;

function mugGeometry() {
  const pts: [number, number, number][] = [
    [0, 0, 0],
    [0.03, 0, 0.005],
    [0.034, 0.0015, 0.01],
    [0.0355, 0.004, 0.02],
  ];
  for (let i = 1; i <= 36; i += 1) {
    const y = 0.004 + (MUG_H - 0.004) * (i / 36);
    pts.push([radius(y), y, 0.02 + 0.7 * (y / MUG_H)]);
  }
  const top = radius(MUG_H);
  pts.push([top - 0.0006, MUG_H + 0.0018, 0.745], [top - WALL / 2, MUG_H + 0.0026, 0.76], [top - WALL + 0.0004, MUG_H + 0.0016, 0.78]);
  for (let i = 1; i <= 24; i += 1) {
    const y = MUG_H - (MUG_H - 0.012) * (i / 24);
    pts.push([radius(y) - WALL, y, 0.78 + 0.2 * (1 - y / MUG_H)]);
  }
  pts.push([0.024, 0.0095, 0.99], [0, 0.0095, 1]);
  const g = new LatheGeometry(
    pts.map(([x, y]) => new Vector2(x, y)),
    64,
  );
  // La UV del torno va por índice de punto; se fija la v a mano para que el esmalte caiga donde toca
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) uv.setY(i, pts[i % pts.length][2]);
  g.computeVertexNormals();
  return g;
}

function handleGeometry() {
  // Asa en oreja: sale casi horizontal del hombro, baja curvada y vuelve a la barriga
  const x0 = radius(0.075) - 0.001;
  const x1 = radius(0.03) - 0.001;
  const curve = new CatmullRomCurve3([
    new Vector3(x0, 0.075, 0),
    new Vector3(x0 + 0.018, 0.078, 0),
    new Vector3(x0 + 0.028, 0.062, 0),
    new Vector3(x1 + 0.024, 0.04, 0),
    new Vector3(x1 + 0.01, 0.028, 0),
    new Vector3(x1, 0.03, 0),
  ]);
  return new TubeGeometry(curve, 40, 0.0052, 10, false);
}

const MUG = mugGeometry();
const HANDLE = handleGeometry();

const LIFT_MUG_S = 1.5;

/** Cappuccino en taza de gres esmaltada a mano, sobre posavasos de corcho. Al pulsarla se levanta un poco y vuelve al posavasos. */
export function Coffee({ t, position, reduceMotion }: Placed & { t: DeskCopy; reduceMotion: boolean }) {
  const mug = useRef<Group>(null);
  const sip = useRef(-1);
  const steam = useRef<SteamDrive>({ gain: 1, stir: 0 });
  useFrame(({ gl }, delta) => {
    const d = steam.current;
    const g = mug.current;
    if (sip.current < 0 || !g) {
      // Tras el sorbo el vapor vuelve con fuerza y se calma poco a poco
      d.gain += (1 - d.gain) * Math.min(1, delta * 0.6);
      d.stir += (0 - d.stir) * Math.min(1, delta * 1.5);
      return;
    }
    sip.current += Math.min(delta, 0.05);
    const p = Math.min(1, sip.current / LIFT_MUG_S);
    // Una sola curva suave de subida y bajada: nada de giros que dejen ver el café pegado a la taza
    const up = Math.sin(Math.PI * p) ** 2;
    g.position.set(0, 0.035 * up, 0);
    d.stir = Math.max(d.stir, 0.5 * up);
    gl.shadowMap.needsUpdate = true;
    if (p >= 1) {
      sip.current = -1;
      g.position.set(0, 0, 0);
      d.gain = 1.8;
      clink();
    }
  });
  const noise = useCanvasTexture(128, 128, drawNoise, { tileX: 1, color: false });
  const glaze = useCanvasTexture(512, 512, drawMugGlaze);
  const glazeRough = useCanvasTexture(512, 512, drawMugRough, { color: false });
  const latte = useCanvasTexture(256, 256, drawLatte);
  const cork = useCanvasTexture(128, 128, drawNoise, { tileX: 3, color: false });
  const inner = radius(COFFEE_Y) - WALL;
  const hover = useHoverable(t.interact.sip, () => {
    if (sip.current < 0) sip.current = 0;
  });
  return (
    <group position={position}>
      {/* Posavasos de corcho */}
      <mesh position={[0, 0.003, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.055, 0.055, 0.006, 64]} />
        <meshStandardMaterial color="#6b5240" roughness={1} bumpMap={cork} bumpScale={1.2} />
      </mesh>
      <group
        ref={mug}
        {...hover}
      >
      <group position={[0, 0.006, 0]} rotation={[0, -0.75, 0]}>
        <mesh geometry={MUG} castShadow receiveShadow>
          <meshPhysicalMaterial map={glaze} roughnessMap={glazeRough} roughness={1} clearcoat={1} clearcoatRoughnessMap={glazeRough} clearcoatRoughness={0.5} />
        </mesh>
        {/* El asa va esmaltada del mismo azul; ovalada, no un tubo redondo */}
        <mesh geometry={HANDLE} scale={[1, 1, 0.62]} castShadow>
          <meshPhysicalMaterial color="#1f5268" roughness={0.3} clearcoat={1} clearcoatRoughness={0.1} />
        </mesh>
        {/* Cappuccino: espuma con roseta y un menisco oscuro donde toca la pared */}
        <mesh position={[0, COFFEE_Y, 0]} rotation={[-Math.PI / 2, 0, 0.9]}>
          <circleGeometry args={[inner, 48]} />
          <meshStandardMaterial map={latte} roughness={0.85} />
        </mesh>
      </group>
      </group>
      {!reduceMotion && (
        <>
          <Steam position={[0.004, COFFEE_Y + 0.006, 0]} height={0.14} width={0.075} noise={noise} drive={steam} />
          <Steam position={[-0.008, COFFEE_Y + 0.006, 0.006]} height={0.11} width={0.06} seed={1} noise={noise} drive={steam} />
        </>
      )}
    </group>
  );
}
