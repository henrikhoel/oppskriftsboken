"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { useShoppingList } from "@/lib/hooks/useShoppingList";
import { formatShoppingAmount, isPantryStaple } from "@/lib/utils/shopping-list";
import { siteConfig } from "@/lib/config";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { ShoppingBagIcon, TrashIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

export function ShoppingListView({ lang }: { lang: Lang }) {
  const { entries, hydrated, toggleChecked, removeEntry, clearChecked, clearAll } =
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

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBagIcon className="h-10 w-10" />}
        title={t(lang, "shoppingPage.emptyTitle")}
        description={t(lang, "shoppingPage.emptyDescription")}
      />
    );
  }

  const checkedCount = entries.filter((e) => e.checked).length;
  const uncheckedFirst = [...entries].sort((a, b) => Number(a.checked) - Number(b.checked));
  // Samme to grupper som brukes i print-sammendraget og i del-teksten under
  // – "det som faktisk gjenstår å handle" er det eneste som er nyttig å ta
  // med seg ut av huset, mens allerede avhukede varer holdes atskilt (ikke
  // bare utelatt – de vises fortsatt, men for seg selv) i selve utskriften.
  const toBuy = entries.filter((e) => !e.checked);
  const alreadyBought = entries.filter((e) => e.checked);

  async function handleShare() {
    setShareError(null);
    const lines = toBuy.map((e) => {
      const base = `- ${[formatShoppingAmount(e), e.name].filter(Boolean).join(" ")}`;
      // Kjøpstips (kun vin, se isBuyingTipWorthKeeping i
      // lib/utils/shopping-list.ts) – f.eks. hvilken type rødvin
      // oppskriften anbefaler, med på samme linje i den delte teksten.
      return e.note ? `${base} (${e.note})` : base;
    });
    // Hvilke retter listen faktisk stammer fra (samme fromRecipes-sporbarhet
    // som vises per linje i selve UI-et, se {t(lang, "shoppingPage.from")}
    // under) – deduplisert, i den rekkefølgen rettene først dukker opp.
    // Kun basert på toBuy, samme utvalg som selve varelisten under, slik at
    // "meny"-blokken og handlelisten alltid stemmer overens med hverandre.
    const dishNames = Array.from(new Set(toBuy.flatMap((e) => e.fromRecipes)));
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

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-faint">
          {lang === "en"
            ? `${entries.length - checkedCount} of ${entries.length} remaining`
            : `${entries.length - checkedCount} av ${entries.length} gjenstår`}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={clearChecked} disabled={checkedCount === 0}>
            {t(lang, "shoppingPage.clearChecked")}
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll}>
            {t(lang, "shoppingPage.clearAll")}
          </Button>
        </div>
      </div>

      {/* Bevisst små, tilbaketrukne tekstknapper (samme stil/prinsipp som
       * "Skriv ut / lagre som PDF" i EveningExperience.tsx) – eksport av
       * listen er en fin-å-ha-detalj, ikke en hovedhandling som avkrysning
       * eller "tøm listen" over. print:hidden siden knappene selv ikke skal
       * være med i selve utskriften (se print-sammendraget nederst i denne
       * fila for det som faktisk skrives ut). */}
      <div className="mb-4 flex flex-wrap items-center gap-1 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full px-2.5 py-1.5 text-xs font-medium text-ink-faint transition-colors hover:bg-cream-dark hover:text-ink"
        >
          {t(lang, "mealPrint.button")}
        </button>
        {shareSupported && (
          <button
            type="button"
            onClick={handleShare}
            className="rounded-full px-2.5 py-1.5 text-xs font-medium text-ink-faint transition-colors hover:bg-cream-dark hover:text-ink"
          >
            {t(lang, "shoppingPage.shareButton")}
          </button>
        )}
        {shareError && <p className="text-xs text-clay-dark">{shareError}</p>}
      </div>
      {/* Vises når nettleseren normalt støtter Web Share, men siden kjører i
       * en usikker kontekst (vanlig http://, f.eks. testing via LAN-IP) –
       * ingen kodefeil, virker av seg selv på https (produksjon). Samme
       * forklaringsmønster som cookMode.voiceInsecureContext/
       * wakeLockInsecureContext i CookMode.tsx. */}
      {shareInsecureContext && (
        <p className="-mt-3 mb-4 text-xs text-ink-faint print:hidden">{t(lang, "shoppingPage.shareInsecureContext")}</p>
      )}

      <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-paper">
        {uncheckedFirst.map((entry) => (
          <li key={entry.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
            <label className="flex flex-1 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={entry.checked}
                onChange={() => toggleChecked(entry.id)}
                className="h-5 w-5 shrink-0 accent-clay"
              />
              {/* MERK: line-through settes IKKE på en ytre wrapper-span lenger
               * – CSS tegner en gjennomstreking fra en forelder rett gjennom
               * ALLE etterkommere sitt innhold, og en etterkommer kan ikke
               * pålitelig skru den av igjen for seg selv (text-decoration:
               * none på et barn stopper IKKE forelderens linje fra å
               * fortsette gjennom det – dette gjaldt fortsatt tydelig på
               * Safari/mobil, et tidligere forsøk med "no-underline" på kun
               * hint-teksten virket ikke). Linjen settes derfor DIREKTE og
               * KUN på de to spennene som faktisk skal strykes over (mengde
               * + navn) – hint/tips/fra-tekstene er søsken utenfor, ikke
               * etterkommere av en overstrøket forelder, og kan derfor
               * aldri arve streken uansett nettleser. */}
              <span className="text-sm sm:text-base">
                <span
                  className={clsx("font-medium", entry.checked ? "text-ink-faint line-through" : "text-ink")}
                >
                  {formatShoppingAmount(entry)}{" "}
                </span>
                <span className={clsx(entry.checked ? "text-ink-faint line-through" : "text-ink")}>
                  {entry.name}
                </span>
                {/* Vises kun mens varen fortsatt står i sin automatisk
                 * overstrøkne basisvare-tilstand (se PANTRY_STAPLE_NAMES i
                 * lib/utils/shopping-list.ts) – forsvinner av seg selv i det
                 * øyeblikket brukeren klikker bort streken, siden det da ikke
                 * lenger er relevant informasjon. */}
                {entry.checked && isPantryStaple(entry.name) && (
                  <span className="block text-xs text-ink-faint">{t(lang, "shoppingPage.pantryStapleHint")}</span>
                )}
                {/* Kjøpstips (kun vin, se isBuyingTipWorthKeeping i
                 * lib/utils/shopping-list.ts) – f.eks. hvilken type rødvin
                 * oppskriften anbefaler. */}
                {entry.note && (
                  <span className="block text-xs italic text-ink-faint">
                    {t(lang, "shoppingPage.buyingTipLabel")}: {entry.note}
                  </span>
                )}
                {entry.fromRecipes.length > 0 && (
                  <span className="block text-xs text-ink-faint">
                    {t(lang, "shoppingPage.from")}: {entry.fromRecipes.join(", ")}
                  </span>
                )}
              </span>
            </label>
            <button
              type="button"
              onClick={() => removeEntry(entry.id)}
              aria-label={t(lang, "shoppingPage.removeAria", { name: entry.name })}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-cream-dark hover:text-clay-dark"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

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
        {toBuy.length > 0 && (
          <ul className="mt-10 space-y-2 text-left">
            {toBuy.map((entry) => (
              <li key={entry.id} className="border-b border-line/60 py-1.5 text-sm text-ink">
                <div className="flex items-baseline justify-between gap-4">
                  <span>{entry.name}</span>
                  <span className="shrink-0 font-serif text-ink-soft">{formatShoppingAmount(entry)}</span>
                </div>
                {/* Kjøpstips (kun vin) – se samme felt/begrunnelse i
                 * hovedlisten over. */}
                {entry.note && <p className="mt-0.5 text-left text-xs italic text-ink-faint">{entry.note}</p>}
              </li>
            ))}
          </ul>
        )}
        {alreadyBought.length > 0 && (
          <div className="mt-8 text-left">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-ink-faint">
              {t(lang, "shoppingPage.printAlreadyBought")}
            </p>
            <ul className="mt-2 space-y-1">
              {alreadyBought.map((entry) => (
                <li key={entry.id} className="text-sm text-ink-faint line-through">
                  {entry.name} · {formatShoppingAmount(entry)}
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
