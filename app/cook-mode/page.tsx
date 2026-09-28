import type { Metadata } from "next";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { CookModeTutorial } from "@/components/cook-mode-tutorial/CookModeTutorial";

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
 * all faktisk logikk/UI bor i den klient-komponenten (CookMode selv trenger
 * document/window – kan ikke være en Server Component).
 */
export default async function CookModePage() {
  const lang = await getLang();
  return <CookModeTutorial lang={lang} />;
}
