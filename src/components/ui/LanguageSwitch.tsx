"use client";

import { setLocale, useDictionary, useLocale, type Locale } from "@/i18n/locale";

const OPTIONS: Locale[] = ["es", "en"];

/** Conmutador ES · EN fijo arriba en el centro, donde no pisa la cabecera de ninguna página; está en todas las páginas, también durante la carga. */
export function LanguageSwitch() {
  const locale = useLocale();
  const t = useDictionary();
  return (
    <div className="lang-switch" role="group" aria-label={t.langSwitch}>
      {OPTIONS.map((l, i) => (
        <span key={l}>
          {i > 0 && <span aria-hidden="true">·</span>}
          <button type="button" lang={l} aria-pressed={locale === l} onClick={() => setLocale(l)}>
            {l.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );
}
