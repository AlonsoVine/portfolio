"use client";

import { useEffect, useMemo } from "react";
import { canvasTexture, type CanvasTex, type Draw } from "./screens";

// Varios objetos piden la misma textura (la mancha suave, el ruido, la hoja del poto): se pinta y se sube
// a la GPU una sola vez y se libera cuando la suelta el último que la usa.
const shared = new WeakMap<Draw, Map<string, CanvasTex>>();
const refs = new Map<CanvasTex, number>();

/**
 * Textura de canvas ligada al ciclo de vida del componente. Con `refreshMs` se repinta periódicamente
 * (pantallas con hora) y no se comparte. Se libera al desmontar.
 */
export function useCanvasTexture(w: number, h: number, draw: Draw, opts: { tileX?: number; tileY?: number; color?: boolean; refreshMs?: number } = {}) {
  const { tileX, tileY, color, refreshMs } = opts;
  const key = `${w}|${h}|${tileX}|${tileY}|${color}`;
  const made = useMemo(() => {
    const create = () => canvasTexture(w, h, draw, { tile: tileX ? [tileX, tileY ?? 1] : undefined, color });
    if (refreshMs) return create();
    let byKey = shared.get(draw);
    if (!byKey) shared.set(draw, (byKey = new Map()));
    let tex = byKey.get(key);
    if (!tex) byKey.set(key, (tex = create()));
    return tex;
  }, [w, h, draw, tileX, tileY, color, refreshMs, key]);

  useEffect(() => {
    refs.set(made, (refs.get(made) ?? 0) + 1);
    if (!refreshMs) shared.get(draw)?.set(key, made);
    const id = refreshMs ? window.setInterval(made.paint, refreshMs) : 0;
    return () => {
      window.clearInterval(id);
      const left = (refs.get(made) ?? 1) - 1;
      if (left > 0) {
        refs.set(made, left);
        return;
      }
      refs.delete(made);
      made.tex.dispose();
      if (shared.get(draw)?.get(key) === made) shared.get(draw)?.delete(key);
    };
  }, [made, refreshMs, draw, key]);

  return made.tex;
}
