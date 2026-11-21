"use client";

import { useEffect, useRef } from "react";
import { NEON_HIT_EVENT, type NeonHit } from "./NeonSign";

const GRAVITY = 1400;
const DRAG = 1.6;

type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; hot: boolean; w: number };
type Flash = { x: number; y: number; t: number; color: string };

/**
 * Capa de chispas sobre el hero. Solo corre mientras hay partículas vivas; en reposo no consume nada.
 */
export function Sparks() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let sparks: Spark[] = [];
    let flashes: Flash[] = [];
    let color = "#fff";
    let raf = 0;
    let prev = 0;
    let box = canvas.getBoundingClientRect();
    let dpr = 1;

    const resize = () => {
      box = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(box.width * dpr);
      canvas.height = Math.round(box.height * dpr);
    };
    resize();

    const frame = (now: number) => {
      const dt = Math.min(0.033, prev ? (now - prev) / 1000 : 0.016);
      prev = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, box.width, box.height);
      ctx.globalCompositeOperation = "lighter";

      flashes = flashes.filter((f) => now - f.t < 220);
      for (const f of flashes) {
        const p = (now - f.t) / 220;
        const r = 18 + p * 46;
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
        g.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - p)})`);
        g.addColorStop(0.35, hexA(f.color, 0.55 * (1 - p)));
        g.addColorStop(1, hexA(f.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.lineCap = "round";
      sparks = sparks.filter((s) => (s.life += dt) < s.max && s.y < box.height + 20);
      for (const s of sparks) {
        s.vx -= s.vx * DRAG * dt;
        s.vy += GRAVITY * dt - s.vy * DRAG * 0.4 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const k = 1 - s.life / s.max;
        // Estela proporcional a la velocidad: las chispas rápidas se ven como trazos, las lentas como puntos
        const tail = 0.018 + 0.02 * k;
        ctx.strokeStyle = s.hot ? `rgba(255,246,228,${k})` : hexA(color, k);
        ctx.lineWidth = s.w * (0.4 + 0.6 * k);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * tail, s.y - s.vy * tail);
        ctx.stroke();
      }

      if (sparks.length || flashes.length) raf = requestAnimationFrame(frame);
      else {
        raf = 0;
        prev = 0;
        ctx.clearRect(0, 0, box.width, box.height);
      }
    };

    const onHit = (e: Event) => {
      const { x: cx, y: cy, color: c } = (e as CustomEvent<NeonHit>).detail;
      const x = cx - box.left;
      const y = cy - box.top;
      color = c || color;
      flashes.push({ x, y, t: performance.now(), color });
      const n = 26 + ((Math.random() * 14) | 0);
      for (let i = 0; i < n; i += 1) {
        // Abanico sesgado hacia arriba, con algunas que caen directamente
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
        const v = 180 + Math.random() * 520;
        sparks.push({
          x,
          y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - 60,
          life: 0,
          max: 0.45 + Math.random() * 0.75,
          hot: Math.random() < 0.45,
          w: 1 + Math.random() * 1.6,
        });
      }
      if (!raf) raf = requestAnimationFrame(frame);
    };

    window.addEventListener(NEON_HIT_EVENT, onHit);
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", resize, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener(NEON_HIT_EVENT, onHit);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", resize);
    };
  }, []);

  return <canvas ref={ref} className="hero-sparks" aria-hidden="true" />;
}

function hexA(color: string, a: number) {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return `rgba(255,255,255,${a})`;
  const v = parseInt(m[1], 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}
