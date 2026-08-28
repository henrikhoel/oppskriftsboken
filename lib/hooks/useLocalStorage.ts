"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const LOCAL_STORAGE_EVENT = "oppskriftsboken:localstorage-change";

interface LocalStorageEventDetail {
  key: string;
  value: unknown;
}

/**
 * SSR-trygg localStorage-hook. Starter alltid med `initialValue` på
 * serveren/første render (for å unngå hydration mismatch), og leser inn
 * den faktiske lagrede verdien rett etter mount.
 *
 * Flere komponenter kan ha hver sin instans av denne hooken mot samme
 * `key` samtidig (f.eks. ShoppingListBadgeCount.tsx i bunnmenyen og
 * ShoppingListView.tsx på selve handleliste-siden) – siden hver instans har
 * sin egen uavhengige useState, ser de andre instansene ellers ikke en
 * skriving før en full remount/sideoppdatering (f.eks. et tall over
 * handleliste-ikonet som ikke forsvinner før man oppdaterer siden, selv om
 * listen faktisk ble tømt). Løses ved å sende ut en custom window-event ved
 * hver skriving (det innebygde "storage"-eventet fyres kun i ANDRE
 * faner/vinduer, aldri i samme dokument), og lytte etter den samme eventen
 * for å synkronisere state umiddelbart på tvers av alle instanser mot samme
 * nøkkel i dette dokumentet.
 *
 * VIKTIG: både localStorage.setItem OG dispatchEvent kjøres UTENFOR selve
 * setState-oppdateringen (ikke inni en funksjonell updater til setValue).
 * Et tidligere forsøk gjorde dette inni updateren, som utløste Reacts
 * "Cannot update a component while rendering a different component"-feil
 * første gang to instanser mot samme nøkkel fantes samtidig (f.eks.
 * RecipeInteractive.tsx sin "legg til i handleliste"-knapp og
 * ShoppingListBadgeCount.tsx i bunnmenyen) – React regner selve
 * updater-funksjonen som en del av gjengivelsen, så en setState-kobling til
 * en ANNEN komponent derfra regnes som "oppdaterer under gjengivelse", selv
 * om selve kallet opprinnelig kom fra en helt vanlig knappe-klikk-handler.
 * `latestValueRef` holder styr på gjeldende verdi slik at `set()` kan regne
 * ut neste verdi selv, uten å måtte lese den ut fra inni en updater.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);
  const latestValueRef = useRef(value);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) {
        setValue(JSON.parse(raw) as T);
      }
    } catch {
      // Korrupt data eller localStorage utilgjengelig (privat modus o.l.) –
      // fortsett bare med initialValue.
    } finally {
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Lytt etter skrivinger fra ANDRE instanser av denne hooken mot samme
  // nøkkel andre steder i komponenttreet – se filheaderen over.
  useEffect(() => {
    function handleExternalChange(event: Event) {
      const detail = (event as CustomEvent<LocalStorageEventDetail>).detail;
      if (!detail || detail.key !== key) return;
      setValue(detail.value as T);
    }
    window.addEventListener(LOCAL_STORAGE_EVENT, handleExternalChange);
    return () => window.removeEventListener(LOCAL_STORAGE_EVENT, handleExternalChange);
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === "function" ? (next as (p: T) => T)(latestValueRef.current) : next;
      latestValueRef.current = resolved;
      setValue(resolved);
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        // Lagring feilet (kvote, privat modus) – behold i minnet uansett.
      }
      // Varsler andre instanser av denne hooken mot samme nøkkel (se
      // filheaderen) – sendes uansett om selve lagringen over lyktes, siden
      // minnetilstanden uansett er oppdatert og andre instanser bør følge
      // den. Kjøres HER, ikke inni setValue-updateren – se filheaderen.
      try {
        window.dispatchEvent(
          new CustomEvent<LocalStorageEventDetail>(LOCAL_STORAGE_EVENT, { detail: { key, value: resolved } }),
        );
      } catch {
        // ignorer – bør ikke kunne feile i en nettleser, men samme
        // forsiktighetsprinsipp som resten av funksjonen.
      }
    },
    [key],
  );

  return [value, set, hydrated];
}
