import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import type { Dictionary } from "@/i18n/dictionaries";

export type ScreenCopy = Dictionary["desk"]["screens"];
type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, font: Fonts) => void;
type Fonts = { mono: string; display: string };

function fonts(): Fonts {
  const css = getComputedStyle(document.documentElement);
  return {
    mono: css.getPropertyValue("--font-mono").trim() || "monospace",
    display: css.getPropertyValue("--font-display").trim() || "sans-serif",
  };
}

/**
 * Textura de pantalla dibujada en un canvas. Se repinta cuando terminan de cargar las fuentes web,
 * porque el primer dibujado puede salir con la fuente de reserva.
 */
export function screenTexture(w: number, h: number, draw: Draw, mirror = false) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  if (mirror) {
    // La cara interior del cilindro de la ultrawide invierte la U
    tex.wrapS = RepeatWrapping;
    tex.repeat.x = -1;
  }
  const paint = () => {
    ctx.clearRect(0, 0, w, h);
    draw(ctx, w, h, fonts());
    tex.needsUpdate = true;
  };
  paint();
  document.fonts.ready.then(paint);
  return tex;
}

function backdrop(ctx: CanvasRenderingContext2D, w: number, h: number, top: string, bottom: string) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function title(ctx: CanvasRenderingContext2D, font: Fonts, text: string, x: number, y: number, size: number, color: string) {
  ctx.font = `800 ${size}px ${font.display}`;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.35;
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.shadowBlur = 0;
}

function label(ctx: CanvasRenderingContext2D, font: Fonts, text: string, x: number, y: number, size: number, color: string) {
  ctx.font = `500 ${size}px ${font.mono}`;
  ctx.fillStyle = color;
  ctx.fillText(text.toUpperCase(), x, y);
}

export const drawCv =
  (t: ScreenCopy): Draw =>
  (ctx, w, h, font) => {
    backdrop(ctx, w, h, "#0d1624", "#070b12");
    // Ventana de editor de juguete: barra lateral, pestañas y líneas de «código»
    ctx.fillStyle = "#0a111c";
    ctx.fillRect(0, 0, w * 0.16, h);
    ctx.fillStyle = "#121c2b";
    ctx.fillRect(0, 0, w, h * 0.08);
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = ["#ff5f57", "#febc2e", "#28c840"][i];
      ctx.beginPath();
      ctx.arc(h * 0.04 + i * h * 0.05, h * 0.04, h * 0.014, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 9; i += 1) {
      ctx.fillStyle = i === 2 ? "#7fd4ff" : "#2a3a52";
      ctx.fillRect(w * 0.02, h * (0.16 + i * 0.07), w * (0.07 + ((i * 37) % 5) * 0.012), h * 0.025);
    }
    title(ctx, font, t.cv, w * 0.22, h * 0.34, h * 0.17, "#7fd4ff");
    label(ctx, font, t.cvDetail, w * 0.225, h * 0.45, h * 0.05, "#9fb3c8");
    const palette = ["#ffad4a", "#7fd4ff", "#c792ea", "#46ff8c", "#5d6f88"];
    for (let i = 0; i < 7; i += 1) {
      let x = w * 0.225;
      const y = h * (0.56 + i * 0.058);
      for (let j = 0; j < 4; j += 1) {
        const seg = w * (0.03 + (((i + 1) * (j + 3) * 17) % 9) * 0.012);
        ctx.fillStyle = palette[(i + j) % palette.length];
        ctx.globalAlpha = 0.75;
        ctx.fillRect(x, y, seg, h * 0.022);
        x += seg + w * 0.01;
      }
    }
    ctx.globalAlpha = 1;
  };

const INVADER = ["00100000100", "00010001000", "00111111100", "01101110110", "11111111111", "10111111101", "10100000101", "00011011000"];

export const drawGames =
  (t: ScreenCopy): Draw =>
  (ctx, w, h, font) => {
    backdrop(ctx, w, h, "#12081f", "#05030b");
    const px = h * 0.022;
    const colors = ["#46ff8c", "#ffad4a", "#ff5fd2"];
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        const ox = w * 0.14 + col * w * 0.155;
        const oy = h * 0.1 + row * h * 0.13;
        ctx.fillStyle = colors[row];
        INVADER.forEach((line, y) =>
          [...line].forEach((bit, x) => bit === "1" && ctx.fillRect(ox + x * px, oy + y * px, px, px)),
        );
      }
    }
    title(ctx, font, t.games, w * 0.08, h * 0.7, h * 0.15, "#ff5fd2");
    label(ctx, font, t.gamesDetail, w * 0.085, h * 0.8, h * 0.05, "#d6c3ef");
    ctx.fillStyle = "#46ff8c";
    ctx.fillRect(w * 0.47, h * 0.9, w * 0.06, h * 0.03);
    ctx.fillRect(w * 0.49, h * 0.875, w * 0.02, h * 0.03);
  };

export const drawProjects =
  (t: ScreenCopy): Draw =>
  (ctx, w, h, font) => {
    backdrop(ctx, w, h, "#1a1208", "#090604");
    title(ctx, font, t.projects, w * 0.07, h * 0.2, h * 0.14, "#ffad4a");
    label(ctx, font, t.projectsDetail, w * 0.075, h * 0.29, h * 0.045, "#e6cfae");
    const cards = ["#ffad4a", "#7fd4ff", "#c792ea", "#46ff8c"];
    cards.forEach((c, i) => {
      const x = w * (0.07 + (i % 2) * 0.445);
      const y = h * (0.37 + Math.floor(i / 2) * 0.31);
      ctx.fillStyle = "#1f1812";
      ctx.fillRect(x, y, w * 0.415, h * 0.27);
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x, y, w * 0.415, h * 0.16);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#4a3c2e";
      ctx.fillRect(x + w * 0.02, y + h * 0.195, w * 0.2, h * 0.025);
    });
  };

export const drawPhone =
  (t: ScreenCopy): Draw =>
  (ctx, w, h, font) => {
    backdrop(ctx, w, h, "#16233a", "#05070d");
    ctx.textAlign = "center";
    title(ctx, font, "17:57", w / 2, h * 0.24, w * 0.3, "#dff3ff");
    label(ctx, font, t.phoneName, w / 2, h * 0.33, w * 0.065, "#9fb3c8");
    ctx.fillStyle = "rgba(127,212,255,0.14)";
    ctx.fillRect(w * 0.08, h * 0.62, w * 0.84, h * 0.12);
    ctx.fillStyle = "#46ff8c";
    ctx.beginPath();
    ctx.arc(w * 0.17, h * 0.68, w * 0.03, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = "left";
    label(ctx, font, t.phoneStatus, w * 0.24, h * 0.69, w * 0.055, "#dff3ff");
  };

export const drawTablet: Draw = (ctx, w, h, font) => {
  const g = ctx.createRadialGradient(w * 0.8, h * 0.2, 0, w * 0.8, h * 0.2, w * 1.1);
  g.addColorStop(0, "#2b5bd7");
  g.addColorStop(1, "#06102b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = "center";
  title(ctx, font, "17:57", w / 2, h * 0.32, w * 0.3, "#e8efff");
};

/** Degradado arcoíris que asoma entre las teclas, como el RGB del teclado real. */
export const drawRgb: Draw = (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, w, 0);
  ["#ff3b6b", "#ffad4a", "#f9f871", "#46ff8c", "#38c9ff", "#7b61ff", "#ff5fd2"].forEach((c, i, a) =>
    g.addColorStop(i / (a.length - 1), c),
  );
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};

export const drawSteam: Draw = (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};
