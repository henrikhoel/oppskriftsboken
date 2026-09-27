"use client";

import { useState } from "react";
import Link from "next/link";
import { getMealShoppingIngredients } from "@/lib/actions/meal-shopping-list";
import { useShoppingList } from "@/lib/hooks/useShoppingList";
import type { ExistingMealCourseSlot, MealCourseSlot } from "@/lib/kitchen-intelligence";
import { ShoppingBagIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * KOMBINERT HANDLELISTE (Fase 5 – Experience, 5.7) – ett trykk legger
 * ingrediensene fra ALLE "existing"-rettene i menyen inn i den samme delte
 * handlelisten som enkelt-oppskriftsidene bruker (useShoppingList), hver
 * skalert til sitt eget porsjonstall fra MealSession-slotten (se
 * lib/kitchen-intelligence/types.ts). "Suggested"-retter (AI-forslag som
 * ikke finnes som ekte oppskrift ennå) har ingen ingredienser å hente – de
 * telles og nevnes tydelig i stedet for å bare tie stille om dem.
 *
 * Gjort mye mer kompakt 31.08.2026 (tilbakemelding: "handleliste trenger
 * kun være en liten knapp. dropp boksene") – ingen egen
 * rounded-card/border-boks eller egen h3-overskrift/beskrivelse-avsnitt
 * lenger, kun selve knappen (heading/description sier ikke noe knappteksten
 * "Legg hele menyen i handlelisten" ikke allerede sier).
 *
 * (27.09.2026, redesign av /meny/[id]) Knappen var en periode full bredde
 * (samme bredde som "Start kokemodus for hele menyen" rett over i
 * MealView.tsx) for å lese som en tydelig SEKUNDÆR handling i "Planlegg
 * kvelden"-kapittelet.
 *
 * OMGJORT 28.09.2026 – "Planlegg kvelden" er nå sin egen lyse
 * (`bg-ink`) fullbredde-seksjon, og kokemodus-knappen er ikke lenger full
 * bredde, men en kompakt, sentrert, "elegant" CTA (se filheaderen i
 * MealView.tsx for hele tre-segment-redesignet: Henrik ønsket eksplisitt at
 * kokemodus-knappen ikke skulle være "absurd bred"). En full-bredde outline-
 * knapp her ville da konkurrert visuelt med den nye, mindre primærknappen i
 * stedet for å lese som tydelig sekundær til den. Byttet derfor til samme
 * diskré, understrekede tekst-lenke-stil som "Vis tidslinje" i
 * MealTimelineSection.tsx bruker – ren typografisk hierarki (primær CTA vs.
 * sekundær tekstlenke) i stedet for to konkurrerende knappe-bokser.
 *
 * FLYTTET TILBAKE 29.09.2026 (8. runde – Henrik: "'legg hele menyen i
 * handlelisten' passer ikke her. den kan ligge oppe sammen med 'lagre
 * menyen'") – monteres nå i DIN MENY sin mørke topplinje (se MealView.tsx),
 * rett ved siden av "Skriv ut"/"Lagre menyen", IKKE lenger i den lyse
 * "Planlegg kvelden"-seksjonen. Fargene under er derfor byttet TILBAKE fra
 * "cream"-familien (mørk tekst, riktig på lys bunn) til "ink"-familien (lys
 * tekst, riktig på mørk bunn) – samme fargeformel som søsken-lenkene
 * "Skriv ut"/"Lagre menyen" bruker (`text-ink-faint` +
 * `decoration-line-strong`). Ytre wrapper byttet fra `text-center` til
 * `text-right` (og "ferdig"-raden fra `justify-center` til `justify-end`),
 * siden denne nå sitter i en høyrestilt (`items-end`) kolonne øverst på
 * siden i stedet for alene, sentrert, i sin egen brede seksjon. Denne
 * komponenten har fortsatt ingen andre importører enn MealView.tsx.
 *
 * IKON 29.09.2026 (22. runde – del av Henriks store DIN MENY-redesign, se
 * REDESIGNET-avsnittet i MealView.tsx sin filheader: "Lagre menyen" =
 * primær, "Legg hele menyen i handlelisten" = sekundær, "Skriv ut/PDF" =
 * tertiær, "bruk gjerne små ikoner dersom det passer") – et lite
 * `ShoppingBagIcon` foran selve knappeteksten, for å skille denne
 * sekundære handlingen visuelt fra "Lagre menyen" (som fikk et `BookIcon`
 * og ble gull, se MealView.tsx) uten å gjøre den til en tung, fylt knapp.
 * Kun selve `<button>`-elementets barn er endret – all logikk under
 * (handleAdd, ferdig/feil-tilstandene) er uendret.
 *
 * VENSTRESTILT IGJEN 29.09.2026 (23. runde – Henrik forkastet 22. rundes
 * plassering øverst til høyre: "Ikke la handlingene ligge helt oppe i
 * høyre hjørne av viewporten [...] De skal være en del av selve
 * menykomposisjonen") – handlingsgruppen flyttet fra en høyrestilt
 * topp-rad til en venstrestilt sidebar-spalte ved siden av selve menyen
 * (se MealView.tsx). Ytre wrapper derfor byttet TILBAKE fra `text-right`
 * (8. runde) til `text-left` (og "ferdig"-raden fra `justify-end` til
 * `justify-start`) – samme prinsipp som den gangen, bare motsatt retning:
 * teksten skal følge kolonnens egen justering, ikke stå isolert
 * høyrestilt i en nå venstrestilt spalte.
 *
 * (29.09.2026, 24. runde – Henrik, med skjermbilde: "høyrekolonnen er for
 * smal, teksten brytes over flere linjer [...] Sørg for at høyrekolonnen
 * er bred nok til at 'Legg hele menyen i handlelisten' står på én linje")
 * – roten var en for smal, fast `lg:w-52`-bredde på selve kolonnen i
 * MealView.tsx (nå fjernet til fordel for en ordentlig 70/30 grid-
 * fordeling, se filheaderen der). Lagt til `whitespace-nowrap` her i
 * tillegg, som en eksplisitt garanti – knappeteksten skal aldri brekke
 * linje uansett kolonnebredde.
 */
export function MealShoppingListSection({ slots, lang }: { slots: MealCourseSlot[]; lang: Lang }) {
  const { addFromRecipe } = useShoppingList();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);

  const existingSlots = slots.filter((s): s is ExistingMealCourseSlot => s.source === "existing");
  const suggestedCount = slots.length - existingSlots.length;

  if (existingSlots.length === 0) {
    return <p className="text-xs text-ink-faint">{t(lang, "mealShopping.noExisting")}</p>;
  }

  async function handleAdd() {
    setLoading(true);
    setError(null);
    try {
      const data = await getMealShoppingIngredients(existingSlots.map((s) => s.recipeId));
      const byId = new Map(data.map((d) => [d.recipeId, d]));

      let added = 0;
      let skipped = 0;
      for (const slot of existingSlots) {
        const recipeData = byId.get(slot.recipeId);
        if (!recipeData || recipeData.baseServings <= 0) {
          skipped++;
          continue;
        }
        addFromRecipe(recipeData.ingredientGroups, slot.title, slot.servings / recipeData.baseServings, {
          recipeId: recipeData.recipeId,
          slug: recipeData.slug,
          servings: slot.servings,
        });
        added++;
      }

      setResult({ added, skipped });
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "mealShopping.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="text-left">
      {!result ? (
        <button
          type="button"
          onClick={handleAdd}
          disabled={loading}
          className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShoppingBagIcon className="h-3.5 w-3.5" />
          {loading ? t(lang, "mealShopping.loading") : t(lang, "mealShopping.button")}
        </button>
      ) : (
        <div className="flex flex-wrap items-center justify-start gap-2 text-xs">
          <span className="text-olive-dark">{t(lang, "mealShopping.done")}</span>
          <Link href="/handleliste" className="font-medium text-clay hover:text-clay-dark">
            {t(lang, "mealShopping.viewList")} →
          </Link>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-clay-dark">{error}</p>}

      {suggestedCount > 0 && (
        <p className="mt-1.5 text-[11px] italic text-ink-faint">
          {t(lang, "mealShopping.skippedSuggested", { count: suggestedCount })}
        </p>
      )}
    </div>
  );
}
