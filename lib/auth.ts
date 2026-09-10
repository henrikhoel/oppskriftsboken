import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string | null;
  isAdmin: boolean;
}

/**
 * Henter innlogget bruker + admin-status server-side. Returnerer alltid
 * `null` i demo-modus (uten Supabase), som er hvordan admin-funksjonalitet
 * skrus av inntil du har koblet til et Supabase-prosjekt.
 *
 * Pakket i Reacts `cache()` (26.08.2026, i forbindelse med "+"-admin-
 * snarveien i Header.tsx – se filheaderen der) – Header er en async
 * server-komponent i app/layout.tsx og kalles derfor på HVER side, i
 * tillegg til de sidene (f.eks. oppskriftssiden, menysiden) som allerede
 * kalte denne selv for sin egen isAdmin-prop. Uten cache() ville det blitt
 * FLERE separate Supabase-kall (auth.getUser() + et profiles-oppslag) per
 * sidevisning. cache() deduplikerer identiske kall innenfor SAMME
 * server-forespørsel – andre kall til getCurrentUser() i samme sidevisning
 * gjenbruker automatisk det første resultatet i stedet for å spørre
 * Supabase på nytt.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    isAdmin: profile?.is_admin ?? false,
  };
});

/**
 * Rask, IKKE-revaliderende variant av getCurrentUser() – for rent
 * kosmetisk bruk (10.09.2026, "treig navigasjon"-tilbakemelding).
 *
 * getUser() gjør ALLTID et ekte nettverkskall til Supabase sin auth-server
 * for å revalidere JWT-en (se filheaderen i proxy.ts for samme poeng) –
 * getSession() leser derimot kun den allerede-betrodde JWT-en lokalt fra
 * cookien, uten noe nettverkskall. Header.tsx (rendres på HVER eneste
 * side, via app/layout.tsx) kalte tidligere getCurrentUser() – altså ett
 * ekte auth-nettverkskall FØR noe som helst annet på siden i det hele tatt
 * kunne begynne å rendres, på hver eneste navigasjon på hele siden, også
 * for besøkende som aldri er logget inn.
 *
 * Trygt å bruke her fordi denne KUN styrer visning (f.eks. "+"-snarveien i
 * Header, om en rediger-knapp vises) – ingen faktisk skriveoperasjon
 * stoler på denne. Alle Server Actions som faktisk endrer noe går via
 * requireAdmin()/getCurrentUser() (den ekte, revaliderende varianten)
 * under, i tillegg til at RLS-policyene i Supabase uansett håndhever
 * tilgangen på databasenivå – en forfalsket/utløpt lokal JWT kan i verste
 * fall vise en knapp som ikke skulle vært synlig, men kan aldri faktisk
 * utføre en admin-handling.
 */
export const getCurrentUserFast = cache(async (): Promise<CurrentUser | null> => {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    isAdmin: profile?.is_admin ?? false,
  };
});

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    throw new Error("Ikke autorisert. Denne handlingen krever admin-tilgang.");
  }
  return user;
}
