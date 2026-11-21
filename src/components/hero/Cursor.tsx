"use client";

import { useEffect, useRef } from "react";
import { POINTER_SMOOTH_MS } from "./motion";

/**
 * Cursor propio: punto que sigue al ratón al instante y anillo con inercia. Sobre el retrato el anillo crece
 * hasta el radio del efecto y se convierte en la «lente» del decodificador.
 */
export function Cursor({ label }: { label: string }) {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    document.documentElement.dataset.cursor = "custom";

    const target = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    let raf = 0;
    let prev = 0;
    const tick = (now: number) => {
      const dt = Math.min(50, prev ? now - prev : 16);
      prev = now;
      const k = 1 - Math.exp(-dt / POINTER_SMOOTH_MS);
      pos.x += (target.x - pos.x) * k;
      pos.y += (target.y - pos.y) * k;
      ring.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      if (Math.abs(target.x - pos.x) > 0.1 || Math.abs(target.y - pos.y) > 0.1) raf = requestAnimationFrame(tick);
      else {
        raf = 0;
        prev = 0;
      }
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      target.x = e.clientX;
      target.y = e.clientY;
      dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      // Solo se tocan los atributos cuando cambian: cada escritura invalida estilos
      const mode = (e.target as Element | null)?.closest?.("[data-cursor]")?.getAttribute("data-cursor") ?? "";
      if (ring.dataset.mode !== mode) ring.dataset.mode = mode;
      if (ring.dataset.hidden !== "false") {
        // Al reaparecer, el anillo nace en el puntero en vez de volar desde donde se quedó
        pos.x = target.x;
        pos.y = target.y;
        ring.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
        dot.dataset.hidden = "false";
        ring.dataset.hidden = "false";
      }
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onLeave = () => {
      dot.dataset.hidden = "true";
      ring.dataset.hidden = "true";
    };
    window.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      delete document.documentElement.dataset.cursor;
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="cursor-ring" data-hidden="true" aria-hidden="true">
        <span>
          <em>{label}</em>
        </span>
      </div>
      <div ref={dotRef} className="cursor-dot" data-hidden="true" aria-hidden="true" />
    </>
  );
}
