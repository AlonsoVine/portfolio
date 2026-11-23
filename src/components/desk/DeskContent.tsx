"use client";

import { useEffect } from "react";
import { useDictionary } from "@/i18n/locale";
import { DeskExperience } from "./DeskExperience";

export function DeskContent() {
  const t = useDictionary();
  useEffect(() => {
    document.title = t.desk.title;
  }, [t]);
  return <DeskExperience t={t.desk} lang={t.lang} />;
}
