"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { useShoppingList } from "@/lib/hooks/useShoppingList";
import {
  categorizeShoppingItem,
  formatShoppingSecondaryLine,
  formatShoppingShareLine,
  getActiveMenuDishNames,
  groupShoppingEntriesForDisplay,
  isPantryStaple,
  SHOPPING_CATEGORY_ORDER,
  type ShoppingCategoryKey,
  type ShoppingDisplayGroup,
} from "@/lib/utils/shopping-list";
import { siteConfig } from "@/lib/config";
import { CheckIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { t, type Lang, type DictKey } from "@/lib/i18n";

/**
 * (05.10.2026, Henrik: "Redesign Handleliste-siden slik at den matcher det
 * nyere, renere CONVITE-designet") Full visuell redesign av denne siden –
 * ALL eksisterende lagring/aggregering/basisvare-/avhukingslogikk (se
 * lib/hooks/useShoppingList.ts og lib/utils/shopping-list.ts) er UENDRET,
 * dette er kun en ny presentasjon over den samme funksjonelle listen:
 *
 *  1) Ingen stor card-container rundt listen lenger – ligger direkte på
 *     sidens mørke bakgrunn, strukturert med luft/typografi/tynne
 *     separatorlinjer (divide-y divide-line) i stedet.
 *  2) Statuslinje ("X av Y gjenstår") + handlinger (Del/eksporter, Fjern
 *     avhukede, Tøm listen) på én rad, "Tøm listen" tydelig mest nedtonet
 *     siden den er destruktiv.
 *  3) Varene grupperes etter butikkategori (categorizeShoppingItem, se
 *     lib/utils/shopping-list.ts) i stedet for én lang liste – små
 *     uppercase kategori-labels, samme stil som f.eks. SeasonIngredientList
 *     sine "FRA HAVET/SKOGEN/..."-overskrifter.
 *  4) Basisvarer (isPantryStaple) vises i en egen, flat seksjon nederst –
 *     uansett butikkategori – siden poenget med den seksjonen er "dette har
 *     du sikkert fra før", ikke hvor i butikken den står. KUN mens varen
 *     fortsatt er avhuket, se (06.10.2026, RUNDE 2) under.
 *  5) Ny, diskret "+ Legg til vare"-rad (useShoppingList sin nye
 *     addManualItem) – et lite inline tekstfelt, ikke en modal.
 *
 * (06.10.2026, RUNDE 2) FEILRETTET – Henrik: "når man 'unchecker' en
 * basisvare, så blir den ikke med i handlelisten når man skal dele den til
 * notater [...] når man uncheckker den, altså gjør den gyldig, så må den
 * flytta seg opp til rett over denne 'basisvare'-lista [...] da legger det
 * seg under 'annet' i lista, det passer bra". stapleGroups/categorizedGroups
 * under delte FØR kun på isPantryStaple(navn) alene – en basisvare havnet
 * dermed ALLTID i den flate, overstrøkne "Basisvarer"-seksjonen, uansett
 * avhukingsstatus, selv om seksjonens egen ingress ("Vi antar at du allerede
 * har disse") åpenbart ikke lenger stemmer for en vare brukeren bevisst har
 * avhuket bort (= "nei, denne trenger jeg faktisk"). Deler nå i stedet på
 * isPantryStaple(navn) && checked – i det øyeblikket varen uncheckes faller
 * den ut av Basisvarer-seksjonen og inn i den vanlige butikkategori-
 * grupperingen (categorizeShoppingItem), rett som en hvilken som helst annen
 * vare som gjenstår å handle. Samme prinsipp som ShoppingRow sin egen
 * pantryStapleHint under ({group.checked && isPantryStaple(...)}) brukte fra
 * før – kun section-medlemskapet hadde ikke fulgt etter.
 */

const CATEGORY_LABEL_KEYS: Record<ShoppingCategoryKey, DictKey> = {
  produce: "shoppingPage.category.produce",
  meatFish: "shoppingPage.category.meatFish",
  dairy: "shoppingPage.category.dairy",
  frozen: "shoppingPage.category.frozen",
  bakery: "shoppingPage.category.bakery",
  pantry: "shoppingPage.category.pantry",
  spicesSauces: "shoppingPage.category.spicesSauces",
  drinks: "shoppingPage.category.drinks",
  other: "shoppingPage.category.other",
};

export function ShoppingListView({ lang }: { lang: Lang }) {
  const { entries, hydrated, toggleChecked, removeEntry, clearChecked, clearAll, addManualItem } =
    useShoppingList();
  const [shareError, setShareError] = useState<string | null>(null);

  // Web Share API – trigger nettleserens/telefonens EGEN delemeny, der
  // Notater (iPhone) / Keep e.l. (Android) allerede er et valg brukeren
  // kjenner igjen, i stedet for at vi bygger en egen "lagre i Notater"-
  // integrasjon (finnes ikke noe nettside-API for å skrive direkte inn i en
  // bestemt telefon-app). Kun vist der nettleseren faktisk støtter det
  // (feature-detected, samme mønster som f.eks. voiceSupported/wakeLock i
  // CookMode.tsx) – ingen synlig, ikke-fungerende knapp ellers. Denne
  // sjekken kjører kun etter `hydrated` (se under), altså kun i nettleseren,
  // så den gir aldri et hydrerings-avvik mot en tom server-gjengivelse.
  const shareSupported = typeof navigator !== "undefined" && typeof navigator.share === "function";
  // Samme mønster som isInsecureContext i useWakeLock.ts/useVoiceCommands.ts
  // – navigator.share finnes rett og slett ikke i en usikker kontekst
  // (vanlig http://, f.eks. ved testing via LAN-IP fra telefonen), så uten
  // dette skillet ville "Del handleliste"-knappen bare vært usynlig og se ut
  // som en feil. Fungerer av seg selv så snart siden kjører på https.
  const shareInsecureContext =
    !shareSupported && typeof window !== "undefined" && window.isSecureContext === false;

  if (!hydrated) {
    return null;
  }

  const checkedCount = entries.filter((e) => e.checked).length;

  // NY PRESENTASJON (06.10.2026, Henriks del 2/3-spesifikasjon) – grupperer
  // ALLE rader til visningsgrupper ÉN gang her (se
  // groupShoppingEntriesForDisplay i lib/utils/shopping-list.ts); resten av
  // komponenten (butikkategorier, basisvare-seksjon, del/eksport,
  // utskriftssammendrag) jobber videre på disse gruppene i stedet for de
  // rå ShoppingListEntry-radene direkte. For de aller fleste varer er en
  // gruppe nøyaktig ÉN rad (ingen endring i oppførsel); kun de sjeldne
  // varene med flere, ikke-sammenslåtte behov (f.eks. "15 g koriander" OG
  // "1 håndfull koriander") blir til én gruppe med flere underliggende
  // rader, vist/avhuket/fjernet samlet.
  const allGroups = groupShoppingEntriesForDisplay(entries);
  // Samme to grupper som brukes i print-sammendraget og i del-teksten under
  // – "det som faktisk gjenstår å handle" er det eneste som er nyttig å ta
  // med seg ut av huset, mens allerede avhukede varer holdes atskilt (ikke
  // bare utelatt – de vises fortsatt, men for seg selv) i selve utskriften.
  // En gruppe med BLANDET avhukingsstatus (bør i praksis ikke forekomme,
  // se combinedToggle under – selve UI-et avhuker alltid alle underliggende
  // rader samlet) regnes som "ikke fullt kjøpt" og vises i toBuy.
  const toBuyGroups = allGroups.filter((g) => !g.checked);
  const alreadyBoughtGroups = allGroups.filter((g) => g.checked);

  // Meny-oversikt (06.10.2026, Henrik: "Når handlelisten kommer fra en
  // ukesmeny, vises selve menyen ved deling/eksport til Notater, men ikke
  // på handlelistesiden [...] Legg derfor inn en samlet menyoversikt øverst
  // på selve handlelisten") – getActiveMenuDishNames (se
  // lib/utils/shopping-list.ts) er den ÉNE delte utledningen, nå også
  // brukt av BackToWeeklyMenuLink (components/meal/BackToWeeklyMenuLink.tsx)
  // for å avgjøre om "Tilbake til ukesmenyen"-lenken skal vises øverst på
  // SELVE siden (app/handleliste/page.tsx) – samme svar på "har vi en
  // meny?" begge steder, ingen duplisert/separat datakilde. Tom for en
  // vanlig, menyløs handleliste – seksjonen under vises da ikke, se bruken.
  const dishNames = getActiveMenuDishNames(entries);

  // Basisvarer (isPantryStaple) havner i sin egen seksjon nederst, uavhengig
  // av butikkategori – KUN mens de fortsatt er avhuket ("vi antar at du
  // allerede har disse"), se filheaderen over (06.10.2026, RUNDE 2). En
  // uncheck flytter varen rett over i den vanlige butikkategori-
  // grupperingen under i stedet, som enhver annen vare som gjenstår å
  // handle.
  const stapleGroups = allGroups.filter((g) => isPantryStaple(g.name) && g.checked);
  const categorizedGroups = allGroups.filter((g) => !isPantryStaple(g.name) || !g.checked);
  const byCategory = new Map<ShoppingCategoryKey, ShoppingDisplayGroup[]>();
  for (const group of categorizedGroups) {
    const key = categorizeShoppingItem(group.name);
    const list = byCategory.get(key) ?? [];
    list.push(group);
    byCategory.set(key, list);
  }
  // Uavhukede først INNENFOR hver kategori (lettere å skanne hva som
  // gjenstår mens man går rundt i butikken) – samme prinsipp som den
  // tidligere globale uncheckedFirst-sorteringen, nå bare avgrenset per
  // kategori i stedet for hele listen under ett.
  for (const list of byCategory.values()) {
    list.sort((a, b) => Number(a.checked) - Number(b.checked));
  }

  async function handleShare() {
    setShareError(null);
    // Del/eksporter (06.10.2026, Henriks del 3-spesifikasjon) – KOMPRIMERER
    // den to-linjers på-skjerm-presentasjonen til ÉN linje per vare
    // ("Kremfløte — ca. 6 dl", se formatShoppingShareLine), slik at
    // mottakeren ser nøyaktig hvor mye som trengs uten å måtte åpne CONVITE
    // selv – ingen mengdeinformasjon fjernes, kun presentasjonen endres.
    const lines = toBuyGroups.map((group) => {
      const base = `- ${formatShoppingShareLine(group)}`;
      // Kjøpstips (kun vin, se isBuyingTipWorthKeeping i
      // lib/utils/shopping-list.ts) – f.eks. hvilken type rødvin
      // oppskriften anbefaler, med på samme linje i den delte teksten. Den
      // FØRSTE raden i gruppen med et notat vinner (samme "først vinner"-
      // prinsipp som selve sammenslåingen).
      const note = group.entries.find((e) => e.note)?.note;
      return note ? `${base} (${note})` : base;
    });
    // dishNames – se den hoistede utledningen over (samme datakilde som nå
    // også vises i meny-seksjonen øverst på selve handlelistesiden, se
    // JSX-en rett under AddItemRow-blokken lenger ned i denne filen).
    const menuBlock =
      dishNames.length > 0
        ? `${t(lang, "eveningExperience.menuHeading")}:\n${dishNames.map((d) => `- ${d}`).join("\n")}\n\n`
        : "";
    // MERK: `title` sendes ALLEREDE separat til navigator.share under, og
    // enkelte mottakere (bl.a. Notater på iPhone) viser både title OG den
    // første linjen i text – la tidligere "Handleliste – CONVITE" stå som
    // egen første linje i text, som da dukket opp RETT under den samme
    // "Handleliste"-tittelen. Kun CONVITE-navnet (uten "Handleliste" foran)
    // står derfor i selve teksten nå.
    const text = `${siteConfig.name}\n\n${menuBlock}${lines.join("\n")}`;
    try {
      await navigator.share({ title: t(lang, "shoppingPage.title"), text });
    } catch (err) {
      // AbortError = brukeren lukket delemenyen selv uten å velge noe –
      // helt normalt, ikke en feil å vise frem.
      if (err instanceof Error && err.name === "AbortError") return;
      setShareError(t(lang, "shoppingPage.shareError"));
    }
  }

  if (entries.length === 0) {
    return (
      <div className="py-10 text-center sm:py-16">
        <h2 className="font-serif text-2xl text-ink">{t(lang, "shoppingPage.emptyTitle")}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">{t(lang, "shoppingPage.emptyDescription")}</p>
        <div className="mt-7 flex flex-col items-center gap-3">
          <AddItemRow lang={lang} onAdd={addManualItem} align="center" />
          <Link
            href="/oppskrifter"
            className="text-sm font-medium text-clay-dark transition-colors hover:text-clay"
          >
            {t(lang, "shoppingPage.findRecipeLink")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-faint">
          {t(lang, "shoppingPage.remainingCount", {
            count: allGroups.length - allGroups.filter((g) => g.checked).length,
            total: allGroups.length,
          })}
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <ExportMenu
            lang={lang}
            shareSupported={shareSupported}
            onShare={handleShare}
            shareError={shareError}
            shareInsecureContext={shareInsecureContext}
          />
          <button
            type="button"
            onClick={clearChecked}
            disabled={checkedCount === 0}
            className="text-sm font-medium text-ink-soft transition-colors hover:text-ink disabled:cursor-not-allowed disabled:text-ink-faint/50"
          >
            {t(lang, "shoppingPage.clearChecked")}
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-ink-faint/70 transition-colors hover:text-ink-faint print:hidden"
          >
            {t(lang, "shoppingPage.clearAll")}
          </button>
        </div>
      </div>

      <div className="mb-8 print:hidden">
        <AddItemRow lang={lang} onAdd={addManualItem} align="start" />
      </div>

      {/* Meny-oversikt (06.10.2026, Henriks opprydding punkt 4 – se
       * filheaderen ved dishNames over for hvor denne kommer fra) – vises
       * KUN når listen faktisk stammer fra én eller flere oppskrifter
       * (dishNames er tom for en vanlig, menyløs handleliste – ingen tom
       * MENY-seksjon da). Plassert ETTER toppområdet (antall gjenstår/
       * del-eksporter/fjern avhukede/tøm listen/legg til vare) og FØR
       * første varekategori, som bedt om. Bevisst diskret/kompakt – egen,
       * lavkontrast kort-flate (border-line/bg-paper, samme "kort bak
       * retter"-flate som resten av CONVITE-uttrykket, se app/globals.css)
       * i stedet for en stor, dominerende blokk – og ingen "Fra:
       * [oppskrift]" per vare noe sted: selve varelinjene under er
       * UENDRET (se ShoppingRow), kildekoblingen vises kun samlet her, én
       * gang per rett. */}
      {dishNames.length > 0 && (
        <section className="mb-8 rounded-lg border border-line bg-paper px-5 py-4">
          <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-ink-faint">
            {t(lang, "eveningExperience.menuHeading")}
          </h2>
          <ul className="mt-2.5 space-y-1">
            {dishNames.map((dish) => (
              <li key={dish} className="font-serif text-sm leading-snug text-ink-soft">
                {dish}
              </li>
            ))}
          </ul>
        </section>
      )}

      {SHOPPING_CATEGORY_ORDER.map((category) => {
        const groups = byCategory.get(category);
        if (!groups || groups.length === 0) return null;
        return (
          <section key={category} className="mt-8 first:mt-0">
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
              {t(lang, CATEGORY_LABEL_KEYS[category])}
            </h2>
            <ul className="mt-3 divide-y divide-line">
              {groups.map((group) => (
                <ShoppingRow key={group.key} group={group} lang={lang} onToggle={toggleChecked} onRemove={removeEntry} />
              ))}
            </ul>
          </section>
        );
      })}

      {stapleGroups.length > 0 && (
        <section className="mt-12 border-t border-line pt-8">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
            {t(lang, "shoppingPage.staplesSectionTitle")}
          </h2>
          <p className="mt-1 text-xs text-ink-faint/70">{t(lang, "shoppingPage.staplesSectionSubtitle")}</p>
          <ul className="mt-3 divide-y divide-line">
            {stapleGroups.map((group) => (
              <ShoppingRow key={group.key} group={group} lang={lang} onToggle={toggleChecked} onRemove={removeEntry} />
            ))}
          </ul>
        </section>
      )}

      {/* Utskriftsvennlig sammendrag – samme redaksjonelle oppskrift (bokstavelig
       * talt) som MealView.tsx sitt print-only sammendrag: siden-eyebrow, serif-
       * tittel, tynn gull-strek, ren tekst uten avkrysningsbokser/knapper/
       * søppelbøtte-ikoner. `hidden print:block` – usynlig i vanlig visning,
       * eneste ting som faktisk skrives ut (resten av siden er print:hidden via
       * app/layout.tsx sine wrappere rundt header/bunnmeny/footer, se der). */}
      <div className="hidden print:mx-auto print:block print:max-w-xl print:px-4 print:py-16 print:text-center">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-ink-faint">{siteConfig.name}</p>
        <h1 className="mt-4 text-balance font-serif text-4xl text-ink">{t(lang, "shoppingPage.title")}</h1>
        <div className="mx-auto mt-5 h-px w-16 bg-clay" />
        {toBuyGroups.length > 0 && (
          <ul className="mt-10 space-y-2 text-left">
            {toBuyGroups.map((group) => (
              <li key={group.key} className="border-b border-line/60 py-1.5 text-sm text-ink">
                <div className="flex items-baseline justify-between gap-4">
                  <span>{group.name}</span>
                  <span className="shrink-0 font-serif text-ink-soft">{formatShoppingSecondaryLine(group)}</span>
                </div>
                {/* Kjøpstips (kun vin) – se samme felt/begrunnelse i
                 * hovedlisten over. Den FØRSTE raden i gruppen med et notat
                 * vinner, samme prinsipp som i handleShare over. */}
                {group.entries.find((e) => e.note) && (
                  <p className="mt-0.5 text-left text-xs italic text-ink-faint">
                    {group.entries.find((e) => e.note)?.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        {alreadyBoughtGroups.length > 0 && (
          <div className="mt-8 text-left">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-ink-faint">
              {t(lang, "shoppingPage.printAlreadyBought")}
            </p>
            <ul className="mt-2 space-y-1">
              {alreadyBoughtGroups.map((group) => (
                <li key={group.key} className="text-sm text-ink-faint line-through">
                  {group.name} · {formatShoppingSecondaryLine(group)}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-16 font-serif text-sm italic text-ink-faint">{siteConfig.tagline}</p>
      </div>
    </div>
  );
}

/**
 * Én vare-rad – delt mellom de vanlige butikkategori-seksjonene og
 * basisvare-seksjonen nederst (identisk oppførsel, kun hvilken liste de
 * vises i er forskjellig).
 *
 * NY PRESENTASJON (06.10.2026, Henriks del 2-spesifikasjon, oppdatert
 * 06.10.2026 med ytterligere opprydding: "hovedlinje = kun varenavn; ALL
 * relevant mengde-/behovsinformasjon samlet på ÉN diskret sekundærlinje",
 * ingen "Du trenger"/"trengs", ingen "Fra: [oppskrift]") – hovedlinjen er
 * nå BARE varenavnet; mengden OG et evt. kjøps-notat (f.eks. hvitløkens
 * fedd-detalj eller sitrusens saft/skall-detalj) er nå ÉN sekundærlinje
 * under, satt sammen med " · " (se formatShoppingSecondaryLine) i stedet
 * for å stå på to separate linjer som før. Kildesporingen ("Fra: …") er
 * fjernet fra selve VISNINGEN – fromRecipes/sources finnes fortsatt
 * uendret i den underliggende ShoppingListEntry-modellen (se
 * lib/types.ts), bare ikke rendret her lenger. Basisvare-hint og
 * kjøpstips (vin) er EGNE, uendrede linjer – de er rådgivende tekst, ikke
 * mengdeinformasjon, og slås derfor ikke sammen med mengde-/behovslinjen.
 *
 * Tar nå en HEL ShoppingDisplayGroup (én eller flere underliggende rader,
 * se groupShoppingEntriesForDisplay i lib/utils/shopping-list.ts) i stedet
 * for én enkelt ShoppingListEntry – de sjeldne varene med flere,
 * ikke-sammenslåtte behov (f.eks. "15 g koriander" OG "1 håndfull
 * koriander") vises dermed som ÉN rad med ÉN avkrysningsboks som
 * av-/tilhuker ALLE underliggende rader samlet, i stedet for å dukke opp
 * som to forvirrende, identisk navngitte rader.
 */
function ShoppingRow({
  group,
  lang,
  onToggle,
  onRemove,
}: {
  group: ShoppingDisplayGroup;
  lang: Lang;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  // ALL mengde-/behovsinformasjon (hoved-antall + et evt. kjøps-notat som
  // "ca. 10 fedd"/"ca. 30 ml saft") samlet på ÉN linje, se
  // formatShoppingSecondaryLine. Tom streng for en helt ukvantifisert vare
  // ("salt" uten mengde) – viser da ingen sekundærlinje i det hele tatt.
  const secondaryLine = formatShoppingSecondaryLine(group);
  const buyingTip = group.entries.find((e) => e.note)?.note;

  function handleToggle() {
    // Setter ALLE underliggende rader til samme, nye tilstand (motsatt av
    // dagens samlede status) i stedet for å "flippe" hver for seg – uten
    // dette ville en gruppe med blandet status (bør i praksis ikke
    // forekomme) fått uforutsigbar oppførsel, og en helt avhuket gruppe
    // ville ikke kunnet hukes av igjen med ett klikk dersom toggleChecked
    // flippet hver rad individuelt.
    const nextChecked = !group.checked;
    for (const entry of group.entries) {
      if (entry.checked !== nextChecked) onToggle(entry.id);
    }
  }

  function handleRemove() {
    for (const entry of group.entries) onRemove(entry.id);
  }

  return (
    <li className="flex items-center gap-3 py-3.5">
      <label className="flex flex-1 cursor-pointer items-center gap-3.5">
        {/* Egendefinert, CONVITE-tilpasset avkrysningsboks (05.10.2026) –
         * fortsatt en EKTE <input type="checkbox"> for tastatur-/
         * skjermleser-oppførsel, bare visuelt skjult (appearance-none) til
         * fordel for en avrundet firkant + CheckIcon som vises via
         * peer-checked. Ikke rent dekorativt: hele boksen ER input-et, ikke
         * et eget element ved siden av som bare ser ut til å følge det. */}
        <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
          <input
            type="checkbox"
            checked={group.checked}
            onChange={handleToggle}
            aria-label={group.name}
            className="peer absolute inset-0 h-full w-full shrink-0 cursor-pointer appearance-none rounded-md border-2 border-line-strong bg-transparent transition-colors checked:border-clay checked:bg-clay"
          />
          <CheckIcon className="pointer-events-none relative h-3.5 w-3.5 text-cream opacity-0 transition-opacity peer-checked:opacity-100" />
        </span>
        {/* MERK: line-through settes IKKE på en ytre wrapper-span lenger –
         * CSS tegner en gjennomstreking fra en forelder rett gjennom ALLE
         * etterkommere sitt innhold, og en etterkommer kan ikke pålitelig
         * skru den av igjen for seg selv (text-decoration: none på et barn
         * stopper IKKE forelderens linje fra å fortsette gjennom det – dette
         * gjaldt fortsatt tydelig på Safari/mobil, et tidligere forsøk med
         * "no-underline" på kun hint-teksten virket ikke). Linjen settes
         * derfor DIREKTE og KUN på de to spennene som faktisk skal strykes
         * over (navn + mengde) – hint/tips/fra-tekstene er søsken utenfor,
         * ikke etterkommere av en overstrøket forelder, og kan derfor aldri
         * arve streken uansett nettleser. */}
        <span className="min-w-0 text-sm sm:text-base">
          <span className={clsx("block font-medium", group.checked ? "text-ink-faint line-through" : "text-ink")}>
            {group.name}
          </span>
          {/* Mengde-/behovs-sekundærlinjen (06.10.2026) – "ca. 90 g",
           * "2 stk. · ca. 10 fedd", "ca. 15 g + 1 håndfull" osv., se
           * formatShoppingSecondaryLine. Tom streng for en helt
           * ukvantifisert vare ("salt" uten mengde) – viser da ingen
           * sekundærlinje i det hele tatt i stedet for en tom rad. */}
          {secondaryLine && (
            <span className={clsx("block text-xs", group.checked ? "text-ink-faint line-through" : "text-ink-soft")}>
              {secondaryLine}
            </span>
          )}
          {/* Vises kun mens varen fortsatt står i sin automatisk
           * overstrøkne basisvare-tilstand (se PANTRY_STAPLE_NAMES i
           * lib/utils/shopping-list.ts) – forsvinner av seg selv i det
           * øyeblikket brukeren klikker bort streken, siden det da ikke
           * lenger er relevant informasjon. */}
          {group.checked && isPantryStaple(group.name) && (
            <span className="block text-xs text-ink-faint">{t(lang, "shoppingPage.pantryStapleHint")}</span>
          )}
          {/* Kjøpstips (kun vin, se isBuyingTipWorthKeeping i
           * lib/utils/shopping-list.ts) – f.eks. hvilken type rødvin
           * oppskriften anbefaler. */}
          {buyingTip && (
            <span className="block text-xs italic text-ink-faint">
              {t(lang, "shoppingPage.buyingTipLabel")}: {buyingTip}
            </span>
          )}
          {/* "Fra: [oppskrift]" er FJERNET fra denne visningen (06.10.2026,
           * Henrik) – kildesporingen (fromRecipes/sources) ligger fortsatt
           * uendret i selve datamodellen (lib/types.ts), bare ikke vist her
           * lenger. */}
        </span>
      </label>
      <button
        type="button"
        onClick={handleRemove}
        aria-label={t(lang, "shoppingPage.removeAria", { name: group.name })}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-cream-dark hover:text-clay-dark"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </li>
  );
}

/**
 * "+ Legg til vare" (05.10.2026, redesign punkt 6) – diskret tekstlenke som
 * utvides til et lite inline tekstfelt, bevisst IKKE en modal ("Hold
 * interaksjonen enkel og rask. Ikke bruk en stor modal hvis det kan løses
 * med et lite inline-felt"). Holder feltet ÅPENT etter innsending (i stedet
 * for å lukke det igjen) – den typiske bruken er å legge til flere varer på
 * rad (Henriks eget eksempel: "melk, brød, Cola Zero, bleier"), og å måtte
 * åpne feltet på nytt for hver eneste vare ville vært tregt.
 */
function AddItemRow({
  lang,
  onAdd,
  align,
}: {
  lang: Lang;
  onAdd: (name: string) => void;
  align: "start" | "center";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setIsOpen(false);
      return;
    }
    onAdd(trimmed);
    setValue("");
    inputRef.current?.focus();
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={clsx(
          "inline-flex items-center gap-1.5 text-sm font-medium text-clay-dark transition-colors hover:text-clay",
          align === "center" && "justify-center",
        )}
      >
        <PlusIcon className="h-3.5 w-3.5" />
        {t(lang, "shoppingPage.addItem")}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className={clsx("flex items-center gap-2", align === "center" && "w-full max-w-xs")}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (!value.trim()) setIsOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setValue("");
            setIsOpen(false);
          }
        }}
        placeholder={t(lang, "shoppingPage.addItemPlaceholder")}
        className="min-w-0 flex-1 border-b border-line-strong bg-transparent py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-clay focus:outline-none"
      />
      <button type="submit" className="shrink-0 text-sm font-medium text-clay-dark transition-colors hover:text-clay">
        {t(lang, "shoppingPage.addItemSubmit")}
      </button>
    </form>
  );
}

/**
 * "Del / eksporter" (05.10.2026, redesign punkt 2) – samler den
 * eksisterende "Skriv ut / lagre som PDF"-funksjonen (window.print(), se
 * print-sammendraget i ShoppingListView over) og Web Share-knappen i én
 * diskret, nedtrekkbar meny i stedet for to separate smånapper på rad.
 * INGEN av selve funksjonene er endret – kun flyttet inn i denne menyen.
 */
function ExportMenu({
  lang,
  shareSupported,
  onShare,
  shareError,
  shareInsecureContext,
}: {
  lang: Lang;
  shareSupported: boolean;
  onShare: () => void;
  shareError: string | null;
  shareInsecureContext: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative print:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      >
        {t(lang, "shoppingPage.shareExport")}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-60 rounded-xl border border-line bg-paper py-1.5 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              window.print();
              setOpen(false);
            }}
            className="block w-full px-4 py-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink"
          >
            {t(lang, "mealPrint.button")}
          </button>
          {shareSupported && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onShare();
                setOpen(false);
              }}
              className="block w-full px-4 py-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink"
            >
              {t(lang, "shoppingPage.shareButton")}
            </button>
          )}
          {/* Vises når nettleseren normalt støtter Web Share, men siden
           * kjører i en usikker kontekst (vanlig http://, f.eks. testing via
           * LAN-IP) – ingen kodefeil, virker av seg selv på https
           * (produksjon). */}
          {shareInsecureContext && (
            <p className="px-4 py-2 text-xs text-ink-faint">{t(lang, "shoppingPage.shareInsecureContext")}</p>
          )}
        </div>
      )}
      {shareError && <p className="absolute right-0 top-full mt-1 w-60 text-xs text-clay-dark">{shareError}</p>}
    </div>
  );
}
