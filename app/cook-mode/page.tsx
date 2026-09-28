import type { Metadata } from "next";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { getCurrentUserFast } from "@/lib/auth";
import { CookModeTutorialEntry } from "@/components/cook-mode-tutorial/CookModeTutorialEntry";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: t(lang, "cookModeTutorial.pageTitle") };
}

/**
 * (28.09.2026) "Utforsk Cook Mode"-lenken på forsiden
 * (components/home/CookModeShowcase.tsx) peker hit i stedet for rett inn på
 * en tilfeldig, ekte oppskrift – se filheaderen i
 * components/cook-mode-tutorial/CookModeTutorial.tsx for hele
 * bakgrunnen/resonnementet. Denne siden selv er bevisst bare et tynt skall:
 * all faktisk logikk/UI bor i klient-komponentene under (CookMode selv
 * trenger document/window – kan ikke være en Server Component).
 *
 * `alreadyCompleted` (29.09.2026) – getCurrentUserFast() (den raske,
 * IKKE-revaliderende varianten, se filheaderen i lib/auth.ts) er trygt her
 * fordi dette KUN styrer hvilken av de to varsel-tekstene som vises
 * (CookModeTutorialEntry.tsx sin egen "vis den på nytt"-knapp lar uansett
 * hvem som helst faktisk se tutorialen igjen, uansett hva profilen sier).
 * For en gjest (ikke innlogget i det hele tatt) er dette alltid `false` –
 * gjesten har jo aldri kunnet huke av noe (checkboxen finnes kun i
 * mode="recipe", som krever innlogging, se RecipeInteractive.tsx) – de ser
 * derfor alltid selve tutorialen her, som før.
 */
export default async function CookModePage() {
  const [lang, user] = await Promise.all([getLang(), getCurrentUserFast()]);
  return <CookModeTutorialEntry lang={lang} alreadyCompleted={Boolean(user?.cookModeTutorialCompleted)} />;
}
