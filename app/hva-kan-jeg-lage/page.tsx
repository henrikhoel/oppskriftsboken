import type { Metadata } from "next";
import { PantryMatchView } from "@/components/pantry/PantryMatchView";
import { LockedPanel } from "@/components/ui/LockedPanel";
import { getCurrentUserFast } from "@/lib/auth";
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
  const [lang, user] = await Promise.all([getLang(), getCurrentUserFast()]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      {/* (04.10.2026, redesign – Henrik: "gjør siden betydelig renere og mer
          i tråd med det nye CONVITE-uttrykket") Ytre container uendret
          bredde (max-w-5xl) – resultatgridet i PantryMatchView.tsx trenger
          den fulle bredden for å få plass til opptil 4 kolonner. Intro/
          undertittel/inputområdet begrenses i stedet til en smalere,
          editorial lesebredde INNENFRA (max-w-prose her, max-w-2xl i
          PantryMatchView.tsx – se filheaderen der), slik at siden fortsatt
          føles som ett rolig, smalt løp (intro → input → chips → CTA) selv
          om selve siden har plass til et bredt resultatgrid under. */}
      <h1 className="font-serif text-3xl text-ink sm:text-4xl">{t(lang, "pantryPage.title")}</h1>
      {/* Tydelig editorial undertittel, egen linje – ikke en del av H1,
          ikke en del av ingressen under. */}
      <p className="mt-3 max-w-prose text-balance font-serif text-xl text-ink sm:text-2xl">
        {t(lang, "pantryPage.subtitle")}
      </p>
      <p className="mt-3 max-w-prose text-ink-soft">{t(lang, "pantryPage.intro")}</p>
      {/* (27.09.2026) "I kjøleskapet" er kontoeksklusiv – se
          favoritter/page.tsx for samme resonnement. */}
      <div className="mt-10">
        {user ? (
          <PantryMatchView lang={lang} isAdmin={Boolean(user?.isAdmin)} />
        ) : (
          <LockedPanel
            message={t(lang, "featureLocked.pantryMessage")}
            ctaLabel={t(lang, "featureLocked.cta")}
            nextPath="/hva-kan-jeg-lage"
          />
        )}
      </div>
    </div>
  );
}
