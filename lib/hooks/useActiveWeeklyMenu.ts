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
 */
export function useActiveWeeklyMenu() {
  const [state, setState] = useState<ActiveWeeklyMenuState>(EMPTY_ACTIVE_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(ACTIVE_WEEKLY_MENU_KEY);
      if (raw != null) {
        // Fjernes UMIDDELBART (konsumeres) – en senere, ny sidevisning av
        // /ukesmeny (uten en ny stashActiveWeeklyMenu()-skriving imellom)
        // skal IKKE finne denne verdien igjen, se filheaderen over.
        window.sessionStorage.removeItem(ACTIVE_WEEKLY_MENU_KEY);
        setState(JSON.parse(raw) as ActiveWeeklyMenuState);
      }
    } catch {
      // Korrupt data eller sessionStorage utilgjengelig (privat modus o.l.)
      // – fortsett bare med den tomme starttilstanden.
    } finally {
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [state, setState, hydrated] as const;
}
