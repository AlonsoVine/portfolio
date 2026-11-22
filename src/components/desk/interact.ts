"use client";

import type { ThreeEvent } from "@react-three/fiber";

/**
 * Estado compartido del puntero sobre los objetos del escritorio: qué hará un clic donde está el ratón.
 * Vive fuera de React para que el cursor (DOM) y la escena (canvas) lo lean sin rerender en cadena.
 */
type Listener = () => void;
let current: string | null = null;
const listeners = new Set<Listener>();

export const subscribeHover = (l: Listener) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export const getHover = () => current;
export const getServerHover = () => null;

export function showHover(label: string | null) {
  if (current === label) return;
  current = label;
  listeners.forEach((l) => l());
}

/**
 * Props de puntero de un objeto pulsable: anuncia su acción al cursor y la ejecuta al hacer clic.
 * Es un hook solo de nombre: así el compilador de React sabe que los callbacks no corren al renderizar.
 */
export function useHoverable(label: string, onClick?: (e: ThreeEvent<MouseEvent>) => void, onEnter?: () => void) {
  return {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      showHover(label);
      onEnter?.();
    },
    onPointerOut: () => showHover(null),
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onClick?.(e);
    },
  };
}
