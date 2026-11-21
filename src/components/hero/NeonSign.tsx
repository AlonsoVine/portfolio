"use client";

import { useEffect, useRef, type Ref } from "react";

export const NEON_HIT_EVENT = "neon:hit";

export type NeonHit = { x: number; y: number; color: string };

const OFF_MIN_MS = 2600;
const OFF_MAX_MS = 4200;
const RELIGHT_MS = 1100;

type Word = { text: string; tone: "a" | "b"; faulty?: number };

/**
 * Rótulo de neón con letras «golpeables»: al darle a una letra saltan chispas desde el impacto, el tubo se
 * apaga unos segundos y vuelve a arrancar con parpadeo. Las chispas las pinta <Sparks> al recibir el evento.
 */
export function NeonSign({ words, ref }: { words: Word[]; ref?: Ref<HTMLDivElement> }) {
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((id) => window.clearTimeout(id));
  }, []);

  const hit = (e: React.PointerEvent<HTMLSpanElement>) => {
    const letter = e.currentTarget;
    if (letter.dataset.state === "off") return;
    const tube = getComputedStyle(letter).getPropertyValue("--tube").trim();
    window.dispatchEvent(
      new CustomEvent<NeonHit>(NEON_HIT_EVENT, { detail: { x: e.clientX, y: e.clientY, color: tube } }),
    );
    letter.dataset.state = "off";
    const off = OFF_MIN_MS + Math.random() * (OFF_MAX_MS - OFF_MIN_MS);
    timers.current.push(
      window.setTimeout(() => {
        letter.dataset.state = "relight";
        timers.current.push(
          window.setTimeout(() => {
            delete letter.dataset.state;
          }, RELIGHT_MS),
        );
      }, off),
    );
  };

  return (
    <div ref={ref} className="hero-sign" aria-hidden="true">
      {words.map((word) => (
        <span key={word.tone} className={`neon neon--${word.tone}`} data-text={word.text}>
          {[...word.text].map((ch, i) => (
            <span
              key={i}
              className={i === word.faulty ? "neon-letter neon-faulty" : "neon-letter"}
              data-cursor="spark"
              onPointerDown={hit}
            >
              {ch}
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}
