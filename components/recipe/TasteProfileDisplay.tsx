import { TASTE_DIMENSIONS, type TasteProfile } from "@/lib/kitchen-intelligence/taste";
import { t, type Lang } from "@/lib/i18n";

/**
 * Smaksprofil – ren visning av en FORHÅNDSGENERERT profil (se
 * lib/kitchen-intelligence/taste.ts sin filheader og generateTasteProfile i
 * lib/actions/recipes.ts). Ingen egen laste-/feiltilstand her i det hele
 * tatt – dataene kommer ferdig med selve oppskriften (recipe.tasteProfile),
 * akkurat som tittel/beskrivelse. RecipeInteractive.tsx viser denne
 * komponenten kun når recipe.tasteProfile faktisk finnes (satt av admin);
 * er den ikke generert ennå, vises ingenting – aldri en tom/lastende boks.
 *
 * Tonet ned og flyttet lenger ned på siden 31.08.2026 (spesifikasjonens
 * punkt 7) – ikke lenger sin egen heldekkende, avrundede boks (den satt
 * tett inntil metadata-raden i heroen tidligere), men et rolig avsnitt i
 * den delte "sekundær info"-flaten i RecipeInteractive.tsx (som selv gir
 * luft/skillelinje rundt), fortsatt like synlig og lesbar.
 */
export function TasteProfileDisplay({ tasteProfile, lang }: { tasteProfile: TasteProfile; lang: Lang }) {
  const summary = lang === "en" && tasteProfile.summaryEn ? tasteProfile.summaryEn : tasteProfile.summary;

  return (
    <div>
      <h2 className="font-serif text-lg text-ink">{t(lang, "tasteProfile.heading")}</h2>
      {summary && <p className="mt-1.5 text-sm italic leading-relaxed text-ink-soft">{summary}</p>}
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        {TASTE_DIMENSIONS.map((dim) => {
          const value = tasteProfile.dimensions[dim.id] ?? 0;
          return (
            <div key={dim.id} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-xs text-ink-faint">{t(lang, dim.labelKey)}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream">
                <div className="h-full rounded-full bg-clay" style={{ width: `${(value / 5) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
