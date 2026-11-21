"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";
import type { Dictionary } from "@/i18n/dictionaries";

// three.js solo existe en el cliente y pesa: se carga aparte para no engordar el hero
const DeskScene = dynamic(() => import("./DeskScene"), { ssr: false });

const REDUCE = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export function DeskExperience({ t, lang }: { t: Dictionary["desk"]; lang: string }) {
  const reduceMotion = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCE).matches,
    () => false,
  );
  const [ready, setReady] = useState(false);
  return (
    <section className="desk" aria-label={t.label} data-ready={ready}>
      <DeskScene t={t} lang={lang} reduceMotion={reduceMotion} onReady={() => setReady(true)} />
      <div className="desk-loader" aria-hidden="true">
        <span className="desk-loader-label">{t.loading}</span>
        <span className="desk-loader-bar" />
      </div>
      <p className="desk-hint">
        <span data-pointer>{t.hintPointer}</span>
        <span data-touch>{t.hintTouch}</span>
      </p>
    </section>
  );
}
