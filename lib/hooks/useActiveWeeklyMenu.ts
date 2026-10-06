"use client";

import { useEffect, useState } from "react";
import type { WeeklyMenuChoice } from "@/lib/kitchen-intelligence/weekly-menu-styles";

export const ACTIVE_WEEKLY_MENU_KEY = "oppskriftsboken:ukesmeny:aktiv-uke";

export interface ActiveWeeklyMenuState {
  style: WeeklyMenuChoice | null;
  recipeIds: string[];
  /** "Kun vegetar"-filteret (01.10.2026, Henrik: "på ukesmeny bør man
   * egentlig ha en knapp 'Kun vegetar'") – lever i samme state som style/
   * recipeIds slik at det også overlever ETT-SKUDDS "tilbake"-reisen (se
   * filheaderen ved useActiveWeeklyMenu() under), akkurat som stilvalget
   * allerede gjorde. */
  vegetarianOnly: boolean;
}

const EMPTY_ACTIVE_STATE: ActiveWeeklyMenuState = { style: null, recipeIds: [], vegetarianOnly: false };

/**
 * Skriver et "returøyeblikksbilde" til sessionStorage – kalles RETT FØR man
 * navigerer BORT fra /ukesmeny (til en oppskrift, se onClick på hver dags
 * lenke i WeeklyMenuView.tsx) eller INN mot /ukesmeny fra en lagret uke (se
 * SavedWeeklyMenusList.tsx sin "Bruk denne uken igjen"). Se filheaderen ved
 * useActiveWeeklyMenu() under for hvorfor dette IKKE er en løpende synket
 * verdi, men et bevisst "skriv kun ved avreise"-kall.
 */
export function stashActiveWeeklyMenu(state: ActiveWeeklyMenuState) {
  try {
    window.sessionStorage.setItem(ACTIVE_WEEKLY_MENU_KEY, JSON.stringify(state));
  } catch {
    // Lagring feilet (privat modus o.l.) – ingenting å gjøre, "tilbake"-
    // lenken faller da bare tilbake til en tom side, samme som i dag.
  }
}

/**
 * (06.10.2026) Henrik, etter at tilbakelenken fra handlelisten til
 * ukesmenyen var på plass: "da må fortsatt ukesmenyen være synlig når man
 * går tilbake, nå er den tom" – TO ganger på rad, selv etter at
 * stashActiveWeeklyMenu(activeWeek) ble lagt til i onClick på "Se listen
 * →"-lenken i WeeklyMenuView.tsx. For å ikke være avhengig av AKKURAT den
 * ene lenkens onClick som eneste utløser (uansett hva som gjør at den
 * ikke alltid treffer i praksis), skriver WeeklyMenuView nå
 * øyeblikksbildet ALLEREDE idet uken faktisk legges i handlelisten
 * (handleAddToShoppingList lykkes) – selve "noe er verdt å ta vare på for
 * ÉN retur-reise"-hendelsen, uavhengig av hvilken lenke/knapp man senere
 * bruker for å navigere til handlelisten. For at dette ikke skal
 * gjeninnføre akkurat den "husker uken for alltid"-bieffekten FØRSTE
 * forsøk hadde (se filheaderen over) dersom brukeren regenererer/bytter
 * dag/stil ETTER at uken ble lagt i handlelisten UTEN å besøke
 * handlelisten i det hele tatt, kalles denne funksjonen i AKKURAT de
 * samme stedene WeeklyMenuView allerede nullstiller `added`
 * (handlePickStyle/handleToggleVegetarianOnly/handleGenerate/
 * handleRegenerate/handleSwapDay/swapDays) – et evt. foreldet
 * øyeblikksbilde fra en uke som ikke lenger stemmer overens med det som
 * faktisk ligger i handlelisten, slettes da med det samme i stedet for å
 * bli stående og kunne dukke opp igjen ved et helt urelatert senere besøk.
 */
export function clearStashedActiveWeeklyMenu() {
  try {
    window.sessionStorage.removeItem(ACTIVE_WEEKLY_MENU_KEY);
  } catch {
    // Se stashActiveWeeklyMenu over – ingenting å gjøre her heller.
  }
}

/**
 * (06.10.2026, RUNDE 3) Henrik, etter at "ALLTID vis tilbakelenken på
 * handlelista"-endringen var på plass (se BackToWeeklyMenuLink.tsx):
 * "når jeg nå går inn på handlelisten senere, altså ikke direkte fra
 * ukesmeny, og deretter går tilbake til ukesmeny, så er den tom igjen".
 *
 * Rotårsak: useActiveWeeklyMenu() under leste OG SLETTET
 * øyeblikksbildet ved HVER ENESTE mount av /ukesmeny, uansett HVORDAN man
 * kom dit – ikke bare via en bevisst "tilbake"-reise. Så lenge
 * tilbakelenken på handlelista nå ALLTID vises (uavhengig av hvor lenge
 * siden/hvor mange sider siden man la uken i handlelisten), er det fullt
 * normalt å besøke /ukesmeny via helt vanlig navigasjon (header-lenken,
 * et bokmerke, osv.) EN gang innimellom – det besøket konsumerte da
 * øyeblikksbildet med det samme, og lot ingenting stå igjen til den
 * FAKTISKE senere "tilbake"-reisen fra handlelista.
 *
 * Løsningen er et eksplisitt "jeg ØNSKER gjenoppretting"-signal
 * (RESTORE_PARAM) i URL-en, satt KUN av de stedene som faktisk er en
 * bevisst retur-reise til en tidligere aktiv/lagret uke: tilbakelenken fra
 * handlelista (BackToWeeklyMenuLink.tsx), tilbakelenken fra en oppskrift
 * man kom til via ukesmenyen (app/oppskrifter/[slug]/page.tsx), og "Bruk
 * denne uken igjen" fra lagrede ukesmenyer (SavedWeeklyMenusList.tsx).
 * useActiveWeeklyMenu() leser (og sletter) KUN øyeblikksbildet når dette
 * signalet er med i URL-en – en helt vanlig navigering til /ukesmeny uten
 * signalet lar et evt. lagret øyeblikksbilde stå urørt, klart for en
 * SENERE, faktisk tilbake-reise, i stedet for å konsumere det stille i
 * bakgrunnen. Samtidig beholdes hele poenget fra 28.09.2026-fiksen over
 * (husker IKKE uken for alltid/ved enhver sidevisning) – uten signalet
 * starter siden fortsatt alltid tom.
 */
const RESTORE_PARAM = "gjenopprett";

function shouldRestoreFromUrl(): boolean {
  try {
    return new URLSearchParams(window.location.search).has(RESTORE_PARAM);
  } catch {
    return false;
  }
}

export function activeWeeklyMenuRestoreHref(targetPath: string): string {
  return `${targetPath}?${RESTORE_PARAM}=1`;
}

/**
 * FEILRETTET (28.09.2026) – Henrik: "nå gjør den jo det du sa ikke skulle
 * skje, den husker ukesmenyen om jeg går ut til forsiden og inn igjen på
 * ukesmeny". Første versjon (se git-historikken, samme dag) holdt den
 * AKTIVE uken løpende synket mot sessionStorage (skrev ved HVER endring,
 * leste ved HVER mount) – det løste "tilbake fra en oppskrift"-behovet,
 * men sessionStorage lever i hele fanens levetid, ikke bare én navigering,
 * så uken ble værende gjennom ALL navigering innenfor samme fane (forsiden
 * og inn igjen, ikke bare oppskrift-og-tilbake) – akkurat den "gjenåpner
 * automatisk"-følelsen Henrik opprinnelig ba om å fjerne (se filheaderen i
 * WeeklyMenuView.tsx, 30.09.2026-redesignet).
 *
 * Løsningen er nå "KONSUMERES ÉN GANG, ikke løpende synk": selve uken
 * lever i vanlig React-state (som før 30.09.2026-redesignet, nullstilles
 * ved enhver ny sidevisning). sessionStorage brukes KUN som en ett-skudds
 * "budbringer" for ÉN spesifikk retur-reise – stashActiveWeeklyMenu() over
 * skrives eksplisitt RETT FØR man navigerer bort via en oppskrift-lenke
 * (eller inn fra en lagret uke), og denne hooken LESER OG SLETTER verdien
 * med det samme ved mount. Effekten: naviger til en oppskrift og trykk
 * "tilbake" → uken er der. Naviger til forsiden (ingen stash skjedde der)
 * og inn på /ukesmeny igjen → tom side, som forventet.
 *
 * (06.10.2026, RUNDE 3) – "ved mount" over er nå PRESISERT til "ved mount
 * MED gjenopprett-signalet i URL-en", se RESTORE_PARAM-filheaderen over
 * for hele resonnementet/feilen dette retter opp i.
 *
 * (06.10.2026, RUNDE 4) FEILRETTET IGJEN – Henrik: "ukesmenyen er kun åpen
 * FØRSTE gang man går direkte tilbake fra handlelista, etter dette blir den
 * tømt". To separate, samvirkende feil:
 *
 * 1) Øyeblikksbildet ble fortsatt SLETTET med det samme ved en vellykket
 *    gjenoppretting (se `window.sessionStorage.removeItem` som FØR sto
 *    her). Det var riktig så lenge KUN selve URL-signalet avgjorde lesing
 *    (RUNDE 3) – men betyr at øyeblikksbildet kun kan "brukes opp" ÉN
 *    eneste gang i hele fanens levetid, uansett hvor mange ganger
 *    tilbakelenken faktisk trykkes senere. Sletting er nå fjernet – siden
 *    lesing uansett er strengt låst til RESTORE_PARAM-signalet (se over),
 *    er det ingen fare for at et IKKE-signalisert besøk plukker opp et
 *    gammelt øyeblikksbilde; det eneste som fortsatt rydder det bort er en
 *    faktisk ENDRING av uken (clearStashedActiveWeeklyMenu, se over).
 * 2) `added`-tilstanden i WeeklyMenuView.tsx (egen, vanlig React-state) ble
 *    ALDRI satt til true av selve gjenopprettingen – kun style/recipeIds/
 *    vegetarianOnly kom tilbake. Siden varene FAKTISK allerede lå i
 *    handlelisten (det er jo DERFOR øyeblikksbildet fantes), men UI-et
 *    likevel viste "Legg i handlelisten →"-knappen (ikke "Se listen →"),
 *    var det ingenting på den gjenopprettede siden som skrev et FERSKT
 *    øyeblikksbilde igjen – kombinert med feil 1) var dermed akkurat ÉN
 *    tilbake-reise alt som noensinne fungerte. `restored` under eksponeres
 *    nå som et eget flagg (sann idet en gjenoppretting faktisk skjedde)
 *    slik at WeeklyMenuView kan sette `added` riktig – se bruken der.
 */
export function useActiveWeeklyMenu() {
  const [state, setState] = useState<ActiveWeeklyMenuState>(EMPTY_ACTIVE_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      if (shouldRestoreFromUrl()) {
        const raw = window.sessionStorage.getItem(ACTIVE_WEEKLY_MENU_KEY);
        if (raw != null) {
          // IKKE lenger slettet her (RUNDE 4, se filheaderen over) – lesing
          // er uansett strengt låst til RESTORE_PARAM-signalet, så
          // øyeblikksbildet kan trygt gjenbrukes av en SENERE tilbake-reise
          // også, ikke bare den aller første.
          setState(JSON.parse(raw) as ActiveWeeklyMenuState);
          setRestored(true);
        }
      }
    } catch {
      // Korrupt data eller sessionStorage utilgjengelig (privat modus o.l.)
      // – fortsett bare med den tomme starttilstanden.
    } finally {
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [state, setState, hydrated, restored] as const;
}
