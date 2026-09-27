"use client";

import { useCallback, useEffect, useState } from "react";
import { getMyFavoriteRecipeIds, toggleFavorite } from "@/lib/actions/favorites";

/**
 * Kontobaserte favoritter (27.09.2026, steg 1 av "kontolagring på tvers av
 * enheter" – se prosjektnotatet). Brukt av FavoriteButton.tsx for
 * INNLOGGEDE, ikke-admin brukere – erstatter useFavorites.ts (localStorage)
 * for denne brukergruppen, mens gjester (ikke innlogget i det hele tatt) og
 * admin (favorited_by_admin, en delt liste) fortsatt bruker sine egne,
 * separate mekanismer.
 *
 * Samme "flere komponentinstanser må se samme tilstand umiddelbart"-problem
 * som useLocalStorage.ts løser (se filheaderen der) – en oppskrift kan
 * f.eks. vises i både et RecipeCard i et grid OG i en meny-oversikt
 * samtidig, og et hjerteklikk i den ene må reflekteres i den andre uten en
 * full sideoppdatering. Her finnes ingen native "storage"-event å bygge på
 * (dataen ligger i databasen, ikke i nettleseren), så mønsteret er i stedet
 * en delt modul-nivå cache + et enkelt abonnement-sett: alle hook-instanser
 * i dokumentet deler ÉN cache og varsles via samme `notify()` når den
 * endres – helt uavhengig av om React-treet har én eller tjue instanser av
 * denne hooken aktive samtidig.
 *
 * Cachen hydreres KUN én gang per sideinnlasting (ikke én gang per
 * hook-instans) – første instans som monteres trigger innhentingen via
 * Server Action-en getMyFavoriteRecipeIds(), og alle andre instanser
 * gjenbruker samme pågående/ferdige resultat i stedet for å spørre på
 * nytt hver for seg.
 *
 * Endringer er optimistiske: toggle() oppdaterer cachen og varsler
 * abonnentene FØR Server Action-kallet fullfører, og ruller tilbake hvis
 * kallet feiler – samme "føles umiddelbar ut"-prinsipp som resten av
 * hjerteknappene i appen (useFavorites.ts sin gjeste-variant er
 * synkron/lokal og har derfor aldri hatt dette problemet).
 */

let cache: string[] | null = null;
let inFlight: Promise<void> | null = null;
const subscribers = new Set<() => void>();

function notify() {
  for (const fn of subscribers) fn();
}

function ensureHydrated(): void {
  if (cache !== null || inFlight) return;
  inFlight = getMyFavoriteRecipeIds()
    .then((ids) => {
      cache = ids;
    })
    .catch(() => {
      // Feilet oppslag – behandle som "ingen favoritter ennå" fremfor å
      // henge fast i en evig lastetilstand. Et påfølgende toggle vil
      // uansett gjøre et ferskt forsøk via Server Action-kallet.
      cache = [];
    })
    .finally(() => {
      inFlight = null;
      notify();
    });
}

export function useAccountFavorites() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const rerender = () => forceRender((n) => n + 1);
    subscribers.add(rerender);
    ensureHydrated();
    return () => {
      subscribers.delete(rerender);
    };
  }, []);

  const isFavorite = useCallback((recipeId: string) => (cache ?? []).includes(recipeId), []);

  const toggle = useCallback((recipeId: string) => {
    const current = cache ?? [];
    const willFavorite = !current.includes(recipeId);
    const next = willFavorite ? [...current, recipeId] : current.filter((id) => id !== recipeId);

    cache = next;
    notify();

    toggleFavorite(recipeId, willFavorite).catch(() => {
      // Optimistisk oppdatering feilet på serveren – rull tilbake.
      cache = current;
      notify();
    });
  }, []);

  return { favoriteIds: cache ?? [], isFavorite, toggle, hydrated: cache !== null };
}
