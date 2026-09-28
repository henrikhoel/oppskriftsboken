"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * SSR-trygg sessionStorage-hook (28.09.2026) – tynnere søsken av den
 * delte useLocalStorage (lib/hooks/useLocalStorage.ts), laget for tilstand
 * som skal overleve en navigering bort og TILBAKE innenfor samme fane
 * (f.eks. trykke inn på en oppskrift fra ukesmenyen og komme rett tilbake),
 * men IKKE skal ligge igjen neste gang man åpner nettsiden på nytt i en ny
 * fane/økt.
 *
 * Bakgrunn: ukesmenyens AKTIVE uke ble 30.09.2026 bevisst flyttet BORT fra
 * localStorage (se filheaderen i WeeklyMenuView.tsx – Henrik ville ikke ha
 * "gjenåpner forrige ukes meny automatisk hver gang du åpner siden på
 * nytt"). Da Henrik senere (28.09.2026) ba om en "tilbake til ukesmenyen"-
 * lenke fra en oppskriftsside, ble det tydelig at ren React-state (som
 * nullstilles ved enhver ny sidevisning i Next.js sin App Router) ikke er
 * nok til å STØTTE en slik tilbake-lenke – uten NOE lagret ville "tilbake"
 * bare vist en tom, ferdig-generert side på nytt. sessionStorage treffer
 * nøyaktig midt i mellom: overlever navigeringen som trengs, men (i
 * motsetning til localStorage) tømmes automatisk når fanen/nettleseren
 * lukkes – akkurat det Henrik opprinnelig ikke ville ha, unngås fortsatt.
 *
 * Ingen cross-instans-synk-event (til forskjell fra useLocalStorage) – kun
 * ØN komponentinstans (WeeklyMenuView.tsx) leser/skriver denne nøkkelen om
 * gangen i praksis, så den kompleksiteten (kun nødvendig når flere
 * SAMTIDIG monterte instanser mot samme nøkkel må holde seg synkronisert,
 * se filheaderen i useLocalStorage.ts) trengs ikke her.
 */
export function useSessionStorage<T>(
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
      const raw = window.sessionStorage.getItem(key);
      if (raw != null) {
        setValue(JSON.parse(raw) as T);
      }
    } catch {
      // Korrupt data eller sessionStorage utilgjengelig (privat modus o.l.) –
      // fortsett bare med initialValue, samme prinsipp som useLocalStorage.
    } finally {
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === "function" ? (next as (p: T) => T)(latestValueRef.current) : next;
      latestValueRef.current = resolved;
      setValue(resolved);
      try {
        window.sessionStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        // Lagring feilet (kvote, privat modus) – behold i minnet uansett.
      }
    },
    [key],
  );

  return [value, set, hydrated];
}
