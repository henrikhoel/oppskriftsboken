"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { getEveningCuration, type EveningCuration, type EveningGlossaryTerm } from "@/lib/actions/kitchen-intelligence";
import { getVinmonopoletWineSuggestion, type VinmonopoletSuggestion } from "@/lib/actions/vinmonopolet";
import { sortSlotsByRole, type MealSession } from "@/lib/kitchen-intelligence";
import { siteConfig } from "@/lib/config";
import { t, type DictKey, type Lang } from "@/lib/i18n";

/**
 * "GJØR DET TIL EN KVELD" (Fase 5-finale, 5.9–5.11/5.14) – vin/bord/stemning/
 * musikk/servering-kapitlene som følger naturlig etter menyen på
 * /meny/[id] (se MealView.tsx). Selve kapittel-overskriften ("GJØR DET TIL
 * EN KVELD" i gull + en større serif-undertittel) ligger nå PÅ MealView.tsx,
 * rett over der denne komponenten monteres – ikke lenger her.
 *
 * OMBYGGET 31.08.2026 (Henrik: "brukeren er allerede inne i 'gjør det til en
 * kveld'-opplevelsen. Derfor er det unødvendig å presentere funksjonen på
 * nytt som en stor CTA-lignende blokk") – FRA en fullskjerm-modal (egen
 * header med lukk-knapp, egen scroll-låst overlay, sticky handlingsbunn) TIL
 * en vanlig, innebygd seksjon i selve sidestrømmen på /meny/[id]. Fjernet i
 * denne ombyggingen (ren struktur, se filheaderen i Git-historikken for det
 * opprinnelige fullskjerm-oppsettet dersom det trengs igjen):
 * - Dialog-wrapperen (`fixed inset-0 z-50`, `role="dialog"`,
 *   `document.body.style.overflow = "hidden"`) – dette ER siden nå, ikke et
 *   lag oppå den.
 *   - Header med CONVITE-lenke/lukk-knapp – siden har allerede sin egen
 *   Header (app/layout.tsx) og trenger ingen "tilbake"-vei ut av noe som
 *   ikke lenger er en overlay.
 * - "KAPITTEL 1" (åpningen: tittel + anledning/tid/gjester gjentatt) –
 *   dupliserte tittelen MealView.tsx allerede viser øverst på siden.
 * - "KAPITTEL 2" (nummerert retter-liste) – dupliserte menylisten
 *   (FORRETT/HOVEDRETT/DESSERT) MealView.tsx allerede viser rett over denne
 *   seksjonen. `courses` (selve datagrunnlaget til AI-kuratering-kallet
 *   under) er beholdt, kun den visuelle listen er fjernet.
 * - Sticky handlingsbunn (HANDLELISTE/PLANLEGG KVELDEN/START MATLAGING) –
 *   alle tre finnes allerede rett over, i "Planlegg kvelden"-seksjonen på
 *   MealView.tsx; en gjentagelse her ville vært nok en stor CTA-rad
 *   ("Start kokemodus for hele menyen" skal være DEN ene tydelige CTA-en).
 * Selve VIN/BORD/STEMNING+MUSIKK/SERVERING-kapitlene under er URØRT – samme
 * struktur, samme klasser, samme AI-henting (getEveningCuration,
 * getVinmonopoletWineSuggestion), samme ordforklaring/"hvorfor"-mekanikk.
 * Siden AI-kurateringen nå hentes med det samme siden lastes (ikke lenger
 * bak et eget klikk) er dette uendret risikofritt kostnadsmessig –
 * getEveningCuration er allerede server-cachet per meny+anledning+språk (se
 * filheaderen i lib/actions/kitchen-intelligence.ts), så et gjenbesøk på
 * samme meny treffer cache i stedet for å generere på nytt.
 *
 * INGEN del av teksten under er hardkodet (spesifikasjonens eksplisitte
 * krav, 5.9) – strukturen (I GLASSET/PÅ BORDET/STEMNING/MUSIKK) er layout,
 * men alt innhold kommer fra `session` (menyens faktiske retter, valgt
 * anledning/tidspunkt) og `curation` (getEveningCuration, se
 * lib/actions/kitchen-intelligence.ts – der 5.10s "ikke cheesy"-krav og
 * 5.11s "ingen falsk Spotify-integrasjon"-krav faktisk håndheves i selve
 * AI-prompten).
 *
 * Progressive enhancement (5.20): curation-kallet kastes ved feil, og feilen
 * fanges HER, lokalt – resten av siden (menyoversikt, planlegging,
 * tidspunkt) fungerer uendret selv om AI-kallet feiler. Samme prinsipp for
 * det sekundære Vinmonopolet-oppslaget.
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

/** Kort, redaksjonell "eyebrow"-etikett foran hvert kapittel (I GLASSET/
 * PÅ BORDET/STEMNING/MUSIKK/VED SERVERING) – ALLTID sans-serif (punkt 12:
 * "Sans: metadata, labels"), eksplisitt satt fremfor å arve h1-h6 sin
 * font-serif-standard fra globals.css, som var nettopp DEN detaljen som
 * gjorde disse små store-bokstaver-etikettene se ut som "et pent formattert
 * dokument" heller enn magasin-kickere før denne redesignen. */
function Eyebrow({ children }: { children: ReactNode }) {
  return <h2 className="font-sans text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-clay">{children}</h2>;
}

export function EveningExperience({ session, lang }: { session: MealSession; lang: Lang }) {
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

  return (
    <div className="print:hidden">
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
          {/* KAPITTEL - I GLASSET. Egen "scene": stor serif-overskrift
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

          {/* KAPITTEL - PÅ BORDET. Kuratert restaurantnote: horisontal
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

          {/* KAPITTEL - STEMNING + MUSIKK. EN sammenhengende "scene" (punkt 6:
           * "musikk skal integreres visuelt med stemning") – full-bredde
           * tonet bånd (bg-cream-dark, samme token som resten av appen
           * allerede bruker for lett kontrasterte flater, IKKE en ny farge/
           * gradient) markerer det tydelige stemningsskiftet punkt 5 ber om,
           * uten gradients/glassmorphism. Kun den faktiske musikk-RETNINGEN
           * vises (curation.musicDirection, en kort sjanger/søkefrase) –
           * INGEN falsk sang-tittel, spilleliste eller ▶-avspillingsknapp,
           * se filheaderen i kitchen-intelligence.ts for hvorfor (5.11:
           * aldri late som en Spotify-integrasjon finnes). */}
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

          {/* KAPITTEL - VED SERVERING. Nesten en håndskrevet kjøkkensjef-
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

      {/* AVSLUTNINGEN - en stille, nesten absurd enkel siste linje, ikke en
       * ny CTA-rad. Gjenbruker siteConfig.tagline (samme ekte data som
       * utskriftsvisningens avslutning i MealView.tsx bruker – IKKE en
       * hardkodet setning som "Det beste skjer rundt bordet"). Den
       * tidligere gjentagelsen av "GJØR DET TIL EN KVELD"-eyebrowen her er
       * fjernet 31.08.2026 – den står allerede øverst i denne seksjonen
       * (MealView.tsx), en gjentagelse helt nederst var overflødig. */}
      <Reveal>
        <div className="border-t border-ink/10 px-5 py-16 text-center sm:px-10 sm:py-24">
          {session.desiredReadyAt && (
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-ink-faint">
              {session.desiredReadyAt}
            </p>
          )}
          <p
            className={clsx(
              "mx-auto max-w-xs font-serif text-base italic text-ink-faint",
              session.desiredReadyAt && "mt-3",
            )}
          >
            {siteConfig.tagline}
          </p>
        </div>
      </Reveal>
    </div>
  );
}
