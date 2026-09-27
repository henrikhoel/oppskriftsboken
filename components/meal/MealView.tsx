"use client";

import { useState } from "react";
import Link from "next/link";
import { useMealSession, useMealSessionIndex } from "@/lib/hooks/useMealSession";
import {
  MEAL_OCCASION_LABELS,
  mealSessionExists,
  sortSlotsByRole,
  type ExistingMealCourseSlot,
} from "@/lib/kitchen-intelligence";
import { MealShoppingListSection } from "@/components/meal/MealShoppingListSection";
import { MealTimelineSection } from "@/components/meal/MealTimelineSection";
import { EveningExperience } from "@/components/meal/EveningExperience";
import { MultiCookMode } from "@/components/meal/MultiCookMode";
import { CheckIcon, PlayIcon } from "@/components/ui/icons";
import { siteConfig } from "@/lib/config";
import { t, type Lang } from "@/lib/i18n";

/**
 * Viser/redigerer én bygget MealSession – landingssiden en besøkende havner
 * på etter "Gå videre" i MealBuilder.tsx/ManualMealBuilder.tsx (se der for
 * hvordan en meny faktisk blir til). Rent klientside/localStorage, samme
 * som resten av Kitchen Intelligence-fundamentet – ingen database involvert.
 *
 * "Finnes ikke"-tilstanden sjekkes via mealSessionExists(session) (IKKE "er
 * slots tom", og IKKE lenger useMealSessionIndex – se OMLAGT-avsnittet
 * under), fordi en tom, men FAKTISK BYGGET meny (brukeren fjernet alle
 * forslagene) ellers ville sett identisk ut som en id som aldri fantes –
 * `session.updatedAt` (satt av touch() i useMealSession.ts på enhver reell
 * endring) er signalet som skiller "bygget, men tom" fra "aldri bygget".
 *
 * OMLAGT 27.09.2026 – "LAGRE MENYEN" ER NÅ EN EGEN, EKSPLISITT HANDLING.
 * Henrik: "jeg vil ikke at alle menyer man går videre med skal lagres. det
 * må være en knapp man trykker på for å velge å lagre." Før dette ble
 * `useMealSessionIndex().addToIndex(mealId)` kalt AUTOMATISK inne i
 * menybyggernes handleSave, samtidig som selve menyen ble bygget – "gå
 * videre" OG "lagre til Dine menyer" var i praksis samme handling. Nå:
 * enhver bygget meny kan vises og redigeres her uansett (se
 * mealSessionExists over), men står IKKE i `useMealSessionIndex()` sitt
 * register (og dukker dermed ikke opp på /mine-menyer, SavedMealsList.tsx)
 * før den besøkende trykker "Lagre menyen"-lenken (plassering endret
 * 28.09.2026, se REDESIGNET-avsnittet under). `saved` (utledet av
 * `mealIds.includes(mealId)`) styrer om lenken viser "Lagre menyen" eller
 * en "Lagret"-bekreftelse med en "Fjern menyen"-lenke (samme
 * handling/tekst som fjern-knappen på /mine-menyer selv).
 *
 * REDESIGNET 27.09.2026 (3. runde – Henrik ga Claude en detaljert
 * designbrief, utarbeidet sammen med ChatGPT ut fra skjermbilder av denne
 * siden: "gir siden mer rotete og administrativ [...] Vi skal beholde
 * funksjonaliteten, men redesigne presentasjonen slik at følelsen blir:
 * 'Her er kvelden din.'"). Dropper den faste `lg:grid-cols-2`
 * MENY/PLANLEGG-KVELDEN-kolonne-layouten fra forrige runde (31.08.2026, se
 * historikken) til fordel for en vertikal, redaksjonell "kapittel"-struktur
 * – hvert kapittel er en egen gull-uppercase-eyebrow etterfulgt av
 * innholdet, atskilt med `border-t border-line pt-12`, samme mønster som
 * "GJØR DET TIL EN KVELD"-overgangen allerede brukte:
 *
 * 1. DIN MENY – eyebrow (mealPage.menuEyebrow) + den store tittelen
 *    (uendret). Beskrivelsen er ikke lenger et permanent synlig
 *    placeholder-felt: har menyen en beskrivelse vises den som ren,
 *    klikkbar tekst (klikk for å redigere); er den tom vises kun en
 *    diskret "+ Legg til beskrivelse"-lenke (mealPage.addDescription) som
 *    åpner feltet. Egen lokal `descriptionEditing`-state, IKKE lagret noe
 *    sted – kun UI-tilstand, selve teksten går fortsatt rett i
 *    session.description via samme setDescription som før.
 * 2. SELVE MENYEN – course-label er nå en liten gull-eyebrow (samme
 *    fargeformel som resten av gull-eyebrowene i denne filen, IKKE lenger
 *    ink-faint), rettenavnet er større (text-xl/2xl, opp fra text-lg/xl).
 *    "Finnes i oppskriftsboken"-teksten for eksisterende retter er fjernet
 *    helt (ren metadata uten funksjon – lenken til selve oppskriften sier
 *    allerede det samme). Porsjoner + "Fjern fra menyen" ligger nå bak en
 *    liten "Rediger"-lenke per rett (ny lokal `expandedSlotIds`-Set,
 *    IKKE lagret), i tråd med brief-ens prioritet
 *    course > rettnavn > redigeringskontroller. "Nytt forslag"-merket,
 *    forslagsbeskrivelsen og admin sin "Opprett som oppskrift"-lenke er
 *    UENDRET og fortsatt alltid synlige – reell informasjon, ikke
 *    administrativt grensesnitt.
 * 3. PLANLEGG KVELDEN – egen eyebrow + ny undertittel
 *    (mealPage.planSubtitle), samler spisetid/tidslinje, kokemodus-knappen
 *    (fortsatt DEN ene tydelige CTA-en) og "Legg i handlelisten" (nå full
 *    bredde i MealShoppingListSection.tsx, se filheaderen der – fortsatt
 *    tydelig sekundær, ikke gull) samt notatene. Alt vertikalt i én kolonne
 *    (ikke lenger en egen høyrekolonne ved siden av menyen).
 * 4. VINEN DIN – flyttet UT av "Planlegg kvelden"-kolonnen og opp som sitt
 *    eget kapittel, med chapter-eyebrowen hentet fra samme
 *    mealWineInput.heading-nøkkel MealWineInput.tsx selv brukte til å vise
 *    en intern overskrift – den interne overskriften/border-t-en er derfor
 *    fjernet fra MealWineInput.tsx selv (se filheaderen der), for å unngå
 *    en duplisert "Vinen din"-tekst rett over hverandre.
 * 5. GJØR DET TIL EN KVELD – URØRT, verken visuelt eller funksjonelt (brief-
 *    ens eksplisitte grense). Samme kode som før, kun flyttet til å følge
 *    rett etter det nye "Vinen din"-kapittelet i stedet for rett etter
 *    2-kolonne-gridet.
 *
 * Ingen ny funksjonalitet i denne runden – kun presentasjon/informasjons-
 * arkitektur. Alle eksisterende handlinger (tittel/beskrivelse/notater,
 * porsjoner, fjern rett, spisetid/tidslinje, kokemodus, handleliste, vin,
 * lagre/fjern menyen, print/PDF, tilbake-navigasjon) er uendret i hvordan
 * de fungerer, kun i hvor fremtredende de vises.
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
 * "Tilbake til …"-lenken øverst på siden. Uendret av denne runden.
 *
 * REDESIGNET 28.09.2026 (4. runde – ny, større designbrief fra Henrik:
 * "Jeg vil nå redesigne hele siden «Din meny» + «Gjør det til en kveld»
 * slik at den får samme tydelige seksjonering og visuelle rytme som
 * forsiden til CONVITE"). Fra ÉN sammenhengende, mørk `max-w-3xl`-kolonne
 * (3. runde, se REDESIGNET-avsnittet over) TIL tre klare, fullbredde
 * makro-segmenter, samme "scene"-teknikk som forsiden (app/page.tsx)
 * allerede bruker (egen `<section>` per segment, hvert med sin egen
 * bakgrunn og sin egen indre `mx-auto max-w-*`-kolonne – se f.eks.
 * components/home/CookModeShowcase.tsx/MoodModeSection.tsx). Den tidligere
 * felles `max-w-3xl`-wrapperen som lå i app/meny/[id]/page.tsx er derfor
 * fjernet derfra for den innloggede visningen – hvert segment her eier nå
 * sin egen bredde/padding:
 *
 * 1. DIN MENY (mørk, standard sidebunn) – uendret innhold (topplinje,
 *    tittel/beskrivelse, retter), kun flyttet inn i sin egen
 *    `mx-auto max-w-3xl`-wrapper i STEDET for å arve den fra page.tsx, med
 *    en tydelig avsluttende pb (`pb-16 sm:pb-20`, samme mønster som
 *    FeaturedEditorial-wrapperen på forsiden) – selve fargeskiftet til
 *    segment 2 rett under ER den tydelige visuelle avslutningen (samme
 *    prinsipp som forsidens seksjoner, ingen ekstra dekorativ linje lagt
 *    til).
 * 2. PLANLEGG KVELDEN – NÅ en egen, full-bredde LYS seksjon (`bg-ink`,
 *    samme lyse token CookModeShowcase.tsx bruker for sin "lyse seksjon som
 *    bevisst bryter med den ellers mørke siden") – tidligere et mørkt
 *    kapittel i samme kolonne som resten. Kokemodus-knappen er ikke lenger
 *    full bredde ("absurd bred") – nå en kompakt, sentrert pille (samme
 *    gull-fylte `bg-clay text-cream`-stil, bare `inline-flex` i stedet for
 *    `w-full`). "Legg i handlelisten" er nå en diskré tekstlenke (samme
 *    behandling som "Vis tidslinje"), tydelig sekundær til kokemodus-
 *    knappen. MealTimelineSection.tsx/MealShoppingListSection.tsx er
 *    omfarget for denne lyse bunnen i egne commits – se deres filheadere.
 * 3. VINEN DIN – IKKE lenger sitt eget kapittel her. Flyttet inn i
 *    EveningExperience.tsx sitt "I GLASSET"-kapittel (se filheaderen der)
 *    – "vin brukeren allerede har" hører naturlig sammen med AI-ens egen
 *    vin-anbefaling for menyen, i stedet for å stå isolert i "Planlegg
 *    kvelden". `setWine` sendes nå ned som `onWineChange`-prop til
 *    EveningExperience i stedet for å brukes direkte her.
 * 4. GJØR DET TIL EN KVELD – nå sitt eget mørke "univers": en egen
 *    full-bredde `bg-paper`-seksjon (en anelse lysere enn sidens
 *    `bg-cream`-bunn, nok til å lese som et eget rom, samme prinsipp som
 *    brief-en ba om – "strukturert slik at et fullbredde bakgrunnsbilde kan
 *    legges til senere", IKKE noe bilde lagt til nå) som rommer BÅDE
 *    kapittel-inngangen (eyebrow + ny undertittel "Alt rundt bordet." +
 *    beskrivelseslinjen, uendret tekstinnhold, kun flyttet hit fra den
 *    smale `max-w-3xl`-kolonnen) OG selve EveningExperience.tsx – begge nå
 *    i samme `max-w-xl`-kolonnebredde som EveningExperience sine egne
 *    kapitler allerede brukte, for konsekvent venstrekant gjennom hele
 *    segmentet.
 *
 * Fortsatt ingen ny funksjonalitet i denne runden heller – samme prinsipp
 * som 3. runde (kun presentasjon/informasjonsarkitektur).
 */
export function MealView({ mealId, isAdmin, lang }: { mealId: string; isAdmin: boolean; lang: Lang }) {
  const [cookModeOpen, setCookModeOpen] = useState(false);
  const [descriptionEditing, setDescriptionEditing] = useState(false);
  // Hvilke retter som har "Rediger"-raden (porsjoner/fjern) åpen akkurat
  // nå – se REDESIGNET-avsnittet i filheaderen over. Ren UI-state, ikke
  // lagret noe sted; tom ved hver friske sidevisning.
  const [expandedSlotIds, setExpandedSlotIds] = useState<Set<string>>(new Set());
  const { mealIds, hydrated: indexHydrated, addToIndex, removeFromIndex } = useMealSessionIndex();
  const {
    session,
    hydrated: sessionHydrated,
    setTitle,
    setDescription,
    remove,
    setServings,
    setDesiredReadyAt,
    setWine,
  } = useMealSession(mealId, "");

  if (!indexHydrated || !sessionHydrated) {
    return <div className="h-40 animate-pulse rounded-card bg-cream-dark/60" />;
  }

  if (!mealSessionExists(session)) {
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

  // Står menyen i "Dine menyer"-registeret? (se OMLAGT-avsnittet i
  // filheaderen over) – IKKE "finnes menyen" lenger, kun "er den
  // eksplisitt lagret dit".
  const saved = mealIds.includes(mealId);

  function toggleExpanded(slotId: string) {
    setExpandedSlotIds((prev) => {
      const next = new Set(prev);
      if (next.has(slotId)) next.delete(slotId);
      else next.add(slotId);
      return next;
    });
  }

  return (
    <>
    {/* ============ SEGMENT 1: DIN MENY (mørk, standard sidebunn) ============ */}
    <div className="mx-auto max-w-3xl space-y-10 px-4 pt-10 pb-16 sm:px-6 sm:pb-20 lg:px-8 print:hidden">
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

        {/* Skriv ut/PDF + Lagre menyen samlet i én liten, tilbaketrukket
            kolonne øverst til høyre (28.09.2026, Henrik: "knappen for å
            lagre menyen må være mindre og ikke midt i der, den kan godt
            være under 'lagre som pdf' knappen") – flyttet hit fra en egen,
            stor gull-knapp midt i "DIN MENY"-kapittelet (se OMLAGT-
            avsnittet i filheaderen over for selve lagre/fjern-logikken,
            som er uendret). Samme diskrete tekst-lenke-stil som
            utskriftsknappen over, IKKE lenger components/ui/Button.tsx sin
            fylte primary-variant. */}
        <div className="flex flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="text-xs font-medium text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
          >
            {t(lang, "mealPrint.button")}
          </button>
          {saved ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-ink-faint">
              <CheckIcon className="h-3.5 w-3.5 text-clay-dark" />
              {t(lang, "mealPage.savedLabel")}
              <button
                type="button"
                onClick={() => removeFromIndex(mealId)}
                className="text-ink-soft underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
              >
                {t(lang, "savedMealsPage.removeButton")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => addToIndex(mealId)}
              className="text-xs font-medium text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
            >
              {t(lang, "mealPage.saveButton")}
            </button>
          )}
        </div>
      </div>

      {/* 1. DIN MENY – tittel er hovedpersonen, beskrivelsen er diskret
          (se REDESIGNET-avsnittet i filheaderen over). */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-clay">
          {t(lang, "mealPage.menuEyebrow")}
        </p>
        <input
          type="text"
          value={session.title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-transparent bg-transparent font-serif text-3xl text-ink transition-colors focus:border-line focus:bg-cream-dark/40 focus:outline-none sm:text-4xl md:text-5xl"
        />

        {descriptionEditing ? (
          <input
            type="text"
            value={session.description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => setDescriptionEditing(false)}
            placeholder={t(lang, "mealPage.descriptionPlaceholder")}
            autoFocus
            className="w-full rounded-lg border border-transparent bg-transparent font-serif text-base italic text-ink-faint transition-colors placeholder:not-italic focus:border-line focus:bg-cream-dark/40 focus:outline-none sm:text-lg"
          />
        ) : session.description ? (
          <button
            type="button"
            onClick={() => setDescriptionEditing(true)}
            className="block w-full rounded-lg text-left font-serif text-base italic text-ink-faint transition-colors hover:text-ink-soft sm:text-lg"
          >
            {session.description}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setDescriptionEditing(true)}
            className="text-xs font-medium text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
          >
            {t(lang, "mealPage.addDescription")}
          </button>
        )}
      </div>

      {slots.length === 0 ? (
        <p className="text-sm text-ink-faint">{t(lang, "mealPage.emptyState")}</p>
      ) : (
        <>
          {/* 2. SELVE MENYEN – presentert som et rolig restaurantmeny-kort,
              ingen kort/bokser rundt hver rett, kun skillelinjer. Siste
              kapittel i DETTE (mørke) segmentet – "Planlegg kvelden" og
              "Gjør det til en kveld" er nå egne, fullbredde segmenter under,
              se filheaderen over. */}
          <div className="divide-y divide-line">
            {slots.map((slot) => {
              const expanded = expandedSlotIds.has(slot.id);
              return (
                <div key={slot.id} className="flex flex-col gap-1.5 py-6 first:pt-0 last:pb-0">
                  <span className="text-xs font-semibold uppercase tracking-[0.25em] text-clay">
                    {t(lang, `mealBuilder.role.${slot.role}`)}
                  </span>

                  {slot.source === "existing" ? (
                    <Link
                      href={`/oppskrifter/${slot.slug}`}
                      className="font-serif text-xl text-ink hover:text-clay-dark sm:text-2xl"
                    >
                      {slot.title}
                    </Link>
                  ) : (
                    <p className="font-serif text-xl text-ink sm:text-2xl">{slot.title}</p>
                  )}

                  {/* "Nytt forslag"-merket og forslagsbeskrivelsen er reell
                      informasjon (skiller et AI-forslag fra en ekte
                      oppskrift) – UENDRET, alltid synlig, i motsetning til
                      "Finnes i oppskriftsboken" for eksisterende retter
                      (fjernet helt, se filheaderen over). */}
                  {slot.source === "suggested" && (
                    <span className="text-[11px] font-medium text-mustard-dark">
                      {t(lang, "mealBuilder.suggestedBadge")}
                    </span>
                  )}

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

                  {/* Porsjoner + "Fjern fra menyen" bak en "Rediger"-lenke
                      (se REDESIGNET-avsnittet i filheaderen over) – course
                      og rettnavn skal eie oppmerksomheten, ikke
                      redigeringskontrollene. */}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(slot.id)}
                    className="mt-0.5 self-start text-xs font-medium text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
                  >
                    {expanded ? t(lang, "eveningExperience.whyHide") : t(lang, "mealPage.editDish")}
                  </button>

                  {expanded && (
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
                  )}
                </div>
              );
            })}
          </div>

        </>
      )}
    </div>

    {/* ============ SEGMENT 2: PLANLEGG KVELDEN (lys kremflate, fullbredde) ============
        Egen full-bredde LYS seksjon (`bg-ink`) – samme "scene"-brudd-teknikk
        som components/home/CookModeShowcase.tsx bruker på forsiden (se
        filheaderen over for hele begrunnelsen). Kokemodus er fortsatt DEN
        ene tydelige, men nå bevisst KOMPAKTE CTA-en (ikke lenger full
        bredde); handlelisten er en diskré tekstlenke, tydelig sekundær.
        Notat-inputen er fortsatt fjernet (28.09.2026, se tidligere
        OPPFØLGING-avsnitt i filheaderen) – kun feltet i datamodellen
        (MealSession.notes) og setNotes (useMealSession.ts) lever videre,
        vist i utskriftsoppsummeringen lenger ned. */}
    {slots.length > 0 && (
      <section className="bg-ink py-16 sm:py-20 print:hidden">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-clay">
            {t(lang, "eveningExperience.planButton")}
          </p>
          <p className="mt-2 font-serif text-2xl text-cream sm:text-3xl">{t(lang, "mealPage.planSubtitle")}</p>

          <div className="mt-8 space-y-8">
            <div id="meal-timeline">
              <MealTimelineSection
                slots={slots}
                readyAt={session.desiredReadyAt ?? ""}
                onReadyAtChange={setDesiredReadyAt}
                lang={lang}
              />
            </div>

            {hasExistingDish && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setCookModeOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-clay px-8 py-3.5 text-base font-medium text-cream transition-colors hover:bg-clay-dark sm:px-10 sm:text-lg"
                >
                  <PlayIcon className="h-4 w-4" />
                  {t(lang, "mealCookMode.button")}
                </button>
              </div>
            )}

            <div id="meal-shopping-list">
              <MealShoppingListSection slots={slots} lang={lang} />
            </div>
          </div>
        </div>
      </section>
    )}

    {/* ============ SEGMENT 3: GJØR DET TIL EN KVELD (eget mørkt univers, fullbredde) ============
        Egen full-bredde `bg-paper`-seksjon (en anelse lysere enn sidens
        `bg-cream`-bunn – nok til å lese som et eget rom, strukturert slik
        at et fullbredde bakgrunnsbilde kan legges til her senere, IKKE lagt
        til nå). "Vinen din" er IKKE lenger et eget kapittel her – flyttet
        inn i EveningExperience.tsx sitt "I GLASSET"-kapittel, se
        filheaderen der.

        (28.09.2026, 5. runde – Henrik: "gi inngangen mer tyngde som
        starten på et nytt kapittel") – kapittel-inngangen under er en
        egen, SENTRERT "tittelside"-komposisjon (større undertittel, en
        tynn gull-strek som markerer kapittelskiftet, romsligere pt/pb) i
        stedet for den venstrestilte, kompakte inngangen fra 4. runde – et
        tydeligere brudd før selve EveningExperience.tsx-kapitlene (som
        beholder sin egen, venstrestilte redaksjonelle stil).

        (28.09.2026, samme runde – Henrik, rett etter: "jeg vil at ...
        skal få enda mer plass") – enda mer rom rundt inngangen: mer
        luft over/under (pt/pb økt), undertittelen er enda større
        (5xl/6xl, opp fra 4xl/5xl), gullstreken og beskrivelsen har fått
        tilsvarende mer luft og en anelse større tekst.

        (28.09.2026, samme runde – Henrik, rett etter igjen: "like mye
        luft under 'akkurat denne menyen' som over 'gjør det til en
        kveld'") – pb er nå satt LIK pt (begge `pt-24 sm:pt-36`) i stedet
        for den mindre pb-16/pb-24 den hadde et øyeblikk – luften er nå
        symmetrisk over eyebrowen og under beskrivelsen. */}
    {slots.length > 0 && (
      <section className="bg-paper print:hidden">
        <div className="mx-auto max-w-2xl px-5 pb-24 pt-24 text-center sm:px-10 sm:pb-36 sm:pt-36">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-clay sm:text-sm">
            {t(lang, "eveningExperience.entryHeading")}
          </p>
          <p className="mt-6 text-balance font-serif text-5xl text-ink sm:text-6xl">
            {t(lang, "eveningExperience.entrySubtitle")}
          </p>
          <div className="mx-auto mt-8 h-px w-20 bg-clay/60" />
          <p className="mx-auto mt-8 max-w-lg font-serif text-xl text-ink-soft sm:text-2xl">
            {t(lang, "eveningExperience.entryDescription")}
          </p>
        </div>

        <EveningExperience session={session} wine={session.wine} onWineChange={setWine} lang={lang} />
      </section>
    )}

    {/* Utskriftsvennlig oppsummering – skjult på skjerm, vist KUN ved
     * utskrift (Tailwind sin `print:`-variant, se filheaderen over for
     * hvorfor dette er en ren CSS-løsning fremfor en delbar lenke).
     * Trigger-knappen bor nå øverst på selve siden (se over) i stedet for
     * inni EveningExperience.tsx – denne print-only-blokken ligger fortsatt
     * her, uendret, siden CSS sin `print:`-variant virker uavhengig av HVOR
     * i DOM-treet knappen som trigget den befinner seg. UENDRET av
     * 27.09.2026-redesignet. */}
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

      {session.wine && (
        <div className="mx-auto mt-14 max-w-sm border-t border-ink/15 pt-6 text-left">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">
            {t(lang, "mealWineInput.heading")}
          </p>
          <p className="mt-2 text-sm text-ink-soft">{session.wine.name}</p>
        </div>
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
