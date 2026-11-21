"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { Cursor } from "./Cursor";
import { MatrixPortrait } from "./MatrixPortrait";
import { NeonSign } from "./NeonSign";
import { Scramble } from "./Scramble";
import { Sparks } from "./Sparks";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const PORTRAIT_SRC = `${BASE_PATH}/hero/retrato.webp`;
const MIN_LOADER_MS = 1500;
// Debe coincidir con el retardo de .hero-ui en globals.css
const UI_DELAY = 3100;

// Componente propio: su tic de cada segundo no re-renderiza el resto del hero
function MadridClock() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("es-ES", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const tick = () => {
      if (ref.current) ref.current.textContent = `${fmt.format(new Date())} CET`;
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span ref={ref} className="hero-clock">
      {" "}
    </span>
  );
}

export function Hero({ t }: { t: Dictionary["hero"] }) {
  const counterRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const signRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [loaderGone, setLoaderGone] = useState(false);
  const [done, setDone] = useState(false);

  // Precarga: el contador nunca llega a 100 hasta que la foto y las fuentes están listas
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const img = new Image();
    img.src = PORTRAIT_SRC;
    const assets = Promise.all([img.decode().catch(() => undefined), document.fonts.ready]);
    let loaded = false;
    assets.then(() => {
      loaded = true;
    });

    if (reduce) {
      assets.then(() => {
        setReady(true);
        setLoaderGone(true);
      });
      return;
    }

    const t0 = performance.now();
    let raf = 0;
    let shown = 0;
    const tick = (now: number) => {
      const elapsed = now - t0;
      const cap = loaded ? 100 : 92;
      const goal = Math.min(cap, (elapsed / MIN_LOADER_MS) * 100);
      shown += (goal - shown) * 0.12;
      if (loaded && elapsed >= MIN_LOADER_MS && shown > 99.5) shown = 100;
      if (counterRef.current) counterRef.current.textContent = String(Math.round(shown)).padStart(3, "0");
      if (barRef.current) barRef.current.style.transform = `scaleX(${(shown / 100).toFixed(3)})`;
      if (shown < 100) raf = requestAnimationFrame(tick);
      else setReady(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Paralaje suave de las capas según el cursor. Se escribe el transform de cada capa (compuesta en GPU)
  // en vez de variables CSS en la sección, que invalidarían el estilo de todo el hero en cada fotograma
  useEffect(() => {
    const backdrop = backdropRef.current;
    const sign = signRef.current;
    if (!backdrop || !sign) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce), (hover: none)").matches) return;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let raf = 0;
    const tick = () => {
      current.x += (target.x - current.x) * 0.06;
      current.y += (target.y - current.y) * 0.06;
      backdrop.style.transform = `translate3d(${(current.x * -16).toFixed(2)}px, ${(current.y * -10).toFixed(2)}px, 0)`;
      sign.style.transform = `translate3d(${(current.x * -8).toFixed(2)}px, ${(current.y * -5).toFixed(2)}px, 0)`;
      if (Math.abs(target.x - current.x) > 0.001 || Math.abs(target.y - current.y) > 0.001) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <section className="hero" data-ready={ready}>
      <h1 className="sr-only">
        {t.firstName} {t.lastName} — {t.role}, {t.roleDetail}
      </h1>

      <div ref={backdropRef} className="hero-backdrop" aria-hidden="true">
        <div className="hero-glow hero-glow--a" />
        <div className="hero-glow hero-glow--b" />
        <div className="hero-halo" />
        <span className="hero-led hero-led--a" />
        <span className="hero-led hero-led--a hero-led--small" />
        <span className="hero-led hero-led--b" />
        <span className="hero-led hero-led--b hero-led--small" />
      </div>

      <NeonSign
        ref={signRef}
        words={[
          { text: t.firstName, tone: "a" },
          // La segunda letra del apellido tiene el tubo «tocado» y parpadea por su cuenta
          { text: t.lastName, tone: "b", faulty: 1 },
        ]}
      />

      <MatrixPortrait
        src={PORTRAIT_SRC}
        alt={t.portraitAlt}
        width={1171}
        height={941}
        start={ready}
        onInteract={() => window.setTimeout(() => setDone(true), 1400)}
      />

      <div className="hero-vignette" aria-hidden="true" />
      <div className="hero-grain" aria-hidden="true" />

      <div className="hero-frame" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>

      <p className="hero-ui hero-ui--tl">
        <strong>
          <Scramble text={`${t.firstName} ${t.lastName}`} active={ready} delay={UI_DELAY} />
        </strong>
        <br />
        <Scramble text={t.edition} active={ready} delay={UI_DELAY + 120} />
      </p>
      <p className="hero-ui hero-ui--tr">
        <strong>
          <Scramble text={t.location} active={ready} delay={UI_DELAY + 150} />
        </strong>
        <br />
        <span className="hero-coords">
          <Scramble text="40.4168° N — 3.7038° W" active={ready} delay={UI_DELAY + 270} />
        </span>
        <br />
        <MadridClock />
      </p>
      <p className="hero-ui hero-ui--bl">
        <span className="hero-index">001</span>
        <strong>
          <Scramble text={t.role} active={ready} delay={UI_DELAY + 60} />
        </strong>
        <br />
        <Scramble text={t.roleDetail} active={ready} delay={UI_DELAY + 180} />
      </p>
      <p className="hero-ui hero-ui--br" aria-live="polite">
        <span className="hero-hint" data-done={done}>
          {done ? (
            <Scramble key="done" text={t.hintDone} active duration={700} />
          ) : (
            <>
              <span data-pointer>
                <Scramble text={t.hintPointer} active={ready} delay={UI_DELAY + 240} />
              </span>
              <span data-touch>
                <Scramble text={t.hintTouch} active={ready} delay={UI_DELAY + 240} />
              </span>
            </>
          )}
        </span>
      </p>

      {!loaderGone && (
        <div className="hero-loader" aria-hidden="true" onTransitionEnd={() => ready && setLoaderGone(true)}>
          <span className="hero-loader-label">{t.loading}</span>
          <span ref={counterRef} className="hero-loader-count">
            000
          </span>
          <span ref={barRef} className="hero-loader-bar" />
        </div>
      )}

      <Sparks />
      <Cursor label={t.cursorLabel} />
    </section>
  );
}
