"use client";

import { useState } from "react";
import Link from "next/link";
import { useMealSession, useMealSessionIndex } from "@/lib/hooks/useMealSession";
import { sortSlotsByRole } from "@/lib/kitchen-intelligence";
import { MealWineSection } from "@/components/meal/MealWineSection";
import { MealShoppingListSection } from "@/components/meal/MealShoppingListSection";
import { MealTimelineSection } from "@/components/meal/MealTimelineSection";
import { MultiCookMode } from "@/components/meal/MultiCookMode";
import { Badge } from "@/components/ui/Badge";
import { PlayIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * Viser/redigerer én lagret MealSession – landingssiden en besøkende havner
 * på etter "Lagre menyen" i MealBuilder.tsx (se der for hvordan en meny
 * faktisk blir til). Rent klientside/localStorage, samme som resten av
 * Kitchen Intelligence-fundamentet – ingen database involvert.
 *
 * "Finnes ikke"-tilstanden sjekkes via useMealSessionIndex (IKKE bare "er
 * slots tom"), fordi en tom, men FAKTISK LAGRET meny (brukeren fjernet alle
 * forslagene) ellers ville sett identisk ut som en id som aldri fantes –
 * indeksen er den ene kilden som skiller "lagret, men tom" fra "aldri
 * lagret".
 *
 * Bevisst enkel dish-visning (ingen bilder/full oppskriftsdata er hentet
 * inn her – kun den lette snapshoten som ligger på selve slotten, se
 * ExistingMealCourseSlot i lib/kitchen-intelligence/types.ts). Vin
 * (MealWineSection), kombinert handleliste (MealShoppingListSection) og
 * hel-meny-timeline (MealTimelineSection) bygger alle videre på
 * slots-listen herfra. `session.desiredReadyAt` (string | null) sendes til
 * MealTimelineSection som `readyAt` med en `?? ""`-fallback, siden
 * komponenten selv håndterer "tomt/ugyldig klokkeslett"-tilfellet.
 *
 * Multi-oppskrift Cook Mode (MultiCookMode.tsx, 5.17) åpnes som et eget
 * fullskjerm-lag OVENPÅ denne siden (samme mønster som RecipeInteractive.tsx
 * sin `cookModeOpen`-boolean + betinget rendering av CookMode nederst i
 * treet) – se MultiCookMode.tsx sin filheader for hvorfor det er trygt å la
 * den gjenbruke ett-oppskrift-CookMode.tsx internt.
 */
export function MealView({ mealId, lang }: { mealId: string; lang: Lang }) {
  const [cookModeOpen, setCookModeOpen] = useState(false);
  const { mealIds, hydrated: indexHydrated } = useMealSessionIndex();
  const {
    session,
    hydrated: sessionHydrated,
    setTitle,
    setNotes,
    remove,
    setServings,
    setDesiredReadyAt,
  } = useMealSession(mealId, "");

  if (!indexHydrated || !sessionHydrated) {
    return <div className="h-40 animate-pulse rounded-card bg-cream-dark/60" />;
  }

  if (!mealIds.includes(mealId)) {
    return (
      <div className="rounded-card border border-line bg-cream-dark/60 p-6 text-center">
        <h1 className="font-serif text-xl text-ink">{t(lang, "mealPage.notFoundHeading")}</h1>
        <p className="mt-2 text-sm text-ink-faint">{t(lang, "mealPage.notFoundBody")}</p>
      </div>
    );
  }

  const slots = sortSlotsByRole(session.slots);
  const hasExistingDish = slots.some((slot) => slot.source === "existing");

  return (
    <div className="space-y-6">
      <input
        type="text"
        value={session.title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border border-transparent bg-transparent font-serif text-2xl text-ink transition-colors focus:border-line focus:bg-cream-dark/40 focus:outline-none sm:text-3xl"
      />

      {slots.length === 0 ? (
        <p className="text-sm text-ink-faint">{t(lang, "mealPage.emptyState")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {slots.map((slot) => (
            <div key={slot.id} className="flex flex-col gap-2 rounded-xl border border-line bg-cream p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  {t(lang, `mealBuilder.role.${slot.role}`)}
                </span>
                <Badge tone={slot.source === "existing" ? "olive" : "mustard"}>
                  {slot.source === "existing"
                    ? t(lang, "mealBuilder.existingBadge")
                    : t(lang, "mealBuilder.suggestedBadge")}
                </Badge>
              </div>

              {slot.source === "existing" ? (
                <Link href={`/oppskrifter/${slot.slug}`} className="font-serif text-base text-ink hover:text-clay-dark">
                  {slot.title}
                </Link>
              ) : (
                <>
                  <p className="font-serif text-base text-ink">{slot.title}</p>
                  {slot.description && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                        {t(lang, "mealPage.suggestedDescriptionLabel")}
                      </p>
                      <p className="text-xs leading-relaxed text-ink-faint">{slot.description}</p>
                    </div>
                  )}
                </>
              )}

              <label className="flex items-center gap-2 text-xs text-ink-faint">
                {t(lang, "mealBuilder.servingsLabel")}
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={slot.servings}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (Number.isFinite(next) && next >= 1) setServings(slot.id, Math.round(next));
                  }}
                  className="w-16 rounded-lg border border-line bg-cream px-2 py-1 text-sm text-ink focus:border-clay focus:outline-none"
                />
              </label>

              <button
                type="button"
                onClick={() => remove(slot.id)}
                className="mt-1 self-start rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-cream-dark"
              >
                {t(lang, "mealBuilder.remove")}
              </button>
            </div>
          ))}
        </div>
      )}

      {hasExistingDish && (
        <button
          type="button"
          onClick={() => setCookModeOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-clay py-3.5 text-base font-medium text-cream transition-colors hover:bg-clay-dark sm:text-lg"
        >
          <PlayIcon className="h-4 w-4" />
          {t(lang, "mealCookMode.button")}
        </button>
      )}

      {slots.length > 0 && <MealShoppingListSection slots={slots} lang={lang} />}

      {slots.length > 0 && (
        <MealTimelineSection
          slots={slots}
          readyAt={session.desiredReadyAt ?? ""}
          onReadyAtChange={setDesiredReadyAt}
          lang={lang}
        />
      )}

      {slots.length > 0 && (
        <MealWineSection
          mealTitle={session.title}
          courses={slots.map((slot) => ({ roleLabel: t(lang, `mealBuilder.role.${slot.role}`), title: slot.title }))}
          lang={lang}
        />
      )}

      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          {t(lang, "mealPage.notesLabel")}
        </label>
        <textarea
          value={session.notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t(lang, "mealPage.notesPlaceholder")}
          rows={3}
          className="mt-1 w-full rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none"
        />
      </div>

      {cookModeOpen && (
        <MultiCookMode
          mealTitle={session.title}
          slots={slots}
          onClose={() => setCookModeOpen(false)}
          lang={lang}
        />
      )}
    </div>
  );
}
