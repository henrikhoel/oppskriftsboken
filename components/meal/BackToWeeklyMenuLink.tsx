"use client";

import Link from "next/link";
import { useShoppingList } from "@/lib/hooks/useShoppingList";
import { activeWeeklyMenuRestoreHref } from "@/lib/hooks/useActiveWeeklyMenu";
import { getActiveMenuDishNames } from "@/lib/utils/shopping-list";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * "Tilbake til ukesmenyen" (06.10.2026, Henrik: "jeg tenker vi kan gjøre
 * sånn at uansett om vi har lagt en ukesmeny i handlelista, så står det
 * ALLTID 'tilbake til ukesmenyen' inne på handlelista, uansett om man går
 * inn via handlelista eller senere") – ERSTATTER den forrige, mer skjøre
 * løsningen (en ?fromWeeklyMenu=1-URL-parameter satt av WeeklyMenuView.tsx
 * sin "Se listen →"-lenke, lest server-side i app/handleliste/page.tsx).
 * Den løsningen viste lenken KUN rett etter at man faktisk klikket seg inn
 * DEN ene veien – ikke ved et senere besøk (f.eks. via header-ikonet, en
 * bokmerket lenke, eller rett og slett en side-refresh). Denne komponenten
 * spør i stedet selve handlelisten (samme getActiveMenuDishNames-utledning
 * som meny-oversikten i ShoppingListView.tsx, se filheaderen der for
 * hvorfor DETTE er den ene datakilden) – lenken vises dermed alltid når
 * listen faktisk inneholder varer fra minst én oppskrift, UANSETT hvordan
 * man kom til siden, og forsvinner av seg selv igjen når alt det
 * menybaserte er fjernet/avhuket bort fra "gjenstår å handle".
 *
 * Selve KLIKKET tar fortsatt rett til /ukesmeny – OM ukesmenyen der faktisk
 * gjenoppretter stil/retter/vegetar-filter (i stedet for å vise en tom
 * starttilstand) styres av et ett-skudds sessionStorage-øyeblikksbilde
 * (stashActiveWeeklyMenu, skrevet idet uken legges i handlelisten, se
 * lib/hooks/useActiveWeeklyMenu.ts) – denne komponenten vet ingenting om
 * SELVE innholdet der, den svarer kun på "bør lenken vises nå?".
 *
 * (06.10.2026, RUNDE 3) FEILRETTET – Henrik: "når jeg nå går inn på
 * handlelisten senere, altså ikke direkte fra ukesmeny, og deretter går
 * tilbake til ukesmeny, så er den tom igjen". Lenken pekte rett på
 * "/ukesmeny", og den siden konsumerte/slettet øyeblikksbildet ved HVER
 * mount – inkludert et hvilket som helst ANNET, tilfeldig besøk på
 * /ukesmeny (f.eks. via header-lenken) man måtte gjøre i mellomtiden, før
 * man faktisk trykket HER. Da var øyeblikksbildet borte lenge før det
 * trengtes. Lenken bruker nå activeWeeklyMenuRestoreHref() – som legger
 * ved et eksplisitt "gjenopprett"-signal i URL-en – slik at KUN en bevisst
 * reise via AKKURAT denne lenken konsumerer øyeblikksbildet, se
 * filheaderen ved RESTORE_PARAM i useActiveWeeklyMenu.ts.
 *
 * Egen, liten klient-komponent (i stedet for å flytte avgjørelsen inn i
 * ShoppingListView selv) fordi den rendres ØVERST på siden, FØR selve
 * <h1>-tittelen i app/handleliste/page.tsx (samme plassering som
 * "Tilbake"-lenken på oppskriftssider, se app/oppskrifter/[slug]/
 * page.tsx) – ShoppingListView.tsx sin egen retur er alt som vises UNDER
 * tittelen/ingressen.
 */
export function BackToWeeklyMenuLink({ lang }: { lang: Lang }) {
  const { entries, hydrated } = useShoppingList();

  // Samme hydrerings-vakt som ShoppingListView.tsx – unngår et hydrerings-
  // avvik mot en tom server-gjengivelse (localStorage finnes jo ikke
  // server-side).
  if (!hydrated) return null;

  const dishNames = getActiveMenuDishNames(entries);
  if (dishNames.length === 0) return null;

  return (
    <Link
      href={activeWeeklyMenuRestoreHref("/ukesmeny")}
      className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
    >
      <ChevronLeftIcon className="h-4 w-4" />
      {t(lang, "shoppingPage.backToWeeklyMenuLink")}
    </Link>
  );
}
