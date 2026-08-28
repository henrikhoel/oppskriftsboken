"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { getEveningCuration, type EveningCuration, type EveningGlossaryTerm } from "@/lib/actions/kitchen-intelligence";
import { getVinmonopoletWineSuggestion, type VinmonopoletSuggestion } from "@/lib/actions/vinmonopolet";
import { MEAL_OCCASION_LABELS, sortSlotsByRole, type MealCourseSlot, type MealSession } from "@/lib/kitchen-intelligence";
import { siteConfig } from "@/lib/config";
import { XIcon } from "@/components/ui/icons";
import { t, guestCountLabel, type DictKey, type Lang } from "@/lib/i18n";

/**
 * "GJØR DET TIL EN KVELD" (Fase 5-finale, 5.9–5.11/5.14) – DEN cinematic,
 * fullskjerm sluttopplevelsen spesifikasjonen etterspør, IKKE nok en modal
 * med AI-forslag. Erstatter MealMoodSection.tsx/MealWineSection.tsx sin
 * plass på /meny/[id] (se MealView.tsx) – disse to komponentene eide
 * tidligere i18n-nøkkelen `mealMood.heading` ("Gjør det til en kveld") for
 * en langt mindre, spredt versjon av akkurat denne ideen; nå er det denne
 * komponenten som er DEN opplevelsen. MealWineSection.tsx sin ekte
 * Vinmonopolet-oppslagsfunksjon (getVinmonopoletWineSuggestion – faktisk
 * produkt/pris, ikke bare en AI-tekst) er bevisst IKKE mistet på veien: den
 * gjenbrukes her under "I GLASSET", trigget av curation.wine.style.
 *
 * INGEN del av teksten under er hardkodet (spesifikasjonens eksplisitte
 * krav, 5.9) – strukturen (MENY/I GLASSET/PÅ BORDET/STEMNING/MUSIKK) er
 * layout, men alt innhold kommer fra `session` (menyens faktiske retter,
 * valgt anledning/tidspunkt) og `curation` (getEveningCuration, se
 * lib/actions/kitchen-intelligence.ts – der 5.10s "ikke cheesy"-krav og
 * 5.11s "ingen falsk Spotify-integrasjon"-krav faktisk håndheves i selve
 * AI-prompten).
 *
 * Progressive enhancement (5.20): curation-kallet kastes ved feil, og feilen
 * fanges HER, lokalt – resten av skjermen (menyoversikt, anledning,
 * tidspunkt, de tre handlingsknappene) fungerer uendret selv om AI-kallet
 * feiler. Samme prinsipp for det sekundære Vinmonopolet-oppslaget.
 *
 * VISUELL REDESIGN 26.08.2026 (Henrik: "gjør PRESENTASJONEN av den ferdige
 * kvelden betydelig mer premium" – "digital restaurantmeny × editorial
 * magazine × en kurert middagskveld", IKKE et dashboard/AI-svar/liste med
 * generert innhold). Ren presentasjons-/layoutendring – INGEN ny
 * datainnhenting, INGEN nye AI-kall, INGEN endring av MealSession/
 * localStorage-logikk. De to unntakene, begge bevisst minimale og
 * bakoverkompatible:
 * (1) `EveningCuration.wine` fikk to nye VALGFRIE felt (`label`/`tags`,
 *     se filheaderen i kitchen-intelligence.ts) slik at "I GLASSET" kan vise
 *     en kort, dynamisk overskrift ("PINOT GRIGIO" / "ITALIA · HVIT ·
 *     FRISK") i stedet for kun den lengre style-frasen – genereres av det
 *     SAMME eksisterende AI-kallet, ingen ny caching-feature. Eldre
 *     cache-rader mangler feltene og faller da automatisk tilbake til å
 *     vise `style` alene, akkurat som `why`/`glossary` allerede gjorde.
 * (2) Ny lokal <Reveal>-komponent (IntersectionObserver) for de svært
 *     forsiktige scroll-transisjonene punkt 9 ber om – ren presentasjon,
 *     ingen datalogikk, respekterer prefers-reduced-motion.
 * Alt annet (courses/curation-henting, Vinmonopolet-oppslag, ordforklaring,
 * "hvorfor"-begrunnelser, HANDLELISTE/PLANLEGG KVELDEN/START MATLAGING sine
 * callbacks) er UENDRET logikk, kun ny presentasjon rundt.
 */

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Svært forsiktig scroll-reveal (spesifikasjonens punkt 8–9: "scrollingen
 * skal fortelle kvelden", "ingen store parallax-effekter... bevegelsen skal
 * nesten ikke merkes bevisst"). Kun opacity+8-12px translateY, IntersectionObserver
 * trigger ÉN gang (observer.disconnect() ved første treff, aldri reverserer
 * seg ved tilbake-scroll – det ville følt seg som en "AI-demo"-effekt, ikke
 * en rolig avdekking). `motion-reduce:transition-none` kutter selve
 * ANIMASJONEN for prefers-reduced-motion – innholdet vises fortsatt (bare
 * uten den animerte overgangen), aldri skjult permanent. Ren presentasjon,
 * ingen datalogikk – lokal i denne filen fremfor en delt hook, siden den kun
 * brukes her (samme "dupliser det lille fremfor tidlig abstraksjon"-prinsipp
 * som resten av kodebasen). */
function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={clsx(
        "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      )}
    >
      {children}
    </div>
  );
}

/** "Se hvorfor →"/"Se detaljer →"-knapp (26.08.2026) – vist under en
 * curation-seksjon (vin/bord-ting/stemning/musikk/servering) NÅR AI-en
 * faktisk ga en begrunnelse for akkurat den (see*Why-feltene i
 * EveningCuration). Skjult helt (returnerer null) når feltet mangler –
 * enten fordi AI-en ikke fant noen god begrunnelse denne gangen, ELLER fordi
 * raden ble cachet før denne utvidelsen fantes (se filheaderen i
 * kitchen-intelligence.ts) – begge tilfellene skal se identiske ut for
 * besøkende, ikke vise en tom/ødelagt knapp. `showKey`/`hideKey` lar
 * PÅ BORDET-seksjonen bruke egen ordlyd ("Se detaljer →") i stedet for
 * standard "Se hvorfor →" – samme mekanikk, kun ulik tekst. */
function WhyToggle({
  why,
  lang,
  showKey = "eveningExperience.whyShow",
  hideKey = "eveningExperience.whyHide",
}: {
  why: string | null | undefined;
  lang: Lang;
  showKey?: DictKey;
  hideKey?: DictKey;
}) {
  const [open, setOpen] = useState(false);
  if (!why) return null;
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="font-sans text-[0.7rem] font-medium text-clay hover:text-clay-dark"
      >
        {t(lang, open ? hideKey : showKey)}
      </button>
      {open && <p className="mt-1.5 max-w-md font-sans text-xs leading-relaxed text-ink-faint">{why}</p>}
    </div>
  );
}

/** Render av én curation-tekst der ordforklarte fagord (curation.glossary,
 * f.eks. "fleur de sel") vises som et lett understreket, trykkbart ord –
 * trykk avdekker en kort forklaring rett under/etter, i stedet for en
 * ordbok-side eller et tooltip som må hovres (upraktisk på mobil). Ren
 * tekst-splitting mot de kjente termene, IKKE en ny AI-forespørsel – alt
 * innhold kom allerede med i samme getEveningCuration-kall (se filheaderen
 * i kitchen-intelligence.ts). Ingen effekt (ren <Tag>{text}</Tag>) når
 * teksten ikke inneholder noen av glossary-termene, som er det vanlige
 * tilfellet. */
function GlossaryText({
  text,
  glossary,
  className,
  as: Tag = "p",
}: {
  text: string;
  glossary: EveningGlossaryTerm[] | undefined;
  className?: string;
  as?: "p" | "span";
}) {
  const [openTerms, setOpenTerms] = useState<Set<string>>(new Set());
  const terms = (glossary ?? []).filter((g) => g.term && g.definition);

  if (terms.length === 0 || !text) {
    return <Tag className={className}>{text}</Tag>;
  }

  // Lengste term først – forhindrer at en kort term (f.eks. "salt") stjeler
  // en match som egentlig hører til en lengre term den er en del av (f.eks.
  // "fleur de sel").
  const sorted = [...terms].sort((a, b) => b.term.length - a.term.length);
  const pattern = new RegExp(`(${sorted.map((g) => escapeRegExp(g.term)).join("|")})`, "gi");
  const parts = text.split(pattern);

  return (
    <Tag className={className}>
      {parts.map((part, i) => {
        const match = terms.find((g) => g.term.toLowerCase() === part.toLowerCase());
        if (!match) return <span key={i}>{part}</span>;
        const isOpen = openTerms.has(match.term);
        return (
          <span key={i}>
            <button
              type="button"
              onClick={() =>
                setOpenTerms((prev) => {
                  const next = new Set(prev);
                  if (next.has(match.term)) next.delete(match.term);
                  else next.add(match.term);
                  return next;
                })
              }
              aria-expanded={isOpen}
              className="underline decoration-dotted decoration-ink-faint underline-offset-4 transition-colors hover:decoration-clay"
            >
              {part}
            </button>
            {isOpen && <span className="mt-1 block font-sans text-xs italic text-ink-faint">{match.definition}</span>}
          </span>
        );
      })}
    </Tag>
  );
}

/** Kort, redaksjonell "eyebrow"-etikett foran hver seksjon (MENY/I GLASSET/
 * PÅ BORDET/STEMNING/MUSIKK/VED SERVERING) – ALLTID sans-serif (punkt 12:
 * "Sans: metadata, labels"), eksplisitt satt fremfor å arve h1-h6 sin
 * font-serif-standard fra globals.css, som var nettopp DEN detaljen som
 * gjorde disse små store-bokstaver-etikettene se ut som "et pent formattert
 * dokument" heller enn magasin-kickere før denne redesignen. */
function Eyebrow({ children }: { children: ReactNode }) {
  return <h2 className="font-sans text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-clay">{children}</h2>;
}

/** Antall retter som faktisk finnes i menyen brukes til å utlede et
 * representativt "porsjoner"-tall for åpningslinjen ("4 GJESTER") – IKKE et
 * eget felt i datamodellen (MealSession har bevisst per-rett servings, se
 * filheaderen der: ulike retter KAN ha ulikt antall porsjoner). Bruker
 * hovedrettens porsjonstall som referanse siden den normalt definerer
 * bordets størrelse; faller tilbake til første rett dersom ingen hovedrett
 * finnes. Ren presentasjonsutledning av eksisterende data, ingen ny
 * datamodell. */
function primaryServings(slots: MealCourseSlot[]): number | null {
  if (slots.length === 0) return null;
  const main = slots.find((s) => s.role === "main");
  return (main ?? slots[0]).servings;
}

export function EveningExperience({
  session,
  onClose,
  onGoToShoppingList,
  onGoToTimeline,
  onStartCooking,
  lang,
}: {
  session: MealSession;
  onClose: () => void;
  onGoToShoppingList: () => void;
  onGoToTimeline: () => void;
  onStartCooking: () => void;
  lang: Lang;
}) {
  const slots = sortSlotsByRole(session.slots);
  const courses = slots.map((slot) => ({
    id: slot.id,
    roleLabel: t(lang, `mealBuilder.role.${slot.role}`),
    title: slot.title,
    href: slot.source === "existing" ? `/oppskrifter/${slot.slug}` : null,
  }));

  const [curation, setCuration] = useState<EveningCuration | null>(null);
  const [curationError, setCurationError] = useState<string | null>(null);
  const [loadingCuration, setLoadingCuration] = useState(true);

  const [vinResult, setVinResult] = useState<VinmonopoletSuggestion | null>(null);
  const [vinLoading, setVinLoading] = useState(false);
  const [vinError, setVinError] = useState<string | null>(null);
  const [vinImageFailed, setVinImageFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingCuration(true);
    setCurationError(null);
    getEveningCuration({ title: session.title, courses }, session.occasion, lang)
      .then((result) => {
        if (!cancelled) setCuration(result);
      })
      .catch((err) => {
        if (!cancelled) setCurationError(err instanceof Error ? err.message : t(lang, "eveningExperience.error"));
      })
      .finally(() => {
        if (!cancelled) setLoadingCuration(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function handleFindWine() {
    if (!curation?.wine) return;
    setVinError(null);
    setVinLoading(true);
    setVinResult(null);
    setVinImageFailed(false);

    (async () => {
      try {
        const pseudoRecipe = {
          title: session.title,
          description: courses.map((c) => `${c.roleLabel}: ${c.title}`).join(". "),
          ingredientNames: [] as string[],
        };
        const wineText = curation.wine ? `${curation.wine.style}. ${curation.wine.note}`.trim() : "";
        const result = await getVinmonopoletWineSuggestion(pseudoRecipe, wineText, lang);
        setVinResult(result);
      } catch (err) {
        setVinError(err instanceof Error ? err.message : t(lang, "wine.vinmonopoletError"));
      } finally {
        setVinLoading(false);
      }
    })();
  }

  const guestCount = primaryServings(slots);
  const metaLine = [
    session.occasion
      ? lang === "en"
        ? MEAL_OCCASION_LABELS[session.occasion].en
        : MEAL_OCCASION_LABELS[session.occasion].no
      : null,
    session.desiredReadyAt,
    guestCount ? guestCountLabel(lang, guestCount) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t(lang, "eveningExperience.dialogAria")}
      className="fixed inset-0 z-50 flex flex-col bg-cream text-ink print:hidden"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-ink/10 px-4 py-3.5 sm:px-6">
        {/* Klikkbar tilbake-til-forsiden, samme mønster som Header.tsx sin
         * logo ellers på siden – naturlig nok savnet her siden dette er en
         * fullskjerm-opplevelse UTEN resten av sideskallet (header/bunnmeny)
         * rundt seg, se print:hidden-wrapperne i app/layout.tsx (26.08.2026,
         * Henrik: "må ha en mulighet til å gå tilbake til forsiden ved å
         * trykke på À TABLE oppe til venstre"). */}
        <Link
          href="/"
          className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-clay transition-colors hover:text-clay-dark"
        >
          {t(lang, "eveningExperience.eyebrow")}
        </Link>
        <div className="flex items-center gap-1">
          {/* Bevisst liten og tilbaketrukket (Henrik, 26.08.2026: "ikke så
           * synlig") – utskrift er en fin-å-ha-detalj her, ikke en
           * hovedhandling som HANDLELISTE/PLANLEGG KVELDEN/START MATLAGING
           * i footeren. Selve print-only-visningen den trigger ligger
           * fortsatt på MealView.tsx (se filheaderen der) – CSS sin
           * `print:`-variant virker uansett hvor i DOM-treet knappen som
           * trigger `window.print()` befinner seg. */}
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full px-2.5 py-1.5 font-sans text-[0.7rem] font-medium text-ink-faint transition-colors hover:bg-ink/10 hover:text-ink"
          >
            {t(lang, "mealPrint.button")}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(lang, "cookMode.closeAria")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink/80 transition-colors hover:bg-ink/10 hover:text-ink"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* KAPITTEL 1 — ÅPNINGEN. Bevisst UTEN <Reveal> (allerede synlig ved
         * montering – en pop-inn-effekt på det aller første man ser ville
         * virket mot sin hensikt, se punkt 9). Mye negativ plass, ingen
         * knapper/forklaringer – "forsiden på kveldens meny". */}
        <div className="px-5 pb-14 pt-12 text-center sm:px-10 sm:pb-20 sm:pt-20">
          <div className="mx-auto max-w-xl">
            {metaLine && (
              <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-ink-faint">{metaLine}</p>
            )}
            <h1 className="mt-5 text-balance font-serif text-4xl leading-[1.1] text-ink sm:text-5xl">
              {session.title}
            </h1>
            <div className="mx-auto mt-8 h-px w-12 bg-clay/70" />
          </div>
        </div>

        {/* KAPITTEL 2 — MENYEN. Nummererte retter (store, subtile
         * typografiske tall), rettens ROLLE liten/dempet, rettens NAVN
         * hovedfokus. Lenke til oppskriftssiden når retten faktisk finnes i
         * katalogen (slot.source === "existing") – ren tillegg-funksjonalitet
         * (fantes ikke i det hele tatt før, ødelegger dermed ingenting), i
         * tråd med "digital restaurantmeny"-følelsen. */}
        {courses.length > 0 && (
          <Reveal>
            <section className="border-t border-ink/10 px-5 py-12 sm:px-10 sm:py-20">
              <div className="mx-auto max-w-xl">
                <Eyebrow>{t(lang, "eveningExperience.menuHeading")}</Eyebrow>
                <ul className="mt-7 divide-y divide-ink/10">
                  {courses.map((c, i) => (
                    <li key={c.id} className="flex items-baseline gap-4 py-4 first:pt-0 last:pb-0 sm:gap-5">
                      <span className="shrink-0 font-serif text-2xl tabular-nums text-ink/15 sm:text-3xl">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">
                          {c.roleLabel}
                        </p>
                        {c.href ? (
                          <Link
                            href={c.href}
                            className="mt-1 block text-pretty font-serif text-xl text-ink transition-colors hover:text-clay-dark sm:text-2xl"
                          >
                            {c.title}
                          </Link>
                        ) : (
                          <p className="mt-1 text-pretty font-serif text-xl text-ink sm:text-2xl">{c.title}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </Reveal>
        )}

        {loadingCuration && (
          <p className="px-5 py-12 text-center font-sans text-sm text-ink-faint sm:px-10">
            {t(lang, "eveningExperience.loading")}
          </p>
        )}

        {!loadingCuration && curationError && (
          <p className="px-5 py-12 text-center font-sans text-sm text-clay-dark sm:px-10">{curationError}</p>
        )}

        {!loadingCuration && curation && (
          <>
            {/* KAPITTEL 3 — I GLASSET. Egen "scene": stor serif-overskrift
             * (curation.wine.label – kort, dynamisk, ALDRI hardkodet "Pinot
             * Grigio", se filheaderen i kitchen-intelligence.ts – med
             * style-teksten som fallback for eldre cache-rader uten label),
             * en liten stikkord-linje, så selve noten. "Se hvorfor"/"Finn en
             * konkret vin" som to rolige linjer, ikke en knapperad. */}
            {curation.wine && (
              <Reveal>
                <section className="border-t border-ink/10 px-5 py-12 sm:px-10 sm:py-20">
                  <div className="mx-auto max-w-xl">
                    <Eyebrow>{t(lang, "eveningExperience.wineHeading")}</Eyebrow>
                    <p className="mt-6 text-balance font-serif text-2xl text-ink sm:text-3xl">
                      {curation.wine.label || curation.wine.style}
                    </p>
                    {curation.wine.tags && curation.wine.tags.length > 0 && (
                      <p className="mt-2.5 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-ink-faint">
                        {curation.wine.tags.join(" · ")}
                      </p>
                    )}
                    {curation.wine.note && (
                      <GlossaryText
                        text={curation.wine.note}
                        glossary={curation.glossary}
                        className="mt-4 max-w-md font-sans text-sm leading-relaxed text-ink-soft"
                      />
                    )}

                    <div className="mt-4 flex flex-col items-start gap-2">
                      <WhyToggle why={curation.wine.why} lang={lang} />
                      {!vinResult && (
                        <button
                          type="button"
                          onClick={handleFindWine}
                          disabled={vinLoading}
                          className="font-sans text-xs font-medium text-clay hover:text-clay-dark disabled:cursor-not-allowed disabled:text-ink-faint"
                        >
                          {vinLoading ? t(lang, "wine.vinmonopoletLoading") : t(lang, "eveningExperience.findWineButton")}
                        </button>
                      )}
                    </div>
                    {vinError && <p className="mt-2 font-sans text-xs text-clay-dark">{vinError}</p>}

                    {vinResult && (
                      <div className="mt-6 border-t border-ink/10 pt-5">
                        <div className="flex gap-4">
                          {!vinImageFailed && (
                            // eslint-disable-next-line @next/next/no-img-element -- ekte, eksternt Vinmonopolet-bilde, se MealWineSection.tsx sin identiske begrunnelse
                            <img
                              src={vinResult.imageUrl}
                              alt={vinResult.productName}
                              onError={() => setVinImageFailed(true)}
                              className="h-24 w-24 shrink-0 rounded-lg border border-ink/10 bg-cream object-contain"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="font-serif text-base text-ink">{vinResult.productName}</p>
                              {vinResult.priceNok !== null && (
                                <p className="shrink-0 font-sans text-xs font-medium text-ink-soft">
                                  {t(lang, "wine.priceLabel")}: {vinResult.priceNok} kr
                                </p>
                              )}
                            </div>
                            <p className="mt-1 font-sans text-xs leading-relaxed text-ink-soft">{vinResult.reasoning}</p>
                          </div>
                        </div>
                        <a
                          href={vinResult.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-block font-sans text-xs font-medium text-clay hover:text-clay-dark"
                        >
                          {t(lang, "wine.viewProduct")} →
                        </a>
                        <p className="mt-3 max-w-md font-sans text-[0.7rem] leading-relaxed text-ink-faint">
                          {t(lang, "wine.vinmonopoletDisclaimer")}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              </Reveal>
            )}

            {/* KAPITTEL 4 - PÅ BORDET. Kuratert restaurantnote: horisontal
             * "·"-atskilt liste på desktop, vertikal stabel på mobil. Egen
             * "Se detaljer →"-ordlyd (i stedet for gjentatt "Hvorfor?" under
             * hvert element) via showKey/hideKey på WhyToggle. */}
            {curation.tableAccompaniments.length > 0 && (
              <Reveal>
                <section className="border-t border-ink/10 px-5 py-12 sm:px-10 sm:py-20">
                  <div className="mx-auto max-w-xl">
                    <Eyebrow>{t(lang, "eveningExperience.tableHeading")}</Eyebrow>
                    <ul className="mt-6 flex flex-col divide-y divide-ink/10 sm:flex-row sm:flex-wrap sm:divide-y-0">
                      {curation.tableAccompaniments.map((item, i) => (
                        <li
                          key={i}
                          className={clsx(
                            "py-3 sm:py-0",
                            i > 0 && "sm:before:mx-4 sm:before:text-ink-faint sm:before:content-['·']",
                          )}
                        >
                          <GlossaryText
                            text={item}
                            glossary={curation.glossary}
                            as="span"
                            className="font-serif text-base text-ink sm:text-lg"
                          />
                          <WhyToggle
                            why={curation.tableAccompanimentsWhy?.[item]}
                            lang={lang}
                            showKey="eveningExperience.detailsShow"
                            hideKey="eveningExperience.detailsHide"
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              </Reveal>
            )}

            {/* KAPITTEL 5+6 — STEMNING + MUSIKK. EN sammenhengende "scene"
             * (punkt 6: "musikk skal integreres visuelt med stemning") – full-
             * bredde tonet bånd (bg-cream-dark, samme token som resten av
             * appen allerede bruker for lett kontrasterte flater, IKKE en ny
             * farge/gradient) markerer det tydelige stemningsskiftet punkt 5
             * ber om, uten gradients/glassmorphism. Kun den faktiske
             * musikk-RETNINGEN vises (curation.musicDirection, en kort
             * sjanger/søkefrase) – INGEN falsk sang-tittel, spilleliste eller
             * ▶-avspillingsknapp, se filheaderen i kitchen-intelligence.ts
             * for hvorfor (5.11: aldri late som en Spotify-integrasjon
             * finnes). Egen <div>-inndeling under (i stedet for helt separate
             * <section>-er) er nettopp det som lar arkitekturen senere ta imot
             * en ekte intern spiller uten et nytt layout-oppsett. */}
            {(curation.mood || curation.musicDirection) && (
              <Reveal>
                <section className="border-y border-ink/10 bg-cream-dark/50">
                  <div className="mx-auto max-w-xl px-5 py-14 sm:px-10 sm:py-24">
                    {curation.mood && (
                      <div>
                        <Eyebrow>{t(lang, "eveningExperience.moodHeading")}</Eyebrow>
                        <GlossaryText
                          text={curation.mood}
                          glossary={curation.glossary}
                          className="mt-5 text-balance font-serif text-2xl leading-snug text-ink sm:text-3xl"
                        />
                        <WhyToggle why={curation.moodWhy} lang={lang} />
                      </div>
                    )}
                    {curation.musicDirection && (
                      <div className={curation.mood ? "mt-12" : ""}>
                        <Eyebrow>{t(lang, "eveningExperience.musicHeading")}</Eyebrow>
                        <GlossaryText
                          text={curation.musicDirection}
                          glossary={curation.glossary}
                          className="mt-5 font-serif text-xl text-ink sm:text-2xl"
                        />
                        <WhyToggle why={curation.musicDirectionWhy} lang={lang} />
                      </div>
                    )}
                  </div>
                </section>
              </Reveal>
            )}

            {/* KAPITTEL 7 — VED SERVERING. Nesten en håndskrevet kjøkkensjef-
             * note: kursivert serif, ingen kort/boks, kun typografi og
             * whitespace. Vises KUN når AI-en faktisk fant et genuint
             * relevant råd (curation.servingTip er null ellers). */}
            {curation.servingTip && (
              <Reveal>
                <section className="border-t border-ink/10 px-5 py-12 sm:px-10 sm:py-20">
                  <div className="mx-auto max-w-xl">
                    <Eyebrow>{t(lang, "eveningExperience.servingHeading")}</Eyebrow>
                    <GlossaryText
                      text={curation.servingTip}
                      glossary={curation.glossary}
                      className="mt-5 max-w-md font-serif text-lg italic leading-relaxed text-ink sm:text-xl"
                    />
                    <WhyToggle why={curation.servingTipWhy} lang={lang} />
                  </div>
                </section>
              </Reveal>
            )}
          </>
        )}

        {/* AVSLUTNINGEN — speiler åpningen (kl. + À TABLE), nesten absurd
         * enkelt, masse negativ plass. Gjenbruker siteConfig.tagline (samme
         * ekte data som utskriftsvisningens avslutning i MealView.tsx bruker
         * – IKKE en hardkodet setning som "Det beste skjer rundt bordet"). */}
        <Reveal>
          <div className="border-t border-ink/10 px-5 py-16 text-center sm:px-10 sm:py-24">
            {session.desiredReadyAt && (
              <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-ink-faint">
                {session.desiredReadyAt}
              </p>
            )}
            <p
              className={clsx(
                "font-sans text-xs font-semibold uppercase tracking-[0.35em] text-clay",
                session.desiredReadyAt && "mt-3",
              )}
            >
              {t(lang, "eveningExperience.eyebrow")}
            </p>
            <p className="mx-auto mt-3 max-w-xs font-serif text-base italic text-ink-faint">{siteConfig.tagline}</p>
          </div>
        </Reveal>
      </div>

      {/* Sticky handlingsbar (punkt 11) – "Start matlaging" er tydelig
       * primær (fylt gull-pille), HANDLELISTE/PLANLEGG KVELDEN er tydelig
       * sekundære (ren tekst, ingen knapp-ramme) – i stedet for tre
       * likeverdige knapper på rad, som leste som en app-verktøylinje. */}
      <footer className="shrink-0 border-t border-ink/10 px-5 py-4 sm:px-10">
        <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <button
              type="button"
              onClick={onGoToShoppingList}
              className="-my-2 py-2 font-sans text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {t(lang, "eveningExperience.shoppingListButton")}
            </button>
            <button
              type="button"
              onClick={onGoToTimeline}
              className="-my-2 py-2 font-sans text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {t(lang, "eveningExperience.planButton")}
            </button>
          </div>
          <button
            type="button"
            onClick={onStartCooking}
            className="rounded-full bg-clay px-5 py-2.5 font-sans text-sm font-medium text-cream transition-colors hover:bg-clay-dark"
          >
            {t(lang, "eveningExperience.startCookingButton")}
          </button>
        </div>
      </footer>
    </div>
  );
}
