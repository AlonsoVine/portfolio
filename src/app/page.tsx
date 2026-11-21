import { Hero } from "@/components/hero/Hero";
import { es } from "@/i18n/dictionaries";

export default function Home() {
  return (
    <main>
      <Hero t={es.hero} />
    </main>
  );
}
