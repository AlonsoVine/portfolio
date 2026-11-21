import type { Metadata } from "next";
import { DeskExperience } from "@/components/desk/DeskExperience";
import { es } from "@/i18n/dictionaries";

export const metadata: Metadata = { title: es.desk.title };

export default function DeskPage() {
  return (
    <main>
      <DeskExperience t={es.desk} lang={es.lang} />
    </main>
  );
}
