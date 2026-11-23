"use client";

import { useEffect, useRef } from "react";

// Solo ASCII: en monoespaciada todos ocupan lo mismo y el texto no baila mientras se descifra
const NOISE = "0123456789<>/=*+#$%&@ABCDEFXZ";

type Props = {
  text: string;
  active: boolean;
  delay?: number;
  duration?: number;
};

/**
 * Texto que se «descifra»: cada carácter pasa por glifos aleatorios y se fija de izquierda a derecha.
 * El HTML inicial ya lleva el texto final (SEO, lectores de pantalla, sin JS); la animación solo lo reescribe.
 */
export function Scramble({ text, active, delay = 0, duration = 900 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const played = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = text;
      return;
    }
    // Tras la entrada (p. ej. al cambiar de idioma) se descifra al momento y más rápido
    const wait = played.current ? 0 : delay;
    const span = played.current ? Math.min(duration, 500) : duration;
    let raf = 0;
    let t0 = 0;
    const chars = [...text];
    const frame = (now: number) => {
      if (!t0) t0 = now;
      const p = (now - t0) / span;
      el.textContent = chars
        .map((ch, i) => {
          if (ch === " ") return ch;
          const lock = (i / chars.length) * 0.75 + 0.25;
          return p >= lock ? ch : NOISE[(Math.random() * NOISE.length) | 0];
        })
        .join("");
      if (p < 1) raf = requestAnimationFrame(frame);
      else {
        el.textContent = text;
        played.current = true;
      }
    };
    const id = window.setTimeout(() => {
      raf = requestAnimationFrame(frame);
    }, wait);
    return () => {
      window.clearTimeout(id);
      cancelAnimationFrame(raf);
    };
  }, [text, active, delay, duration]);

  return (
    <span ref={ref} aria-label={text}>
      {text}
    </span>
  );
}
