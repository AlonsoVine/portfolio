"use client";

import { useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  HalfFloatType,
  BufferAttribute,
  BufferGeometry,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  type Points,
  Scene,
  type Texture,
  WebGLRenderTarget,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { AMBER, hdr, ICE, VIOLET } from "./palette";

// Las cajas redondeadas se repiten mucho con las mismas medidas: una geometría por medida
const boxes = new Map<string, RoundedBoxGeometry>();
function roundedBox(w: number, h: number, d: number, radius: number, segments: number) {
  const key = `${w}|${h}|${d}|${radius}|${segments}`;
  let g = boxes.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, segments, Math.min(radius, w / 2, h / 2, d / 2));
    boxes.set(key, g);
  }
  return g;
}

type RBoxProps = Omit<ThreeElements["mesh"], "args"> & {
  args: [number, number, number];
  radius?: number;
  smoothness?: number;
};

/** Caja con aristas redondeadas, el ladrillo de todos los objetos «de juguete» de la escena. */
export function RoundedBox({ args, radius = 0.005, smoothness = 3, children, ...rest }: RBoxProps) {
  const geometry = roundedBox(args[0], args[1], args[2], radius, smoothness);
  return (
    <mesh geometry={geometry} {...rest}>
      {children}
    </mesh>
  );
}

/**
 * Entorno para reflejos generado en el momento: paneles emisivos frío/cálido/violeta en una escena
 * mínima, prefiltrados con PMREM. Evita descargar un HDR y los cargadores que lo acompañan.
 */
export function Reflections() {
  const gl = useThree((s) => s.gl);
  const texture = useMemo<Texture>(() => {
    const env = new Scene();
    const plane = new PlaneGeometry(1, 1);
    const panel = (color: string, k: number, pos: [number, number, number], scale: [number, number], rotY = 0, rotX = 0) => {
      const m = new Mesh(plane, new MeshBasicMaterial({ color: hdr(color, k) }));
      m.position.set(...pos);
      m.scale.set(scale[0], scale[1], 1);
      m.rotation.set(rotX, rotY, 0);
      env.add(m);
    };
    panel(ICE, 0.8, [-2, 1, 0], [2.5, 1.2], Math.PI / 2);
    panel(AMBER, 0.8, [2, 1, 0], [2.5, 1.2], -Math.PI / 2);
    panel(VIOLET, 0.45, [0, 2, -0.5], [3, 1.5], 0, Math.PI / 2);
    panel("#ffffff", 0.5, [0, 1, 2.2], [1.2, 0.6], Math.PI);
    const pmrem = new PMREMGenerator(gl);
    const rt = pmrem.fromScene(env, 0.04);
    pmrem.dispose();
    env.traverse((o) => {
      if (o instanceof Mesh) o.material.dispose();
    });
    plane.dispose();
    return rt.texture;
  }, [gl]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <primitive object={texture} attach="environment" />;
}

/** Motas de polvo flotando en la luz de las pantallas. */
export function Dust({ count = 70, map }: { count?: number; map: Texture }) {
  const points = useRef<Points>(null);
  const { geometry, seeds } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 3);
    let s = 17;
    const r = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
    for (let i = 0; i < count; i += 1) {
      // Solo en el volumen iluminado delante de las pantallas, donde la luz las delata
      seeds[i * 3] = (r() - 0.5) * 1.6;
      seeds[i * 3 + 1] = r() * 0.55 + 0.08;
      seeds[i * 3 + 2] = -0.45 + r() * 0.55;
    }
    pos.set(seeds);
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    return { geometry: g, seeds };
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    const attr = points.current?.geometry.getAttribute("position");
    if (!attr) return;
    const t = clock.elapsedTime * 0.12;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] = seeds[i] + Math.sin(t + i) * 0.03;
      arr[i + 1] = seeds[i + 1] + Math.sin(t * 0.7 + i * 1.3) * 0.04;
      arr[i + 2] = seeds[i + 2] + Math.cos(t * 0.8 + i) * 0.03;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial map={map} color={hdr(ICE, 1.2)} size={0.005} transparent opacity={0.3} depthWrite={false} blending={AdditiveBlending} />
    </points>
  );
}


/**
 * Preparación antes de revelar la escena, mientras el loader la tapa:
 * 1. compila todos los shaders (si no, cada material se compila al entrar en cuadro y girar pega un tirón);
 * 2. sube todas las texturas a la GPU;
 * 3. mide unos fotogramas y, si no llega a ~45 fps, baja el DPR y avisa para quitar efectos caros.
 * Decidir la calidad aquí evita que los efectos desaparezcan de golpe a mitad de la visita.
 */
export function Warmup({ onReady, onLow }: { onReady: () => void; onLow: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const setDpr = useThree((s) => s.setDpr);
  const probe = useRef({ phase: "compile" as "compile" | "measure" | "done", samples: [] as number[], n: 0 });

  useEffect(() => {
    let alive = true;
    // El composer pinta la escena en un render target lineal: se compila contra uno igual, o los
    // programas calentados (salida sRGB al canvas) no sirven y se recompilan en el primer fotograma
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType });
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(target);
    const compiling = gl.compileAsync(scene, camera);
    gl.setRenderTarget(prev);
    compiling
      .catch(() => undefined)
      .then(() => {
        target.dispose();
        if (!alive) return;
        scene.traverse((o) => {
          const material = (o as Mesh).material;
          for (const m of Array.isArray(material) ? material : material ? [material] : []) {
            for (const value of Object.values(m)) if ((value as Texture | null)?.isTexture) gl.initTexture(value as Texture);
          }
        });
        probe.current.phase = "measure";
      });
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __desk: gl });
    return () => {
      alive = false;
    };
  }, [gl, scene, camera]);

  useFrame((_, delta) => {
    const p = probe.current;
    if (p.phase !== "measure") return;
    p.n += 1;
    // Los primeros fotogramas tras compilar aún suben texturas: no son representativos
    if (p.n <= 10) return;
    p.samples.push(delta);
    if (p.samples.length < 30) return;
    p.phase = "done";
    // Mediana: un tirón aislado no debe condenar a la máquina al modo bajo
    const median = [...p.samples].sort((a, b) => a - b)[15];
    if (median > 1 / 40) {
      setDpr(1);
      onLow();
    }
    requestAnimationFrame(onReady);
  });
  return null;
}