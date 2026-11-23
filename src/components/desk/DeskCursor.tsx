"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { getHover, getServerHover, subscribeHover } from "./interact";

/**
 * Cursor propio del escritorio: un punto con aro que sigue al ratón con algo de inercia. Sobre un objeto
 * pulsable el aro se abre y aparece qué hará el clic. Solo con ratón; en táctil no se pinta.
 */
export function DeskCursor({ reduceMotion, ready }: { reduceMotion: boolean; ready: boolean }) {
  const hovered = useSyncExternalStore(subscribeHover, getHover, getServerHover);
  // Mientras carga, el lienzo es invisible pero sigue detectando objetos: sin etiqueta hasta que se vea
  const label = ready ? hovered : null;
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let x = -100;
    let y = -100;
    let rx = x;
    let ry = y;
    let raf = 0;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const press = (on: boolean) => () => ring.current?.toggleAttribute("data-press", on);
    const down = press(true);
    const up = press(false);
    const loop = () => {
      // El aro llega un poco después que el punto: se nota el movimiento sin retrasar la puntería
      const k = reduceMotion ? 1 : 0.22;
      rx += (x - rx) * k;
      ry += (y - ry) * k;
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, [reduceMotion]);

  return (
    <div className="desk-cursor" aria-hidden="true" data-active={label ? "" : undefined}>
      <div ref={ring} className="desk-cursor-ring">
        <span className="desk-cursor-label">{label}</span>
      </div>
      <div ref={dot} className="desk-cursor-dot" />
    </div>
  );
}
