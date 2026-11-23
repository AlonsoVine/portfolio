"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  type Group,
  Float32BufferAttribute,
  type Mesh,
  type InstancedMesh,
  type MeshBasicMaterial,
  Object3D,
  SphereGeometry,
} from "three";
import { AMBER, GRADIENT, hdr, ICE, MAGENTA, MINT, VIOLET } from "./palette";
import { drawLegends, drawSoftDot, drawStrip, type DeskCopy } from "./screens";
import { useHoverable } from "./interact";
import { click } from "./sfx";
import { RoundedBox } from "./primitives";
import { useCanvasTexture } from "./useCanvasTexture";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

type Placed = { position: [number, number, number]; rotation?: [number, number, number] };

// Distribución TKL ISO-ES: anchos en unidades de tecla; 0.5/0.25 en la fila de funciones son huecos
const ROWS: { w: number; l: string }[][] = [
  "Esc:1 _:1 F1:1 F2:1 F3:1 F4:1 _:0.5 F5:1 F6:1 F7:1 F8:1 _:0.5 F9:1 F10:1 F11:1 F12:1",
  "º:1 1:1 2:1 3:1 4:1 5:1 6:1 7:1 8:1 9:1 0:1 ':1 ¡:1 ⌫:2",
  "⇥:1.5 Q:1 W:1 E:1 R:1 T:1 Y:1 U:1 I:1 O:1 P:1 `:1 +:1 ↵:1.5",
  "⇪:1.75 A:1 S:1 D:1 F:1 G:1 H:1 J:1 K:1 L:1 Ñ:1 ´:1 Ç:1.25",
  "⇧:1.25 <:1 Z:1 X:1 C:1 V:1 B:1 N:1 M:1 ,:1 .:1 -:1 ⇧:2.75",
  "Ctrl:1.25 ⊞:1.25 Alt:1.25 :6.25 AltGr:1.25 Fn:1.25 ☰:1.25 Ctrl:1.25",
].map((row) =>
  row.split(" ").map((k) => {
    const i = k.lastIndexOf(":");
    return { l: k.slice(0, i), w: Number(k.slice(i + 1)) };
  }),
);
const NAV: [number, number, string][] = [
  [0, 0, "Impr"], [1, 0, "Bloq"], [2, 0, "Pausa"],
  [0, 1.25, "Ins"], [1, 1.25, "Inicio"], [2, 1.25, "RePág"],
  [0, 2.25, "Supr"], [1, 2.25, "Fin"], [2, 2.25, "AvPág"],
  [1, 4.25, "↑"], [0, 5.25, "←"], [1, 5.25, "↓"], [2, 5.25, "→"],
];
const U = 0.0188;
const COLS = 18.5;
const DEPTH = 6.5;

type Key = { x: number; z: number; w: number; label: string };
const KEYS: Key[] = (() => {
  const keys: Key[] = [];
  ROWS.forEach((row, r) => {
    let x = 0;
    for (const k of row) {
      if (k.l !== "_") keys.push({ x: x + k.w / 2, z: r === 0 ? 0 : r + 0.25, w: k.w, label: k.l });
      x += k.w;
    }
  });
  NAV.forEach(([c, r, label]) => keys.push({ x: 15.5 + c + 0.5, z: r, w: 1, label }));
  return keys;
})();

// Tecla física (KeyboardEvent.code) → índice de la tecla dibujada; las repetidas (⇧, Ctrl) por orden de aparición
const CODE_TO_KEY: Record<string, number> = (() => {
  const at = (label: string, n = 0) => KEYS.map((k, i) => (k.label === label ? i : -1)).filter((i) => i >= 0)[n] ?? -1;
  const m: Record<string, number> = {};
  for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") m[`Key${c}`] = at(c);
  for (let d = 0; d <= 9; d += 1) m[`Digit${d}`] = at(String(d));
  for (let f = 1; f <= 12; f += 1) m[`F${f}`] = at(`F${f}`);
  const named: Record<string, [string, number?]> = {
    Escape: ["Esc"], Backquote: ["º"], Minus: ["'"], Equal: ["¡"], Backspace: ["⌫"], Tab: ["⇥"],
    BracketLeft: ["`"], BracketRight: ["+"], Enter: ["↵"], CapsLock: ["⇪"], Semicolon: ["Ñ"], Quote: ["´"],
    Backslash: ["Ç"], ShiftLeft: ["⇧", 0], IntlBackslash: ["<"], Comma: [","], Period: ["."], Slash: ["-"],
    ShiftRight: ["⇧", 1], ControlLeft: ["Ctrl", 0], MetaLeft: ["⊞"], AltLeft: ["Alt"], Space: [""],
    AltRight: ["AltGr"], ContextMenu: ["☰"], ControlRight: ["Ctrl", 1], PrintScreen: ["Impr"], ScrollLock: ["Bloq"],
    Pause: ["Pausa"], Insert: ["Ins"], Home: ["Inicio"], PageUp: ["RePág"], Delete: ["Supr"], End: ["Fin"],
    PageDown: ["AvPág"], ArrowUp: ["↑"], ArrowLeft: ["←"], ArrowDown: ["↓"], ArrowRight: ["→"],
  };
  for (const [code, [label, n]] of Object.entries(named)) m[code] = at(label, n ?? 0);
  return m;
})();

// Color de cada tecla encendida: el degradado del RGB según su posición. Va multiplicado por el gris del
// material (casi negro en lineal), así que se escala para que la tecla llegue a brillar de verdad
const KEY_BASE = new Color("#16171c");
const KEY_GLOW = KEYS.map((k) => {
  const t = Math.min(0.999, k.x / COLS) * (GRADIENT.length - 1);
  const c = new Color(GRADIENT[Math.floor(t)]).lerp(new Color(GRADIENT[Math.floor(t) + 1]), t - Math.floor(t));
  return new Color(c.r / KEY_BASE.r, c.g / KEY_BASE.g, c.b / KEY_BASE.b).multiplyScalar(1.6);
});
const WHITE = new Color(1, 1, 1);
const RIPPLE_S = 1.3;
const o = new Object3D();
const c = new Color();

const LEGEND_PX = 64;

/**
 * Teclado TKL con RGB que fluye. Las teclas que pulsas en tu teclado de verdad se hunden y se encienden,
 * y un clic sobre él lanza una onda de luz desde la tecla tocada.
 */
export function Keyboard({ t, position, rotation, reduceMotion }: Placed & { t: DeskCopy; reduceMotion: boolean }) {
  const keysRef = useRef<InstancedMesh>(null);
  const heat = useRef(new Float32Array(KEYS.length));
  const held = useRef(new Set<number>());
  const ripple = useRef({ x: 0, z: 0, at: -10 });
  const lit = useRef(false);
  const glowMat = useRef<MeshBasicMaterial>(null);
  // En inglés se rotulan como un ISO del Reino Unido; las teclas físicas y su respuesta no cambian
  const legendsDraw = useMemo(() => drawLegends(KEYS, LEGEND_PX, t.keyLegends), [t]);
  const legends = useCanvasTexture(COLS * LEGEND_PX, DEPTH * LEGEND_PX, legendsDraw);
  const glow = useCanvasTexture(512, 4, drawStrip, { tileX: 1 });
  const spill = useCanvasTexture(128, 128, drawSoftDot);
  // Tecla con perfil real: cara superior más estrecha que la base y cantos redondeados que atrapan reflejos
  const geometry = useMemo(() => {
    const g = new RoundedBoxGeometry(1, 1, 1, 2, 0.14);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const k = 1 - 0.18 * (pos.getY(i) + 0.5);
      pos.setX(i, pos.getX(i) * k);
      pos.setZ(i, pos.getZ(i) * k);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const width = COLS * U;
  const depth = DEPTH * U;

  useLayoutEffect(() => {
    const mesh = keysRef.current;
    if (!mesh) return;
    const o = new Object3D();
    KEYS.forEach((k, i) => {
      o.position.set(k.x * U - width / 2, 0.026, k.z * U - depth / 2 + U / 2);
      o.scale.set(k.w * U - 0.0022, 0.0105, U - 0.0022);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    KEYS.forEach((_, i) => mesh.setColorAt(i, WHITE));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [width, depth]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const i = CODE_TO_KEY[e.code];
      if (i === undefined || i < 0) return;
      held.current.add(i);
      heat.current[i] = 1;
    };
    const up = (e: KeyboardEvent) => {
      const i = CODE_TO_KEY[e.code];
      if (i !== undefined) held.current.delete(i);
    };
    // Al perder el foco no llega el keyup: se sueltan todas
    const blur = () => held.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  useFrame((_, delta) => {
    const map = glowMat.current?.map;
    if (map && !reduceMotion) map.offset.x = (map.offset.x - delta * 0.06) % 1;

    const mesh = keysRef.current;
    if (!mesh) return;
    const h = heat.current;
    const since = performance.now() / 1000 - ripple.current.at;
    const waving = since < RIPPLE_S;
    let any = waving || held.current.size > 0;
    for (let i = 0; i < h.length && !any; i += 1) any = h[i] > 0.002;
    if (!any && !lit.current) return;
    lit.current = any;
    const fade = Math.exp(-delta * 2.2);
    let peak = 0;
    KEYS.forEach((k, i) => {
      if (held.current.has(i)) h[i] = 1;
      else h[i] *= fade;
      let v = h[i];
      if (waving) {
        const d = Math.hypot(k.x - ripple.current.x, (k.z - ripple.current.z) * 1.2);
        v = Math.max(v, Math.exp(-(((d - since * 26) / 1.4) ** 2)) * (1 - since / RIPPLE_S));
      }
      peak = Math.max(peak, v);
      const press = held.current.has(i) ? 1 : h[i] > 0.6 ? (h[i] - 0.6) / 0.4 : 0;
      o.position.set(k.x * U - width / 2, 0.026 - press * 0.0035, k.z * U - depth / 2 + U / 2);
      o.scale.set(k.w * U - 0.0022, 0.0105, U - 0.0022);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, c.copy(WHITE).lerp(KEY_GLOW[i], v));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // Toda la retroiluminación se aviva un momento con cada pulsación
    glowMat.current?.color.setScalar(0.75 + peak * 0.9);
  });

  const hover = useHoverable(t.interact.keys, (e) => {
    const p = keysRef.current?.worldToLocal(e.point.clone());
    if (!p) return;
    ripple.current = { x: (p.x + width / 2) / U, z: (p.z + depth / 2 - U / 2) / U, at: performance.now() / 1000 };
  });

  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[width + 0.018, 0.02, depth + 0.018]} radius={0.0035} position={[0, 0.011, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#0d0e12" roughness={0.35} metalness={0.5} />
      </RoundedBox>
      {/* Retroiluminación que asoma entre las teclas, recorriendo el degradado */}
      <mesh position={[0, 0.0212, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial ref={glowMat} map={glow} color={hdr("#ffffff", 0.75)} toneMapped={false} />
      </mesh>
      <instancedMesh
        ref={keysRef}
        args={[geometry, undefined, KEYS.length]}
        castShadow
        {...hover}
      >
        <meshStandardMaterial color="#16171c" roughness={0.55} metalness={0.05} />
      </instancedMesh>
      <mesh position={[0, 0.0315, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial map={legends} color={hdr("#ffffff", 0.85)} transparent depthWrite={false} />
      </mesh>
      {/* Reposamuñecas */}
      <RoundedBox args={[width, 0.016, 0.07]} radius={0.008} smoothness={4} position={[0, 0.008, depth / 2 + 0.055]} castShadow receiveShadow>
        <meshStandardMaterial color="#141419" roughness={0.95} />
      </RoundedBox>
      {/* Reflejo del RGB sobre el tapete alrededor del teclado */}
      <mesh position={[0, 0.0045, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 1.7, depth * 2.6]} />
        <meshBasicMaterial map={spill} color={VIOLET} transparent opacity={0.09} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// Medidas de un ratón diestro corriente: 12 × 6,2 × 4 cm
const MOUSE_SCALE: [number, number, number] = [0.031, 0.032, 0.06];
const MOUSE_LIFT = 0.0088;

/** Esfera unitaria esculpida: base plana, frontal estrecho, joroba trasera y cintura para el pulgar. */
function mouseShell() {
  const g = new SphereGeometry(1, 64, 44);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    const z = pos.getZ(i);
    y = y < 0 ? y * 0.15 : y * (0.8 + 0.25 * smooth(-0.6, 0.5, z));
    // Planta de rectángulo redondeado, no de huevo: los lados se empujan hacia fuera
    x = Math.sign(x) * Math.abs(x) ** 0.78;
    x *= 1 - 0.1 * Math.max(0, -z);
    x *= 1 - 0.08 * Math.exp(-(((z - 0.05) / 0.35) ** 2)) * smooth(-0.1, 0.4, y);
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

/** Recorta de la carcasa los triángulos cuyo centro cumple `keep` y los infla un poco: piezas que asoman sobre el cuerpo. */
function shellPart(shell: SphereGeometry, keep: (x: number, y: number, z: number) => boolean, inflate: [number, number, number]) {
  const flat = shell.toNonIndexed();
  const pos = flat.attributes.position;
  const nor = flat.attributes.normal;
  const keepP: number[] = [];
  const keepN: number[] = [];
  for (let t = 0; t < pos.count; t += 3) {
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let k = 0; k < 3; k += 1) {
      cx += pos.getX(t + k) / 3;
      cy += pos.getY(t + k) / 3;
      cz += pos.getZ(t + k) / 3;
    }
    if (keep(cx, cy, cz)) {
      for (let k = 0; k < 3; k += 1) {
        keepP.push(pos.getX(t + k), pos.getY(t + k), pos.getZ(t + k));
        keepN.push(nor.getX(t + k), nor.getY(t + k), nor.getZ(t + k));
      }
    }
  }
  flat.dispose();
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(keepP, 3));
  g.setAttribute("normal", new Float32BufferAttribute(keepN, 3));
  g.scale(...inflate);
  return g;
}

const SHELL = mouseShell();
// Botones: la parte frontal superior, partida por una ranura y por el hueco de la rueda; cada lado por separado
const isButton = (x: number, y: number, z: number) => y > 0.3 && z < 0.1 && Math.abs(x) > 0.06 && !(Math.abs(x) < 0.2 && z > -0.66 && z < -0.18);
const BUTTONS = [-1, 1].map((side) => shellPart(SHELL, (x, y, z) => isButton(x, y, z) && Math.sign(x) === side, [1.008, 1.014, 1.004]));
// Faldón lateral gris grafito: marca la silueta y separa el ratón del tapete
const SKIRT = shellPart(SHELL, (_x, y) => y > 0.02 && y < 0.26, [1.01, 1, 1.006]);
/** Altura de la carcasa en el eje central para una z unitaria (para asentar la rueda). */
const shellTop = (z: number) => Math.sqrt(1 - z * z) * (0.8 + 0.25 * smooth(-0.6, 0.5, z));

const DPI_COLORS = [ICE, MINT, VIOLET, MAGENTA, AMBER];
const SLIDE_S = 0.9;
const CLICKS_AT = [0.35, 0.5];

/**
 * Ratón inalámbrico clásico: carcasa esculpida, botones partidos, rueda de goma en su hueco y patines.
 * Hace clic a la vez que tu ratón de verdad. Al pulsarlo se desliza un poco, hace doble clic y cambia de DPI
 * con un destello del color nuevo.
 */
export function Mouse({ t, position, rotation }: Placed & { t: DeskCopy }) {
  const spill = useCanvasTexture(128, 128, drawSoftDot);
  const left = useRef<Mesh>(null);
  const right = useRef<Mesh>(null);
  const led = useRef<MeshBasicMaterial>(null);
  const flash = useRef<MeshBasicMaterial>(null);
  const body = useRef<Group>(null);
  const state = useRef({ dpi: 0, press: 0, flash: 0, slide: SLIDE_S, clicks: 0, side: 0, last: -10 });

  useEffect(() => {
    // Copia los clics de tu ratón: izquierdo o derecho según el botón que pulses
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      state.current.side = e.button === 2 ? 1 : 0;
      state.current.press = 1;
    };
    window.addEventListener("pointerdown", down);
    return () => window.removeEventListener("pointerdown", down);
  }, []);

  useFrame(({ gl }, delta) => {
    const s = state.current;
    if (s.press <= 0 && s.flash <= 0 && s.slide >= SLIDE_S) return;
    if (s.slide < SLIDE_S) {
      s.slide = Math.min(SLIDE_S, s.slide + delta);
      const p = s.slide / SLIDE_S;
      // Un pequeño desplazamiento de ida y vuelta, como quien coloca el puntero, y dos clics a mitad
      const go = Math.sin(Math.PI * Math.min(1, p / 0.85)) ** 2;
      body.current?.position.set(0.012 * go, 0, -0.016 * go);
      if (body.current) body.current.rotation.y = 0.12 * go;
      while (s.clicks < CLICKS_AT.length && p >= CLICKS_AT[s.clicks]) {
        s.clicks += 1;
        s.press = 1;
        click();
      }
      gl.shadowMap.needsUpdate = true;
    }
    s.press = Math.max(0, s.press - delta * 9);
    s.flash = Math.max(0, s.flash - delta * 0.9);
    if (left.current) left.current.position.y = s.side === 0 ? -0.035 * s.press : 0;
    if (right.current) right.current.position.y = s.side === 1 ? -0.035 * s.press : 0;
    if (flash.current) flash.current.opacity = 0.55 * s.flash ** 1.5;
  });

  const nextDpi = () => {
    const s = state.current;
    s.dpi = (s.dpi + 1) % DPI_COLORS.length;
    s.flash = 1;
    s.slide = 0;
    s.clicks = 0;
    // Pulsado de nuevo enseguida, el doble clic pasa al otro botón
    const now = performance.now() / 1000;
    s.side = now - s.last < 2.5 ? 1 - s.side : 0;
    s.last = now;
    led.current?.color.set(DPI_COLORS[s.dpi]).multiplyScalar(3);
    flash.current?.color.set(DPI_COLORS[s.dpi]);
  };
  const hover = useHoverable(t.interact.click, nextDpi);

  const wheelZ = -0.42;
  const wheelY = MOUSE_LIFT + shellTop(wheelZ) * MOUSE_SCALE[1] - 0.002;
  return (
    <group position={position} rotation={rotation} {...hover}>
      {/* Destello bajo el ratón al cambiar de DPI */}
      <mesh position={[0, 0.0015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.13, 0.19]} />
        <meshBasicMaterial ref={flash} map={spill} color={ICE} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <group ref={body}>
      <group position={[0, MOUSE_LIFT, 0]} scale={MOUSE_SCALE}>
        {/* Cuerpo: plástico más mate y algo más oscuro que los botones */}
        <mesh geometry={SHELL} castShadow receiveShadow>
          <meshStandardMaterial color="#0e0f12" roughness={0.7} />
        </mesh>
        {BUTTONS.map((g, i) => (
          <mesh key={i} ref={i === 0 ? left : right} geometry={g} castShadow>
            <meshStandardMaterial color="#2e3037" roughness={0.34} metalness={0.1} />
          </mesh>
        ))}
        <mesh geometry={SKIRT}>
          <meshStandardMaterial color="#6a6d76" roughness={0.5} metalness={0.35} />
        </mesh>
      </group>
      {/* Rueda: goma estriada sobre eje, con el hueco negro debajo */}
      <mesh position={[0, wheelY - 0.0012, wheelZ * MOUSE_SCALE[2]]}>
        <boxGeometry args={[0.0105, 0.004, 0.02]} />
        <meshStandardMaterial color="#050506" roughness={1} />
      </mesh>
      <mesh position={[0, wheelY, wheelZ * MOUSE_SCALE[2]]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.0068, 0.0068, 0.0062, 40]} />
        <meshStandardMaterial color="#8a8e98" roughness={0.45} metalness={0.6} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * 0.0034, wheelY, wheelZ * MOUSE_SCALE[2]]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.0062, 0.0062, 0.0008, 32]} />
          <meshStandardMaterial color="#1a1b1f" roughness={0.9} />
        </mesh>
      ))}
      {/* Botón de DPI tras la rueda, con su piloto tenue */}
      <RoundedBox args={[0.004, 0.0016, 0.007]} radius={0.0007} position={[0, wheelY + 0.0011, -0.0105]} rotation={[-0.12, 0, 0]}>
        <meshStandardMaterial color="#0d0e11" roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, wheelY + 0.0021, -0.0105]} rotation={[-Math.PI / 2 - 0.12, 0, 0]}>
        <circleGeometry args={[0.0007, 12]} />
        <meshBasicMaterial ref={led} color={hdr(ICE, 3)} toneMapped={false} />
      </mesh>
      {/* Botones laterales para el pulgar */}
      {[-0.002, 0.016].map((z) => (
        <RoundedBox key={z} args={[0.002, 0.005, 0.015]} radius={0.0009} position={[-0.0285, 0.016, z]} rotation={[0, -0.08, 0.25]}>
          <meshStandardMaterial color="#26272e" roughness={0.4} />
        </RoundedBox>
      ))}
      {/* Patines de PTFE: el ratón apoya sobre ellos, no sobre la carcasa */}
      {[-0.045, 0.045].map((z) => (
        <RoundedBox key={z} args={[0.03, 0.0012, 0.006]} radius={0.0005} position={[0, 0.0046, z]}>
          <meshStandardMaterial color="#d8d6d0" roughness={0.3} />
        </RoundedBox>
      ))}
      </group>
    </group>
  );
}
