import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import type { Dictionary } from "@/i18n/dictionaries";
import { AMBER, GRADIENT, ICE, MAGENTA, MINT, VIOLET } from "./palette";

export type DeskCopy = Dictionary["desk"];
export type Fonts = { mono: string; display: string };
export type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, font: Fonts) => void;

function fonts(): Fonts {
  const css = getComputedStyle(document.documentElement);
  return {
    mono: css.getPropertyValue("--font-mono").trim() || "monospace",
    display: css.getPropertyValue("--font-display").trim() || "sans-serif",
  };
}

export type CanvasTex = { tex: CanvasTexture; paint: () => void };

/**
 * Textura dibujada en un canvas. Se repinta al cargar las fuentes web, porque el primer dibujado
 * puede salir con la fuente de reserva, y cuando la pantalla muestra la hora.
 */
export function canvasTexture(w: number, h: number, draw: Draw, opts: { tile?: [number, number]; color?: boolean } = {}): CanvasTex {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const tex = new CanvasTexture(canvas);
  if (opts.color !== false) tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  if (opts.tile) {
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.repeat.set(...opts.tile);
  }
  const paint = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    draw(ctx, w, h, fonts());
    tex.needsUpdate = true;
  };
  paint();
  // Solo se repinta lo que lleva texto; madera, tela o ruido no dependen de las fuentes
  if (!FONT_FREE.has(draw)) document.fonts.ready.then(paint);
  return { tex, paint };
}

/* ---------- utilidades de dibujo ---------- */

function vgrad(ctx: CanvasRenderingContext2D, h: number, stops: string[]) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}

function hgrad(ctx: CanvasRenderingContext2D, x0: number, x1: number, stops: string[]) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, withAlpha(color, a));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

export function withAlpha(hex: string, a: number) {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function text(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  font: string,
  color: string | CanvasGradient,
  opts: { glow?: number; spacing?: number; align?: CanvasTextAlign } = {},
) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = opts.align ?? "left";
  ctx.letterSpacing = `${opts.spacing ?? 0}px`;
  if (opts.glow) {
    ctx.shadowColor = typeof color === "string" ? color : "#ffffff";
    ctx.shadowBlur = opts.glow;
  }
  ctx.fillText(s, x, y);
  ctx.shadowBlur = 0;
  ctx.letterSpacing = "0px";
  ctx.textAlign = "left";
}

const display = (f: Fonts, size: number, weight = 800) => `${weight} ${size}px ${f.display}`;
const mono = (f: Fonts, size: number, weight = 500) => `${weight} ${size}px ${f.mono}`;

// Generador determinista: las pantallas tienen que salir idénticas en cada carga
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/* ---------- pantallas ---------- */

const TOKENS = [ICE, AMBER, VIOLET, MAGENTA, "#c9d4e5", "#56627a"];

function codeLines(ctx: CanvasRenderingContext2D, f: Fonts, x: number, y: number, w: number, lines: number, lh: number, seed: number) {
  const r = rng(seed);
  for (let i = 0; i < lines; i += 1) {
    text(ctx, String(i + 1).padStart(2, " "), x, y + i * lh, mono(f, lh * 0.5), "#34405a");
    let cx = x + lh * 1.6 + (i % 4 === 0 ? 0 : Math.floor(r() * 3) * lh * 0.9);
    const n = 2 + Math.floor(r() * 4);
    for (let j = 0; j < n && cx < x + w; j += 1) {
      const seg = lh * (1.2 + r() * 4.2);
      ctx.fillStyle = withAlpha(TOKENS[Math.floor(r() * TOKENS.length)], 0.85);
      rrect(ctx, cx, y + i * lh - lh * 0.42, seg, lh * 0.34, lh * 0.1);
      ctx.fill();
      cx += seg + lh * 0.45;
    }
  }
}

export const drawCv =
  (t: DeskCopy): Draw =>
  (ctx, w, h, f) => {
    ctx.fillStyle = vgrad(ctx, h, ["#0c1422", "#070b14"]);
    ctx.fillRect(0, 0, w, h);
    glow(ctx, w * 0.42, h * 0.3, w * 0.35, ICE, 0.1);
    glow(ctx, w * 0.85, h * 0.85, w * 0.25, VIOLET, 0.08);

    // Barra de actividad y explorador
    ctx.fillStyle = "#080d17";
    ctx.fillRect(0, 0, w * 0.035, h);
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = i === 0 ? ICE : "#2a3650";
      rrect(ctx, w * 0.011, h * (0.1 + i * 0.09), w * 0.013, w * 0.013, 6);
      ctx.fill();
    }
    ctx.fillStyle = "#0a101c";
    ctx.fillRect(w * 0.035, 0, w * 0.13, h);
    text(ctx, "PORTFOLIO", w * 0.045, h * 0.07, mono(f, 17), "#5b6a86", { spacing: 3 });
    const files = ["experiencia.md", "formacion.md", "skills.ts", "cv.tsx", "contacto.json", "certificados/"];
    files.forEach((name, i) =>
      text(ctx, name, w * 0.055, h * (0.14 + i * 0.055), mono(f, 19), i === 3 ? ICE : "#7d8aa3"),
    );
    ctx.fillStyle = withAlpha(ICE, 0.12);
    ctx.fillRect(w * 0.035, h * (0.14 + 3 * 0.055) - 22, w * 0.13, 32);

    // Pestañas
    ctx.fillStyle = "#0a101c";
    ctx.fillRect(w * 0.165, 0, w, h * 0.065);
    ["cv.tsx", "experiencia.md", "skills.ts"].forEach((tab, i) => {
      const x = w * (0.165 + i * 0.09);
      if (i === 0) {
        ctx.fillStyle = "#0c1422";
        ctx.fillRect(x, 0, w * 0.09, h * 0.065);
        ctx.fillStyle = ICE;
        ctx.fillRect(x, 0, w * 0.09, 4);
      }
      text(ctx, tab, x + w * 0.014, h * 0.043, mono(f, 18), i === 0 ? "#dce9ff" : "#5b6a86");
    });

    // Cabecera del documento
    const x0 = w * 0.2;
    text(ctx, `// 002 — ${t.screens.cv.toUpperCase()}`, x0, h * 0.16, mono(f, 22), "#5b6a86", { spacing: 4 });
    text(ctx, "ALONSO VIÑÉ", x0, h * 0.33, display(f, 104, 800), hgrad(ctx, x0, x0 + w * 0.42, [ICE, "#e4f6ff"]), {
      glow: 30,
      spacing: 2,
    });
    text(ctx, t.screens.cvRole, x0, h * 0.405, mono(f, 28), AMBER, { spacing: 6 });
    text(ctx, t.screens.cvDetail, x0, h * 0.46, mono(f, 22), "#8a98b2", { spacing: 3 });
    codeLines(ctx, f, x0, h * 0.56, w * 0.36, 9, 34, 7);

    // Línea temporal de experiencia
    const tx = w * 0.64;
    ctx.fillStyle = "#0b1220";
    rrect(ctx, tx - 30, h * 0.12, w * 0.33, h * 0.74, 18);
    ctx.fill();
    ctx.strokeStyle = "#1c2840";
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, t.screens.cvTimeline, tx, h * 0.19, mono(f, 20), "#5b6a86", { spacing: 4 });
    ctx.fillStyle = "#1f2b44";
    ctx.fillRect(tx + 9, h * 0.24, 3, h * 0.56);
    const stops = [ICE, VIOLET, AMBER, MAGENTA];
    const r = rng(3);
    stops.forEach((c, i) => {
      const y = h * (0.27 + i * 0.145);
      ctx.fillStyle = c;
      ctx.shadowColor = c;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(tx + 10, y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#c9d4e5";
      rrect(ctx, tx + 40, y - 14, w * (0.1 + r() * 0.08), 14, 5);
      ctx.fill();
      ctx.fillStyle = "#3a4762";
      rrect(ctx, tx + 40, y + 10, w * (0.16 + r() * 0.08), 10, 4);
      ctx.fill();
      rrect(ctx, tx + 40, y + 30, w * (0.08 + r() * 0.1), 10, 4);
      ctx.fill();
    });

    // Barra de estado
    ctx.fillStyle = hgrad(ctx, 0, w, [VIOLET, "#5a49c9"]);
    ctx.fillRect(0, h - 30, w, 30);
    text(ctx, "⎇ main   ✓ 0   UTF-8   TypeScript React", 20, h - 9, mono(f, 17), "#f1eeff");
  };

const INVADERS = [
  ["00100000100", "00010001000", "00111111100", "01101110110", "11111111111", "10111111101", "10100000101", "00011011000"],
  ["00011111000", "01111111110", "11111111111", "11100100111", "11111111111", "00011011000", "00110001100", "11000000011"],
];

export const drawGames =
  (t: DeskCopy): Draw =>
  (ctx, w, h, f) => {
    ctx.fillStyle = vgrad(ctx, h, ["#0b0520", "#2a0a3d", "#120320"]);
    ctx.fillRect(0, 0, w, h);
    // Sol synthwave con franjas
    const sx = w / 2;
    const sy = h * 0.6;
    const sr = h * 0.3;
    ctx.save();
    ctx.beginPath();
    ctx.arc(sx, sy, sr, Math.PI, 0);
    ctx.clip();
    ctx.fillStyle = vgrad(ctx, h, [AMBER, AMBER, MAGENTA, MAGENTA]);
    ctx.fillRect(sx - sr, sy - sr, sr * 2, sr);
    ctx.fillStyle = "#1a0630";
    for (let i = 0; i < 6; i += 1) ctx.fillRect(sx - sr, sy - sr * 0.55 + i * i * 4 + i * 10, sr * 2, 3 + i * 1.6);
    ctx.restore();
    glow(ctx, sx, sy - sr * 0.4, sr * 1.6, MAGENTA, 0.25);
    // Suelo en perspectiva
    ctx.fillStyle = "#0d0218";
    ctx.fillRect(0, sy, w, h - sy);
    ctx.strokeStyle = withAlpha(MAGENTA, 0.75);
    ctx.lineWidth = 2;
    for (let i = -12; i <= 12; i += 1) {
      ctx.beginPath();
      ctx.moveTo(sx + i * 18, sy);
      ctx.lineTo(sx + i * 140, h);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i += 1) {
      const y = sy + Math.pow(i / 7, 2) * (h - sy);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // Invasores
    const px = 6;
    for (let col = 0; col < 7; col += 1) {
      const shape = INVADERS[col % 2];
      const ox = w * 0.13 + col * w * 0.11;
      const oy = h * 0.07 + (col % 2) * 14;
      ctx.fillStyle = col % 3 === 0 ? MINT : ICE;
      ctx.shadowColor = ctx.fillStyle as string;
      ctx.shadowBlur = 10;
      shape.forEach((line, y) => [...line].forEach((bit, x) => bit === "1" && ctx.fillRect(ox + x * px, oy + y * px, px, px)));
    }
    ctx.shadowBlur = 0;
    text(ctx, t.screens.games.toUpperCase(), sx, h * 0.47, display(f, 118, 900), "#fff4e6", {
      glow: 24,
      align: "center",
      spacing: 6,
    });
    text(ctx, t.screens.gamesDetail, sx, h * 0.53, mono(f, 22), "#ffd7f0", { align: "center", spacing: 4 });
    text(ctx, t.screens.pressStart, sx, h * 0.9, mono(f, 24, 500), MINT, { align: "center", spacing: 8, glow: 12 });
  };

const CARD_GRADIENTS = [
  [AMBER, MAGENTA],
  [ICE, VIOLET],
  [MAGENTA, VIOLET],
  [MINT, ICE],
];

export const drawProjects =
  (t: DeskCopy): Draw =>
  (ctx, w, h, f) => {
    ctx.fillStyle = vgrad(ctx, h, ["#171009", "#0b0806"]);
    ctx.fillRect(0, 0, w, h);
    glow(ctx, w * 0.2, h * 0.1, w * 0.5, AMBER, 0.12);
    text(ctx, "// 003", w * 0.06, h * 0.1, mono(f, 16), "#8a7560", { spacing: 4 });
    text(ctx, t.screens.projects.toUpperCase(), w * 0.06, h * 0.22, display(f, 66, 900), AMBER, { glow: 18, spacing: 3 });
    text(ctx, t.screens.projectsDetail, w * 0.06, h * 0.29, mono(f, 17), "#d9c2a5", { spacing: 3 });
    const names = [...t.screens.projectNames, "", ""];
    CARD_GRADIENTS.forEach(([a, b], i) => {
      const x = w * (0.06 + (i % 2) * 0.45);
      const y = h * (0.36 + Math.floor(i / 2) * 0.31);
      const cw = w * 0.42;
      const ch = h * 0.27;
      ctx.save();
      rrect(ctx, x, y, cw, ch, 14);
      ctx.clip();
      ctx.fillStyle = "#1d1610";
      ctx.fillRect(x, y, cw, ch);
      const g = ctx.createLinearGradient(x, y, x + cw, y + ch * 0.7);
      g.addColorStop(0, a);
      g.addColorStop(1, b);
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(x, y, cw, ch * 0.64);
      ctx.globalAlpha = 1;
      // Mini «captura»: bloques que sugieren una web
      ctx.fillStyle = "rgba(10,8,6,0.35)";
      rrect(ctx, x + 16, y + 16, cw * 0.5, 12, 6);
      ctx.fill();
      rrect(ctx, x + 16, y + 38, cw * 0.32, 8, 4);
      ctx.fill();
      ctx.restore();
      if (names[i]) text(ctx, names[i], x + 4, y + ch * 0.83, display(f, 26, 800), "#f5e8d8", { spacing: 1 });
      else {
        ctx.fillStyle = "#3b2f24";
        rrect(ctx, x + 4, y + ch * 0.74, cw * 0.4, 14, 6);
        ctx.fill();
      }
      ctx.fillStyle = "#4a3c2e";
      rrect(ctx, x + 4, y + ch * 0.92, cw * 0.6, 8, 4);
      ctx.fill();
    });
  };

function clock(lang: string) {
  const now = new Date();
  return {
    time: new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }).format(now),
    date: new Intl.DateTimeFormat(lang, { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" }).format(now),
  };
}

export const drawPhone =
  (t: DeskCopy, lang: string): Draw =>
  (ctx, w, h, f) => {
    ctx.fillStyle = vgrad(ctx, h, ["#1a1240", "#0a0f26", "#04060d"]);
    ctx.fillRect(0, 0, w, h);
    glow(ctx, w * 0.2, h * 0.75, w * 0.9, VIOLET, 0.45);
    glow(ctx, w * 0.95, h * 0.35, w * 0.7, ICE, 0.3);
    const { time, date } = clock(lang);
    text(ctx, date, w / 2, h * 0.11, mono(f, 20), "#c9d8ff", { align: "center" });
    text(ctx, time, w / 2, h * 0.26, display(f, 118, 300), "#f2f6ff", { align: "center", glow: 14 });
    // Notificación
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    rrect(ctx, w * 0.06, h * 0.6, w * 0.88, h * 0.11, 24);
    ctx.fill();
    ctx.fillStyle = MINT;
    ctx.shadowColor = MINT;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(w * 0.16, h * 0.655, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    text(ctx, t.screens.phoneName, w * 0.26, h * 0.645, mono(f, 20, 500), "#ffffff");
    text(ctx, t.screens.phoneStatus, w * 0.26, h * 0.68, mono(f, 17), "#c9d8ff");
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    rrect(ctx, w * 0.33, h * 0.955, w * 0.34, 6, 3);
    ctx.fill();
  };

export const drawTablet =
  (t: DeskCopy, lang: string): Draw =>
  (ctx, w, h, f) => {
    ctx.fillStyle = vgrad(ctx, h, ["#0a1a4a", "#071032", "#03081a"]);
    ctx.fillRect(0, 0, w, h);
    // Ondas de fondo frío/cálido
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, h * (0.55 + i * 0.07));
      ctx.bezierCurveTo(w * 0.3, h * (0.35 + i * 0.09), w * 0.7, h * (0.85 - i * 0.05), w, h * (0.45 + i * 0.08));
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = withAlpha([ICE, VIOLET, MAGENTA, AMBER][i], 0.16 + i * 0.04);
      ctx.fill();
    }
    const { time, date } = clock(lang);
    text(ctx, date, w / 2, h * 0.12, mono(f, 22), "#d4e0ff", { align: "center" });
    text(ctx, time, w / 2, h * 0.29, display(f, 168, 200), "#f4f7ff", { align: "center", glow: 16 });
    const card = (y: number, title: string, body: string, dot: string) => {
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      rrect(ctx, w * 0.08, y, w * 0.84, h * 0.085, 22);
      ctx.fill();
      ctx.fillStyle = dot;
      ctx.beginPath();
      ctx.arc(w * 0.15, y + h * 0.0425, 11, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, title, w * 0.21, y + h * 0.037, mono(f, 20, 500), "#ffffff");
      text(ctx, body, w * 0.21, y + h * 0.065, mono(f, 17), "#c9d8ff");
    };
    card(h * 0.38, t.screens.tabletCity, t.screens.tabletCityNote, AMBER);
    card(h * 0.48, t.screens.tabletNote, t.screens.tabletNoteBody, ICE);
  };

/* ---------- superficies ---------- */

/** Rótulos del teclado: cada letra con el color del degradado según su posición, como el RGB real. */
export const drawLegends =
  (keys: { x: number; z: number; w: number; label: string }[], unit: number): Draw =>
  (ctx, w, _h, f) => {
    ctx.fillStyle = hgrad(ctx, 0, w, [...GRADIENT, ICE]);
    ctx.textBaseline = "middle";
    for (const k of keys) {
      if (!k.label) continue;
      const size = k.label.length > 2 ? unit * 0.2 : unit * 0.34;
      ctx.font = mono(f, size, 500);
      ctx.textAlign = "center";
      ctx.fillText(k.label, k.x * unit, (k.z + 0.5) * unit - unit * 0.06);
    }
  };

export const drawStrip: Draw = (ctx, w, h) => {
  ctx.fillStyle = hgrad(ctx, 0, w, [...GRADIENT, ...[...GRADIENT].reverse().slice(1)]);
  ctx.fillRect(0, 0, w, h);
};

export const drawSoftDot: Draw = (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};

export const drawWood: Draw = (ctx, w, h) => {
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "#3d2719");
  base.addColorStop(0.5, "#4a2f1e");
  base.addColorStop(1, "#382316");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const r = rng(11);
  // Vetas largas onduladas con grosor y tono variables, y algún nudo
  for (let i = 0; i < 340; i += 1) {
    const y = r() * h;
    const dark = r() > 0.45;
    ctx.strokeStyle = dark ? `rgba(18,9,3,${0.15 + r() * 0.3})` : `rgba(150,100,62,${0.06 + r() * 0.14})`;
    ctx.lineWidth = 0.5 + r() * 2.6;
    ctx.beginPath();
    const ph = r() * 10;
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 24) ctx.lineTo(x, y + Math.sin(x * 0.003 + ph) * 9 + Math.sin(x * 0.017 + ph * 3) * 2);
    ctx.stroke();
  }
  for (let k = 0; k < 3; k += 1) {
    const cx = r() * w;
    const cy = r() * h;
    for (let ring = 1; ring < 9; ring += 1) {
      ctx.strokeStyle = `rgba(20,10,4,${0.25 - ring * 0.02})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, ring * 7, ring * 2.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
};
export const drawPegboard: Draw = (ctx, w, h) => {
  ctx.fillStyle = "#2a2730";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#121116";
  const step = 32;
  for (let y = step / 2; y < h; y += step)
    for (let x = step / 2; x < w; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
};

/** Rótulo de neón de pared: mismo nombre y colores que el del hero. */
export const drawNeonSign =
  (first: string, last: string): Draw =>
  (ctx, w, h, f) => {
    ctx.fontStretch = "condensed";
    ctx.lineJoin = "round";
    const size = h * 0.62;
    ctx.font = display(f, size, 800);
    ctx.textBaseline = "middle";
    const gap = size * 0.25;
    const a = first.toUpperCase();
    const b = last.toUpperCase();
    const wa = ctx.measureText(a).width;
    const wb = ctx.measureText(b).width;
    let x = (w - wa - wb - gap) / 2;
    for (const [word, color, ww] of [
      [a, ICE, wa],
      [b, AMBER, wb],
    ] as const) {
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = h * 0.08;
      ctx.lineWidth = h * 0.035;
      ctx.strokeText(word, x, h / 2);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = h * 0.012;
      ctx.strokeText(word, x, h / 2);
      x += ww + gap;
    }
  };

/** Teclado, touchpad y rejillas del portátil, dibujados: a ese tamaño no merece la pena modelar teclas. */
export const drawLaptopDeck: Draw = (ctx, w, h, f) => {
  ctx.fillStyle = "#1b2131";
  ctx.fillRect(0, 0, w, h);
  // Rejillas de altavoz a los lados
  ctx.fillStyle = "#121722";
  for (const x0 of [w * 0.02, w * 0.93]) {
    for (let y = h * 0.05; y < h * 0.52; y += 9) for (let x = x0; x < x0 + w * 0.05; x += 9) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const rows = [
    "Esc F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12 Supr",
    "º 1 2 3 4 5 6 7 8 9 0 ' ¡ ⌫",
    "⇥ Q W E R T Y U I O P ` + ↵",
    "⇪ A S D F G H J K L Ñ ´ Ç",
    "⇧ < Z X C V B N M , . - ⇧",
    "Ctrl Fn ⊞ Alt ␣ AltGr Ctrl ◂ ▴▾ ▸",
  ].map((r) => r.split(" "));
  const wide: Record<string, number> = { "⌫": 1.6, "⇥": 1.4, "↵": 1.4, "⇪": 1.7, Ç: 1.1, "⇧": 1.9, "␣": 5.2, Esc: 1.1, Supr: 1.1 };
  const left = w * 0.09;
  const right = w * 0.91;
  const top = h * 0.04;
  const rowH = h * 0.075;
  rows.forEach((keys, r) => {
    const units = keys.reduce((s, k) => s + (wide[k] ?? 1), 0);
    const u = (right - left) / units;
    const kh = r === 0 ? rowH * 0.6 : rowH * 0.86;
    const y = top + (r === 0 ? 0 : rowH * 0.7 + (r - 1) * rowH);
    let x = left;
    for (const k of keys) {
      const kw = u * (wide[k] ?? 1);
      ctx.fillStyle = "#0a0d14";
      rrect(ctx, x + 3, y, kw - 6, kh, 7);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (k !== "␣") {
        ctx.font = mono(f, r === 0 ? 13 : k.length > 2 ? 13 : 19, 500);
        ctx.fillStyle = "rgba(214,200,255,0.85)";
        ctx.shadowColor = VIOLET;
        ctx.shadowBlur = 8;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(k, x + kw / 2, y + kh / 2);
        ctx.shadowBlur = 0;
      }
      x += kw;
    }
  });
  // Touchpad
  const tw = w * 0.36;
  const th = h * 0.3;
  rrect(ctx, (w - tw) / 2, h * 0.62, tw, th, 18);
  ctx.fillStyle = "#1f2638";
  ctx.fill();
  ctx.strokeStyle = "rgba(160,170,200,0.25)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
};
export const drawFaceButton =
  (letter: string, color: string): Draw =>
  (ctx, w, h, f) => {
    ctx.textBaseline = "middle";
    text(ctx, letter, w / 2, h / 2 + 2, display(f, h * 0.7, 800), color, { align: "center", glow: 6 });
  };

/** Logo del botón Xbox: esfera con la «X» curvada recortada. */
export const drawXboxLogo: Draw = (ctx, w, h) => {
  const r = w * 0.36;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a1b20";
  ctx.lineWidth = w * 0.09;
  ctx.lineCap = "round";
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(w / 2 - r * 0.75, h / 2 + s * r * 0.75);
    ctx.quadraticCurveTo(w / 2, h / 2 - s * r * 0.05, w / 2 + r * 0.75, h / 2 + s * r * 0.75);
    ctx.stroke();
  }
};

/**
 * Ruido de valor tileable en escala de grises, varias octavas. Lo usa el shader del humo
 * para retorcer y recortar la voluta.
 */
export const drawNoise: Draw = (ctx, w, h) => {
  const img = ctx.createImageData(w, h);
  const r = rng(29);
  const octaves = [4, 8, 16, 32].map((cells) => {
    const grid = Array.from({ length: cells * cells }, () => r());
    return { cells, grid };
  });
  const smooth = (t: number) => t * t * (3 - 2 * t);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let v = 0;
      let amp = 0.5;
      let norm = 0;
      for (const { cells, grid } of octaves) {
        const fx = (x / w) * cells;
        const fy = (y / h) * cells;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = smooth(fx - x0);
        const ty = smooth(fy - y0);
        const at = (i: number, j: number) => grid[((j % cells) * cells + (i % cells)) % grid.length];
        const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
        const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
        v += (a + (b - a) * ty) * amp;
        norm += amp;
        amp *= 0.5;
      }
      const c = Math.round((v / norm) * 255);
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = c;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
};

/** Tela del tapete: trama fina en gris con ligera variación, sirve también de relieve. */
export const drawFabric: Draw = (ctx, w, h) => {
  ctx.fillStyle = "#7a7c84";
  ctx.fillRect(0, 0, w, h);
  const r = rng(41);
  const img = ctx.getImageData(0, 0, w, h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      // Trama cruzada: hilos alternos horizontales y verticales con ruido
      const weave = ((x >> 1) + (y >> 1)) % 2 === 0 ? 14 : -14;
      const n = (r() - 0.5) * 36 + weave;
      const i = (y * w + x) * 4;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
  }
  ctx.putImageData(img, 0, 0);
};

/** Borde cosido del tapete: canal de luminancia para el relieve y el color de la costura. */
export const drawMatEdge: Draw = (ctx, w, h) => {
  const inset = 10;
  ctx.strokeStyle = "rgba(120,122,130,0.4)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.setLineDash([]);
};


const FONT_FREE = new Set<Draw>([drawWood, drawPegboard, drawFabric, drawMatEdge, drawStrip, drawSoftDot, drawNoise, drawXboxLogo]);