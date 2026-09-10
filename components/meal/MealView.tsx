"use client";

import { useState } from "react";
import Link from "next/link";
import { useMealSession, useMealSessionIndex } from "@/lib/hooks/useMealSession";
import {
  MEAL_OCCASION_LABELS,
  sortSlotsByRole,
  type ExistingMealCourseSlot,
} from "@/lib/kitchen-intelligence";
import { MealShoppingListSection } from "@/components/meal/MealShoppingListSection";
import { MealTimelineSection } from "@/components/meal/MealTimelineSection";
import { EveningExperience } from "@/components/meal/EveningExperience";
import { MultiCookMode } from "@/components/meal/MultiCookMode";
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
 * VISUELL FINPUSS 31.08.2026 (2. runde – "gjør siden mer elegant,
 * redaksjonell og kuratert, mindre som en administrasjonsside"). Samme data
 * og funksjonalitet som før, ny visuell struktur i tre lesbare "kapitler"
 * uten egne bokser rundt hvert av dem:
 *
 * 1. MENYTITTEL OG INTRO – stor serif-tittel (uendret), pluss en ny, valgfri
 *    ÉN-SETNINGS `session.description` rett under, visuelt sekundær (dempet,
 *    kursiv). Feltet er brukerskrevet (samme redigeringsmønster som
 *    tittelen/notatene – IKKE AI-generert, se `description` i
 *    lib/kitchen-intelligence/types.ts for hvorfor), usynlig/plassholder når
 *    tomt, så en gammel meny uten tekst ikke får et rart tomrom.
 * 2. MENYEN + PLANLEGG KVELDEN – samme to-kolonners grid som før
 *    (`lg:grid-cols-2`), men hver kolonne har nå en liten redaksjonell
 *    eyebrow ("MENYEN" / "PLANLEGG KVELDEN", gjenbruker eksisterende
 *    eveningExperience.menuHeading/planButton-nøkler) i stedet for å bare
 *    starte rett på kontrollene. Retten-navnet er gjort tydeligere/større
 *    (font-serif text-lg/xl, opp fra text-base), og "Finnes i
 *    oppskriftsboken" er tonet ned fra en fylt Badge-pille til ren, dempet
 *    tekst UNDER tittelen – nyttig metadata, ikke en konkurrerende
 *    fargeflate (se egen kommentar ved bruken under; components/ui/Badge.tsx
 *    selv er bevisst IKKE endret, siden den er delt med andre steder i
 *    appen). Notatene er flyttet inn som siste element i høyre kolonne
 *    (hører naturlig sammen med planleggingen av kvelden, uten å bli et eget
 *    stort visuelt fokus) – dette gir også riktig mobil-rekkefølge helt
 *    gratis (retter → planlegg kvelden → notater), siden et ett-kolonne
 *    grid følger DOM-rekkefølgen.
 * 3. GJØR DET TIL EN KVELD – den tidligere store, innrammede
 *    "Gjør det til en kveld"-boksen (og før det, en modal-knapp) er fjernet
 *    helt. Brukeren er allerede inne i denne opplevelsen når menyen er
 *    lagret, så funksjonen trenger ikke presenteres på nytt som en egen
 *    CTA-boks. I stedet er dette nå en ren redaksjonell kapittelovergang –
 *    en liten gul uppercase-eyebrow (gjenbruker eveningExperience.
 *    entryHeading) etterfulgt av en større serif-undertittel (gjenbruker
 *    eveningExperience.entryDescription, ALDRI hardkodet) – og selve
 *    EveningExperience.tsx-innholdet (vin/bord/stemning/musikk) følger
 *    DIREKTE under, som vanlig sideinnhold. Se EveningExperience.tsx sin
 *    egen filheader for hvordan den komponenten selv ble bygget om fra en
 *    fullskjerm-modal til inline kapittelinnhold samme dag.
 *
 * ANLEDNING fjernet helt fra denne siden i en tidligere runde (samme dato) –
 * `session.occasion` kan fortsatt stå igjen på eldre, allerede lagrede
 * menyer og vises fortsatt i utskriftsoppsummeringen under, men det finnes
 * ikke lenger noe UI her for å SETTE den.
 *
 * Multi-oppskrift Cook Mode (MultiCookMode.tsx, 5.16/5.17) åpnes som et eget
 * fullskjerm-lag OVENPÅ denne siden (samme mønster som RecipeInteractive.tsx
 * sin `cookModeOpen`-boolean + betinget rendering av CookMode nederst i
 * treet) – se MultiCookMode.tsx sin filheader for den kryssrett-orkestrerte
 * modellen. Uendret av denne runden.
 *
 * DELING/UTSKRIFT: ren print-CSS-basert utskrifts-/PDF-visning
 * (`window.print()` + Tailwind sine `print:`-varianter), IKKE en delbar
 * lenke – MealSession lever kun i denne besøkendes egen nettleser
 * (localStorage). Trigger-knappen bodde tidligere øverst i
 * EveningExperience.tsx sitt (nå fjernede) modal-hode – siden den
 * komponenten ikke lenger har noe eget "hode", er utskrifts-lenken flyttet
 * hit, som en liten, tilbaketrukket tekstlenke ved siden av
 * "Tilbake til …"-lenken øverst på siden.
 */
export function MealView({ mealId, isAdmin, lang }: { mealId: string; isAdmin: boolean; lang: Lang }) {
  const [cookModeOpen, setCookModeOpen] = useState(false);
  const { mealIds, hydrated: indexHydrated } = useMealSessionIndex();
  const {
    session,
    hydrated: sessionHydrated,
    setTitle,
    setDescription,
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
    <div className="space-y-10 print:hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        {anchorSlot ? (
          <Link
            href={`/oppskrifter/${anchorSlot.slug}`}
            className="text-sm font-medium text-ink-faint transition-colors hover:text-clay-dark"
          >
            {t(lang, "mealPage.backToRecipe", { title: anchorSlot.title })}
          </Link>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => window.print()}
          className="text-xs font-medium text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
        >
          {t(lang, "mealPrint.button")}
        </button>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={session.title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-transparent bg-transparent font-serif text-3xl text-ink transition-colors focus:border-line focus:bg-cream-dark/40 focus:outline-none sm:text-4xl md:text-5xl"
        />
        {/* Redaksjonell ett-setnings-intro (31.08.2026) – brukerskrevet, se
            `description` i lib/kitchen-intelligence/types.ts. Bevisst kursiv
            og dempet (text-ink-faint) slik at tittelen fortsatt eier
            oppmerksomheten; placeholder vises kun i selve redigeringen (tomt
            felt utenfor fokus er visuelt umerkelig, ikke et hull i siden). */}
        <input
          type="text"
          value={session.description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t(lang, "mealPage.descriptionPlaceholder")}
          className="w-full rounded-lg border border-transparent bg-transparent font-serif text-base italic text-ink-faint transition-colors placeholder:not-italic focus:border-line focus:bg-cream-dark/40 focus:outline-none sm:text-lg"
        />
      </div>

      {slots.length === 0 ? (
        <p className="text-sm text-ink-faint">{t(lang, "mealPage.emptyState")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          {/* MENYEN – ren, boks-fri liste. Rettene er allerede redigerbare/
              fjernbare herfra, så en egen rounded-card/border-boks per rett
              ga ingen ekstra info, bare vekt (fjernet i en tidligere runde). */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-faint">
              {t(lang, "eveningExperience.menuHeading")}
            </p>
            <div className="mt-4 divide-y divide-line">
              {slots.map((slot) => (
                <div key={slot.id} className="flex flex-col gap-1.5 py-6 first:pt-0 last:pb-0">
                  <span className="text-sm font-semibold uppercase tracking-wide text-ink-faint">
                    {t(lang, `mealBuilder.role.${slot.role}`)}
                  </span>

                  {slot.source === "existing" ? (
                    <Link
                      href={`/oppskrifter/${slot.slug}`}
                      className="font-serif text-lg text-ink hover:text-clay-dark sm:text-xl"
                    >
                      {slot.title}
                    </Link>
                  ) : (
                    <p className="font-serif text-lg text-ink sm:text-xl">{slot.title}</p>
                  )}

                  {/* "Finnes i oppskriftsboken"/"Nytt forslag" – tonet ned fra
                      en fylt Badge-pille (components/ui/Badge.tsx, bevisst
                      IKKE endret siden den er delt med andre sider) til ren
                      tekst her: nyttig metadata, skal ikke konkurrere
                      visuelt med selve retten. */}
                  <span
                    className={
                      slot.source === "existing"
                        ? "text-[11px] text-ink-faint"
                        : "text-[11px] font-medium text-mustard-dark"
                    }
                  >
                    {slot.source === "existing"
                      ? t(lang, "mealBuilder.existingBadge")
                      : t(lang, "mealBuilder.suggestedBadge")}
                  </span>

                  {slot.source === "suggested" && slot.description && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                        {t(lang, "mealPage.suggestedDescriptionLabel")}
                      </p>
                      <p className="text-xs leading-relaxed text-ink-faint">{slot.description}</p>
                    </div>
                  )}

                  {/* Kun synlig for innlogget admin (server-sjekket, se
                   * isAdmin-prop-en/app/meny/[id]/page.tsx). Fører til "Ny
                   * oppskrift" med tittel/beskrivelse forhåndsutfylt, pluss
                   * fromMealId/fromSlotId som RecipeForm.tsx bruker til å
                   * bytte DENNE plassen fra et AI-forslag til en ordentlig
                   * oppskrift så snart den er lagret. */}
                  {isAdmin && slot.source === "suggested" && (
                    <Link
                      href={`/admin/oppskrifter/ny?${new URLSearchParams({
                        title: slot.title,
                        description: slot.description,
                        servings: String(slot.servings),
                        fromMealId: mealId,
                        fromSlotId: slot.id,
                      }).toString()}`}
                      className="self-start text-xs font-medium text-clay hover:text-clay-dark"
                    >
                      {t(lang, "mealPage.createFromSuggestion")}
                    </Link>
                  )}

                  <div className="mt-1 flex flex-wrap items-center gap-4">
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
                      className="text-xs font-medium text-ink-soft underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
                    >
                      {t(lang, "mealBuilder.remove")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PLANLEGG KVELDEN – ønsket spisetidspunkt, tidslinje, kokemodus
              og handleliste samlet som én logisk planleggingsseksjon, pluss
              notatene helt nederst (hører naturlig sammen med planleggingen,
              uten å bli et eget stort visuelt fokus – og gir riktig
              mobil-rekkefølge gratis siden ett-kolonne-gridet følger
              DOM-rekkefølgen: retter → planlegg kvelden → notater). Ingen
              stor omsluttende boks – kun spacing, typografi og de tre
              knappenes egen tre-nivå-hierarki (kokemodus > handleliste >
              tidslinje). */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-faint">
              {t(lang, "eveningExperience.planButton")}
            </p>
            <div className="mt-4 space-y-6">
              <div id="meal-timeline">
                <MealTimelineSection
                  slots={slots}
                  readyAt={session.desiredReadyAt ?? ""}
                  onReadyAtChange={setDesiredReadyAt}
                  lang={lang}
                />
              </div>

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

              <div id="meal-shopping-list">
                <MealShoppingListSection slots={slots} lang={lang} />
              </div>

              <div className="border-t border-line pt-6">
                <label className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                  {t(lang, "mealPage.notesLabel")}
                </label>
                <textarea
                  value={session.notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t(lang, "mealPage.notesPlaceholder")}
                  rows={2}
                  // text-base på mobil (unngår iOS-innzooming ved fokus).
                  className="mt-1.5 w-full rounded-lg border border-line bg-cream px-3 py-2 text-base text-ink focus:border-clay focus:outline-none sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GJØR DET TIL EN KVELD – kapittelovergang, ikke en boks/CTA (fjernet
          31.08.2026, se filheaderen over: brukeren er allerede inne i denne
          opplevelsen). Kun en liten gull-eyebrow pluss en større
          serif-undertittel, begge gjenbrukt fra eksisterende
          eveningExperience.*-nøkler (aldri hardkodet). Selve innholdet
          (vin/bord/stemning/musikk) følger direkte under, som vanlig
          sideinnhold – se EveningExperience.tsx. */}
      {slots.length > 0 && (
        <div className="border-t border-line pt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-clay">
            {t(lang, "eveningExperience.entryHeading")}
          </p>
          <p className="mt-2 max-w-md font-serif text-xl text-ink-soft sm:text-2xl">
            {t(lang, "eveningExperience.entryDescription")}
          </p>
        </div>
      )}
    </div>

    {slots.length > 0 && <EveningExperience session={session} lang={lang} />}

    {/* Utskriftsvennlig oppsummering – skjult på skjerm, vist KUN ved
     * utskrift (Tailwind sin `print:`-variant, se filheaderen over for
     * hvorfor dette er en ren CSS-løsning fremfor en delbar lenke).
     * Trigger-knappen bor nå øverst på selve siden (se over) i stedet for
     * inni EveningExperience.tsx – denne print-only-blokken ligger fortsatt
     * her, uendret, siden CSS sin `print:`-variant virker uavhengig av HVOR
     * i DOM-treet knappen som trigget den befinner seg. */}
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
      {session.description && (
        <p className="mx-auto mt-3 max-w-sm font-serif text-base italic text-ink-faint">{session.description}</p>
      )}
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
