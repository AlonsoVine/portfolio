"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";

export const EYE: [number, number, number] = [0, 0.47, 0.74];

// Límites del giro de cabeza (radianes). Hacia abajo se llega más lejos para ver la tablet y el teclado
const YAW = 0.72;
const PITCH_REST = -0.27;
const PITCH_UP = 0.08;
const PITCH_DOWN = -0.78;
// Más lento que el cursor: una cabeza pesa más que una mano
const LOOK_SMOOTH_MS = 220;

/**
 * Mirada en primera persona: con ratón, la posición del puntero decide hacia dónde mira la cabeza;
 * en táctil, arrastrar gira la vista. La cámara no se desplaza, solo gira (y se inclina un poco).
 */
export function LookControls({ reduceMotion }: { reduceMotion: boolean }) {
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    let drag: { id: number; x: number; y: number } | null = null;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        target.current.x = clamp((e.clientX / window.innerWidth) * 2 - 1);
        target.current.y = clamp((e.clientY / window.innerHeight) * 2 - 1);
      } else if (drag && drag.id === e.pointerId) {
        target.current.x = clamp(target.current.x - ((e.clientX - drag.x) / window.innerWidth) * 2.4);
        target.current.y = clamp(target.current.y - ((e.clientY - drag.y) / window.innerHeight) * 2.4);
        drag.x = e.clientX;
        drag.y = e.clientY;
      }
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    };
    const onUp = () => {
      drag = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  useFrame(({ camera, clock }, delta) => {
    const k = reduceMotion ? 1 : 1 - Math.exp((-delta * 1000) / LOOK_SMOOTH_MS);
    const c = current.current;
    c.x += (target.current.x - c.x) * k;
    c.y += (target.current.y - c.y) * k;

    const yaw = -c.x * YAW;
    const pitch = c.y > 0 ? PITCH_REST + c.y * (PITCH_DOWN - PITCH_REST) : PITCH_REST - c.y * (PITCH_UP - PITCH_REST);
    // Respiración: un vaivén mínimo para que la vista no parezca una cámara en trípode
    const breath = reduceMotion ? 0 : Math.sin(clock.elapsedTime * 1.1) * 0.004;

    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch + breath * 0.3, yaw, 0);
    // Al girar, la cabeza se desplaza un poco hacia ese lado y hacia delante al mirar abajo
    camera.position.set(EYE[0] + Math.sin(yaw) * -0.05, EYE[1] + breath, EYE[2] + Math.min(0, pitch - PITCH_REST) * 0.12);
  });

  return null;
}
