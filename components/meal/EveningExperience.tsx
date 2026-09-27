"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { getEveningCuration, type EveningCuration, type EveningGlossaryTerm } from "@/lib/actions/kitchen-intelligence";
import { getVinmonopoletWineSuggestion, type VinmonopoletSuggestion } from "@/lib/actions/vinmonopolet";
import { sortSlotsByRole, type MealSession } from "@/lib/kitchen-intelligence";
import { MealWineInput } from "@/components/meal/MealWineInput";
import { siteConfig } from "@/lib/config";
import { t, type Lang } from "@/lib/i18n";

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
 *
 * REDESIGNET 28.09.2026 (4. runde – Henrik ga en ny, større designbrief for
 * HELE /meny/[id]-siden: "Jeg vil nå redesigne hele siden «Din meny» +
 * «Gjør det til en kveld» slik at den får samme tydelige seksjonering og
 * visuelle rytme som forsiden til CONVITE" – tre makro-segmenter: DIN MENY
 * mørk / PLANLEGG KVELDEN lys kremflate / GJØR DET TIL EN KVELD eget mørkt
 * univers, se filheaderen i MealView.tsx for helheten). Denne filen ER nå
 * det tredje, mørke segmentet – montert av MealView.tsx inni en egen
 * fullbredde `bg-paper`-seksjon (sammen med kapittel-inngangen "GJØR DET
 * TIL EN KVELD" / "Alt rundt bordet." / undertittelen, som fortsatt ligger
 * i MealView.tsx). Tre konkrete endringer i denne runden:
 *
 * 1. "VINEN DIN" (MealWineInput.tsx – vin brukeren ALLEREDE HAR) er flyttet
 *    HIT, inn i "I GLASSET"-kapittelet, rett under AI-ens egen
 *    vinstil-anbefaling/"Finn en konkret vin"-resultatet – ikke lenger sitt
 *    eget kapittel på MealView.tsx (brief-en: "Vin knyttet til AKKURAT
 *    denne menyen, blir det viktigste enkeltelementet i seksjonen [I
 *    GLASSET] – både AI-anbefaling OG mulighet til å oppgi den vinen man
 *    faktisk har"). Ny prop `wine`/`onWineChange` (i stedet for å lese
 *    session.wine direkte – MealView.tsx eier fortsatt selve
 *    useMealSession-tilkoblingen/setWine, denne komponenten er fortsatt
 *    "kontrollert" av kalleren, samme mønster som MealWineInput.tsx selv
 *    alltid har fulgt).
 * 2. "STEMNING + MUSIKK" sin egen `bg-cream-dark/50`-tonede bånd-bakgrunn
 *    (og `border-y` i stedet for `border-t`) er fjernet (Henrik: "fjern den
 *    store, litt tilfeldige mørke boksen") – kapittelet er nå visuelt
 *    likestilt med I GLASSET/PÅ BORDET/VED SERVERING (samme
 *    `border-t border-ink/10`, ingen egen bakgrunnsflate), kun selve
 *    INNHOLDET (stemning + musikk i samme kapittel) skiller det fra de
 *    andre, som brief-en ba om.
 * 3. Vertikal rytme strammet inn gjennomgående (brief: "stram inn den
 *    vertikale rytmen") – `py-12 sm:py-20`/`py-14 sm:py-24` på hvert
 *    kapittel er redusert til `py-10 sm:py-14`, og den avsluttende
 *    "Cook well. Eat better."-linjen (`py-16 sm:py-24`) er redusert til
 *    `py-10 sm:py-14` (Henrik: "uten det store tomrommet som er rundt den
 *    nå" – linjen selv er uendret, kun luften rundt).
 *
 * Selve AI-kurateringen/ordforklaringene/"Se hvorfor"-mekanikken under er
 * FORTSATT URØRT av denne runden.
 *
 * REDESIGNET 28.09.2026 (5. runde – Henrik, etter å ha sett 4. runde satt
 * live: "Problemet med dagens versjon er at den fortsatt føles som en lang
 * tekstside. Nesten alle delene bruker samme mønster: liten gull-label →
 * tekst → «Se hvorfor» → mye luft → neste del [...] Målet: «Gjør det til en
 * kveld» skal føles som et lite kuratert magasinoppslag for akkurat denne
 * middagen – ikke som en liste med AI-anbefalinger"). 4. runde rettet
 * MAKRO-seksjoneringen (mørk/lys/mørk på HELE /meny/[id]); denne runden
 * redesigner kun INNHOLDET/layouten INNI dette ene mørke segmentet – DIN
 * MENY og PLANLEGG KVELDEN (MealView.tsx) er URØRT. Brief-ens eksplisitte
 * prinsipp: hvert kapittel skal ha en BEVISST ULIK komposisjon (ikke samme
 * mønster gjentatt fire ganger), fortsatt uten cards/bokser/illustrasjoner:
 *
 * 1. I GLASSET – nå en 2-kolonne redaksjonell komposisjon på desktop
 *    (`lg:grid lg:grid-cols-[1.3fr_1fr]`) i stedet for én smal kolonne:
 *    venstre = AI-ens vinanbefaling (uendret innhold), høyre = "Vinen din"
 *    (MealWineInput) under en egen, mindre "HAR DU ALLEREDE EN VIN?"-etikett
 *    (ny nøkkel `mealWineInput.ownWineHeading` – tydeligere invitasjon enn
 *    den nøytrale "Vinen din"-etiketten som stod her i 4. runde), fortsatt
 *    en bevisst SEKUNDÆR funksjon (mindre visuell vekt enn venstre kolonne),
 *    ikke et eget skjema/kort. Stables vertikalt på mobil (`grid-cols-1`).
 * 2. PÅ BORDET – fra en linje med "·"-atskilte ord TIL et responsivt rutenett
 *    (`sm:grid-cols-2 lg:grid-cols-3`) der hvert element får sin egen luft i
 *    stedet for å flyte i én setning – fortsatt ren typografi, ingen bokser.
 * 3. STEMNING + MUSIKK – fra to stablede blokker TIL en bevisst ASYMMETRISK
 *    2-kolonne-komposisjon på desktop (`lg:grid-cols-[1.6fr_1fr]`): STEMNING
 *    får mest plass og en større, tyngre serif-stemme (den emosjonelle
 *    hovedteksten), MUSIKK er forskjøvet ned (`lg:mt-16`) og markert mindre
 *    – visuelt underordnet, som brief-en ba om.
 * 4. VED SERVERING – fra samme oppsett som de tre over TIL en tydelig
 *    AVSLUTTENDE komposisjon: sentrert, smalere kolonne, større
 *    italic-serif "siste ord"-følelse, egen litt mørkere bunntone
 *    (`bg-cream`, sidens egen mørkeste/"grunn"-tone – et bevisst symbolsk
 *    "tilbake til roen" for kveldens siste beskjed fra CONVITE).
 * 5. Svært subtile bakgrunnstone-variasjoner mellom kapitlene (i stedet for
 *    én ensartet flate gjennom hele segmentet) – I GLASSET arver den ytre
 *    `bg-paper`-fargen (MealView.tsx) uendret, PÅ BORDET får en anelse
 *    lysere `bg-cream-dark`, STEMNING+MUSIKK tilbake til gjennomsiktig
 *    (samme `bg-paper` som ytre segment), VED SERVERING den mørkeste tonen
 *    (`bg-cream`, se punkt 4). Ingen av dem er et "card" – hver flate er
 *    full bredde, kun typografien/max-w-xl-kolonnen holder innholdet smalt.
 *
 * Selve AI-kurateringen (getEveningCuration/getVinmonopoletWineSuggestion)
 * og ordforklaringene er FORTSATT urørt.
 *
 * REDESIGNET 29.09.2026 (6. runde – Henrik: "i stedet for 'se hvorfor' så
 * kan man heller trykke på selve tingen, feks kan man trykke på 'Kaldt vann
 * i glass' og få opp hvorfor, i stedet for så mange små gule se hvorfor").
 * "Se hvorfor"-mekanikken ER nå endret: den forrige, separate
 * `WhyToggle`-lenken (liten gull tekst-knapp under hvert element) er
 * erstattet med `WhyReveal`, som gjør selve elementet/overskriften/teksten
 * TIL knappen (vinnavnet i I GLASSET, hvert element i PÅ BORDET, stemnings-
 * og musikk-teksten, rådet i VED SERVERING) – se WhyReveal sin egen
 * filheader for detaljer, inkludert hvordan den samspiller med
 * GlossaryText sine egne, nøstede ordforklarings-knapper
 * (`stopPropagation`, se der). Ingen endring i NÅR en "hvorfor" vises
 * (fortsatt kun når AI-en faktisk ga en begrunnelse) – kun HVORDAN den
 * trykkes frem.
 *
 * "HVORFOR" INNSNEVRET 29.09.2026 (7. runde – Henrik: "vi ikke trenger å
 * vite hvorfor man må ha varme tallerken, eller stemning og musikk. så det
 * kan fjernes. det gjelder kun hva som skal stå på bordet, og vinen").
 * `WhyReveal` (klikk-for-å-avdekke-begrunnelse) brukes nå KUN i I GLASSET
 * (vinen) og PÅ BORDET (hvert bordelement) – fjernet fra STEMNING+MUSIKK og
 * VED SERVERING, som nå rendrer teksten sin rett frem via `GlossaryText`
 * alene (fortsatt med ordforklarings-mekanikken for enkeltord, kun selve
 * "hvorfor hele setningen"-avdekkingen er borte). `curation.moodWhy`/
 * `musicDirectionWhy`/`servingTipWhy` genereres fortsatt av AI-kalt (rørt
 * ved i kitchen-intelligence.ts), bare ikke lenger vist noe sted i UI-en.
 *
 * Samtidig rettet: VED SERVERING sin kolonne var `max-w-sm` (384px) – for
 * smal til at enkelte lange, sammensatte ord (f.eks. "lammecarréen") fikk
 * plass på én linje ved denne italic-serif-størrelsen, som tvang nettleseren
 * til å brekke MIDT I ordet (Henrik, med skjermbilde: "det er en sperre helt
 * nederst sånn at lammecarréen blir kuttet"). Utvidet til `max-w-md` – gir
 * nok bredde til normal ord-for-ord-wrap uten å brekke et enkelt ord.
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

/** Klikkbar avdekk-"hvorfor"-wrapper (29.09.2026 – erstatter den forrige
 * separate "Se hvorfor →"/"Se detaljer →"-lenken, se WhyToggle i
 * Git-historikken hvis den trengs igjen). Henrik: "i stedet for 'se
 * hvorfor' så kan man heller trykke på selve tingen, feks kan man trykke
 * på 'Kaldt vann i glass' og få opp hvorfor, i stedet for så mange små
 * gule se hvorfor". Selve teksten/overskriften (children) ER nå knappen –
 * ingen egen synlig lenke ved siden av. Samme visuelle språk som de
 * enkelte ordforklaringene i GlossaryText under (tynn prikket
 * understreking, gull ved hover) – "prikket understreking = trykk for
 * mer" er nå ett konsekvent mønster gjennom hele "Gjør det til en kveld",
 * enten det er ett fagord eller en hel setning som er trykkbar.
 *
 * `role="button"` (ikke en ekte `<button>`) fordi children ofte er
 * GlossaryText, som selv kan inneholde ekte `<button>`-er for enkeltord –
 * en `<button>` kan ikke inneholde en annen `<button>` (ugyldig HTML).
 * GlossaryText sin egen term-knapp kaller `stopPropagation()` (se der) slik
 * at et trykk på ETT fagord inni teksten ikke også åpner/lukker HELE
 * "hvorfor"-forklaringen.
 *
 * Skjult helt (rendrer kun children, uten klikk-egenskaper) når feltet
 * mangler – enten fordi AI-en ikke fant noen god begrunnelse denne gangen,
 * ELLER fordi raden ble cachet før denne utvidelsen fantes (se filheaderen
 * i kitchen-intelligence.ts) – begge tilfellene skal se identiske, helt
 * vanlige (ikke-klikkbare) ut for besøkende. */
function WhyReveal({
  why,
  lang,
  className,
  children,
}: {
  why: string | null | undefined;
  lang: Lang;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (!why) return <div className={className}>{children}</div>;
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className={clsx(
          "cursor-pointer underline decoration-dotted decoration-ink-faint underline-offset-4 transition-colors hover:decoration-clay",
          className,
        )}
      >
        {children}
      </div>
      {open && <p className="mt-2 max-w-md font-sans text-xs leading-relaxed text-ink-faint">{why}</p>}
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
              onClick={(e) => {
                // (29.09.2026) stopPropagation – GlossaryText brukes nå ofte
                // inni WhyReveal (se der), som selv lytter etter klikk på
                // HELE teksten for å avdekke "hvorfor". Uten dette ville et
                // trykk på ett enkelt fagord her også åpnet/lukket hele
                // "hvorfor"-forklaringen ved siden av ordforklaringen.
                e.stopPropagation();
                setOpenTerms((prev) => {
                  const next = new Set(prev);
                  if (next.has(match.term)) next.delete(match.term);
                  else next.add(match.term);
                  return next;
                });
              }}
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

export function EveningExperience({
  session,
  wine,
  onWineChange,
  lang,
}: {
  session: MealSession;
  wine: { name: string } | null;
  onWineChange: (wine: { name: string } | null) => void;
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

  // (29.09.2026, 8. runde – RETTET 9. runde) Filtrerer bort glossary-termer
  // som forekommer i en av rettene i menyen selv (f.eks. "Lammecarré") –
  // Henrik: "det trenger heller ikke være en strek under lammecarre hvor
  // man får vite hva det er, det regner jeg med folk vet når de velger det
  // i en meny". Brukeren har allerede valgt denne retten fra menyen – en
  // ordforklaring for selve rettnavnet er overflødig på en måte et faktisk
  // fagord (f.eks. "fleur de sel") ikke er.
  //
  // RETTET (9. runde – Henrik, etter push: "det er fortsatt forklaring på
  // lammecarre etter denne pushen") – forrige forsøk sammenlignet termen
  // mot HELE rettittelen (f.eks. "Lammecarré med potetgrateng, rødvinssjy
  // & glasert sjalottløk"), men selve glossary-termen fra AI-en er typisk
  // kun kjerneordet ("Lammecarré" alene) – et EKSAKT likhets-sjekk traff
  // derfor aldri. Sjekker nå i stedet om termen finnes SOM DELSTRENG i en
  // av rettitlene (`title.includes(term)`), som faktisk fanger dette
  // tilfellet. Brukes i STEDET for curation.glossary overalt under (samme
  // AI-data, kun rettnavn-treff luket bort).
  const dishTitles = courses.map((c) => c.title.trim().toLowerCase()).filter(Boolean);
  const glossary = curation?.glossary?.filter(
    (g) => !dishTitles.some((title) => title.includes(g.term.trim().toLowerCase())),
  );

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
          {/* KAPITTEL - I GLASSET. Den mest fremtredende anbefalingen i
           * segmentet (brief 29.09.2026 [5. runde]) – IKKE lenger én smal
           * tekstkolonne, men en 2-kolonne redaksjonell komposisjon på
           * desktop: venstre = AI-ens vinanbefaling (stor serif-overskrift,
           * curation.wine.label – kort, dynamisk, ALDRI hardkodet "Pinot
           * Grigio", se filheaderen i kitchen-intelligence.ts – med
           * style-teksten som fallback for eldre cache-rader uten label),
           * en liten stikkord-linje, så selve noten, "Se hvorfor"/"Finn en
           * konkret vin" som to rolige linjer. Høyre = "Vinen din"
           * (MealWineInput) – bevisst SEKUNDÆR (smalere kolonne, mindre
           * etikett-vekt enn Eyebrow), ikke et eget skjema/kort. Stables
           * vertikalt på mobil (`grid-cols-1`, høyre under venstre).
           *
           * Kapittelet er IKKE gatet bak `curation.wine` alene – "Vinen
           * din" skal alltid være tilgjengelig uavhengig av om AI-ens egen
           * vinstil-anbefaling faktisk kom med denne gangen. AI-delen
           * (label/tags/note/"Se hvorfor"/"Finn en konkret vin") vises
           * fortsatt kun `curation.wine &&`. */}
          {/* DELT BAKGRUNNSBILDE 29.09.2026 (10. runde – Henrik sendte et
           * mørkt, stemningsfullt bord-med-stearinlys-bilde: "prøv å sette
           * dette bildet over 3 seksjoner: I glasset - på bordet -
           * stemning") – I GLASSET/PÅ BORDET/STEMNING+MUSIKK deler nå ETT
           * bakgrunnsbilde (public/images/evening-table.jpg) i stedet for
           * hver sin flate bakgrunnsfarge (bg-paper/bg-cream-dark/bg-paper),
           * som om det er ETT sammenhengende "rom" man beveger seg gjennom i
           * stedet for tre atskilte flater. Samme enkle CSS-background-
           * image-teknikk som MoodModeSection.tsx/WinePairing.tsx bruker på
           * forsiden (absolutt bakgrunnsdiv + absolutt mørkt overlegg +
           * `relative`-innholdswrapper oppå, se filheaderen der for hvorfor
           * innholdswrapperen MÅ være eksplisitt positionert for å legge seg
           * over de absolutte lagene). `bg-cream-dark/72`-overlegget (samme
           * mørke familie som resten av siden) sikrer god lesbarhet for
           * text-ink – bildet er allerede svært mørkt i seg selv (kun
           * stearinlys-glød sentralt), så overlegget lar noe av varmen/
           * gløden skinne gjennom i stedet for å flate det helt ut.
           *
           * (29.09.2026, 11. runde – Henrik, etter å ha sett det live:
           * "kan du prøve å legge en veldig mørk overlay? sånn at det
           * nesten blir helt mørk? nå ble det litt for mye synlig bilde")
           * – skrudd opp fra `/72` til `/94`.
           *
           * (29.09.2026, 12. runde – Henrik: "ja, men det ser jo ikke SVART
           * ut?? det er jo grått") – roten til problemet var FARGEN, ikke
           * kun styrken: `bg-cream-dark` er #191917, en lysere, litt varm
           * gråtone – IKKE sidens egentlige nesten-svarte bunnfarge
           * (`bg-cream`, #0b0b0a, se app/globals.css sin filheader for
           * hvorfor "cream" er den mørke fargefamilien). Et sterkt overlegg
           * i #191917 blandet med bildets egne mørke piksler leser som grått
           * nettopp fordi #191917 ER en gråtone sammenlignet med #0b0b0a.
           * Byttet derfor selve fargen til `bg-cream` (samme fargeverdi som
           * resten av siden sin bunn), på `/95` – nå blander overlegget seg
           * med SAMME nesten-sorte tone som omgivelsene i stedet for en
           * synlig lysere/gråere flate.
           *
           * (29.09.2026, 13. runde – Henrik byttet samtidig selve bildet til
           * et annet, bredere bord-med-stearinlys-motiv, og ba om at
           * overlegget skrus NED en del igjen: "bytt til dette bildet, og
           * skru ned overlayen en del") – `/95` → `/78`. Bildet er nå igjen
           * tydeligere synlig (samme balanse som den opprinnelige `/72`,
           * bare med riktig `bg-cream`-farge fra forrige runde i stedet for
           * den grålige `bg-cream-dark`).
           *
           * (29.09.2026, 14. runde – Henrik: "uff, vi må ha den litt opp
           * igjen") – `/78` var for lyst/synlig igjen; skrudd opp til `/86`,
           * et sted midt mellom `/78` og `/94`.
           *
           * RETTET (15. runde – Henrik, med skjermbilde: "fjern strekene
           * mellom disse seksjonene, og flytt 'på bordet' til å være like
           * langt inn som 'i glasset' og 'stemning'") – to ting rettet:
           * 1) `border-t border-ink/10` fjernet fra PÅ BORDET og
           *    STEMNING+MUSIKK sine egne `<section>`-elementer (de to
           *    skillelinjene som kuttet tvers over det nå delte
           *    bakgrunnsbildet) – I GLASSET beholdt DA sin egen `border-t`,
           *    siden den skilte dette segmentet fra en bildeløs
           *    kapittel-inngang ("GJØR DET TIL EN KVELD"/"Alt rundt
           *    bordet.") RETT OVER.
           *
           * RETTET IGJEN (16. runde – Henrik la samtidig et eget
           * bakgrunnsbilde bak selve kapittel-inngangen i MealView.tsx, se
           * filheaderen der: "fjern linja som skiller seksjonene") – nå som
           * inngangen OGSÅ har et bilde bak seg, er I GLASSET sin
           * gjenværende `border-t` fjernet også – hele veien fra "GJØR DET
           * TIL EN KVELD"-tittelen til STEMNING+MUSIKK er nå én
           * sammenhengende, bildedrevet flate uten en eneste skillelinje.
           * 2) PÅ BORDET sin indre kolonne var `max-w-xl` (smalere enn I
           *    GLASSET/STEMNING sin `max-w-2xl`) – `mx-auto` sentrerer hver
           *    kolonne for seg, så en smalere bredde ga en synlig lengre
           *    venstremarg enn de to andre kapitlene (nøyaktig det Henrik
           *    pekte på i skjermbildet). Satt til samme `max-w-2xl` – felles
           *    venstrekant gjennom hele segmentet nå.
           * PÅ BORDET sin tidligere `bg-cream-dark`-flate (se filheaderen
           * lenger ned) er derfor fjernet – gjennomsiktig, som de to andre,
           * slik at bildet skinner gjennom overalt. VED SERVERING og
           * avslutningslinjen ("Cook well…") er UTENFOR denne wrapperen,
           * fortsatt sin egen rolige, bildeløse `bg-cream`-avslutning (se
           * deres egne filheadere) – bevisst kontrast: bildet hører til
           * selve "gjør det til en kveld"-oppbyggingen, ikke til
           * avslutningen.
           *
           * FADE TIL SVART, TOPP+BUNN (29.09.2026, 17. runde – Henrik:
           * "bildet som går over de tre seksjonene må fades til svart både
           * oppe og nede") – et ekstra, lagvis gradient-overlegg OVENPÅ den
           * eksisterende flate `bg-cream/86`-flaten, samme `var(--color-
           * cream)`-fargetoken (sidens ekte sorte, se filheaderen øverst i
           * filen) i en `linear-gradient` som er helt solid i begge ender
           * og gjennomsiktig i midten – gir en myk overgang til svart der
           * segmentet møter kapittel-inngangen over (som nå har sitt eget
           * bilde, se MealView.tsx) og VED SERVERING under (som har sin
           * egne flate `bg-cream`), i stedet for en brå bildekant. */}
          <div className="relative isolate overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url(/images/evening-table.jpg)" }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-cream/86" aria-hidden="true" />
            <div
              className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--color-cream)_0%,transparent_18%,transparent_82%,var(--color-cream)_100%)]"
              aria-hidden="true"
            />

            <div className="relative">
          <Reveal>
            <section className="px-5 py-10 sm:px-10 sm:py-14">
              {/* max-w-2xl – gir 2-kolonne-oppsettet nødvendig bredde på
                  desktop. Alle tre kapitlene i dette delte bakgrunnsbilde-
                  segmentet (I GLASSET/PÅ BORDET/STEMNING+MUSIKK) bruker nå
                  SAMME max-w-2xl (PÅ BORDET brukte tidligere en smalere
                  max-w-xl, se RETTET-avsnittet i filheaderen øverst – 15.
                  runde, Henrik: "flytt 'på bordet' til å være like langt
                  inn som 'i glasset' og 'stemning'") – felles venstrekant
                  gjennom hele segmentet. */}
              <div className="mx-auto max-w-2xl">
                <Eyebrow>{t(lang, "eveningExperience.wineHeading")}</Eyebrow>

                <div className="mt-6 lg:grid lg:grid-cols-[1.3fr_1fr] lg:gap-12">
                  {/* Venstre: AI-ens egen vinstil-anbefaling. */}
                  <div>
                    {curation.wine ? (
                      <>
                        {/* (29.09.2026) Selve vinnavnet ER nå knappen for
                         * "hvorfor" – se WhyReveal sin filheader. Erstatter
                         * den forrige separate "Se hvorfor →"-lenken under. */}
                        <WhyReveal
                          why={curation.wine.why}
                          lang={lang}
                          className="text-balance font-serif text-2xl text-ink sm:text-3xl"
                        >
                          {curation.wine.label || curation.wine.style}
                        </WhyReveal>
                        {curation.wine.tags && curation.wine.tags.length > 0 && (
                          <p className="mt-2.5 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-ink-faint">
                            {curation.wine.tags.join(" · ")}
                          </p>
                        )}
                        {curation.wine.note && (
                          <GlossaryText
                            text={curation.wine.note}
                            glossary={glossary}
                            className="mt-4 max-w-md font-sans text-sm leading-relaxed text-ink-soft"
                          />
                        )}

                        {!vinResult && (
                          <button
                            type="button"
                            onClick={handleFindWine}
                            disabled={vinLoading}
                            className="mt-4 font-sans text-xs font-medium text-clay hover:text-clay-dark disabled:cursor-not-allowed disabled:text-ink-faint"
                          >
                            {vinLoading
                              ? t(lang, "wine.vinmonopoletLoading")
                              : t(lang, "eveningExperience.findWineButton")}
                          </button>
                        )}
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
                                <p className="mt-1 font-sans text-xs leading-relaxed text-ink-soft">
                                  {vinResult.reasoning}
                                </p>
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
                      </>
                    ) : (
                      <div className="h-px" aria-hidden="true" />
                    )}
                  </div>

                  {/* Høyre: "Vinen din" (MealWineInput) – flyttet hit fra
                   * sitt eget kapittel på MealView.tsx i 4. runde, nå gitt
                   * en tydeligere, mer invitterende etikett (ny nøkkel
                   * mealWineInput.ownWineHeading i stedet for det nøytrale
                   * mealWineInput.heading) – bevisst mindre vekt enn
                   * Eyebrow-en over, dette er en sekundær funksjon, ikke et
                   * nytt kapittel. Egen border-t KUN på mobil/nettbrett
                   * (der kolonnene stables) – på desktop skiller selve
                   * grid-gapet de to kolonnene i stedet. */}
                  <div className="mt-10 border-t border-ink/10 pt-8 lg:mt-0 lg:border-t-0 lg:border-l lg:border-ink/10 lg:pl-10 lg:pt-0">
                    <p className="font-sans text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">
                      {t(lang, "mealWineInput.ownWineHeading")}
                    </p>
                    <div className="mt-3">
                      <MealWineInput wine={wine} onChange={onWineChange} lang={lang} />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </Reveal>

          {/* KAPITTEL - PÅ BORDET (redesignet 5. runde, 28.09.2026 – Henrik:
           * "Denne delen trenger mest opprydding. Dagens løse tekst/prikker
           * skal bort"). Fra én "·"-atskilt linje TIL et responsivt
           * rutenett (`sm:grid-cols-2 lg:grid-cols-3`) – hvert element får
           * sin egen luft/spalte i stedet for å flyte i samme setning,
           * fortsatt ren typografi (ingen cards/bokser/rammer). Antall
           * elementer varierer med AI-svaret (typisk 2–5) – rutenettet
           * folder naturlig, ingen fast tre-kolonne-antakelse. Stables i én
           * kolonne på mobil.
           *
           * (29.09.2026) Selve elementteksten (f.eks. "Kaldt vann i glass")
           * ER nå selve "hvorfor"-knappen, se WhyReveal sin filheader –
           * erstatter den forrige separate "Se detaljer →"-lenken under
           * hvert element. */}
          {curation.tableAccompaniments.length > 0 && (
            <Reveal>
              <section className="px-5 py-10 sm:px-10 sm:py-14">
                <div className="mx-auto max-w-2xl">
                  <Eyebrow>{t(lang, "eveningExperience.tableHeading")}</Eyebrow>
                  <ul className="mt-6 grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
                    {curation.tableAccompaniments.map((item, i) => (
                      <li key={i}>
                        <WhyReveal why={curation.tableAccompanimentsWhy?.[item]} lang={lang}>
                          <GlossaryText
                            text={item}
                            glossary={glossary}
                            as="span"
                            className="font-serif text-lg leading-snug text-ink"
                          />
                        </WhyReveal>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </Reveal>
          )}

          {/* KAPITTEL - STEMNING + MUSIKK (redesignet 5. runde, 28.09.2026 –
           * Henrik: "Disse to skal oppleves som én samlet del: atmosfæren
           * rundt middagen [...] STEMNING skal få mest plass og være den
           * emosjonelle hovedteksten [...] MUSIKK ligger ved siden av eller
           * forskjøvet [...] sekundær til stemningen"). Fra to stablede
           * blokker i én kolonne TIL en bevisst ASYMMETRISK 2-kolonne-
           * komposisjon på desktop (`lg:grid-cols-[1.6fr_1fr]`): STEMNING
           * får mest bredde og en større serif-stemme (den emosjonelle
           * hovedteksten), MUSIKK er visuelt underordnet OG forskjøvet ned
           * (`lg:mt-16`) i sin egen, smalere kolonne – ikke likestilt med
           * STEMNING slik de to var i forrige runde. Stables normalt på
           * mobil/nettbrett. Kun den faktiske musikk-RETNINGEN vises
           * (curation.musicDirection, en kort sjanger/søkefrase) – INGEN
           * falsk sang-tittel, spilleliste eller ▶-avspillingsknapp, se
           * filheaderen i kitchen-intelligence.ts for hvorfor (5.11: aldri
           * late som en Spotify-integrasjon finnes). Ingen egen
           * bakgrunnsflate her (gjennomsiktig, samme `bg-paper` som ytre
           * segment i MealView.tsx) – se filheaderen øverst for hele
           * bakgrunnstone-rytmen mellom kapitlene. */}
          {(curation.mood || curation.musicDirection) && (
            <Reveal>
              <section className="px-5 py-10 sm:px-10 sm:py-14">
                <div className="mx-auto max-w-2xl lg:grid lg:grid-cols-[1.6fr_1fr] lg:items-start lg:gap-14">
                  {curation.mood && (
                    <div>
                      <Eyebrow>{t(lang, "eveningExperience.moodHeading")}</Eyebrow>
                      <GlossaryText
                        text={curation.mood}
                        glossary={glossary}
                        as="p"
                        className="mt-5 text-balance font-serif text-3xl leading-snug text-ink sm:text-4xl"
                      />
                    </div>
                  )}
                  {curation.musicDirection && (
                    <div className={curation.mood ? "mt-12 lg:mt-16" : ""}>
                      <Eyebrow>{t(lang, "eveningExperience.musicHeading")}</Eyebrow>
                      <GlossaryText
                        text={curation.musicDirection}
                        glossary={glossary}
                        as="p"
                        className="mt-5 font-serif text-lg text-ink-soft"
                      />
                    </div>
                  )}
                </div>
              </section>
            </Reveal>
          )}
            </div>
          </div>

          {/* KAPITTEL - VED SERVERING (redesignet 5. runde, 28.09.2026 –
           * Henrik: "Dette skal føles som kveldens siste beskjed fra
           * CONVITE. Ikke presenter den som enda en vanlig seksjon
           * identisk med resten. Lag en tydelig avsluttende editorial
           * note"). Fra samme venstrestilte oppsett som de andre TIL en
           * bevisst AVSLUTTENDE komposisjon: sentrert, smalere kolonne
           * (`max-w-sm`, ikke `max-w-xl`), større italic-serif "siste
           * ord"-følelse, og en egen, litt mørkere bunntone (`bg-cream` –
           * sidens egen mørkeste/"grunn"-tone, se filheaderen øverst i
           * filen) i stedet for å arve samme flate som kapitlene over.
           * Vises KUN når AI-en faktisk fant et genuint relevant råd
           * (curation.servingTip er null ellers).
           *
           * (29.09.2026) Selve rådteksten ER nå "hvorfor"-knappen (se
           * WhyReveal sin filheader) – erstatter den forrige, sentrerte
           * "Se hvorfor"-lenken under. */}
          {curation.servingTip && (
            <Reveal>
              {/* (29.09.2026, 17. runde – Henrik: "og linje som deler
               * 'stemning' og 'ved servering' må fjernes") – `border-t
               * border-ink/10` fjernet. Samme resonnement som 15./16. runde
               * over: nå som hele det bildedrevne segmentet (I
               * GLASSET/PÅ BORDET/STEMNING+MUSIKK) ikke lenger har noen
               * synlige skillelinjer internt, og bakgrunnsbildet dessuten
               * nå fader til svart nederst (se filheaderen ved
               * bilde-wrapperen), er selve fargeskiftet til `bg-cream` her
               * nok til å markere overgangen til VED SERVERING – ingen
               * hard strek trengs i tillegg. */}
              <section className="bg-cream px-5 py-14 text-center sm:px-10 sm:py-20">
                <div className="mx-auto max-w-md">
                  <Eyebrow>{t(lang, "eveningExperience.servingHeading")}</Eyebrow>
                  <GlossaryText
                    text={curation.servingTip}
                    glossary={glossary}
                    as="p"
                    className="mt-6 font-serif text-xl italic leading-relaxed text-ink sm:text-2xl"
                  />
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
       * (MealView.tsx), en gjentagelse helt nederst var overflødig.
       *
       * (28.09.2026) Luften rundt linjen er strammet inn
       * (`py-16 sm:py-24` → `py-10 sm:py-14`, se filheaderen øverst i
       * filen) – Henrik: linjen kan godt stå igjen, men uten det store
       * tomrommet som var rundt den.
       *
       * (28.09.2026, 5. runde) `bg-cream` lagt til – samme mørkeste
       * bunntone som VED SERVERING-kapittelet rett over (se filheaderen
       * øverst), slik at denne aller siste linjen fortsatt leser som del av
       * SAMME rolige avslutning, uansett om VED SERVERING selv rendret
       * (curation.servingTip kan være null).
       *
       * (29.09.2026, 8. runde) `border-t` fjernet (Henrik: "den nederste
       * streken som skiller 'ved servering' og 'cook well' teksten, kan
       * fjernes") – samme `bg-cream`-bunntone som VED SERVERING rett over
       * er nok til å lese som én sammenhengende avslutning; en egen
       * skillelinje mellom dem var overflødig. */}
      <Reveal>
        <div className="bg-cream px-5 py-10 text-center sm:px-10 sm:py-14">
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
