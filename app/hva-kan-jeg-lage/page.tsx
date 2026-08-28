import type { Metadata } from "next";
import { PantryMatchView } from "@/components/pantry/PantryMatchView";
import { getCurrentUser } from "@/lib/auth";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: t(lang, "pantryPage.title"),
    description: t(lang, "pantryPage.metaDescription"),
  };
}

/**
 * "Hva kan jeg lage?" – Smart Pantry Search OG "Bruk restene" fra
 * spesifikasjonen, BEVISST slått sammen til én side/motor i stedet for to
 * separate funksjoner. Begge er i bunn og grunn samme spørsmål ("her er
 * noen ingredienser jeg har – hva kan jeg lage?"), bare med ulik "mengde"
 * ingrediens som utgangspunkt (et helt kjøleskap via bilde, kontra noen få
 * rester man skriver inn) – å bygge dem som to parallelle, nesten
 * identiske sider ville vært akkurat den typen ti-frittstående-AI-
 * funksjoner-som-ikke-vet-om-hverandre kravspesifikasjonen ba om å unngå.
 * Se components/pantry/PantryMatchView.tsx og
 * lib/kitchen-intelligence/pantry-match.ts for selve gjennomføringen.
 */
export default async function PantryPage() {
  const [lang, user] = await Promise.all([getLang(), getCurrentUser()]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-serif text-3xl text-ink sm:text-4xl">{t(lang, "pantryPage.title")}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t(lang, "pantryPage.intro")}</p>
      <div className="mt-8">
        <PantryMatchView lang={lang} isAdmin={Boolean(user?.isAdmin)} />
      </div>
    </div>
  );
}
