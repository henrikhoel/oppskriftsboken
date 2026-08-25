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
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
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
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    throw new Error("Ikke autorisert. Denne handlingen krever admin-tilgang.");
  }
  return user;
}
