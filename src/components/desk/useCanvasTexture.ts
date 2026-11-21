"use client";

import { useEffect, useMemo } from "react";
import { canvasTexture, type Draw } from "./screens";

/**
 * Textura de canvas ligada al ciclo de vida del componente. Con `refreshMs` se repinta periódicamente
 * (pantallas con hora). Se libera al desmontar.
 */
export function useCanvasTexture(w: number, h: number, draw: Draw, opts: { tileX?: number; tileY?: number; color?: boolean; refreshMs?: number } = {}) {
  const { tileX, tileY, color, refreshMs } = opts;
  const made = useMemo(() => canvasTexture(w, h, draw, { tile: tileX ? [tileX, tileY ?? 1] : undefined, color }),
    [w, h, draw, tileX, tileY, color],
  );
  useEffect(() => {
    const id = refreshMs ? window.setInterval(made.paint, refreshMs) : 0;
    return () => {
      window.clearInterval(id);
      made.tex.dispose();
    };
  }, [made, refreshMs]);
  return made.tex;
}
