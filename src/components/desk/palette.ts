import { Color } from "three";

// Mismo frío/cálido que el rótulo del hero, con dos acentos para que la escena no sea bicolor
export const ICE = "#7fd4ff";
export const AMBER = "#ffad4a";
export const VIOLET = "#8b6cff";
export const MAGENTA = "#ff4fa3";
export const MINT = "#5dffc4";

/** Color por encima de 1: solo lo que pasa de 1 entra en el bloom. */
export const hdr = (hex: string, k: number) => new Color(hex).multiplyScalar(k);

export const GRADIENT = [ICE, VIOLET, MAGENTA, AMBER];
