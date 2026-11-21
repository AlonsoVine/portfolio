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
  document.fonts.ready.then(paint);
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
  ctx.fillStyle = "#3b2619";
  ctx.fillRect(0, 0, w, h);
  const r = rng(11);
  for (let i = 0; i < 260; i += 1) {
    const y = r() * h;
    ctx.strokeStyle = r() > 0.5 ? "rgba(20,10,4,0.35)" : "rgba(120,80,50,0.18)";
    ctx.lineWidth = 0.6 + r() * 2.2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.004 + i) * 6 + Math.sin(x * 0.02 + i * 3) * 1.5);
    ctx.stroke();
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

/** Teclado y touchpad del portátil, dibujados: no merece la pena modelar teclas a ese tamaño. */
export const drawLaptopDeck: Draw = (ctx, w, h) => {
  ctx.fillStyle = "#151a26";
  ctx.fillRect(0, 0, w, h);
  const cols = 14;
  const kw = (w - 40) / cols;
  const kh = h * 0.12;
  for (let r = 0; r < 6; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = 20 + c * kw;
      const y = 14 + r * (kh + 6);
      ctx.fillStyle = "#07090e";
      rrect(ctx, x + 3, y, kw - 6, kh, 6);
      ctx.fill();
      ctx.fillStyle = "rgba(200,180,255,0.55)";
      ctx.fillRect(x + kw / 2 - 5, y + kh / 2 - 2, 10, 4);
    }
  }
  ctx.fillStyle = "rgba(0,0,0,0)";
};
