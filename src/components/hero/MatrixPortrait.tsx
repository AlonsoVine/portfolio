"use client";

import { useEffect, useRef } from "react";
import { POINTER_SMOOTH_MS } from "./motion";

const GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789:=*+<>";
const INTRO_DELAY_MS = 450;
const INTRO_MS = 2100;
const INTRO_FADE_MS = 420;
const TRAIL_HALF_LIFE_MS = 280;
const RAIN_TAIL = 12;
const LEVELS = 12;
const GLITCH_MS = 140;
// Por encima de esto solo se llega en la intro (silueta entera); al mover el ratón se pinta celda a celda
const HEAVY_CELLS = 3500;

type Grid = {
  w: number;
  h: number;
  dpr: number;
  cw: number;
  ch: number;
  cols: number;
  rows: number;
  radius: number;
  atlas: HTMLCanvasElement;
  gw: number;
  gh: number;
  lum: Float32Array;
  inside: Uint8Array;
  noise: Float32Array;
  chars: Uint8Array;
  heat: Float32Array;
  head: Float32Array;
  speed: Float32Array;
  mask: HTMLCanvasElement;
  maskCtx: CanvasRenderingContext2D;
  maskData: ImageData;
  voidLayer: HTMLCanvasElement;
  voidCtx: CanvasRenderingContext2D;
  codeLayer: HTMLCanvasElement;
  codeCtx: CanvasRenderingContext2D;
  fieldLayer: HTMLCanvasElement;
  fieldCtx: CanvasRenderingContext2D;
  baseLayer: HTMLCanvasElement;
};

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  start: boolean;
  onInteract?: () => void;
};

function layer(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Retrato con capa «Matrix». El calor de cada celda (cursor, estela, intro) se escribe en un canvas diminuto
 * de una celda por píxel y se escala con suavizado bilineal: así la máscara sale orgánica sin calcularla a
 * resolución completa. Esa máscara oscurece la foto (solo dentro de la silueta) y recorta la lluvia de glifos,
 * que además se duplica en un canvas desenfocado por CSS para el bloom.
 */
export function MatrixPortrait({ src, alt, width, height, start, onInteract }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const onInteractRef = useRef(onInteract);
  const startRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onInteractRef.current = onInteract;
  }, [onInteract]);

  useEffect(() => {
    if (start) startRef.current?.();
  }, [start]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const glow = glowRef.current;
    const img = imgRef.current;
    const ctx = canvas?.getContext("2d");
    const gctx = glow?.getContext("2d");
    if (!wrap || !canvas || !glow || !img || !ctx || !gctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(hover: none)").matches;
    const rootStyle = getComputedStyle(document.documentElement);
    const matrixRgb = rootStyle.getPropertyValue("--matrix-rgb").trim() || "70, 255, 140";
    const headRgb = rootStyle.getPropertyValue("--matrix-head-rgb").trim() || "215, 255, 228";
    const stage = rootStyle.getPropertyValue("--stage").trim() || "#04050a";
    const monoFamily = rootStyle.getPropertyValue("--font-mono").trim();
    const bodyBuckets: number[][] = Array.from({ length: LEVELS }, () => []);
    const headBuckets: number[][] = Array.from({ length: LEVELS }, () => []);

    let grid: Grid | null = null;
    let raf = 0;
    let running = false;
    let prev = 0;
    // hold: esperando a la intro (la silueta se ve hecha de código); intro: compilándose; live: interactivo
    let phase: "hold" | "intro" | "live" = reduce ? "live" : "hold";
    let introStart = 0;
    let ghostStart = -1;
    let interacted = false;
    const target = { x: 0, y: 0 };
    const smooth = { x: 0, y: 0 };
    let pointerActive = false;
    let lastStamp: { x: number; y: number } | null = null;
    const timers: number[] = [];
    let glitch: { start: number; bands: { r0: number; r1: number; c0: number; c1: number }[] } | null = null;

    const build = (): Grid | null => {
      const box = wrap.getBoundingClientRect();
      if (!box.width || !box.height || !img.naturalWidth) return null;
      const w = box.width;
      const h = box.height;
      // 1.5 basta para glifos nítidos y reduce casi a la mitad el relleno por fotograma frente a 2
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      glow.width = Math.round(w / 2);
      glow.height = Math.round(h / 2);

      const ch = Math.max(7, Math.min(13, Math.round(w / 88)));
      const cw = ch * 0.7;
      const cols = Math.ceil(w / cw);
      const rows = Math.ceil(h / ch);

      const sample = layer(cols, rows);
      const sctx = sample.getContext("2d", { willReadFrequently: true });
      if (!sctx) return null;
      sctx.drawImage(img, 0, 0, w / cw, h / ch);
      const data = sctx.getImageData(0, 0, cols, rows).data;

      const n = cols * rows;
      const lum = new Float32Array(n);
      const inside = new Uint8Array(n);
      let lo = 1;
      let hi = 0;
      for (let i = 0; i < n; i += 1) {
        const k = i * 4;
        const l = (0.299 * data[k] + 0.587 * data[k + 1] + 0.114 * data[k + 2]) / 255;
        lum[i] = l;
        if (data[k + 3] > 110) {
          inside[i] = 1;
          if (l < lo) lo = l;
          if (l > hi) hi = l;
        }
      }
      // Estira el rango tonal para que la cara use todo el brillo disponible
      const span = Math.max(hi - lo, 0.01);
      for (let i = 0; i < n; i += 1) {
        lum[i] = 0.12 + 0.88 * Math.pow(Math.min(1, Math.max(0, (lum[i] - lo) / span)), 0.75);
      }

      const noise = new Float32Array(n);
      const chars = new Uint8Array(n);
      for (let i = 0; i < n; i += 1) {
        noise[i] = Math.random();
        chars[i] = (Math.random() * GLYPHS.length) | 0;
      }
      const head = new Float32Array(cols);
      const speed = new Float32Array(cols);
      for (let c = 0; c < cols; c += 1) {
        head[c] = Math.random() * rows * 1.5 - rows * 0.5;
        speed[c] = 8 + Math.random() * 18;
      }

      const mask = layer(cols, rows);
      const maskCtx = mask.getContext("2d");
      const voidLayer = layer(canvas.width, canvas.height);
      const voidCtx = voidLayer.getContext("2d");
      const codeLayer = layer(canvas.width, canvas.height);
      const codeCtx = codeLayer.getContext("2d");
      const fieldLayer = layer(canvas.width, canvas.height);
      const fieldCtx = fieldLayer.getContext("2d");
      // Atlas de glifos prerenderizados (fila 0: cuerpo, fila 1: cabeza de la lluvia). drawImage desde aquí es
      // mucho más barato que miles de fillText por fotograma
      const gw = Math.ceil(cw * dpr);
      const gh = Math.ceil(ch * dpr);
      const atlas = layer(gw * GLYPHS.length, gh * 2);
      const actx = atlas.getContext("2d");
      if (!maskCtx || !voidCtx || !codeCtx || !fieldCtx || !actx) return null;
      actx.font = `500 ${Math.round(ch * 0.95 * dpr)}px ${monoFamily || "ui-monospace"}, "MS Gothic", "Yu Gothic", monospace`;
      actx.textAlign = "center";
      actx.textBaseline = "middle";
      [matrixRgb, headRgb].forEach((rgb, row) => {
        actx.fillStyle = `rgb(${rgb})`;
        for (let k = 0; k < GLYPHS.length; k += 1) actx.fillText(GLYPHS[k], k * gw + gw / 2, row * gh + gh / 2);
      });
      // Silueta de código completa, pintada una sola vez por tamaño (base de la intro)
      const baseLayer = layer(canvas.width, canvas.height);
      const bctx = baseLayer.getContext("2d");
      if (!bctx) return null;
      for (let i = 0; i < n; i += 1) {
        if (!inside[i]) continue;
        bctx.globalAlpha = Math.max(0.08, Math.min(1, lum[i] * 0.95));
        bctx.drawImage(atlas, chars[i] * gw, 0, gw, gh, (i % cols) * cw * dpr, ((i / cols) | 0) * ch * dpr, gw, gh);
      }
      const maskData = maskCtx.createImageData(cols, rows);
      for (let i = 0; i < n; i += 1) {
        maskData.data[i * 4] = 255;
        maskData.data[i * 4 + 1] = 255;
        maskData.data[i * 4 + 2] = 255;
      }

      return {
        w,
        h,
        dpr,
        cw,
        ch,
        cols,
        rows,
        radius: Math.max(80, Math.min(190, w * 0.145)),
        atlas,
        gw,
        gh,
        lum,
        inside,
        noise,
        chars,
        heat: new Float32Array(n),
        head,
        speed,
        mask,
        maskCtx,
        maskData,
        voidLayer,
        voidCtx,
        codeLayer,
        codeCtx,
        fieldLayer,
        fieldCtx,
        baseLayer,
      };
    };

    const stamp = (g: Grid, x: number, y: number, radius: number) => {
      const c0 = Math.max(0, Math.floor((x - radius) / g.cw));
      const c1 = Math.min(g.cols - 1, Math.ceil((x + radius) / g.cw));
      const r0 = Math.max(0, Math.floor((y - radius) / g.ch));
      const r1 = Math.min(g.rows - 1, Math.ceil((y + radius) / g.ch));
      for (let row = r0; row <= r1; row += 1) {
        const cy = (row + 0.5) * g.ch;
        for (let col = c0; col <= c1; col += 1) {
          const i = row * g.cols + col;
          const cx = (col + 0.5) * g.cw;
          const d = Math.hypot(cx - x, cy - y) / radius + (g.noise[i] - 0.5) * 0.22;
          if (d >= 1) continue;
          const t = Math.min(1, (1 - d) / 0.4);
          const v = t * t * (3 - 2 * t);
          if (v > g.heat[i]) g.heat[i] = v;
        }
      }
    };

    const stampSegment = (g: Grid, from: { x: number; y: number }, to: { x: number; y: number }, radius: number) => {
      const dist = Math.hypot(to.x - from.x, to.y - from.y);
      const steps = Math.max(1, Math.ceil(dist / (radius * 0.2)));
      for (let s = 1; s <= steps; s += 1) {
        const t = s / steps;
        stamp(g, from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, radius);
      }
    };

    const ghostPos = (g: Grid, t: number) => {
      const p = Math.min(1, t / 1700);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      return { x: g.w * (0.28 + 0.44 * e), y: g.h * (0.35 + 0.06 * Math.sin(e * Math.PI * 2)), done: p >= 1 };
    };

    const draw = (g: Grid) => {
      const { heat, maskData, maskCtx, mask, voidCtx, codeCtx, fieldLayer, fieldCtx } = g;
      const W = canvas.width;
      const H = canvas.height;
      const sw = g.cols * g.cw * g.dpr;
      const sh = g.rows * g.ch * g.dpr;

      for (let i = 0; i < heat.length; i += 1) maskData.data[i * 4 + 3] = heat[i] * 255;
      maskCtx.putImageData(maskData, 0, 0);

      // Velo oscuro: máscara suave ∩ silueta del retrato
      voidCtx.globalCompositeOperation = "source-over";
      voidCtx.clearRect(0, 0, W, H);
      voidCtx.imageSmoothingEnabled = true;
      voidCtx.imageSmoothingQuality = "high";
      voidCtx.drawImage(mask, 0, 0, sw, sh);
      voidCtx.globalCompositeOperation = "source-in";
      voidCtx.fillStyle = stage;
      voidCtx.globalAlpha = 0.95;
      voidCtx.fillRect(0, 0, W, H);
      voidCtx.globalAlpha = 1;
      voidCtx.globalCompositeOperation = "destination-in";
      voidCtx.drawImage(img, 0, 0, W, H);
      voidCtx.globalCompositeOperation = "source-over";

      for (let l = 0; l < LEVELS; l += 1) {
        bodyBuckets[l].length = 0;
        headBuckets[l].length = 0;
      }
      for (let row = 0; row < g.rows; row += 1) {
        for (let col = 0; col < g.cols; col += 1) {
          const i = row * g.cols + col;
          if (heat[i] < 0.015) continue;
          const dist = g.head[col] - row;
          const boost = dist >= 0 && dist < RAIN_TAIL ? 1 - dist / RAIN_TAIL : 0;
          const a = g.inside[i] ? Math.min(1, g.lum[i] * 0.95 + boost * 0.5) : boost * 0.42;
          if (a < 0.05) continue;
          const level = Math.min(LEVELS - 1, (a * LEVELS) | 0);
          (dist >= 0 && dist < 1 ? headBuckets : bodyBuckets)[level].push(i);
        }
      }

      let count = 0;
      for (let l = 0; l < LEVELS; l += 1) count += bodyBuckets[l].length + headBuckets[l].length;
      fieldCtx.globalCompositeOperation = "source-over";
      fieldCtx.clearRect(0, 0, W, H);
      const stepX = g.cw * g.dpr;
      const stepY = g.ch * g.dpr;

      if (count > HEAVY_CELLS) {
        // Silueta casi entera (intro): se parte de la silueta de código prerenderizada y solo se pintan encima
        // las estelas de lluvia, unas pocas centenas de glifos en lugar de miles
        fieldCtx.drawImage(g.baseLayer, 0, 0);
        for (let col = 0; col < g.cols; col += 1) {
          const headRow = Math.floor(g.head[col]);
          const r0 = Math.max(0, headRow - RAIN_TAIL + 1);
          const r1 = Math.min(g.rows - 1, headRow);
          for (let row = r0; row <= r1; row += 1) {
            const i = row * g.cols + col;
            if (heat[i] < 0.015) continue;
            const dist = g.head[col] - row;
            const boost = 1 - dist / RAIN_TAIL;
            fieldCtx.globalAlpha = Math.min(1, boost * (g.inside[i] ? 0.55 : 0.42));
            fieldCtx.drawImage(g.atlas, g.chars[i] * g.gw, (dist < 1 ? 1 : 0) * g.gh, g.gw, g.gh, col * stepX, row * stepY, g.gw, g.gh);
          }
        }
        fieldCtx.globalAlpha = 1;
        codeCtx.globalCompositeOperation = "source-over";
        codeCtx.clearRect(0, 0, W, H);
        codeCtx.drawImage(fieldLayer, 0, 0);
        codeCtx.globalCompositeOperation = "destination-in";
        codeCtx.drawImage(mask, 0, 0, sw, sh);
        codeCtx.globalCompositeOperation = "source-over";
        composite(g);
        return;
      }
      const paint = (buckets: number[][], atlasRow: number) => {
        for (let l = 0; l < LEVELS; l += 1) {
          const cells = buckets[l];
          if (!cells.length) continue;
          fieldCtx.globalAlpha = (l + 1) / LEVELS;
          for (const i of cells) {
            const col = i % g.cols;
            const row = (i / g.cols) | 0;
            fieldCtx.drawImage(g.atlas, g.chars[i] * g.gw, atlasRow * g.gh, g.gw, g.gh, col * stepX, row * stepY, g.gw, g.gh);
          }
        }
        fieldCtx.globalAlpha = 1;
      };
      paint(bodyBuckets, 0);
      paint(headBuckets, 1);
      codeCtx.globalCompositeOperation = "source-over";
      codeCtx.clearRect(0, 0, W, H);
      codeCtx.drawImage(fieldLayer, 0, 0);
      codeCtx.globalCompositeOperation = "destination-in";
      codeCtx.imageSmoothingEnabled = true;
      codeCtx.drawImage(mask, 0, 0, sw, sh);
      codeCtx.globalCompositeOperation = "source-over";
      composite(g);
    };

    const composite = (g: Grid) => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(g.voidLayer, 0, 0);
      ctx.drawImage(g.codeLayer, 0, 0);
      gctx.clearRect(0, 0, glow.width, glow.height);
      gctx.drawImage(g.codeLayer, 0, 0, glow.width, glow.height);
    };

    const frame = (now: number) => {
      const g = grid;
      if (!g) {
        running = false;
        return;
      }
      const dt = Math.min(50, prev ? now - prev : 16);
      prev = now;
      const heat = g.heat;

      const decay = Math.pow(0.5, dt / TRAIL_HALF_LIFE_MS);
      for (let i = 0; i < heat.length; i += 1) {
        const v = heat[i] * decay;
        heat[i] = v < 0.012 ? 0 : v;
      }

      if (phase === "hold") {
        for (let i = 0; i < heat.length; i += 1) if (g.inside[i]) heat[i] = 1;
      } else if (phase === "intro") {
        const t = now - introStart;
        if (t >= INTRO_MS + INTRO_FADE_MS) {
          phase = "live";
          if (!coarse) ghostStart = now + 700;
        } else {
          // Se compila de arriba abajo, como si la lluvia fuese dejando la imagen
          for (let row = 0; row < g.rows; row += 1) {
            const base = (row / g.rows) * 0.7;
            for (let col = 0; col < g.cols; col += 1) {
              const i = row * g.cols + col;
              if (!g.inside[i]) continue;
              const thr = (base + g.noise[i] * 0.3) * INTRO_MS;
              const v = Math.min(1, Math.max(0, (thr + INTRO_FADE_MS - t) / INTRO_FADE_MS));
              if (v > heat[i]) heat[i] = v;
            }
          }
        }
      }

      if (pointerActive) {
        const k = 1 - Math.exp(-dt / POINTER_SMOOTH_MS);
        smooth.x += (target.x - smooth.x) * k;
        smooth.y += (target.y - smooth.y) * k;
        const to = { x: smooth.x, y: smooth.y };
        stampSegment(g, lastStamp ?? to, to, g.radius);
        lastStamp = to;
      }

      let ghostActive = false;
      if (ghostStart >= 0 && now >= ghostStart) {
        const p = ghostPos(g, now - ghostStart);
        stamp(g, p.x, p.y, g.radius * 0.9);
        if (p.done) ghostStart = -1;
        else ghostActive = true;
      }

      let glitchActive = false;
      if (glitch && now - glitch.start < GLITCH_MS) {
        glitchActive = true;
        for (const band of glitch.bands) {
          for (let row = band.r0; row <= band.r1 && row < g.rows; row += 1) {
            for (let col = band.c0; col <= band.c1 && col < g.cols; col += 1) {
              const i = row * g.cols + col;
              if (g.inside[i] && heat[i] < 0.95) heat[i] = 0.95;
            }
          }
        }
      } else glitch = null;

      if (!reduce) {
        const step = dt / 1000;
        for (let c = 0; c < g.cols; c += 1) {
          g.head[c] += g.speed[c] * step;
          if (g.head[c] - RAIN_TAIL > g.rows) {
            g.head[c] = -Math.random() * g.rows * 0.6;
            g.speed[c] = 8 + Math.random() * 18;
          }
        }
        const swaps = (heat.length * 0.01 * dt) / 16;
        for (let s = 0; s < swaps; s += 1) {
          g.chars[(Math.random() * heat.length) | 0] = (Math.random() * GLYPHS.length) | 0;
        }
      }

      let hot = false;
      for (let i = 0; i < heat.length; i += 1) {
        if (heat[i] > 0) {
          hot = true;
          break;
        }
      }

      draw(g);

      if (hot || pointerActive || ghostActive || glitchActive || ghostStart >= 0 || phase !== "live") {
        raf = requestAnimationFrame(frame);
      } else {
        running = false;
        prev = 0;
      }
    };

    const kick = () => {
      if (running || !grid) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };

    startRef.current = () => {
      if (phase !== "hold") return;
      phase = "intro";
      introStart = performance.now() + INTRO_DELAY_MS;
      kick();
    };

    const setup = () => {
      grid = build();
      kick();
    };

    // La caja se cachea: leerla en cada pointermove forzaba un layout síncrono por evento
    let box = canvas.getBoundingClientRect();
    const measure = () => {
      box = canvas.getBoundingClientRect();
    };
    const toLocal = (e: PointerEvent) => ({ x: e.clientX - box.left, y: e.clientY - box.top });

    const onMove = (e: PointerEvent) => {
      if (phase !== "live") return;
      const p = toLocal(e);
      target.x = p.x;
      target.y = p.y;
      if (!pointerActive) {
        smooth.x = p.x;
        smooth.y = p.y;
        lastStamp = null;
      }
      pointerActive = true;
      ghostStart = -1;
      if (!interacted) {
        interacted = true;
        onInteractRef.current?.();
      }
      kick();
    };

    const onLeave = () => {
      pointerActive = false;
      lastStamp = null;
    };

    const onDown = (e: PointerEvent) => {
      onMove(e);
      if (e.pointerType !== "mouse" && grid && phase === "live") {
        const p = toLocal(e);
        stamp(grid, p.x, p.y, grid.radius * 1.5);
      }
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") onLeave();
    };

    let resizeRaf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        measure();
        if (!img.naturalWidth) return;
        grid = build();
        kick();
      });
    });
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);

    if (img.complete && img.naturalWidth) setup();
    else img.addEventListener("load", setup, { once: true });

    // En reposo, de vez en cuando unas franjas del retrato «se cuelan» a código un instante
    const scheduleGlitch = () => {
      timers.push(
        window.setTimeout(() => {
          const g = grid;
          if (g && phase === "live" && !pointerActive && !document.hidden) {
            const count = 1 + ((Math.random() * 3) | 0);
            glitch = {
              start: performance.now(),
              bands: Array.from({ length: count }, () => {
                const r0 = Math.floor(g.rows * (0.12 + Math.random() * 0.6));
                const span = Math.floor(g.cols * (0.25 + Math.random() * 0.5));
                const c0 = Math.floor(Math.random() * (g.cols - span));
                return { r0, r1: r0 + 1 + ((Math.random() * 4) | 0), c0, c1: c0 + span };
              }),
            };
            kick();
          }
          scheduleGlitch();
        }, 5200 + Math.random() * 4800),
      );
    };
    if (!reduce) scheduleGlitch();

    // En táctil no hay hover: un barrido periódico enseña el efecto mientras nadie toca
    if (coarse && !reduce) {
      timers.push(
        window.setInterval(() => {
          if (document.hidden || pointerActive || phase !== "live") return;
          ghostStart = performance.now();
          kick();
        }, 6500),
      );
    }

    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointerleave", onLeave);
    wrap.addEventListener("pointerup", onUp);
    wrap.addEventListener("pointercancel", onLeave);
    ro.observe(wrap);

    return () => {
      startRef.current = null;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeRaf);
      timers.forEach((id) => {
        window.clearInterval(id);
        window.clearTimeout(id);
      });
      ro.disconnect();
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      img.removeEventListener("load", setup);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointerleave", onLeave);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", onLeave);
    };
  }, []);

  return (
    <div ref={wrapRef} className="hero-portrait" data-cursor="decode">
      {/* eslint-disable-next-line @next/next/no-img-element -- export estático: la imagen ya va optimizada en WebP */}
      <img ref={imgRef} src={src} alt={alt} width={width} height={height} fetchPriority="high" draggable={false} />
      <canvas ref={glowRef} className="hero-portrait-glow" aria-hidden="true" />
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}
