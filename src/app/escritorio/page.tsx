import type { Metadata } from "next";
import { DeskContent } from "@/components/desk/DeskContent";
import { es } from "@/i18n/dictionaries";

export const metadata: Metadata = { title: es.desk.title };

export default function DeskPage() {
  return (
    <main>
      <DeskContent />
    </main>
  );
}
