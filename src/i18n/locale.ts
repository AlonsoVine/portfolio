"use client";

import { useSyncExternalStore } from "react";
import { en, es, type Dictionary } from "./dictionaries";

export type Locale = "es" | "en";

const KEY = "lang";
const listeners = new Set<() => void>();
let current: Locale | null = null;

// Primera visita: el idioma del navegador; después, lo que eligió el usuario
function read(): Locale {
  if (current) return current;
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch {}
  current = saved === "es" || saved === "en" ? saved : navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
  document.documentElement.lang = current;
  return current;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setLocale(next: Locale) {
  current = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {}
  document.documentElement.lang = next;
  for (const fn of listeners) fn();
}

/** Idioma activo. El HTML estático sale en español y, al hidratar, cambia al del usuario sin desajustes. */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, read, () => "es");
}

export function useDictionary(): Dictionary {
  return useLocale() === "en" ? en : es;
}
