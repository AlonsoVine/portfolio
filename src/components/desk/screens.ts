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
    const files = t.screens.cvFiles;
    files.forEach((name, i) =>
      text(ctx, name, w * 0.055, h * (0.14 + i * 0.055), mono(f, 19), i === 3 ? ICE : "#7d8aa3"),
    );
    ctx.fillStyle = withAlpha(ICE, 0.12);
    ctx.fillRect(w * 0.035, h * (0.14 + 3 * 0.055) - 22, w * 0.13, 32);

    // Pestañas
    ctx.fillStyle = "#0a101c";
    ctx.fillRect(w * 0.165, 0, w, h * 0.065);
    [files[3], files[0], files[2]].forEach((tab, i) => {
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
    time: new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/Madrid" }).format(now),
    date: new Intl.DateTimeFormat(lang, { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" }).format(now),
  };
}

/** Rectángulos [x0, y0, x1, y1] (fracción de la pantalla, desde arriba a la izquierda) de los chips del móvil: el dibujo y el clic los comparten. */
export const PHONE_BUTTONS = {
  linkedin: [0.07, 0.345, 0.485, 0.68],
  github: [0.515, 0.345, 0.93, 0.68],
  email: [0.07, 0.705, 0.93, 0.905],
} as const;
/** Correo de contacto: el mismo que publica el portfolio. */
export const CONTACT_EMAIL = "alonvineba@gmail.com";

const GITHUB_MARK_D =
  "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z";

/** Móvil en su soporte: hora, nombre con su estado y chips grandes a LinkedIn, GitHub y el correo. */
export const drawPhone =
  (t: DeskCopy, lang: string): Draw =>
  (ctx, w, h, f) => {
    ctx.fillStyle = vgrad(ctx, h, ["#1a1240", "#0a0f26", "#04060d"]);
    ctx.fillRect(0, 0, w, h);
    glow(ctx, w * 0.2, h * 0.75, w * 0.9, VIOLET, 0.45);
    glow(ctx, w * 0.95, h * 0.35, w * 0.7, ICE, 0.3);
    const { time, date } = clock(lang);
    text(ctx, date, w / 2, h * 0.065, mono(f, 18), "#c9d8ff", { align: "center" });
    text(ctx, time, w / 2, h * 0.165, display(f, 96, 300), "#f2f6ff", { align: "center", glow: 14 });
    // Nombre y estado en dos renglones apretados: el punto verde va pegado al estado, no suelto debajo
    text(ctx, t.screens.phoneName, w / 2, h * 0.225, mono(f, 22, 600), "#ffffff", { align: "center" });
    ctx.font = mono(f, 14);
    const status = t.screens.phoneStatus;
    const sw = ctx.measureText(status).width + 16;
    ctx.fillStyle = MINT;
    ctx.shadowColor = MINT;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(w / 2 - sw / 2 + 4, h * 0.258 - 5, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    text(ctx, status, w / 2 + 8, h * 0.258, mono(f, 14), "#c9d8ff", { align: "center" });
    text(ctx, t.screens.phoneLinks.toUpperCase(), w / 2, h * 0.322, mono(f, 14, 500), "rgba(201,216,255,0.7)", { align: "center", spacing: 4 });

    // Dos chips grandes, uno al lado del otro: icono enorme y el nombre debajo
    const chip = ([x0, y0, x1, y1]: readonly [number, number, number, number], bg: string, edge: string, label: string, sub: string, icon: (x: number, y: number, s: number) => void) => {
      const x = w * x0;
      const y = h * y0;
      const cw = w * (x1 - x0);
      const ch = h * (y1 - y0);
      ctx.save();
      ctx.shadowColor = edge;
      ctx.shadowBlur = 28;
      ctx.fillStyle = bg;
      rrect(ctx, x, y, cw, ch, 30);
      ctx.fill();
      ctx.restore();
      const sheen = ctx.createLinearGradient(0, y, 0, y + ch);
      sheen.addColorStop(0, "rgba(255,255,255,0.16)");
      sheen.addColorStop(0.5, "rgba(255,255,255,0)");
      ctx.fillStyle = sheen;
      rrect(ctx, x, y, cw, ch, 30);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 2;
      ctx.stroke();
      const s = cw * 0.56;
      icon(x + (cw - s) / 2, y + ch * 0.14, s);
      text(ctx, label, x + cw / 2, y + ch * 0.76, display(f, 30, 700), "#ffffff", { align: "center" });
      text(ctx, sub, x + cw / 2, y + ch * 0.88, mono(f, 13), "rgba(255,255,255,0.72)", { align: "center" });
    };
    chip(PHONE_BUTTONS.linkedin, "#0a66c2", "#2d8cff", "LinkedIn", "alonso-viñé", (x, y, s) => {
      ctx.fillStyle = "#ffffff";
      rrect(ctx, x, y, s, s, s * 0.2);
      ctx.fill();
      text(ctx, "in", x + s * 0.53, y + s * 0.8, `700 ${s * 0.74}px Arial, sans-serif`, "#0a66c2", { align: "center" });
    });
    chip(PHONE_BUTTONS.github, "#24292f", "#8b949e", "GitHub", "@AlonsoVine", (x, y, s) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s / 16, s / 16);
      ctx.fillStyle = "#ffffff";
      ctx.fill(new Path2D(GITHUB_MARK_D));
      ctx.restore();
    });

    // Correo: chip ancho, con el sobre a la izquierda y la dirección al lado
    {
      const [x0, y0, x1, y1] = PHONE_BUTTONS.email;
      const x = w * x0;
      const y = h * y0;
      const cw = w * (x1 - x0);
      const ch = h * (y1 - y0);
      ctx.save();
      ctx.shadowColor = AMBER;
      ctx.shadowBlur = 24;
      ctx.fillStyle = hgrad(ctx, x, x + cw, ["#c2622a", "#d98a3c"]);
      rrect(ctx, x, y, cw, ch, 30);
      ctx.fill();
      ctx.restore();
      const sheen = ctx.createLinearGradient(0, y, 0, y + ch);
      sheen.addColorStop(0, "rgba(255,255,255,0.18)");
      sheen.addColorStop(0.5, "rgba(255,255,255,0)");
      ctx.fillStyle = sheen;
      rrect(ctx, x, y, cw, ch, 30);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
      ctx.stroke();
      const s = ch * 0.5;
      const ix = x + cw * 0.1;
      const iy = y + (ch - s * 0.75) / 2;
      ctx.fillStyle = "#ffffff";
      rrect(ctx, ix, iy, s, s * 0.75, s * 0.1);
      ctx.fill();
      ctx.strokeStyle = "#c2622a";
      ctx.lineWidth = s * 0.08;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(ix + s * 0.1, iy + s * 0.12);
      ctx.lineTo(ix + s / 2, iy + s * 0.42);
      ctx.lineTo(ix + s * 0.9, iy + s * 0.12);
      ctx.stroke();
      const tx = ix + s + cw * 0.07;
      text(ctx, "Email", tx, y + ch * 0.47, display(f, 28, 700), "#ffffff");
      ctx.font = mono(f, 13);
      let size = 13;
      while (ctx.measureText(CONTACT_EMAIL).width > x + cw - tx - 14 && size > 9) ctx.font = mono(f, (size -= 0.5));
      text(ctx, CONTACT_EMAIL, tx, y + ch * 0.72, ctx.font, "rgba(255,255,255,0.85)");
    }
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    rrect(ctx, w * 0.33, h * 0.955, w * 0.34, 6, 3);
    ctx.fill();
  };

/** Pantalla de bloqueo de la tablet: fondo y hora. El retrato se pinta encima en su propio plano con transparencia. */
export const drawTablet =
  (lang: string): Draw =>
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
    text(ctx, date, w / 2, h * 0.075, mono(f, 24, 500), "#e4ecff", { align: "center" });
    // La hora queda por detrás del retrato, como un fondo con profundidad: es secundaria
    text(ctx, time, w / 2, h * 0.3, display(f, 168, 200), "rgba(230,238,255,0.82)", { align: "center", glow: 12 });
  };

/* ---------- superficies ---------- */

/** Rótulos del teclado: cada letra con el color del degradado según su posición, como el RGB real. */
export const drawLegends =
  (keys: { x: number; z: number; w: number; label: string }[], unit: number, legend: Record<string, string>): Draw =>
  (ctx, w, _h, f) => {
    ctx.fillStyle = hgrad(ctx, 0, w, [...GRADIENT, ICE]);
    ctx.textBaseline = "middle";
    for (const k of keys) {
      if (!k.label) continue;
      ctx.textAlign = "center";
      const label = legend[k.label] ?? k.label;
      ctx.font = mono(f, label.length > 2 ? unit * 0.2 : unit * 0.34, 500);
      ctx.fillText(label, k.x * unit, (k.z + 0.5) * unit - unit * 0.06);
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
export const drawLaptopDeck =
  (legend: Record<string, string>): Draw =>
  (ctx, w, h, f) => {
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
        ctx.fillText(legend[k] ?? k, x + kw / 2, y + kh / 2);
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


const FONT_FREE = new Set<Draw>([drawRug, drawEdgeFalloff, drawFloorFalloff, drawClockFace, drawUnderglow, drawMugGlaze, drawMugRough, drawLatte, drawPothosLeaf, drawWoodRough, drawSnakeLeaf, drawSpruceTop, drawFretboard, drawWood, drawPegboard, drawFabric, drawMatEdge, drawStrip, drawSoftDot, drawNoise, drawXboxLogo]);
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

/** Cappuccino visto desde arriba: crema tostada al borde y un corazón de leche limpio, como el de una barra. */
export function drawLatte(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const c = w / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, "#a8703f");
  g.addColorStop(0.7, "#93592f");
  g.addColorStop(0.92, "#61361a");
  g.addColorStop(1, "#3a1d0c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Corazón: dos lóbulos y la punta, con el borde difuminado como la espuma al verterla
  const heart = new Path2D();
  const s = w * 0.3;
  const cy = c - s * 0.12;
  heart.moveTo(c, cy + s * 0.95);
  heart.bezierCurveTo(c - s * 0.15, cy + s * 0.7, c - s * 1.05, cy + s * 0.2, c - s * 0.92, cy - s * 0.35);
  heart.bezierCurveTo(c - s * 0.8, cy - s * 0.85, c - s * 0.15, cy - s * 0.85, c, cy - s * 0.38);
  heart.bezierCurveTo(c + s * 0.15, cy - s * 0.85, c + s * 0.8, cy - s * 0.85, c + s * 0.92, cy - s * 0.35);
  heart.bezierCurveTo(c + s * 1.05, cy + s * 0.2, c + s * 0.15, cy + s * 0.7, c, cy + s * 0.95);
  ctx.save();
  ctx.shadowColor = "rgba(240, 226, 204, 0.9)";
  ctx.shadowBlur = w * 0.02;
  ctx.fillStyle = "#f1e4cf";
  ctx.fill(heart);
  ctx.restore();
  // Microespuma: puntos finos solo en la crema del borde, nunca encima del corazón
  const r = rng(3);
  for (let i = 0; i < 220; i += 1) {
    const a = r() * Math.PI * 2;
    const d = c * (0.82 + r() * 0.16);
    ctx.fillStyle = `rgba(230, 200, 160, ${0.15 + r() * 0.25})`;
    ctx.beginPath();
    ctx.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, 0.5 + r() * 1.2, 0, Math.PI * 2);
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

/** Máscara en grises del brillo en el faldón: intensa junto a la tira (abajo) y desvanecida hacia arriba y los extremos. */
export function drawEdgeFalloff(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const dx = (x / (w - 1)) * 2 - 1;
      const up = 1 - y / (h - 1);
      const v = Math.round(255 * (1 - dx ** 8) * (1 - up) ** 2);
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
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

/**
 * Alfombra de lana tejida a mano: campo rojo con abrash (franjas de tinte desigual), medallón central,
 * motivos azules que cambian de una fila a otra y cenefa azul; flecos en los extremos cortos.
 */
export function drawRug(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const r = rng(73);
  const fringe = 28;
  const x0 = fringe;
  const x1 = w - fringe;
  ctx.clearRect(0, 0, w, h);
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
  // Campo rojo con abrash: franjas verticales de rojo algo distinto, como lotes de lana teñidos aparte
  ctx.fillStyle = "#9c2420";
  ctx.fillRect(x0, 0, x1 - x0, h);
  for (let x = x0; x < x1; ) {
    const bw = 20 + r() * 90;
    ctx.fillStyle = r() > 0.5 ? `rgba(120,16,14,${0.15 + r() * 0.25})` : `rgba(190,60,44,${0.1 + r() * 0.2})`;
    ctx.fillRect(x, 0, bw, h);
    x += bw;
  }
  for (let i = 0; i < 9000; i += 1) {
    ctx.fillStyle = r() > 0.5 ? "rgba(255,220,200,0.07)" : "rgba(40,0,0,0.12)";
    ctx.fillRect(x0 + r() * (x1 - x0), r() * h, 2, 2);
  }

  const navy = "#1d3566";
  const blue = "#2f5c9e";
  const pale = "#d9cfb8";
  const wobble = () => (r() - 0.5) * 2.5;
  const diamond = (x: number, y: number, rx: number, ry: number, stroke: string, lw: number, fill?: string) => {
    ctx.beginPath();
    ctx.moveTo(x + wobble(), y - ry);
    ctx.lineTo(x + rx, y + wobble());
    ctx.lineTo(x + wobble(), y + ry);
    ctx.lineTo(x - rx, y + wobble());
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  };
  ctx.lineJoin = "round";

  // Cenefa: banda azul marino con una greca en zigzag y filetes claros
  const inset = 16;
  const bandW = 44;
  ctx.strokeStyle = navy;
  ctx.lineWidth = bandW;
  ctx.strokeRect(x0 + inset + bandW / 2, inset + bandW / 2, x1 - x0 - inset * 2 - bandW, h - inset * 2 - bandW);
  ctx.strokeStyle = pale;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x0 + inset, inset, x1 - x0 - inset * 2, h - inset * 2);
  ctx.strokeRect(x0 + inset + bandW, inset + bandW, x1 - x0 - (inset + bandW) * 2, h - (inset + bandW) * 2);
  const zig = (ax: number, ay: number, bx: number, by: number) => {
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.round(len / 22);
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    ctx.beginPath();
    for (let i = 0; i <= n; i += 1) {
      const t = i / n;
      const o = (i % 2 ? 1 : -1) * 9;
      const px = ax + (bx - ax) * t + nx * o;
      const py = ay + (by - ay) * t + ny * o;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.strokeStyle = blue;
    ctx.lineWidth = 4;
    ctx.stroke();
  };
  const m = inset + bandW / 2;
  zig(x0 + m, m, x1 - m, m);
  zig(x0 + m, h - m, x1 - m, h - m);
  zig(x0 + m, m, x0 + m, h - m);
  zig(x1 - m, m, x1 - m, h - m);

  // Medallón central con capas
  const cx = (x0 + x1) / 2;
  const cy = h / 2;
  diamond(cx, cy, 150, 120, navy, 7, "rgba(29,53,102,0.35)");
  diamond(cx, cy, 112, 90, pale, 3);
  diamond(cx, cy, 78, 62, blue, 6, "rgba(156,36,32,0.6)");
  diamond(cx, cy, 34, 27, navy, 5, blue);
  for (const [dx, dy] of [
    [0, -150],
    [0, 150],
    [-185, 0],
    [185, 0],
  ])
    diamond(cx + dx, cy + dy * 0.82, 16, 13, blue, 4, navy);

  // Motivos del campo: cada uno elegido al azar y con tamaño propio, para que no se lea como una rejilla
  const fieldX0 = x0 + inset + bandW + 30;
  const fieldX1 = x1 - inset - bandW - 30;
  const fieldY0 = inset + bandW + 30;
  const fieldY1 = h - inset - bandW - 30;
  const motifs = [
    (x: number, y: number, s: number) => diamond(x, y, s * 0.7, s, blue, 4),
    (x: number, y: number, s: number) => {
      diamond(x, y, s * 0.6, s * 0.8, navy, 4);
      diamond(x, y, s * 0.25, s * 0.32, blue, 3, blue);
    },
    (x: number, y: number, s: number) => {
      ctx.strokeStyle = blue;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.7, y);
      ctx.lineTo(x + s * 0.7, y);
      ctx.moveTo(x, y - s * 0.7);
      ctx.lineTo(x, y + s * 0.7);
      ctx.stroke();
      diamond(x, y, s * 0.2, s * 0.2, pale, 2, navy);
    },
    (x: number, y: number, s: number) => {
      ctx.strokeStyle = navy;
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let k = -2; k <= 2; k += 1) {
        const px = x + k * s * 0.3;
        const py = y + (k % 2 ? s * 0.3 : -s * 0.3);
        if (k === -2) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    },
  ];
  for (let gy = fieldY0; gy <= fieldY1; gy += 64 + r() * 22) {
    for (let gx = fieldX0 + r() * 40; gx <= fieldX1; gx += 70 + r() * 50) {
      if (Math.abs(gx - cx) / 210 + Math.abs(gy - cy) / 165 < 1) continue;
      if (r() < 0.18) continue;
      motifs[Math.floor(r() * motifs.length)](gx, gy, 14 + r() * 12);
    }
  }
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

type CalScene = { sky: [string, string]; sun: string; ridges: [string, string, string]; accent: string; kind: "sunset" | "sea" | "night" | "snow" | "dunes" };

// Cada hoja del calendario trae su propia lámina: la del mes en curso es la puesta de sol y las siguientes cambian
const CAL_SCENES: CalScene[] = [
  { kind: "sunset", sky: ["#f2b27a", "#f7dcb8"], sun: "#fff3dc", ridges: ["#c47a55", "#8e4f3a", "#5b3328"], accent: "#b4623a" },
  { kind: "sea", sky: ["#8ccbe0", "#e6f4f0"], sun: "#fffbea", ridges: ["#4f9bb5", "#2f7590", "#1d5068"], accent: "#2f7590" },
  { kind: "night", sky: ["#141b3a", "#3a4a82"], sun: "#f4efd8", ridges: ["#2b3866", "#1c2549", "#10162e"], accent: "#5a62b8" },
  { kind: "snow", sky: ["#b9d3ea", "#eef4fa"], sun: "#ffffff", ridges: ["#8aa4c2", "#5f7a9c", "#3b5271"], accent: "#4d6e96" },
  { kind: "dunes", sky: ["#f6b860", "#fde9bf"], sun: "#fff6de", ridges: ["#e8a85c", "#c9803f", "#97562b"], accent: "#c26a2a" },
];
export const CAL_PAGES = CAL_SCENES.length;

/**
 * Hoja del calendario de pared `ahead` meses por delante: lámina ilustrada arriba y la cuadrícula del mes.
 * Solo la del mes en curso rodea el día de hoy y tacha los que ya pasaron.
 */
export const drawCalendar =
  (lang: string, ahead = 0): Draw =>
  (ctx, w, h, f) => {
    const today = new Date();
    const now = ahead ? new Date(today.getFullYear(), today.getMonth() + ahead, 1) : today;
    const scene = CAL_SCENES[ahead % CAL_SCENES.length];
    const locale = lang === "en" ? "en-GB" : "es-ES";
    ctx.fillStyle = "#f4efe6";
    ctx.fillRect(0, 0, w, h);
    const ph = h * 0.4;
    const r = rng(11 + ahead);
    const sky = ctx.createLinearGradient(0, 0, 0, ph);
    sky.addColorStop(0, scene.sky[0]);
    sky.addColorStop(1, scene.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, ph);
    if (scene.kind === "night")
      for (let i = 0; i < 70; i += 1) {
        ctx.fillStyle = `rgba(255, 250, 230, ${0.3 + r() * 0.7})`;
        ctx.beginPath();
        ctx.arc(r() * w, r() * ph * 0.7, 0.6 + r() * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    // Astro: sol, luna creciente en la noche o un sol enorme y bajo sobre las dunas
    const big = scene.kind === "dunes" ? 1.5 : 1;
    const sx = w * (scene.kind === "night" ? 0.74 : 0.66);
    const sy = ph * (scene.kind === "dunes" ? 0.6 : scene.kind === "night" ? 0.3 : 0.52);
    ctx.fillStyle = scene.sun;
    ctx.beginPath();
    ctx.arc(sx, sy, w * 0.09 * big, 0, Math.PI * 2);
    ctx.fill();
    if (scene.kind === "night") {
      ctx.fillStyle = scene.sky[0];
      ctx.beginPath();
      ctx.arc(sx + w * 0.04, sy - w * 0.025, w * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
    const ridge = (base: number, amp: number, color: string, seed: number, sharp = false) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, ph);
      for (let x = 0; x <= w; x += 6) {
        const n = sharp ? 1 - Math.abs(Math.sin(x * 0.012 + seed)) * (0.7 + 0.3 * Math.cos(x * 0.031 + seed)) : 0.5 + 0.5 * Math.sin(x * 0.018 + seed) * Math.cos(x * 0.007 + seed * 2);
        ctx.lineTo(x, base - amp * n);
      }
      ctx.lineTo(w, ph);
      ctx.fill();
    };
    if (scene.kind === "sea") {
      // Isla lejana, mar en franjas y un velero
      ridge(ph * 0.66, ph * 0.16, scene.ridges[0], 2);
      const sea = ctx.createLinearGradient(0, ph * 0.62, 0, ph);
      sea.addColorStop(0, scene.ridges[1]);
      sea.addColorStop(1, scene.ridges[2]);
      ctx.fillStyle = sea;
      ctx.fillRect(0, ph * 0.64, w, ph * 0.36);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = w * 0.004;
      for (let i = 0; i < 16; i += 1) {
        const y = ph * (0.68 + r() * 0.3);
        const x = r() * w;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + w * 0.03, y - w * 0.008, x + w * 0.06, y);
        ctx.stroke();
      }
      const bx = w * 0.28;
      const by = ph * 0.74;
      ctx.fillStyle = "#f8f3e6";
      ctx.beginPath();
      ctx.moveTo(bx, by - w * 0.11);
      ctx.lineTo(bx + w * 0.05, by - w * 0.012);
      ctx.lineTo(bx, by - w * 0.012);
      ctx.fill();
      ctx.fillStyle = "#3a2a24";
      ctx.beginPath();
      ctx.moveTo(bx - w * 0.04, by - w * 0.01);
      ctx.lineTo(bx + w * 0.06, by - w * 0.01);
      ctx.lineTo(bx + w * 0.045, by + w * 0.006);
      ctx.lineTo(bx - w * 0.028, by + w * 0.006);
      ctx.fill();
    } else if (scene.kind === "night") {
      ridge(ph * 0.8, ph * 0.28, scene.ridges[0], 3);
      ridge(ph * 0.92, ph * 0.16, scene.ridges[1], 6);
      // Bosque de abetos en silueta
      ctx.fillStyle = scene.ridges[2];
      ctx.fillRect(0, ph * 0.94, w, ph * 0.06);
      for (let x = -10; x < w + 10; x += w * 0.035) {
        const th = ph * (0.12 + r() * 0.14);
        const tx = x + r() * w * 0.02;
        ctx.beginPath();
        ctx.moveTo(tx, ph * 0.96 - th);
        ctx.lineTo(tx + th * 0.28, ph * 0.97);
        ctx.lineTo(tx - th * 0.28, ph * 0.97);
        ctx.fill();
      }
    } else if (scene.kind === "snow") {
      ridge(ph * 0.82, ph * 0.5, scene.ridges[0], 1.3, true);
      // Neveros: la misma cordillera en blanco recortada a su parte alta
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, ph * 0.55);
      ctx.clip();
      ridge(ph * 0.82, ph * 0.5, "#f7fbff", 1.3, true);
      ctx.restore();
      ridge(ph * 0.95, ph * 0.22, scene.ridges[1], 4.2, true);
      ridge(ph * 1.0, ph * 0.08, "#eef3f8", 7);
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      for (let i = 0; i < 60; i += 1) {
        ctx.beginPath();
        ctx.arc(r() * w, r() * ph, 0.8 + r() * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (scene.kind === "dunes") {
      const dune = (base: number, amp: number, color: string, seed: number) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, ph);
        for (let x = 0; x <= w; x += 6) ctx.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin(x * 0.011 + seed)));
        ctx.lineTo(w, ph);
        ctx.fill();
      };
      dune(ph * 0.8, ph * 0.2, scene.ridges[0], 0.5);
      dune(ph * 0.9, ph * 0.18, scene.ridges[1], 2.6);
      dune(ph * 1.0, ph * 0.14, scene.ridges[2], 5.1);
      // Caravana diminuta en la cresta
      ctx.fillStyle = "#4a2a17";
      for (let i = 0; i < 3; i += 1) {
        const cx = w * (0.18 + i * 0.05);
        const cy = ph * 0.71 + i * 1.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy, w * 0.014, w * 0.007, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx + w * 0.01, cy - w * 0.012, w * 0.004, w * 0.012);
        ctx.fillRect(cx - w * 0.01, cy, w * 0.003, w * 0.012);
        ctx.fillRect(cx + w * 0.007, cy, w * 0.003, w * 0.012);
      }
    } else {
      ridge(ph * 0.78, ph * 0.3, scene.ridges[0], 1);
      ridge(ph * 0.9, ph * 0.22, scene.ridges[1], 4);
      ridge(ph * 1.0, ph * 0.12, scene.ridges[2], 7);
    }

    const month = new Intl.DateTimeFormat(locale, { month: "long" }).format(now);
    ctx.fillStyle = "#2a2522";
    ctx.textBaseline = "alphabetic";
    ctx.font = display(f, w * 0.085, 800);
    ctx.fillText(month.toUpperCase(), w * 0.08, ph + h * 0.085);
    ctx.font = mono(f, w * 0.045, 500);
    ctx.fillStyle = scene.accent;
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
      ctx.fillStyle = i >= 5 ? scene.accent : "#6d6660";
      ctx.fillText(wd.format(new Date(2024, 0, 1 + i)), gx + cw * (i + 0.5), top + ch * 0.6);
    }
    ctx.font = mono(f, w * 0.056, 700);
    for (let d = 1; d <= days; d += 1) {
      const i = offset + d - 1;
      const x = gx + cw * ((i % 7) + 0.5);
      const y = top + ch * (Math.floor(i / 7) + 1.6);
      if (!ahead && d === now.getDate()) {
        ctx.strokeStyle = "#d9822b";
        ctx.lineWidth = w * 0.008;
        ctx.beginPath();
        ctx.arc(x, y - w * 0.014, cw * 0.36, 0, Math.PI * 2);
        ctx.stroke();
      }
      const past = !ahead && d < now.getDate();
      ctx.fillStyle = i % 7 >= 5 ? scene.accent : "#2a2522";
      ctx.globalAlpha = past ? 0.55 : 1;
      ctx.fillText(String(d), x, y);
      ctx.globalAlpha = 1;
      if (past) {
        // Tachado a rotulador rojo, cada aspa algo distinta como hecha a mano
        const r = cw * 0.3;
        const cy = y - w * 0.014;
        const j = (k: number) => Math.sin(d * 12.9898 + k * 78.233) * r * 0.12;
        ctx.strokeStyle = "rgba(196,48,40,0.85)";
        ctx.lineWidth = w * 0.007;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x - r + j(1), cy - r + j(2));
        ctx.lineTo(x + r + j(3), cy + r + j(4));
        ctx.moveTo(x + r + j(5), cy - r + j(6));
        ctx.lineTo(x - r + j(7), cy + r + j(8));
        ctx.stroke();
      }
    }
    ctx.textAlign = "left";
  };

/* ---------- libros de la balda ---------- */

export type BookKey = keyof DeskCopy["books"];
type SpineStyle = "tolkien" | "band" | "stripe" | "plain";
/** Libro de la balda: caja de sx × sy × sz con el lomo (sx × sy) mirando a la sala. */
export type BookSpec = {
  key: BookKey;
  size: [number, number, number];
  at: [number, number, number];
  turn?: number;
  body: string;
  ink: string;
  accent: string;
  style: SpineStyle;
  vol?: string;
  lying?: boolean;
};

const TOLKIEN = { body: "#1d2b24", ink: "#d4b062", accent: "#d4b062", style: "tolkien" } as const;
const STANDING: Omit<BookSpec, "at">[] = [
  { key: "fellowship", size: [0.026, 0.168, 0.108], ...TOLKIEN, vol: "I" },
  { key: "towers", size: [0.026, 0.168, 0.108], ...TOLKIEN, vol: "II" },
  { key: "king", size: [0.026, 0.168, 0.108], ...TOLKIEN, vol: "III" },
  { key: "clean", size: [0.021, 0.16, 0.1], body: "#26292f", ink: "#f2efe8", accent: "#e0a43a", style: "band" },
  { key: "refactoring", size: [0.024, 0.172, 0.104], body: "#e6dfd0", ink: "#8a2c22", accent: "#8a2c22", style: "stripe" },
  { key: "deep", size: [0.03, 0.174, 0.11], body: "#3a2f4c", ink: "#f0e6d0", accent: "#d07a46", style: "plain" },
  { key: "aima", size: [0.036, 0.178, 0.112], body: "#16294a", ink: "#f2efe8", accent: "#c9a24a", style: "band" },
];
const SHELF_TOP = 0.012;
// Los lomos quedan a ras del frente, como en una balda de verdad; cada libro con su pizca de giro
export const BOOKS: BookSpec[] = [
  ...(() => {
    let x = -0.238;
    return STANDING.map((b, i) => {
      const at: [number, number, number] = [x + b.size[0] / 2, SHELF_TOP, 0.128 - b.size[2] / 2];
      x += b.size[0] + 0.0015;
      return { ...b, at, turn: ((i * 37) % 7) * 0.006 - 0.018 };
    });
  })(),
  { key: "ddia", size: [0.135, 0.022, 0.1], at: [0.035, SHELF_TOP, 0.074], turn: 0.08, body: "#ece6da", ink: "#7b3b2a", accent: "#c9563a", style: "stripe", lying: true },
  { key: "pragmatic", size: [0.122, 0.018, 0.092], at: [0.038, SHELF_TOP + 0.022, 0.074], turn: -0.05, body: "#3f4247", ink: "#e8e4dc", accent: "#c9a24a", style: "band", lying: true },
];

// Atlas de lomos: todos en un canvas, para que la balda entera use una sola textura y un solo material
const SPINE_PX = 4400;
export const SPINE_ATLAS = 1024;
/** Píxel blanco del atlas: las tapas lo muestrean y se tiñen con el color de vértice. */
export const SPINE_WHITE: [number, number] = [1012 / SPINE_ATLAS, 1 - 1012 / SPINE_ATLAS];
export const SPINE_RECTS: [number, number, number, number][] = (() => {
  let x = 4;
  let y = 4;
  let row = 0;
  return BOOKS.map((b) => {
    const w = Math.round(b.size[0] * SPINE_PX);
    const h = Math.round(b.size[1] * SPINE_PX);
    if (x + w > SPINE_ATLAS - 4) {
      x = 4;
      y += row + 8;
      row = 0;
    }
    const r: [number, number, number, number] = [x, y, w, h];
    // Los tumbados van uno debajo de otro; los de pie, en fila
    if (b.lying) y += h + 8;
    else {
      x += w + 8;
      row = Math.max(row, h);
    }
    return r;
  });
})();

export const drawSpines =
  (books: DeskCopy["books"]): Draw =>
  (ctx, _w, _h, f) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(1000, 1000, 24, 24);
    BOOKS.forEach((b, i) => {
      const [x, y, w, h] = SPINE_RECTS[i];
      const copy = books[b.key];
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.clip();
      // Se dibuja siempre en horizontal: el lomo de pie se gira para que el título baje de arriba abajo
      const upright = h > w;
      if (upright) {
        ctx.translate(w, 0);
        ctx.rotate(Math.PI / 2);
      }
      const L = upright ? h : w;
      const T = upright ? w : h;
      ctx.fillStyle = b.body;
      ctx.fillRect(0, 0, L, T);
      // Lomo redondeado: algo más claro en el centro y más oscuro hacia las tapas
      const round = ctx.createLinearGradient(0, 0, 0, T);
      round.addColorStop(0, "rgba(0,0,0,0.28)");
      round.addColorStop(0.45, "rgba(255,255,255,0.08)");
      round.addColorStop(1, "rgba(0,0,0,0.32)");
      ctx.fillStyle = round;
      ctx.fillRect(0, 0, L, T);

      const fit = (s: string, size: number, max: number, weight = 700, family = f.display) => {
        let px = size;
        ctx.font = `${weight} ${px}px ${family}`;
        while (px > 8 && ctx.measureText(s).width > max) ctx.font = `${weight} ${(px -= 1)}px ${family}`;
        return ctx.font;
      };
      const write = (s: string, cx: number, font: string, color: string, spacing = 0) => {
        ctx.textBaseline = "middle";
        text(ctx, s, cx, T / 2 + 1, font, color, { align: "center", spacing });
        ctx.textBaseline = "alphabetic";
      };
      const bar = (at: number, width: number, color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(at, 0, width, T);
      };

      if (b.style === "tolkien") {
        // Edición a juego: filetes dorados, número de tomo y el anillo como emblema
        for (const at of [L * 0.035, L * 0.055, L * 0.945, L * 0.965]) bar(at, 2.5, b.accent);
        write(b.vol ?? "", L * 0.12, display(f, T * 0.36, 700), b.ink);
        write(copy.spine, L * 0.5, fit(copy.spine, T * 0.34, L * 0.58, 600), b.ink, 1);
        ctx.strokeStyle = b.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(L * 0.87, T / 2, T * 0.2, T * 0.2, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (b.style === "band") {
        bar(L * 0.05, L * 0.1, b.accent);
        write(copy.spine, L * 0.5, fit(copy.spine, T * 0.42, L * 0.56), b.ink);
        write(copy.by, L * 0.86, fit(copy.by, T * 0.24, L * 0.2, 600, f.mono), withAlpha(b.ink, 0.75), 1);
      } else if (b.style === "stripe") {
        for (const at of [L * 0.06, L * 0.09, L * 0.91, L * 0.94]) bar(at, 3, b.accent);
        write(copy.spine, L * 0.47, fit(copy.spine, T * 0.4, L * 0.58), b.ink);
        write(copy.by, L * 0.82, fit(copy.by, T * 0.24, L * 0.12, 600, f.mono), b.ink, 1);
      } else {
        write(copy.spine, L * 0.45, fit(copy.spine, T * 0.44, L * 0.56, 800), b.ink);
        ctx.fillStyle = b.accent;
        ctx.beginPath();
        ctx.arc(L * 0.1, T / 2, T * 0.13, 0, Math.PI * 2);
        ctx.fill();
        write(copy.by, L * 0.85, fit(copy.by, T * 0.22, L * 0.22, 600, f.mono), withAlpha(b.ink, 0.8), 1);
      }
      ctx.restore();
    });
  };

/* ---------- ventana, gato y post-its ---------- */

/** Noche al otro lado de la ventana: cielo despejado con luna, estrellas y la silueta de la ciudad con ventanas encendidas. */
export const drawNightSky: Draw = (ctx, w, h) => {
  ctx.fillStyle = vgrad(ctx, h, ["#070b1c", "#101a3a", "#2a2350", "#4a2c56"]);
  ctx.fillRect(0, 0, w, h);
  const r = rng(7);
  for (let i = 0; i < 260; i += 1) {
    const y = r() * h * 0.62;
    const a = (0.25 + r() * 0.75) * (1 - y / (h * 0.7));
    ctx.fillStyle = `rgba(230,236,255,${a})`;
    const s = r() < 0.08 ? 2.2 : 1.2;
    ctx.fillRect(r() * w, y, s, s);
  }
  // Luna creciente con su halo
  glow(ctx, w * 0.72, h * 0.2, h * 0.16, "#cfd8ff", 0.35);
  ctx.fillStyle = "#f1efe2";
  ctx.beginPath();
  ctx.arc(w * 0.72, h * 0.2, h * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#121c3e";
  ctx.beginPath();
  ctx.arc(w * 0.72 + h * 0.022, h * 0.2 - h * 0.012, h * 0.042, 0, Math.PI * 2);
  ctx.fill();
  // Resplandor de la ciudad en el horizonte
  glow(ctx, w * 0.4, h * 0.95, w * 0.6, "#ff9a5a", 0.22);
  // Dos filas de edificios: la del fondo más azulada y apagada
  for (const [base, tint, lit, seed] of [
    [0.7, "#141a33", 0.35, 3],
    [0.8, "#0a0d1a", 0.8, 11],
  ] as const) {
    const rr = rng(seed);
    let x = -10;
    while (x < w) {
      const bw = 30 + rr() * 70;
      const top = h * base - rr() * h * 0.2;
      ctx.fillStyle = tint;
      ctx.fillRect(x, top, bw, h - top);
      for (let wy = top + 8; wy < h - 6; wy += 11) {
        for (let wx = x + 6; wx < x + bw - 6; wx += 9) {
          if (rr() > 0.22 * lit) continue;
          ctx.fillStyle = rr() < 0.7 ? `rgba(255,200,120,${0.5 * lit + 0.2})` : `rgba(150,200,255,${0.4 * lit + 0.2})`;
          ctx.fillRect(wx, wy, 4, 5);
        }
      }
      // Alguna antena con piloto rojo
      if (rr() < 0.25) {
        ctx.fillRect(x + bw / 2, top - 18, 1.5, 18);
        ctx.fillStyle = "rgba(255,70,60,0.9)";
        ctx.fillRect(x + bw / 2 - 1, top - 20, 3.5, 3.5);
      }
      x += bw + rr() * 6;
    }
  }
};

/** Pelaje de gato naranja: rayas suaves y onduladas que, en la esfera, rodean el cuerpo. */
export const drawTabby: Draw = (ctx, w, h) => {
  ctx.fillStyle = hgrad(ctx, 0, w, ["#dc8642", "#e6964f", "#dc8642"]);
  ctx.fillRect(0, 0, w, h);
  const r = rng(5);
  for (let i = 0; i < 14; i += 1) {
    const x0 = (i / 14) * w + r() * 8;
    ctx.strokeStyle = `rgba(176,92,38,${0.22 + r() * 0.18})`;
    ctx.lineWidth = 6 + r() * 6;
    ctx.beginPath();
    for (let y = h * 0.08; y <= h * 0.92; y += 8) {
      const x = x0 + Math.sin(y * 0.03 + i) * 6;
      if (y === h * 0.08) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Tripa y pecho más claros
  const belly = ctx.createLinearGradient(0, 0, 0, h);
  belly.addColorStop(0.7, "rgba(240,215,180,0)");
  belly.addColorStop(1, "rgba(240,215,180,0.85)");
  ctx.fillStyle = belly;
  ctx.fillRect(0, 0, w, h);
};

FONT_FREE.add(drawNightSky).add(drawTabby);

const HAND = '"Segoe Print", "Bradley Hand", "Marker Felt", "Comic Sans MS", cursive';
const PEN = "#1e2b66";

/** Post-it escrito a mano. `strike` lo tacha; `arrow` dibuja una flecha hacia abajo a la izquierda. */
export const drawNote =
  (msg: string, paper: string, opts: { strike?: boolean; arrow?: boolean } = {}): Draw =>
  (ctx, w, h) => {
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, w, h);
    // Franja adhesiva arriba algo más lisa y sombra suave donde el papel se despega
    const lift = ctx.createLinearGradient(0, 0, 0, h);
    lift.addColorStop(0, "rgba(255,255,255,0.18)");
    lift.addColorStop(0.18, "rgba(255,255,255,0)");
    lift.addColorStop(0.75, "rgba(0,0,0,0)");
    lift.addColorStop(1, "rgba(0,0,0,0.12)");
    ctx.fillStyle = lift;
    ctx.fillRect(0, 0, w, h);

    // Parte la frase en dos renglones por el espacio más cercano a la mitad
    const words = msg.split(" ");
    let best = [msg];
    if (words.length > 1 && msg.length > 12) {
      let cut = 1;
      for (let i = 1; i < words.length; i += 1) {
        if (Math.abs(words.slice(0, i).join(" ").length - msg.length / 2) < Math.abs(words.slice(0, cut).join(" ").length - msg.length / 2)) cut = i;
      }
      best = [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
    }
    let size = w * 0.17;
    ctx.font = `700 ${size}px ${HAND}`;
    while (best.some((l) => ctx.measureText(l).width > w * 0.84) && size > 10) ctx.font = `700 ${(size -= 1)}px ${HAND}`;
    const top = opts.arrow ? h * 0.32 : h * 0.42;
    best.forEach((l, i) => {
      const y = top + i * size * 1.15;
      ctx.save();
      ctx.translate(w / 2, y);
      ctx.rotate(-0.04);
      text(ctx, l, 0, 0, ctx.font, PEN, { align: "center" });
      ctx.restore();
      if (opts.strike) {
        const half = ctx.measureText(l).width / 2 + 6;
        ctx.strokeStyle = "#c0262c";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(w / 2 - half, y - size * 0.28 + 3);
        ctx.quadraticCurveTo(w / 2, y - size * 0.38, w / 2 + half, y - size * 0.3 - 4);
        ctx.stroke();
      }
    });
    if (opts.strike) {
      // Visto bueno en rojo al pie
      ctx.strokeStyle = "#c0262c";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(w * 0.66, h * 0.8);
      ctx.lineTo(w * 0.73, h * 0.88);
      ctx.lineTo(w * 0.86, h * 0.7);
      ctx.stroke();
    }
    if (opts.arrow) {
      ctx.strokeStyle = PEN;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(w * 0.72, h * 0.5);
      ctx.bezierCurveTo(w * 0.7, h * 0.72, w * 0.45, h * 0.8, w * 0.17, h * 0.86);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.3, h * 0.76);
      ctx.lineTo(w * 0.15, h * 0.865);
      ctx.lineTo(w * 0.29, h * 0.95);
      ctx.stroke();
    }
  };
