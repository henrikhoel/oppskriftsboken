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

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    throw new Error("Ikke autorisert. Denne handlingen krever admin-tilgang.");
  }
  return user;
}
