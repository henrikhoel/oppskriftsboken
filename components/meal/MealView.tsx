"use client";

import { useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { useMealSession, useMealSessionIndex } from "@/lib/hooks/useMealSession";
import {
  ALL_MEAL_OCCASIONS,
  MEAL_OCCASION_LABELS,
  sortSlotsByRole,
  type ExistingMealCourseSlot,
} from "@/lib/kitchen-intelligence";
import { MealShoppingListSection } from "@/components/meal/MealShoppingListSection";
import { MealTimelineSection } from "@/components/meal/MealTimelineSection";
import { EveningExperience } from "@/components/meal/EveningExperience";
import { MultiCookMode } from "@/components/meal/MultiCookMode";
import { Badge } from "@/components/ui/Badge";
import { PlayIcon } from "@/components/ui/icons";
import { siteConfig } from "@/lib/config";
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
 * ExistingMealCourseSlot i lib/kitchen-intelligence/types.ts). Kombinert
 * handleliste (MealShoppingListSection) og hel-meny-timeline
 * (MealTimelineSection) bygger begge videre på slots-listen herfra.
 * `session.desiredReadyAt` (string | null) sendes til MealTimelineSection
 * som `readyAt` med en `?? ""`-fallback, siden komponenten selv håndterer
 * "tomt/ugyldig klokkeslett"-tilfellet.
 *
 * Rekkefølge under rettene (bevisst, etter tilbakemelding): ønsket
 * spisetidspunkt/tidslinje (MealTimelineSection) FØRST – man setter
 * tidspunktet før man eventuelt starter å lage mat – deretter
 * kokemodus-knappen rett under, så "GJØR DET TIL EN KVELD"-inngangen, og
 * handleliste (MealShoppingListSection) sist av seksjonene, rett over
 * notat-feltet.
 *
 * "GJØR DET TIL EN KVELD" (Fase 5-finale, 5.9) – EveningExperience.tsx
 * (fullskjerm, samme lag-mønster som MultiCookMode under) ERSTATTER de
 * tidligere MealMoodSection/MealWineSection-seksjonene som lå her (de eide
 * tidligere i18n-nøkkelen `mealMood.heading`, se EveningExperience.tsx sin
 * filheader) – ÉN samlet, cinematic opplevelse i stedet for to spredte
 * knapper. `#meal-timeline`/`#meal-shopping-list`-anker-id-ene under lar
 * EveningExperience sine HANDLELISTE/PLANLEGG KVELDEN-knapper lukke seg selv
 * og scrolle til riktig seksjon på DENNE siden, i stedet for å bygge de
 * samme seksjonene på nytt inni den fullskjerm-opplevelsen.
 *
 * Multi-oppskrift Cook Mode (MultiCookMode.tsx, 5.16/5.17) åpnes som et eget
 * fullskjerm-lag OVENPÅ denne siden (samme mønster som RecipeInteractive.tsx
 * sin `cookModeOpen`-boolean + betinget rendering av CookMode nederst i
 * treet) – se MultiCookMode.tsx sin filheader for den ombygde,
 * kryssrett-orkestrerte modellen.
 *
 * DELING/UTSKRIFT (Fase 5 – Experience, trigger-knappen flyttet 26.08.2026
 * inn i EveningExperience.tsx – en liten, tilbaketrukket knapp øverst der,
 * se filheaderen der): en ren print-CSS-basert utskrifts-/PDF-visning
 * (`window.print()` + Tailwind sine `print:`-varianter), IKKE en delbar
 * lenke – MealSession
 * lever kun i denne besøkendes egen nettleser (localStorage), så en ekte
 * delbar lenke ville krevd en helt ny database-arkitektur utover det resten
 * av Kitchen Intelligence-fundamentet bygger på. Den utskriftsvennlige
 * oppsummeringen viser bevisst KUN det som faktisk er lagret på selve
 * MealSession (retter/roller/porsjoner, ønsket spisetidspunkt, notater) –
 * IKKE AI-forslagene fra EveningExperience, som kun lever som forbigående
 * state i den komponenten og aldri lagres på selve økten.
 */
export function MealView({ mealId, isAdmin, lang }: { mealId: string; isAdmin: boolean; lang: Lang }) {
  const [cookModeOpen, setCookModeOpen] = useState(false);
  const [eveningOpen, setEveningOpen] = useState(false);
  const { mealIds, hydrated: indexHydrated } = useMealSessionIndex();
  const {
    session,
    hydrated: sessionHydrated,
    setTitle,
    setNotes,
    remove,
    setServings,
    setDesiredReadyAt,
    setOccasion,
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

  // Retten menyen ble bygget rundt (session.anchorRecipeId) er alltid også
  // lagt inn som en av de "existing"-plassene selv (se addExistingSlot i
  // MealBuilder.tsx sitt genererings-steg) – ingen egen oppslags-fetch
  // nødvendig, bare finn den samme slotten igjen her for slug-en. `null` når
  // menyen ikke har noen forankret ankerrett (bør normalt ikke skje, men en
  // meny startet uten en gyldig anker skal ikke krasje siden).
  const anchorSlot: ExistingMealCourseSlot | null = session.anchorRecipeId
    ? (slots.find(
        (s): s is ExistingMealCourseSlot => s.source === "existing" && s.recipeId === session.anchorRecipeId,
      ) ?? null)
    : null;

  return (
    <>
    <div className="space-y-6 print:hidden">
      {anchorSlot && (
        <Link
          href={`/oppskrifter/${anchorSlot.slug}`}
          className="inline-block text-sm font-medium text-ink-faint transition-colors hover:text-clay-dark"
        >
          {t(lang, "mealPage.backToRecipe", { title: anchorSlot.title })}
        </Link>
      )}

      <input
        type="text"
        value={session.title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border border-transparent bg-transparent font-serif text-2xl text-ink transition-colors focus:border-line focus:bg-cream-dark/40 focus:outline-none sm:text-3xl"
      />

      <div className="flex flex-wrap gap-1.5">
        {ALL_MEAL_OCCASIONS.map((option) => {
          const active = session.occasion === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setOccasion(active ? null : option)}
              aria-pressed={active}
              className={clsx(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-clay bg-clay text-cream"
                  : "border-line-strong bg-paper text-ink-soft hover:bg-cream-dark",
              )}
            >
              {lang === "en" ? MEAL_OCCASION_LABELS[option].en : MEAL_OCCASION_LABELS[option].no}
            </button>
          );
        })}
      </div>

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
                  {/* Kun synlig for innlogget admin (server-sjekket, se
                   * isAdmin-prop-en/app/meny/[id]/page.tsx – ikke bare
                   * CSS-skjult for alle andre). Fører til "Ny oppskrift"
                   * med tittel/beskrivelse forhåndsutfylt, PLUSS et par
                   * ekstra query-parametre (fromMealId/fromSlotId) som
                   * RecipeForm.tsx bruker til å bytte DENNE plassen fra et
                   * AI-forslag til en ordentlig, eksisterende oppskrift så
                   * snart den er lagret – se replaceSlotContent i
                   * lib/kitchen-intelligence/meal-session.ts (fantes fra
                   * før, aldri koblet til noe UI). Ingen ny handling å bygge
                   * her – ren navigasjon med noen query-parametre. */}
                  {isAdmin && (
                    <Link
                      href={`/admin/oppskrifter/ny?${new URLSearchParams({
                        title: slot.title,
                        description: slot.description,
                        servings: String(slot.servings),
                        fromMealId: mealId,
                        fromSlotId: slot.id,
                      }).toString()}`}
                      className="mt-1 self-start text-xs font-medium text-clay hover:text-clay-dark"
                    >
                      {t(lang, "mealPage.createFromSuggestion")}
                    </Link>
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
                  // text-base på mobil (unngår iOS-innzooming ved fokus).
                  className="w-16 rounded-lg border border-line bg-cream px-2 py-1 text-base text-ink focus:border-clay focus:outline-none sm:text-sm"
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

      {slots.length > 0 && (
        <div id="meal-timeline">
          <MealTimelineSection
            slots={slots}
            readyAt={session.desiredReadyAt ?? ""}
            onReadyAtChange={setDesiredReadyAt}
            lang={lang}
          />
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

      {slots.length > 0 && (
        <button
          type="button"
          onClick={() => setEveningOpen(true)}
          className="w-full rounded-card border border-line bg-cream-dark/60 p-5 text-left transition-colors hover:bg-cream-dark sm:p-6"
        >
          <h3 className="font-serif text-lg text-ink">{t(lang, "eveningExperience.entryHeading")}</h3>
          <p className="mt-1 text-sm text-ink-faint">{t(lang, "eveningExperience.entryDescription")}</p>
        </button>
      )}

      {slots.length > 0 && (
        <div id="meal-shopping-list">
          <MealShoppingListSection slots={slots} lang={lang} />
        </div>
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
          // text-base på mobil (unngår iOS-innzooming ved fokus).
          className="mt-1 w-full rounded-lg border border-line bg-cream px-3 py-2 text-base text-ink focus:border-clay focus:outline-none sm:text-sm"
        />
      </div>

    </div>

    {/* Utskriftsvennlig oppsummering – skjult på skjerm, vist KUN ved
     * utskrift (Tailwind sin `print:`-variant, se filheaderen over for
     * hvorfor dette er en ren CSS-løsning fremfor en delbar lenke).
     * Trigger-knappen flyttet 26.08.2026 til EveningExperience.tsx (en
     * liten, tilbaketrukket knapp øverst der, se filheaderen der og
     * `window.print()`-kallet i den komponenten) – selve denne
     * print-only-blokken ligger fortsatt her, uendret, siden CSS sin
     * `print:`-variant virker uavhengig av HVOR i DOM-treet knappen som
     * trigget den befinner seg. */}
    <div className="hidden print:mx-auto print:block print:max-w-xl print:px-4 print:py-16 print:text-center">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-ink-faint">{siteConfig.name}</p>

      {(session.occasion || session.desiredReadyAt) && (
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.25em] text-ink-faint">
          {[
            session.occasion
              ? lang === "en"
                ? MEAL_OCCASION_LABELS[session.occasion].en
                : MEAL_OCCASION_LABELS[session.occasion].no
              : null,
            session.desiredReadyAt,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      <h1 className="mt-4 text-balance font-serif text-4xl text-ink">{session.title}</h1>
      <div className="mx-auto mt-5 h-px w-16 bg-clay" />

      {slots.length > 0 && (
        <ul className="mt-10 space-y-6">
          {slots.map((slot) => (
            <li key={slot.id}>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-clay-dark">
                {t(lang, `mealBuilder.role.${slot.role}`)}
              </p>
              <p className="mt-1.5 font-serif text-xl text-ink">{slot.title}</p>
            </li>
          ))}
        </ul>
      )}

      {session.notes && (
        <div className="mx-auto mt-14 max-w-sm border-t border-ink/15 pt-6 text-left">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">
            {t(lang, "mealPage.notesLabel")}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{session.notes}</p>
        </div>
      )}

      <p className="mt-16 font-serif text-sm italic text-ink-faint">{siteConfig.tagline}</p>
    </div>

    {eveningOpen && (
      <EveningExperience
        session={session}
        onClose={() => setEveningOpen(false)}
        onGoToShoppingList={() => {
          setEveningOpen(false);
          document.getElementById("meal-shopping-list")?.scrollIntoView({ behavior: "smooth" });
        }}
        onGoToTimeline={() => {
          setEveningOpen(false);
          document.getElementById("meal-timeline")?.scrollIntoView({ behavior: "smooth" });
        }}
        onStartCooking={() => {
          setEveningOpen(false);
          setCookModeOpen(true);
        }}
        lang={lang}
      />
    )}

    {cookModeOpen && (
      <MultiCookMode
        mealId={mealId}
        mealTitle={session.title}
        slots={slots}
        readyAt={session.desiredReadyAt ?? ""}
        onClose={() => setCookModeOpen(false)}
        lang={lang}
      />
    )}
    </>
  );
}
