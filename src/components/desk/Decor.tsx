"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { BufferGeometry, type CanvasTexture, Color, type MeshStandardMaterial, DoubleSide, SRGBColorSpace, TextureLoader, Float32BufferAttribute, type Group, PlaneGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HangingPothos, Sway } from "./Plants";
import { showHover, useHoverable } from "./interact";
import { flip, startAmbient, ticks } from "./sfx";
import { ICE } from "./palette";
import { RoundedBox } from "./primitives";
import { BOOKS, type BookSpec, CAL_PAGES, canvasTexture, drawCalendar, drawClockFace, drawRug, drawSoftDot, drawSpines, SPINE_ATLAS, SPINE_RECTS, SPINE_WHITE, type DeskCopy } from "./screens";
import { useCanvasTexture } from "./useCanvasTexture";

type Vec3 = [number, number, number];

/** Alfombra de lana bajo la mesa, donde la vista alcanza el suelo: que mirar abajo no sea un vacío negro. */
export function Rug() {
  const map = useCanvasTexture(1024, 640, drawRug);
  return (
    <mesh position={[0.05, -0.7495, 0.12]} rotation={[-Math.PI / 2, 0, 0.03]} receiveShadow>
      <planeGeometry args={[1.85, 1.12]} />
      <meshStandardMaterial map={map} bumpMap={map} bumpScale={0.6} color="#b3a6a2" roughness={1} alphaTest={0.4} />
    </mesh>
  );
}

// Tabla de roble de la balda
const SHELF_WOOD = (() => {
  const g = new RoundedBoxGeometry(0.5, 0.024, 0.14, 3, 0.004);
  g.translate(0, 0, 0.07);
  return g;
})();

// Cada libro es una sola malla: tapas teñidas por color de vértice sobre el píxel blanco del atlas y lomo con su recorte
const BOOK_GEOMETRY = BOOKS.map((b, i) => {
  const [sx, sy, sz] = b.size;
  const tint = (g: BufferGeometry, hex: string) => {
    const c = new Color(hex);
    const n = g.attributes.position.count;
    g.setAttribute("color", new Float32BufferAttribute(Array.from({ length: n }, () => [c.r, c.g, c.b]).flat(), 3));
    return g;
  };
  const cover = tint(new RoundedBoxGeometry(sx, sy, sz, 2, 0.0016), b.body);
  const uv = cover.attributes.uv;
  for (let k = 0; k < uv.count; k++) uv.setXY(k, ...SPINE_WHITE);
  const spine = tint(new PlaneGeometry(sx - 0.0012, sy - 0.0012).toNonIndexed(), "#ffffff");
  const [x, y, w, h] = SPINE_RECTS[i];
  const suv = spine.attributes.uv;
  for (let k = 0; k < suv.count; k++) {
    suv.setXY(k, (x + suv.getX(k) * w) / SPINE_ATLAS, 1 - (y + (1 - suv.getY(k)) * h) / SPINE_ATLAS);
  }
  spine.translate(0, 0, sz / 2 + 0.0003);
  const merged = mergeGeometries([cover, spine], false);
  merged.translate(0, sy / 2, 0);
  cover.dispose();
  spine.dispose();
  return merged;
});

/** Libro de la balda: al pasar el cursor asoma un poco y dice su título; al pulsarlo se saca un instante. */
function Book({ spec, geometry, label, map }: { spec: BookSpec; geometry: BufferGeometry; label: string; map: CanvasTexture }) {
  const slide = useRef<Group>(null);
  const hot = useRef(false);
  const pulled = useRef(-10);
  const hover = useHoverable(
    label,
    () => {
      pulled.current = performance.now() / 1000;
      flip();
    },
    () => {
      hot.current = true;
    },
  );
  useFrame(({ gl }, dt) => {
    const g = slide.current;
    if (!g) return;
    const s = performance.now() / 1000 - pulled.current;
    const reach = spec.lying ? 0.5 : 1;
    const target = ((hot.current ? 0.016 : 0) + (s < 0.7 ? Math.sin((Math.PI * s) / 0.7) * 0.03 : 0)) * reach;
    const next = g.position.z + (target - g.position.z) * Math.min(1, dt * 14);
    if (Math.abs(next - g.position.z) < 1e-5) return;
    g.position.z = next;
    gl.shadowMap.needsUpdate = true;
  });
  return (
    <group position={spec.at} rotation={[0, spec.turn ?? 0, 0]}>
      <group ref={slide}>
        <mesh
          geometry={geometry}
          castShadow
          receiveShadow
          {...hover}
          onPointerOut={() => {
            hot.current = false;
            hover.onPointerOut();
          }}
        >
          <meshStandardMaterial map={map} vertexColors roughness={0.78} />
        </mesh>
      </group>
    </group>
  );
}

/** Balda flotante de roble con El Señor de los Anillos, libros de programación e IA, un poto colgante y una cámara de carrete. */
export function Shelf({ t, position }: { t: DeskCopy; position: Vec3 }) {
  const dot = useCanvasTexture(128, 128, drawSoftDot);
  const draw = useMemo(() => drawSpines(t.books), [t.books]);
  const spines = useCanvasTexture(SPINE_ATLAS, SPINE_ATLAS, draw);
  return (
    <group position={position}>
      <mesh geometry={SHELF_WOOD} castShadow receiveShadow>
        <meshStandardMaterial color="#9b6b43" roughness={0.72} />
      </mesh>
      {BOOKS.map((b, i) => (
        <Book key={b.key} spec={b} geometry={BOOK_GEOMETRY[i]} map={spines} label={`${t.books[b.key].title} · ${t.books[b.key].author}`} />
      ))}
      {/* Sombra de la balda y sus objetos sobre la pared */}
      <mesh position={[0, -0.05, 0.002]} scale={[0.62, 0.16, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={dot} color="#000000" transparent opacity={0.55} depthWrite={false} />
      </mesh>

      {/* Poto colgante sobre la pila: sus guías caen por delante de la balda */}
      <Sway label={t.interact.plant} position={[0.04, 0.052, 0.072]} stiffness={18}>
        <HangingPothos position={[0, 0, 0]} />
      </Sway>

      {/* Cámara de carrete: cuerpo negro, tapa cromada y objetivo */}
      <group position={[0.175, 0.012, 0.075]} rotation={[0, -0.35, 0]}>
        <RoundedBox args={[0.085, 0.05, 0.032]} radius={0.004} position={[0, 0.025, 0]} castShadow>
          <meshStandardMaterial color="#1a1a1d" roughness={0.6} />
        </RoundedBox>
        <RoundedBox args={[0.086, 0.014, 0.033]} radius={0.003} position={[0, 0.052, 0]}>
          <meshStandardMaterial color="#b9b8b4" roughness={0.3} metalness={0.9} />
        </RoundedBox>
        <mesh position={[0, 0.026, 0.026]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.017, 0.019, 0.022, 28]} />
          <meshStandardMaterial color="#232326" roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.026, 0.0375]}>
          <circleGeometry args={[0.012, 28]} />
          <meshStandardMaterial color="#0c1218" roughness={0.05} metalness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

const smoother = (k: number) => k * k * k * (k * (k * 6 - 15) + 10);
const SPIN_S = 1.8;

/** Reloj de pared con marco de nogal: marca la hora real. Al pulsarlo las agujas dan vueltas hasta la hora. */
export function WallClock({ t, position, radius = 0.093 }: { t: DeskCopy; position: Vec3; radius?: number }) {
  const spin = useRef(-10);
  const hover = useHoverable(t.interact.clock, () => {
    if (performance.now() / 1000 - spin.current < SPIN_S) return;
    spin.current = performance.now() / 1000;
    ticks(26, SPIN_S);
  });
  const face = useCanvasTexture(256, 256, drawClockFace);
  const dot = useCanvasTexture(128, 128, drawSoftDot);
  const hour = useRef<Group>(null);
  const minute = useRef<Group>(null);
  const second = useRef<Group>(null);

  useFrame(() => {
    const d = new Date();
    const s = d.getSeconds() + d.getMilliseconds() / 1000;
    const m = d.getMinutes() + s / 60;
    const h = (d.getHours() % 12) + m / 60;
    // Vueltas de más que se van gastando: las agujas frenan y caen justo en la hora
    const left = 1 - smoother(Math.min(1, (performance.now() / 1000 - spin.current) / SPIN_S));
    const turn = Math.PI * 2 * left;
    if (hour.current) hour.current.rotation.z = -(h / 12) * Math.PI * 2 + turn * 0.5;
    if (minute.current) minute.current.rotation.z = -(m / 60) * Math.PI * 2 + turn * 3;
    // La aguja de segundos avanza a saltos, como un reloj de cuarzo
    if (second.current) second.current.rotation.z = -(Math.floor(s) / 60) * Math.PI * 2 + turn * 8;
  });

  const hand = (len: number, width: number, z: number, color: string, tail = 0) => (
    <mesh position={[0, (len - tail) / 2, z]}>
      <boxGeometry args={[width, len + tail, 0.0015]} />
      <meshStandardMaterial color={color} roughness={0.4} />
    </mesh>
  );

  return (
    <group position={position} {...hover}>
      <mesh position={[0.01, -0.012, 0.001]} scale={[radius * 2.9, radius * 2.9, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={dot} color="#000000" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[radius * 1.1, radius * 1.1, 0.024, 64, 1, true]} />
        <meshStandardMaterial color="#4a2f1f" roughness={0.5} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0.024]}>
        <torusGeometry args={[radius * 1.05, radius * 0.06, 12, 64]} />
        <meshStandardMaterial color="#5a3a26" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0, 0.006]}>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial map={face} roughness={0.7} />
      </mesh>
      <group ref={hour}>{hand(radius * 0.52, radius * 0.07, 0.009, "#1d1c1f", radius * 0.1)}</group>
      <group ref={minute}>{hand(radius * 0.78, radius * 0.045, 0.0105, "#1d1c1f", radius * 0.12)}</group>
      <group ref={second}>{hand(radius * 0.84, radius * 0.015, 0.012, "#c4552d", radius * 0.2)}</group>
      <mesh position={[0, 0, 0.0135]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.05, radius * 0.05, 0.003, 16]} />
        <meshStandardMaterial color="#c4552d" roughness={0.4} />
      </mesh>
      {/* Cristal: solo un brillo leve del entorno */}
      <mesh position={[0, 0, 0.02]}>
        <circleGeometry args={[radius, 48]} />
        <meshStandardMaterial color="#000000" roughness={0.05} metalness={1} transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  );
}

const FLIP_S = 0.42;
const HOLD_LAST_S = 0.7;

/**
 * Calendario de pared colgado de un clavo, con el mes en curso y el día de hoy rodeado. Al pulsarlo pasa
 * las hojas de los meses siguientes, cada una con su lámina, y vuelve a la del mes actual.
 */
export function WallCalendar({ t, position, lang }: { t: DeskCopy; position: Vec3; lang: string }) {
  const draw = useMemo(() => drawCalendar(lang), [lang]);
  // Se repinta cada hora: el día marcado cambia solo a medianoche
  const map = useCanvasTexture(360, 500, draw, { refreshMs: 3_600_000 });
  const dot = useCanvasTexture(128, 128, drawSoftDot);
  const W = 0.218;
  const H = W * (500 / 360);
  const base = useRef<MeshStandardMaterial>(null);
  const leaf = useRef<Group>(null);
  const leafMat = useRef<MeshStandardMaterial>(null);
  // Las hojas siguientes solo se pintan la primera vez que alguien pasa páginas
  const pages = useRef<CanvasTexture[]>([]);
  const run = useRef(-1);
  useEffect(() => {
    const made = pages.current;
    return () => {
      for (const tex of made) tex.dispose();
      made.length = 0;
    };
  }, [lang]);
  useFrame((_, delta) => {
    const g = leaf.current;
    if (run.current < 0 || !g || !base.current || !leafMat.current) return;
    const prev = run.current;
    run.current += Math.min(delta, 0.05);
    const forward = (CAL_PAGES - 1) * FLIP_S;
    const s = run.current;
    const all = [map, ...pages.current];
    if (s < forward) {
      // Hoja k se levanta por el borde de arriba y deja ver la k + 1
      const k = Math.floor(s / FLIP_S);
      const p = (s - k * FLIP_S) / FLIP_S;
      if (Math.floor(prev / FLIP_S) !== k || prev === 0) flip();
      leafMat.current.map = all[k];
      base.current.map = all[k + 1];
      g.visible = true;
      g.rotation.x = -Math.PI * 0.94 * smoother(p);
    } else if (s < forward + HOLD_LAST_S) {
      g.visible = false;
      base.current.map = all[CAL_PAGES - 1];
    } else {
      // Y la hoja de este mes baja de nuevo hasta su sitio
      const p = Math.min(1, (s - forward - HOLD_LAST_S) / (FLIP_S * 1.3));
      if (prev < forward + HOLD_LAST_S) flip();
      leafMat.current.map = map;
      g.visible = true;
      g.rotation.x = -Math.PI * 0.94 * (1 - smoother(p));
      if (p >= 1) {
        g.visible = false;
        base.current.map = map;
        run.current = -1;
      }
    }
  });
  const hover = useHoverable(t.interact.calendar, () => {
    if (run.current >= 0) return;
    if (!pages.current.length)
      for (let i = 1; i < CAL_PAGES; i += 1) pages.current.push(canvasTexture(360, 500, drawCalendar(lang, i)).tex);
    run.current = 0;
  });
  return (
    <group position={position}>
      <mesh position={[0.008, -0.012, 0.001]} scale={[W * 1.5, H * 1.25, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={dot} color="#000000" transparent opacity={0.45} depthWrite={false} />
      </mesh>
      <group {...hover}>
        {/* Cartón trasero y hojas apiladas */}
        <mesh position={[0, 0, 0.004]}>
          <boxGeometry args={[W, H, 0.004]} />
          <meshStandardMaterial color="#d8cfbf" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.0065]}>
          <planeGeometry args={[W * 0.985, H * 0.985]} />
          <meshStandardMaterial ref={base} map={map} roughness={0.85} />
        </mesh>
        {/* Hoja que se pasa: gira sobre la espiral; por detrás es papel liso */}
        <group ref={leaf} position={[0, H * 0.4925, 0.0075]} visible={false}>
          <mesh position={[0, -H * 0.4925, 0]}>
            <planeGeometry args={[W * 0.985, H * 0.985]} />
            <meshStandardMaterial ref={leafMat} map={map} roughness={0.85} />
          </mesh>
          <mesh position={[0, -H * 0.4925, -0.0002]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[W * 0.985, H * 0.985]} />
            <meshStandardMaterial color="#ece5d8" roughness={0.9} />
          </mesh>
        </group>
      </group>
      {/* Espiral de alambre arriba y el clavo del que cuelga */}
      <mesh position={[0, H / 2 - 0.004, 0.008]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.0028, 0.0028, W * 0.9, 12]} />
        <meshStandardMaterial color="#2a2a2e" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={[0, H / 2 + 0.012, 0.006]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0025, 0.0025, 0.012, 10]} />
        <meshStandardMaterial color="#8a8780" roughness={0.3} metalness={0.9} />
      </mesh>
    </group>
  );
}

const MAP_URL = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/desk/mapa.webp`;

/** Cuadro enmarcado con el mapa de la Tierra Media: marco de nogal, paspartú y cristal. */
export function MapFrame({ position, rotation }: { position: Vec3; rotation?: Vec3 }) {
  const dot = useCanvasTexture(128, 128, drawSoftDot);
  // La textura existe desde el principio: el shader se compila con ella en el calentamiento y la imagen entra al llegar
  const [map] = useState(() => {
    const t = new TextureLoader().load(MAP_URL);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
  useEffect(() => () => map.dispose(), [map]);
  const W = 0.56;
  const H = W * 0.75;
  const F = 0.026;
  const M = 0.03;
  const OW = W + M * 2 + F * 2;
  const OH = H + M * 2 + F * 2;
  const bars: Vec3[] = [
    [0, OH / 2 - F / 2, OW],
    [0, -OH / 2 + F / 2, OW],
  ];
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0.01, -0.015, 0.001]} scale={[OW * 1.25, OH * 1.3, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={dot} color="#000000" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      {bars.map(([x, y, len]) => (
        <RoundedBox key={y} args={[len, F, 0.022]} radius={0.003} position={[x, y, 0.011]} castShadow>
          <meshStandardMaterial color="#3e2718" roughness={0.5} />
        </RoundedBox>
      ))}
      {[-1, 1].map((sx) => (
        <RoundedBox key={sx} args={[F, OH - F * 2, 0.022]} radius={0.003} position={[(sx * (OW - F)) / 2, 0, 0.011]} castShadow>
          <meshStandardMaterial color="#3e2718" roughness={0.5} />
        </RoundedBox>
      ))}
      <mesh position={[0, 0, 0.004]}>
        <planeGeometry args={[OW - F * 2, OH - F * 2]} />
        <meshStandardMaterial color="#efe7d6" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[W, H]} />
        {/* Algo apagado: el farolillo y la vela están muy cerca y el pergamino se quemaba */}
        <meshStandardMaterial map={map} color="#b9b1a6" roughness={0.9} />
      </mesh>
      {/* Cristal: solo un reflejo leve del entorno */}
      <mesh position={[0, 0, 0.018]}>
        <planeGeometry args={[OW - F * 2, OH - F * 2]} />
        <meshStandardMaterial color="#000000" roughness={0.05} metalness={1} transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
  );
}

/**
 * Cascos cerrados de diadema rígida, de pie sobre la mesa. Al pulsarlos dan un saltito y ponen o quitan la música.
 */
export function Headphones({ t, position, rotation }: { t: DeskCopy; position: Vec3; rotation?: Vec3 }) {
  const R = 0.085;
  const CUP_R = 0.042;
  const hop = useRef<Group>(null);
  const pushed = useRef(-10);
  const stop = useRef<(() => void) | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => stop.current?.(), []);
  useFrame(({ gl }) => {
    const g = hop.current;
    const s = performance.now() / 1000 - pushed.current;
    if (!g || s > 0.9) return;
    // Saltito con rebote: sube, cae y se asienta con un leve giro
    const p = Math.min(1, s / 0.8);
    const y = p < 0.55 ? Math.sin((Math.PI * p) / 0.55) * 0.014 : Math.sin((Math.PI * (p - 0.55)) / 0.45) * 0.003;
    g.position.y = s > 0.85 ? 0 : y;
    g.rotation.y = s > 0.85 ? 0 : Math.sin(p * Math.PI) * 0.08;
    gl.shadowMap.needsUpdate = true;
  });
  const hover = useHoverable(playing ? t.interact.musicOff : t.interact.musicOn, () => {
    pushed.current = performance.now() / 1000;
    if (stop.current) {
      stop.current();
      stop.current = null;
      setPlaying(false);
      showHover(t.interact.musicOn);
    } else {
      stop.current = startAmbient();
      setPlaying(true);
      showHover(t.interact.musicOff);
    }
  });
  // Cascos rígidos de pie sobre sus copas, con la diadema en arco: la silueta de siempre, que se reconoce al instante
  const DROP = 0.068;
  return (
    <group position={position} rotation={rotation} {...hover}>
      <group ref={hop}>
        <group position={[0, CUP_R + DROP, 0]}>
          {/* Diadema: arco de acero con almohadilla de piel por dentro */}
          <mesh castShadow>
            <torusGeometry args={[R, 0.0045, 10, 56, Math.PI]} />
            <meshStandardMaterial color="#b9b8b4" roughness={0.3} metalness={0.9} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI * 0.18]} scale={[1, 1, 2.4]} castShadow>
            <torusGeometry args={[R - 0.007, 0.0075, 12, 40, Math.PI * 0.64]} />
            <meshStandardMaterial color="#202024" roughness={0.6} />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * R, 0, 0]}>
              {/* Deslizador y horquilla que abraza la copa */}
              <mesh position={[0, -0.022, 0]} castShadow>
                <boxGeometry args={[0.006, 0.044, 0.012]} />
                <meshStandardMaterial color="#b9b8b4" roughness={0.3} metalness={0.9} />
              </mesh>
              <mesh position={[0, -DROP, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
                <torusGeometry args={[CUP_R + 0.004, 0.0028, 8, 40, Math.PI]} />
                <meshStandardMaterial color="#b9b8b4" roughness={0.3} metalness={0.9} />
              </mesh>
              <group position={[-s * 0.004, -DROP, 0]} rotation={[0, 0, Math.PI / 2]}>
                <mesh castShadow receiveShadow>
                  <cylinderGeometry args={[CUP_R, 0.04, 0.026, 40]} />
                  <meshStandardMaterial color="#1d1d21" roughness={0.45} metalness={0.2} />
                </mesh>
                {/* Aro de acento en la tapa exterior: con la música puesta se enciende como un piloto */}
                <mesh position={[0, -s * 0.0135, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.03, 0.0016, 8, 40]} />
                  <meshStandardMaterial color="#c9a24a" roughness={0.3} metalness={1} emissive={playing ? ICE : "#000000"} emissiveIntensity={playing ? 2.5 : 0} />
                </mesh>
                {/* Almohadilla de polipiel hacia dentro */}
                <mesh position={[0, s * 0.016, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1.4]} castShadow>
                  <torusGeometry args={[0.032, 0.009, 12, 40]} />
                  <meshStandardMaterial color="#141416" roughness={0.7} />
                </mesh>
              </group>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}
