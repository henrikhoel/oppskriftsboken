"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * SSR-trygg localStorage-hook. Starter alltid med `initialValue` på
 * serveren/første render (for å unngå hydration mismatch), og leser inn
 * den faktiske lagrede verdien rett etter mount.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

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

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Lagring feilet (kvote, privat modus) – behold i minnet uansett.
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, set, hydrated];
}
