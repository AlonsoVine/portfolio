"use client";

import { useEffect } from "react";
import { useDictionary } from "@/i18n/locale";
import { Hero } from "./Hero";

export function HomeContent() {
  const t = useDictionary();
  useEffect(() => {
    document.title = t.meta.title;
  }, [t]);
  return <Hero t={t.hero} />;
}
