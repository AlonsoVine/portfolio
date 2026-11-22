"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { PerspectiveCamera } from "three";

export const EYE: [number, number, number] = [0, 0.47, 0.74];

// Límites del giro de cabeza (radianes). Hacia abajo se llega más lejos para ver la tablet y el teclado
const YAW = 0.72;
const PITCH_REST = -0.27;
const PITCH_UP = 0.08;
const PITCH_DOWN = -0.64;
export const BASE_FOV = 56;
const MAX_FOV = 92;
const MIN_HFOV = (68 * Math.PI) / 180;
// Una cabeza pesa más que una mano: muelle blando y amortiguamiento crítico (2·√k)
const STIFFNESS = 38;
const DAMPING = 2 * Math.sqrt(STIFFNESS);

/**
 * Mirada en primera persona: con ratón, la posición del puntero decide hacia dónde mira la cabeza;
 * en táctil, arrastrar gira la vista. La cámara no se desplaza, solo gira (y se inclina un poco).
 */
export function LookControls({ reduceMotion }: { reduceMotion: boolean }) {
  const target = useRef({ x: 0, y: 0 });
  // Muelle críticamente amortiguado: arranca y frena con inercia, sin el «enganche» lineal de un lerp
  const spring = useRef({ x: 0, y: 0, vx: 0, vy: 0 });

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
    // Si el ratón sale de la ventana, la cabeza vuelve a mirar al frente
    const onLeave = () => {
      target.current.x = 0;
      target.current.y = 0;
    };
    document.documentElement.addEventListener("pointerleave", onLeave);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  useFrame(({ camera, clock }, delta) => {
    const c = spring.current;
    if (reduceMotion) {
      c.x = target.current.x;
      c.y = target.current.y;
      c.vx = c.vy = 0;
    } else {
      // Subpasos fijos: estable aunque un fotograma se alargue
      const steps = Math.min(8, Math.ceil(delta / (1 / 120)));
      const dt = Math.min(delta, 0.1) / steps;
      for (let i = 0; i < steps; i += 1) {
        c.vx += (STIFFNESS * (target.current.x - c.x) - DAMPING * c.vx) * dt;
        c.vy += (STIFFNESS * (target.current.y - c.y) - DAMPING * c.vy) * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
      }
    }

    const yaw = -c.x * YAW;
    const pitch = c.y > 0 ? PITCH_REST + c.y * (PITCH_DOWN - PITCH_REST) : PITCH_REST - c.y * (PITCH_UP - PITCH_REST);
    // Respiración: un vaivén mínimo para que la vista no parezca una cámara en trípode
    const breath = reduceMotion ? 0 : Math.sin(clock.elapsedTime * 1.1) * 0.004;

    // En vertical se mantiene un campo horizontal mínimo para que quepan las tres pantallas
    const cam = camera as PerspectiveCamera;
    const fov = cam.aspect >= 1.2 ? BASE_FOV : Math.min(MAX_FOV, (2 * Math.atan(Math.tan(MIN_HFOV / 2) / cam.aspect) * 180) / Math.PI);
    if (Math.abs(cam.fov - fov) > 0.1) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    camera.rotation.order = "YXZ";
    // Alabeo leve al girar, proporcional a la velocidad: la cabeza se inclina al moverse, no al estar quieta
    camera.rotation.set(pitch + breath * 0.3, yaw, c.vx * YAW * 0.02);
    // Al girar, la cabeza se desplaza un poco hacia ese lado y hacia delante al mirar abajo
    camera.position.set(EYE[0] + Math.sin(yaw) * -0.05, EYE[1] + breath, EYE[2] + Math.min(0, pitch - PITCH_REST) * 0.12);
  });

  return null;
}
