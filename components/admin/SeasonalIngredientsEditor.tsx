"use client";

import { newSeasonalIngredient, type FormSeasonalIngredient } from "@/lib/admin-form-types";
import { suggestIngredientSlug } from "@/lib/actions/seasons";
import { slugify } from "@/lib/utils/slug";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import type { IngredientCategory, IngredientOrigin, IngredientOriginGroup } from "@/lib/types";

/**
 * Råvare-editor for "I sesong"-admin-skjemaet – speiler
 * GuideStepsEditor.tsx sitt opp/ned/slett-mønster (samme moveAt-helper,
 * samme knapperad).
 *
 * Utvidet 28.08.2026 (spesifikasjonens punkt 35) med det tre-lags
 * TILGJENGELIG/SESONG/PEAK-vinduet, redaksjonell gruppering, opprinnelse og
 * strukturert kildegrunnlag – se filheaderen til SeasonalIngredient i
 * lib/types.ts. Feltene som IKKE trengs for hver eneste råvare (kildetekst,
 * lengre sesongnotat) er lagt i en kollapset <details>-seksjon per rad, slik
 * at en sesong med 20+ råvarer (Sensommer, spesifikasjonens punkt 12) ikke
 * blir en uoverkommelig vegg av inputfelter – samme
 * "progressive disclosure"-prinsipp som selve sesongsidene, bare anvendt på
 * admin-skjemaet. IKKE en stor enterprise-CMS (spesifikasjonens eksplisitte
 * advarsel), kun en flat liste med litt mer struktur enn før.
 */
function moveAt<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

const MONTH_LABELS_NO = ["Jan", "Feb", "Mar", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Des"];

const CATEGORY_OPTIONS: { value: IngredientCategory; label: string }[] = [
  { value: "vegetable", label: "Grønnsak" },
  { value: "fruit", label: "Frukt" },
  { value: "berry", label: "Bær" },
  { value: "herb", label: "Urt" },
  { value: "mushroom", label: "Sopp" },
  { value: "fish", label: "Fisk" },
  { value: "shellfish", label: "Skalldyr" },
  { value: "game", label: "Vilt" },
  { value: "meat", label: "Kjøtt" },
];

const ORIGIN_GROUP_OPTIONS: { value: IngredientOriginGroup; label: string }[] = [
  { value: "havet", label: "Fra havet" },
  { value: "skogen", label: "Fra skogen" },
  { value: "jorda", label: "Fra jorda" },
  { value: "hagen", label: "Fra hagen" },
  { value: "beite", label: "Fra beite" },
];

const ORIGIN_OPTIONS: { value: IngredientOrigin; label: string }[] = [
  { value: "norwegian", label: "Norsk" },
  { value: "imported", label: "Importert" },
];

const inputClass =
  "w-full rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-xs";

const selectClass = inputClass;

function MonthSelect({
  value,
  onChangeValue,
  ariaLabel,
  fallbackLabel = "Ikke satt",
}: {
  value: string;
  onChangeValue: (value: string) => void;
  ariaLabel: string;
  fallbackLabel?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChangeValue(e.target.value)} aria-label={ariaLabel} className={selectClass}>
      <option value="">{fallbackLabel}</option>
      {MONTH_LABELS_NO.map((label, i) => (
        <option key={label} value={i + 1}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function SeasonalIngredientsEditor({
  ingredients,
  onChange,
  seasonId,
}: {
  ingredients: FormSeasonalIngredient[];
  onChange: (ingredients: FormSeasonalIngredient[]) => void;
  /** Sesongens id (undefined for en ikke-lagret ny sesong) – sendt videre
   * til suggestIngredientSlug() slik at søsken-råvarer i SAMME sesong ikke
   * teller som kollisjon mot seg selv, se filheaderen til
   * getAllIngredientSlugsForCollisionCheck() i lib/data/seasons.ts. */
  seasonId?: string;
}) {
  function updateIngredient(index: number, next: FormSeasonalIngredient) {
    const copy = [...ingredients];
    copy[index] = next;
    onChange(copy);
  }

  async function handleNameBlur(index: number, ingredient: FormSeasonalIngredient) {
    if (ingredient.slug || !ingredient.nameNo.trim()) return;
    const suggested = await suggestIngredientSlug(ingredient.nameNo, seasonId);
    updateIngredient(index, { ...ingredient, slug: suggested });
  }

  return (
    <div className="space-y-3">
      {ingredients.map((ingredient, index) => (
        <div key={ingredient.key} className="flex gap-2 rounded-card border border-line bg-cream/50 p-3">
          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={ingredient.nameNo}
                onChange={(e) => updateIngredient(index, { ...ingredient, nameNo: e.target.value })}
                onBlur={() => handleNameBlur(index, ingredient)}
                placeholder="Navn (norsk), f.eks. Tomat"
                aria-label={`Norsk navn for råvare ${index + 1}`}
                className="w-full rounded-lg border border-line-strong bg-paper px-3 py-2 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-sm"
              />
              <input
                value={ingredient.nameEn}
                onChange={(e) => updateIngredient(index, { ...ingredient, nameEn: e.target.value })}
                placeholder="Navn (engelsk, valgfritt)"
                aria-label={`Engelsk navn for råvare ${index + 1}`}
                className="w-full rounded-lg border border-line-strong bg-paper px-3 py-2 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="flex items-center gap-2 text-xs text-ink-faint">
                Slug
                <input
                  value={ingredient.slug}
                  onChange={(e) => updateIngredient(index, { ...ingredient, slug: slugify(e.target.value) })}
                  placeholder="auto"
                  aria-label={`Slug for råvare ${index + 1}`}
                  className={inputClass}
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-faint">
                Kategori
                <select
                  value={ingredient.category}
                  onChange={(e) => updateIngredient(index, { ...ingredient, category: e.target.value })}
                  aria-label={`Kategori for råvare ${index + 1}`}
                  className={selectClass}
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-faint">
                Opprinnelse
                <select
                  value={ingredient.origin}
                  onChange={(e) => updateIngredient(index, { ...ingredient, origin: e.target.value })}
                  aria-label={`Opprinnelse for råvare ${index + 1}`}
                  className={selectClass}
                >
                  {ORIGIN_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex items-center gap-2 text-xs text-ink-faint">
              Visningsgruppe (på sesongsiden)
              <select
                value={ingredient.originGroup}
                onChange={(e) => updateIngredient(index, { ...ingredient, originGroup: e.target.value })}
                aria-label={`Visningsgruppe for råvare ${index + 1}`}
                className={selectClass}
              >
                {ORIGIN_GROUP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <input
              value={ingredient.aliases}
              onChange={(e) => updateIngredient(index, { ...ingredient, aliases: e.target.value })}
              placeholder="Alternative skriveformer, kommaseparert (f.eks. tomater, cherrytomater)"
              aria-label={`Alias for råvare ${index + 1}`}
              className={inputClass}
            />

            <div className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-paper/60 p-2.5 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-[0.65rem] font-medium uppercase tracking-wide text-ink-faint">Tilgjengelig</p>
                <div className="flex items-center gap-1.5">
                  <MonthSelect
                    value={ingredient.availableStartMonth}
                    onChangeValue={(v) => updateIngredient(index, { ...ingredient, availableStartMonth: v })}
                    ariaLabel={`Tilgjengelig fra måned for råvare ${index + 1}`}
                  />
                  <span className="text-ink-faint">–</span>
                  <MonthSelect
                    value={ingredient.availableEndMonth}
                    onChangeValue={(v) => updateIngredient(index, { ...ingredient, availableEndMonth: v })}
                    ariaLabel={`Tilgjengelig til måned for råvare ${index + 1}`}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[0.65rem] font-medium uppercase tracking-wide text-ink-faint">Sesong</p>
                <div className="flex items-center gap-1.5">
                  <MonthSelect
                    value={ingredient.seasonStartMonth}
                    onChangeValue={(v) => updateIngredient(index, { ...ingredient, seasonStartMonth: v })}
                    ariaLabel={`Sesong fra måned for råvare ${index + 1}`}
                    fallbackLabel="Som sesongen"
                  />
                  <span className="text-ink-faint">–</span>
                  <MonthSelect
                    value={ingredient.seasonEndMonth}
                    onChangeValue={(v) => updateIngredient(index, { ...ingredient, seasonEndMonth: v })}
                    ariaLabel={`Sesong til måned for råvare ${index + 1}`}
                    fallbackLabel="Som sesongen"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[0.65rem] font-medium uppercase tracking-wide text-ink-faint">
                  Peak (&quot;PÅ SITT BESTE NÅ&quot;)
                </p>
                <div className="flex items-center gap-1.5">
                  <MonthSelect
                    value={ingredient.peakStartMonth}
                    onChangeValue={(v) => updateIngredient(index, { ...ingredient, peakStartMonth: v })}
                    ariaLabel={`Peak fra måned for råvare ${index + 1}`}
                    fallbackLabel="Ingen peak"
                  />
                  <span className="text-ink-faint">–</span>
                  <MonthSelect
                    value={ingredient.peakEndMonth}
                    onChangeValue={(v) => updateIngredient(index, { ...ingredient, peakEndMonth: v })}
                    ariaLabel={`Peak til måned for råvare ${index + 1}`}
                    fallbackLabel="Ingen peak"
                  />
                </div>
              </div>
            </div>

            <input
              value={ingredient.descriptionNo}
              onChange={(e) => updateIngredient(index, { ...ingredient, descriptionNo: e.target.value })}
              placeholder="Kort beskrivelse (norsk, valgfritt)"
              aria-label={`Norsk beskrivelse for råvare ${index + 1}`}
              className={inputClass}
            />
            <input
              value={ingredient.descriptionEn}
              onChange={(e) => updateIngredient(index, { ...ingredient, descriptionEn: e.target.value })}
              placeholder="Kort beskrivelse (engelsk, valgfritt)"
              aria-label={`Engelsk beskrivelse for råvare ${index + 1}`}
              className={inputClass}
            />

            <details className="rounded-lg border border-line bg-paper/60 p-2.5">
              <summary className="cursor-pointer text-xs font-medium text-ink-soft">
                Redaksjonell tekst og kilde
              </summary>
              <div className="mt-2 space-y-2">
                <textarea
                  value={ingredient.seasonNoteNo}
                  onChange={(e) => updateIngredient(index, { ...ingredient, seasonNoteNo: e.target.value })}
                  placeholder="Lengre, kildebasert forklaring (norsk) – vises kun på råvaresiden"
                  aria-label={`Sesongnotat norsk for råvare ${index + 1}`}
                  rows={2}
                  className={`${inputClass} resize-y`}
                />
                <textarea
                  value={ingredient.seasonNoteEn}
                  onChange={(e) => updateIngredient(index, { ...ingredient, seasonNoteEn: e.target.value })}
                  placeholder="Lengre, kildebasert forklaring (engelsk)"
                  aria-label={`Sesongnotat engelsk for råvare ${index + 1}`}
                  rows={2}
                  className={`${inputClass} resize-y`}
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    value={ingredient.sourceName}
                    onChange={(e) => updateIngredient(index, { ...ingredient, sourceName: e.target.value })}
                    placeholder="Kilde, f.eks. Norges sjømatråd"
                    aria-label={`Kildenavn for råvare ${index + 1}`}
                    className={inputClass}
                  />
                  <input
                    value={ingredient.sourceUrl}
                    onChange={(e) => updateIngredient(index, { ...ingredient, sourceUrl: e.target.value })}
                    placeholder="Kilde-URL, valgfritt"
                    aria-label={`Kilde-URL for råvare ${index + 1}`}
                    className={inputClass}
                  />
                </div>
                <input
                  value={ingredient.sourceNote}
                  onChange={(e) => updateIngredient(index, { ...ingredient, sourceNote: e.target.value })}
                  placeholder="Kildenotat, valgfritt"
                  aria-label={`Kildenotat for råvare ${index + 1}`}
                  className={inputClass}
                />
                <label className="flex items-center gap-2 text-xs text-ink-faint">
                  Sist verifisert
                  <input
                    type="date"
                    value={ingredient.verifiedAt}
                    onChange={(e) => updateIngredient(index, { ...ingredient, verifiedAt: e.target.value })}
                    aria-label={`Sist verifisert for råvare ${index + 1}`}
                    className={inputClass}
                  />
                </label>
              </div>
            </details>
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            <button
              type="button"
              onClick={() => onChange(moveAt(ingredients, index, -1))}
              disabled={index === 0}
              aria-label="Flytt råvare opp"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-cream-dark disabled:opacity-30"
            >
              <ArrowUpIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onChange(moveAt(ingredients, index, 1))}
              disabled={index === ingredients.length - 1}
              aria-label="Flytt råvare ned"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-cream-dark disabled:opacity-30"
            >
              <ArrowDownIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onChange(ingredients.filter((_, i) => i !== index))}
              aria-label="Slett råvare"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-clay-light hover:text-clay-dark"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...ingredients, newSeasonalIngredient()])}
        className="flex items-center gap-1.5 rounded-full border border-dashed border-line-strong px-4 py-2 text-sm font-medium text-ink-soft hover:bg-cream-dark"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Legg til råvare
      </button>
    </div>
  );
}
