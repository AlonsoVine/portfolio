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
  // Caída (1-r²)³: sin saltos de pendiente, así no aparecen aros ni bandas en el halo
  for (let i = 0; i <= 11; i += 1) {
    const r = i / 11;
    g.addColorStop(r, `rgba(255,255,255,${(1 - r * r) ** 3})`);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};

/**
 * Madera de la mesa. Con `rough` pinta el mapa de rugosidad con la misma veta (misma semilla):
 * la veta oscura es poro abierto y mate, la clara queda pulida por el barniz.
 */
function woodPass(ctx: CanvasRenderingContext2D, w: number, h: number, rough: boolean) {
  if (rough) {
    ctx.fillStyle = "#6e6e6e";
  } else {
    const base = ctx.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, "#3d2719");
    base.addColorStop(0.5, "#4a2f1e");
    base.addColorStop(1, "#382316");
    ctx.fillStyle = base;
  }
  ctx.fillRect(0, 0, w, h);
  const r = rng(11);
  for (let i = 0; i < 340; i += 1) {
    const y = r() * h;
    const dark = r() > 0.45;
    const a = dark ? 0.15 + r() * 0.3 : 0.06 + r() * 0.14;
    if (rough) ctx.strokeStyle = dark ? `rgba(170,170,170,${a})` : `rgba(60,60,60,${a * 1.6})`;
    else ctx.strokeStyle = dark ? `rgba(18,9,3,${a})` : `rgba(150,100,62,${a})`;
    ctx.lineWidth = 0.5 + r() * 2.6;
    ctx.beginPath();
    const ph = r() * 10;
    ctx.moveTo(0, y);
    // Frecuencias enteras sobre el ancho: la textura se repite sin costura; la deriva hace que las vetas converjan
    const drift = (r() - 0.5) * 40;
    for (let x = 0; x <= w; x += 16) {
      const u = (x / w) * Math.PI * 2;
      ctx.lineTo(x, y + Math.sin(u + ph) * 9 + Math.sin(u * 6 + ph * 3) * 2 + Math.sin(u * 0.5) ** 2 * drift);
    }
    ctx.stroke();
  }
  // Nudos: pocos, alargados y deformados, con la veta envolviéndolos (nada de dianas)
  for (let k = 0; k < 2; k += 1) {
    const cx = r() * w;
    const cy = r() * h;
    for (let ring = 1; ring < 7; ring += 1) {
      ctx.strokeStyle = rough ? `rgba(160,160,160,${0.18 - ring * 0.02})` : `rgba(20,10,4,${0.18 - ring * 0.02})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let t = 0; t <= 64; t += 1) {
        const ang = (t / 64) * Math.PI * 2;
        const wob = 1 + 0.18 * Math.sin(ang * 3 + ring) + 0.1 * Math.sin(ang * 5 + k);
        const x = cx + Math.cos(ang) * ring * 9 * wob;
        const y = cy + Math.sin(ang) * ring * 2.2 * wob;
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
}

export const drawWood: Draw = (ctx, w, h) => woodPass(ctx, w, h, false);
export const drawWoodRough: Draw = (ctx, w, h) => woodPass(ctx, w, h, true);

export const drawPegboard: Draw = (ctx, w, h) => {
  ctx.fillStyle = "#2a2730";
  ctx.fillRect(0, 0, w, h);
  const step = 32;
  ctx.lineWidth = 1;
  for (let y = step / 2; y < h; y += step)
    for (let x = step / 2; x < w; x += step) {
      ctx.fillStyle = "#050408";
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      // Canto del taladro iluminado desde arriba: el agujero se lee hundido, no pintado
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.arc(x, y, 6.5, 0.1, Math.PI * 0.9);
      ctx.stroke();
    }
};

/** Rótulo de neón de pared: mismo nombre y colores que el del hero. */
export const drawNeonSign =
  (first: string, last: string): Draw =>
  (ctx, w, h, f) => {
    ctx.fontStretch = "condensed";
    ctx.lineJoin = "round";
    // Lienzo con margen de sobra: el halo se desvanece antes del borde y no deja un rectángulo
    const size = h * 0.36;
    ctx.font = display(f, size, 600);
    ctx.textBaseline = "middle";
    const gap = size * 0.28;
    const a = first.toUpperCase();
    const b = last.toUpperCase();
    const wa = ctx.measureText(a).width;
    const wb = ctx.measureText(b).width;
    let x = (w - wa - wb - gap) / 2;
    // Tubo macizo: halo amplio del color, luego el vidrio teñido y un núcleo casi blanco
    for (const [word, color, core, ww] of [
      [a, ICE, "#e8f8ff", wa],
      [b, AMBER, "#fff1dc", wb],
    ] as const) {
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      for (const blur of [size * 0.45, size * 0.16]) {
        ctx.shadowBlur = blur;
        ctx.fillText(word, x, h / 2);
      }
      ctx.shadowBlur = size * 0.035;
      ctx.fillStyle = core;
      ctx.strokeStyle = color;
      ctx.lineWidth = size * 0.025;
      ctx.strokeText(word, x, h / 2);
      ctx.fillText(word, x, h / 2);
      x += ww + gap;
    }
    ctx.shadowBlur = 0;
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
  // Manchas muy suaves de uso: la tela real no es un gris perfectamente uniforme
  const r = rng(41);
  for (let i = 0; i < 6; i += 1) {
    const g = ctx.createRadialGradient(r() * w, r() * h, 0, r() * w, r() * h, w * 0.4);
    g.addColorStop(0, `rgba(${r() > 0.5 ? "255,255,255" : "0,0,0"},0.05)`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
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
  // Pespunte fino de tapete, no una línea de carretera
  const inset = 5;
  ctx.strokeStyle = "rgba(150,152,160,0.26)";
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.setLineDash([]);
};


const FONT_FREE = new Set<Draw>([drawRug, drawFloorFalloff, drawFantasyMap, drawClockFace, drawUnderglow, drawMugGlaze, drawMugRough, drawLatte, drawPothosLeaf, drawWoodRough, drawSnakeLeaf, drawSpruceTop, drawFretboard, drawWood, drawPegboard, drawFabric, drawMatEdge, drawStrip, drawSoftDot, drawNoise, drawXboxLogo]);
/** Hoja de sansevieria: verde oscuro con bandas onduladas claras y borde amarillo. */
export function drawSnakeLeaf(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#24442a";
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 7 + (y % 5)) {
    ctx.strokeStyle = `rgba(150, 180, 130, ${0.18 + ((y * 37) % 10) / 60})`;
    ctx.lineWidth = 2 + (y % 3);
    ctx.beginPath();
    for (let x = 0; x <= w; x += 4) ctx.lineTo(x, y + Math.sin(x * 0.15 + y) * 3);
    ctx.stroke();
  }
  const edge = ctx.createLinearGradient(0, 0, w, 0);
  edge.addColorStop(0, "#d6c25a");
  edge.addColorStop(0.1, "#c9b850");
  edge.addColorStop(0.16, "rgba(201,184,80,0)");
  edge.addColorStop(0.84, "rgba(201,184,80,0)");
  edge.addColorStop(0.9, "#c9b850");
  edge.addColorStop(1, "#d6c25a");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);
}

/** Tapa de abeto (lienzo = 0,4 × 0,5 m): veta vertical, ligero sombreado de borde, roseta, boca y golpeador. */
export function drawSpruceTop(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const px = w / 0.4;
  const g = ctx.createRadialGradient(w / 2, h * 0.62, 20, w / 2, h * 0.55, w * 0.75);
  g.addColorStop(0, "#e9c58e");
  g.addColorStop(0.6, "#d9ae72");
  g.addColorStop(1, "#9c6a35");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 1 + ((x * 7) % 3)) {
    ctx.fillStyle = `rgba(120, 78, 40, ${0.05 + ((x * 13) % 7) / 70})`;
    ctx.fillRect(x, 0, 1, h);
  }
  const cx = w / 2;
  const cy = h * (1 - 0.39 / 0.5);
  const r = 0.05 * px;
  // Golpeador de carey bajo la boca, hacia el lado de la mano que rasguea
  ctx.save();
  ctx.translate(cx + r * 0.55, cy + r * 0.55);
  ctx.rotate(0.5);
  const pg = ctx.createLinearGradient(-r, -r, r, r);
  pg.addColorStop(0, "rgba(46, 20, 10, 0.92)");
  pg.addColorStop(0.5, "rgba(84, 36, 14, 0.9)");
  pg.addColorStop(1, "rgba(30, 12, 6, 0.92)");
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.55, r * 0.95, r * 1.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  for (const [rr, c, lw] of [
    [1.42, "#1c120c", 3],
    [1.34, "#f0e6cf", 2],
    [1.27, "#3a2416", 6],
    [1.2, "#f0e6cf", 2],
    [1.12, "#1c120c", 3],
  ] as const) {
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(cx, cy, r * rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  const hole = ctx.createRadialGradient(cx, cy - r * 0.2, r * 0.2, cx, cy, r);
  hole.addColorStop(0, "#0c0705");
  hole.addColorStop(0.85, "#1a0f08");
  hole.addColorStop(1, "#3b2414");
  ctx.fillStyle = hole;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Diapasón de palosanto: trastes en posición temperada desde la cejuela (arriba) y marcadores de nácar. */
export function drawFretboard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const len = 0.4377;
  ctx.fillStyle = "#2a1912";
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) {
    ctx.fillStyle = `rgba(0, 0, 0, ${((y * 17) % 9) / 60})`;
    ctx.fillRect(0, y, w, 1);
  }
  const at = (n: number) => ((0.645 * (1 - 2 ** (-n / 12))) / len) * h;
  for (let n = 1; n <= 19; n += 1) {
    const y = at(n);
    ctx.fillStyle = "#cfcbc2";
    ctx.fillRect(0, y - 1.5, w, 3);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(0, y - 1.5, w, 1);
  }
  ctx.fillStyle = "#e9e4da";
  for (const n of [3, 5, 7, 9, 12, 15, 17]) {
    const y = (at(n - 1) + at(n)) / 2;
    const xs = n === 12 ? [w * 0.3, w * 0.7] : [w / 2];
    for (const x of xs) {
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Hoja de poto dorado (u a lo ancho, v a lo largo): nervio central claro y pinceladas amarillas que salen de él. */
export function drawPothosLeaf(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#d9e6cf";
  ctx.fillRect(0, 0, w, h);
  const r = rng(29);
  for (let i = 0; i < 16; i += 1) {
    const y = h * (0.15 + r() * 0.75);
    const side = r() > 0.5 ? 1 : -1;
    ctx.strokeStyle = `rgba(255, 226, 120, ${0.35 + r() * 0.4})`;
    ctx.lineWidth = 2 + r() * 5;
    ctx.beginPath();
    ctx.moveTo(w / 2, y);
    ctx.quadraticCurveTo(w / 2 + side * w * 0.2, y - h * 0.08, w / 2 + side * w * (0.3 + r() * 0.15), y - h * (0.12 + r() * 0.1));
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(240, 236, 180, 0.8)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w / 2, h);
  ctx.lineTo(w / 2, h * 0.05);
  ctx.stroke();
}

/**
 * Esmalte de la taza artesanal, en las UV del torno (v: 0 pie, 0,72 borde, 1 fondo interior).
 * Con `rough` pinta la rugosidad: el gres crudo es mate y el esmalte, vidriado.
 */
function mugPass(ctx: CanvasRenderingContext2D, w: number, h: number, rough: boolean) {
  const Y = (v: number) => (1 - v) * h;
  const r = rng(5);
  // Exterior: azul reactivo, más claro y verdoso arriba donde el esmalte es fino
  if (rough) ctx.fillStyle = "#262626";
  else {
    const g = ctx.createLinearGradient(0, Y(0.72), 0, Y(0.15));
    g.addColorStop(0, "#4f8e98");
    g.addColorStop(0.25, "#2a6378");
    g.addColorStop(1, "#102a42");
    ctx.fillStyle = g;
  }
  ctx.fillRect(0, Y(0.78), w, h - Y(0.78));
  if (!rough) {
    for (let i = 0; i < 160; i += 1) {
      const x = r() * w;
      const y = Y(0.2 + r() * 0.5);
      const rad = 2 + r() * 10;
      ctx.fillStyle = r() > 0.75 ? `rgba(150, 95, 55, ${0.15 + r() * 0.2})` : `rgba(120, 190, 205, ${0.08 + r() * 0.18})`;
      ctx.beginPath();
      ctx.ellipse(x, y, rad * 0.6, rad * (1.2 + r()), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Borde: el esmalte se retira de la arista y deja ver el gres tostado
  ctx.fillStyle = rough ? "#4a4a4a" : "#a27a52";
  ctx.fillRect(0, Y(0.785), w, Y(0.715) - Y(0.785));
  // Interior: esmalte crema con motas
  ctx.fillStyle = rough ? "#303030" : "#e8dfcf";
  ctx.fillRect(0, 0, w, Y(0.785));
  if (!rough) {
    for (let i = 0; i < 140; i += 1) {
      ctx.fillStyle = `rgba(90, 70, 50, ${0.2 + r() * 0.3})`;
      ctx.fillRect(r() * w, r() * Y(0.785), 1 + r() * 1.5, 1 + r() * 1.5);
    }
  }
  // Pie de gres crudo bajo una línea de goteo irregular (periódica en u para cerrar la vuelta)
  const drips = Array.from({ length: 7 }, () => ({ u: r(), len: 0.03 + r() * 0.07, wd: 0.02 + r() * 0.025 }));
  const dripV = (u: number) => {
    let v = 0.21 + 0.012 * Math.sin(u * Math.PI * 2 * 3) + 0.006 * Math.sin(u * Math.PI * 2 * 7 + 1);
    for (const d of drips) {
      const du = Math.min(Math.abs(u - d.u), 1 - Math.abs(u - d.u));
      v -= d.len * Math.exp(-((du / d.wd) ** 2));
    }
    return v;
  };
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 2) ctx.lineTo(x, Y(dripV(x / w)));
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = rough ? "#dadada" : "#cbb79a";
  ctx.fill();
  if (!rough) {
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 500; i += 1) {
      ctx.fillStyle = `rgba(60, 40, 25, ${0.25 + r() * 0.4})`;
      ctx.fillRect(r() * w, Y(0.25 * r()), 1 + r() * 2, 1 + r() * 2);
    }
    ctx.restore();
    // El esmalte se engrosa al final de la gota: borde más oscuro
    ctx.strokeStyle = "rgba(8, 22, 36, 0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) ctx[x ? "lineTo" : "moveTo"](x, Y(dripV(x / w)) - 1);
    ctx.stroke();
  }
}

export function drawMugGlaze(ctx: CanvasRenderingContext2D, w: number, h: number) {
  mugPass(ctx, w, h, false);
}
export function drawMugRough(ctx: CanvasRenderingContext2D, w: number, h: number) {
  mugPass(ctx, w, h, true);
}

/** Cappuccino visto desde arriba: crema tostada al borde, roseta de leche y microburbujas. */
export function drawLatte(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const c = w / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, "#b77d4c");
  g.addColorStop(0.75, "#9a6236");
  g.addColorStop(0.93, "#5f3519");
  g.addColorStop(1, "#3a1d0c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const r = rng(3);
  ctx.fillStyle = "#f2e5d0";
  ctx.strokeStyle = "#f2e5d0";
  // Roseta: hojas apiladas que se estrechan hacia arriba, atravesadas por el tallo
  for (let i = 0; i < 7; i += 1) {
    const y = h * (0.72 - i * 0.075);
    const rw = w * (0.3 - i * 0.03);
    const rh = h * 0.055;
    ctx.beginPath();
    ctx.moveTo(c - rw, y + rh * 0.3);
    ctx.quadraticCurveTo(c, y - rh * 1.6, c + rw, y + rh * 0.3);
    ctx.quadraticCurveTo(c, y - rh * 0.2, c - rw, y + rh * 0.3);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(c, h * 0.2, w * 0.05, h * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = w * 0.012;
  ctx.beginPath();
  ctx.moveTo(c, h * 0.82);
  ctx.lineTo(c, h * 0.2);
  ctx.stroke();
  for (let i = 0; i < 260; i += 1) {
    const a = r() * Math.PI * 2;
    const d = c * (0.8 + r() * 0.18);
    ctx.fillStyle = `rgba(230, 200, 160, ${0.2 + r() * 0.35})`;
    ctx.beginPath();
    ctx.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, 0.6 + r() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Tira LED bajo la mesa: degradado continuo de hielo a ámbar, sin puntos de diodo a la vista. */
export function drawUnderglow(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Ciclo cerrado hielo → ámbar → hielo: al desplazar la textura repetida no se ve la costura
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, "#7fd4ff");
  g.addColorStop(0.18, "#9fdcff");
  g.addColorStop(0.5, "#ffad4a");
  g.addColorStop(0.82, "#9fdcff");
  g.addColorStop(1, "#7fd4ff");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Máscara en grises del reflejo de la tira en el suelo: intensa bajo el canto, se apaga hacia los bordes. */
export function drawFloorFalloff(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const dx = (x / (w - 1)) * 2 - 1;
      const dy = (y / (h - 1)) * 2 - 1;
      const r2 = Math.min(1, dx ** 6 + dy * dy);
      const v = Math.round(255 * (1 - r2) ** 3);
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
}

/** Alfombra bereber de lana: fondo crema con rombos teja y ocre, cenefas y flecos en los extremos cortos. */
export function drawRug(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const fringe = 28;
  const x0 = fringe;
  const x1 = w - fringe;
  ctx.clearRect(0, 0, w, h);
  // Flecos de algodón: hebras sueltas que se recortan con alphaTest
  ctx.strokeStyle = "#e8dcc4";
  ctx.lineWidth = 2;
  for (let y = 6; y < h - 6; y += 5) {
    const jitter = Math.sin(y * 12.9898) * 4;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(4 + Math.abs(jitter), y + jitter * 0.4);
    ctx.moveTo(x1, y);
    ctx.lineTo(w - 4 - Math.abs(jitter), y - jitter * 0.4);
    ctx.stroke();
  }
  ctx.fillStyle = "#d9a894";
  ctx.fillRect(x0, 0, x1 - x0, h);
  // Lana: motas cálidas que rompen el color plano
  for (let i = 0; i < 9000; i += 1) {
    const x = x0 + Math.random() * (x1 - x0);
    const y = Math.random() * h;
    ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,248,235,0.18)" : "rgba(120,80,50,0.08)";
    ctx.fillRect(x, y, 2, 2);
  }
  // Cenefas
  const band = (inset: number, width: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.strokeRect(x0 + inset, inset, x1 - x0 - inset * 2, h - inset * 2);
  };
  band(18, 10, "#8e2a22");
  band(34, 3, "#d0a060");
  // Rombos dibujados a mano, con trazo irregular, en dos tonos
  const cx = (x0 + x1) / 2;
  const cell = 96;
  ctx.lineJoin = "round";
  for (let gx = -4; gx <= 4; gx += 1)
    for (let gy = -2; gy <= 2; gy += 1) {
      const x = cx + gx * cell;
      const y = h / 2 + gy * cell * 0.9 + (gx % 2 ? cell * 0.45 : 0);
      if (x < x0 + 70 || x > x1 - 70 || y < 70 || y > h - 70) continue;
      const s = cell * 0.42;
      ctx.strokeStyle = (gx + gy) % 2 ? "rgba(160,44,36,0.85)" : "rgba(110,30,28,0.75)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s * 0.8, y);
      ctx.lineTo(x, y + s);
      ctx.lineTo(x - s * 0.8, y);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = "rgba(201,154,82,0.55)";
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
}

/**
 * Mapa de fantasía en pergamino, a tinta: costa con ondas, cordilleras, bosques, ríos y rosa de los vientos.
 * Sale de una semilla: un mapa original al estilo de los de las novelas, no la copia de uno.
 */
export function drawFantasyMap(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const r = rng(1937);
  const ink = "#3b2a1a";
  const land = "#e8d6b0";
  const paper = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.62);
  paper.addColorStop(0, "#efdfbc");
  paper.addColorStop(0.7, "#dcc195");
  paper.addColorStop(1, "#a98352");
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i += 1) {
    ctx.fillStyle = r() > 0.5 ? "rgba(120,84,40,0.07)" : "rgba(255,246,220,0.08)";
    ctx.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3);
  }

  // Tierra: contorno irregular desplazado al este; el mar queda al oeste y al sur
  const cx = w * 0.6;
  const cy = h * 0.46;
  const ph = [r() * 6, r() * 6, r() * 6];
  const pts = Array.from({ length: 140 }, (_, i): [number, number] => {
    const a = (i / 140) * Math.PI * 2;
    const k = 1 + 0.16 * Math.sin(a * 3 + ph[0]) + 0.09 * Math.sin(a * 7 + ph[1]) + 0.05 * Math.sin(a * 13 + ph[2]) + (r() - 0.5) * 0.05;
    return [cx + Math.cos(a) * w * 0.42 * k, cy + Math.sin(a) * h * 0.4 * k];
  });
  const coast = () => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  ctx.lineJoin = "round";
  // Ondas de agua alrededor de la costa, cada vez más tenues
  for (let i = 5; i >= 1; i -= 1) {
    coast();
    ctx.strokeStyle = `rgba(70,50,30,${0.12 - i * 0.015})`;
    ctx.lineWidth = i * 9;
    ctx.stroke();
    coast();
    ctx.strokeStyle = "#e4cfa6";
    ctx.lineWidth = i * 9 - 3;
    ctx.stroke();
  }
  coast();
  ctx.fillStyle = land;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.save();
  coast();
  ctx.clip();
  // Cordilleras: picos en V con la ladera de sombra rayada
  const range = (x0: number, y0: number, x1: number, y1: number, count: number, size: number) => {
    for (let i = 0; i < count; i += 1) {
      const t = i / (count - 1);
      const x = x0 + (x1 - x0) * t + (r() - 0.5) * size * 0.6;
      const y = y0 + (y1 - y0) * t + (r() - 0.5) * size * 0.5;
      const s = size * (0.7 + r() * 0.5);
      ctx.fillStyle = land;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.6, y);
      ctx.lineTo(x, y - s);
      ctx.lineTo(x + s * 0.6, y);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.lineWidth = 1.6;
      for (let k = 1; k < 5; k += 1) {
        ctx.beginPath();
        ctx.moveTo(x + (s * 0.6 * k) / 5, y - s + (s * k) / 5);
        ctx.lineTo(x + (s * 0.6 * k) / 5 - s * 0.12, y);
        ctx.stroke();
      }
    }
  };
  range(w * 0.48, h * 0.2, w * 0.56, h * 0.72, 13, 46);
  range(w * 0.62, h * 0.18, w * 0.9, h * 0.24, 10, 40);
  range(w * 0.78, h * 0.6, w * 0.9, h * 0.76, 5, 50);
  // Bosques: copas redondas a tinta, apiñadas
  const forest = (fx: number, fy: number, rx: number, ry: number, count: number) => {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.8;
    for (let i = 0; i < count; i += 1) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r());
      const x = fx + Math.cos(a) * rx * d;
      const y = fy + Math.sin(a) * ry * d;
      ctx.fillStyle = "#c9b98a";
      ctx.beginPath();
      ctx.arc(x, y, 8, Math.PI, 0);
      ctx.lineTo(x + 8, y + 3);
      ctx.lineTo(x - 8, y + 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y + 3);
      ctx.lineTo(x, y + 9);
      ctx.stroke();
    }
  };
  forest(w * 0.72, h * 0.44, 100, 60, 90);
  forest(w * 0.36, h * 0.62, 50, 40, 50);
  forest(w * 0.66, h * 0.7, 40, 30, 35);
  // Ríos que bajan de las montañas al mar del oeste
  ctx.strokeStyle = "#3f5a6a";
  ctx.lineWidth = 3.5;
  for (const [x0, y0, mx, my, x1, y1] of [
    [w * 0.6, h * 0.24, w * 0.5, h * 0.4, w * 0.24, h * 0.5],
    [w * 0.66, h * 0.62, w * 0.55, h * 0.8, w * 0.42, h * 0.86],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(mx, my, x1, y1);
    ctx.stroke();
  }
  // Ciudades unidas por un camino punteado
  ctx.setLineDash([7, 9]);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(w * 0.34, h * 0.42);
  ctx.bezierCurveTo(w * 0.45, h * 0.5, w * 0.6, h * 0.5, w * 0.82, h * 0.42);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const [x, y] of [
    [w * 0.34, h * 0.42],
    [w * 0.82, h * 0.42],
    [w * 0.6, h * 0.56],
  ]) {
    ctx.fillStyle = "#8e2a22";
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.stroke();
  }
  ctx.restore();

  // Rosa de los vientos en el mar
  const rx = w * 0.12;
  const ry = h * 0.78;
  const R = h * 0.1;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(rx, ry, R * 0.75, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const len = i % 2 ? R * 0.6 : R;
    const side = a + Math.PI / 2;
    ctx.fillStyle = i % 2 ? land : i === 0 ? "#8e2a22" : ink;
    ctx.beginPath();
    ctx.moveTo(rx + Math.cos(a) * len, ry + Math.sin(a) * len);
    ctx.lineTo(rx + Math.cos(side) * R * 0.12, ry + Math.sin(side) * R * 0.12);
    ctx.lineTo(rx - Math.cos(side) * R * 0.12, ry - Math.sin(side) * R * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Doble filete del borde
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(w * 0.025, h * 0.035, w * 0.95, h * 0.93);
  ctx.lineWidth = 1;
  ctx.strokeRect(w * 0.035, h * 0.05, w * 0.93, h * 0.9);
}

/** Esfera de reloj de pared: blanco roto, sesenta marcas y doce índices gruesos, sin números. */
export function drawClockFace(ctx: CanvasRenderingContext2D, w: number) {
  const r = w / 2;
  ctx.fillStyle = "#f1ebe0";
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(r, r, r * 0.6, r, r, r);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(60,40,20,0.12)");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "#1d1c1f";
  ctx.lineCap = "butt";
  for (let i = 0; i < 60; i += 1) {
    const a = (i / 60) * Math.PI * 2;
    const big = i % 5 === 0;
    const len = big ? r * 0.14 : r * 0.05;
    ctx.lineWidth = big ? r * 0.035 : r * 0.012;
    ctx.beginPath();
    ctx.moveTo(r + Math.sin(a) * (r * 0.9 - len), r - Math.cos(a) * (r * 0.9 - len));
    ctx.lineTo(r + Math.sin(a) * r * 0.9, r - Math.cos(a) * r * 0.9);
    ctx.stroke();
  }
}

/** Calendario de pared del mes en curso: ilustración cálida arriba y la cuadrícula con el día de hoy marcado. */
export const drawCalendar =
  (lang: string): Draw =>
  (ctx, w, h, f) => {
    const now = new Date();
    const locale = lang === "en" ? "en-GB" : "es-ES";
    ctx.fillStyle = "#f4efe6";
    ctx.fillRect(0, 0, w, h);
    // Ilustración: puesta de sol sobre montañas, en papel
    const ph = h * 0.4;
    const sky = ctx.createLinearGradient(0, 0, 0, ph);
    sky.addColorStop(0, "#f2b27a");
    sky.addColorStop(1, "#f7dcb8");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, ph);
    ctx.fillStyle = "#fff3dc";
    ctx.beginPath();
    ctx.arc(w * 0.66, ph * 0.52, w * 0.09, 0, Math.PI * 2);
    ctx.fill();
    const ridge = (base: number, amp: number, color: string, seed: number) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, ph);
      for (let x = 0; x <= w; x += 8) ctx.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin(x * 0.018 + seed) * Math.cos(x * 0.007 + seed * 2)));
      ctx.lineTo(w, ph);
      ctx.fill();
    };
    ridge(ph * 0.78, ph * 0.3, "#c47a55", 1);
    ridge(ph * 0.9, ph * 0.22, "#8e4f3a", 4);
    ridge(ph * 1.0, ph * 0.12, "#5b3328", 7);

    const month = new Intl.DateTimeFormat(locale, { month: "long" }).format(now);
    ctx.fillStyle = "#2a2522";
    ctx.textBaseline = "alphabetic";
    ctx.font = display(f, w * 0.085, 800);
    ctx.fillText(month.toUpperCase(), w * 0.08, ph + h * 0.085);
    ctx.font = mono(f, w * 0.045, 500);
    ctx.fillStyle = "#b4623a";
    ctx.textAlign = "right";
    ctx.fillText(String(now.getFullYear()), w * 0.92, ph + h * 0.085);

    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const gx = w * 0.08;
    const cw = (w * 0.84) / 7;
    const top = ph + h * 0.14;
    const ch = (h - top - h * 0.04) / 7;
    const wd = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
    ctx.textAlign = "center";
    ctx.font = mono(f, w * 0.048, 700);
    for (let i = 0; i < 7; i += 1) {
      ctx.fillStyle = i >= 5 ? "#b4623a" : "#6d6660";
      ctx.fillText(wd.format(new Date(2024, 0, 1 + i)), gx + cw * (i + 0.5), top + ch * 0.6);
    }
    ctx.font = mono(f, w * 0.056, 700);
    for (let d = 1; d <= days; d += 1) {
      const i = offset + d - 1;
      const x = gx + cw * ((i % 7) + 0.5);
      const y = top + ch * (Math.floor(i / 7) + 1.6);
      if (d === now.getDate()) {
        ctx.strokeStyle = "#d9822b";
        ctx.lineWidth = w * 0.008;
        ctx.beginPath();
        ctx.arc(x, y - w * 0.014, cw * 0.36, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = i % 7 >= 5 ? "#b4623a" : "#2a2522";
      ctx.fillText(String(d), x, y);
    }
    ctx.textAlign = "left";
  };
