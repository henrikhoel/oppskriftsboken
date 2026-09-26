"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { requireAdmin } from "@/lib/auth";
import { SITE_ACCESS_COOKIE, createSiteAccessToken } from "@/lib/site-access/token";

/**
 * Handlingene bak fellespassordet for hele nettstedet (26.09.2026) – se
 * filheaderen i proxy.ts og supabase/migrations/0019_site_access_password.sql
 * for hele bildet. To helt separate ting her, ikke å forveksle med
 * lib/actions/auth.ts sin admin-innlogging: dette er ETT delt passord alle
 * besøkende bruker for å slippe inn på det offentlige nettstedet i det hele
 * tatt, ikke en personlig konto.
 */

export interface SiteAccessActionState {
  error: string | null;
}

/**
 * "Lås opp" fellespassord-siden (/adgang, se proxy.ts) – krever IKKE at man
 * er innlogget (besøkende har jo ingen konto her), sjekker i stedet det ene
 * delte passordet mot databasen via verify_site_password (SECURITY DEFINER
 * RPC – se migrasjonen for hvorfor det er en RPC og ikke et rått
 * tabelloppslag). Selve hashen forlater aldri databasen.
 */
export async function verifySitePassword(
  _prevState: SiteAccessActionState,
  formData: FormData,
): Promise<SiteAccessActionState> {
  if (!isSupabaseConfigured) {
    return { error: "Ikke konfigurert ennå. Se README.md." };
  }

  const password = String(formData.get("password") ?? "");
  if (!password) {
    return { error: "Skriv inn passordet." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_site_password", { candidate: password });

  if (error || data !== true) {
    return { error: "Feil passord." };
  }

  const cookieStore = await cookies();
  cookieStore.set(SITE_ACCESS_COOKIE, await createSiteAccessToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Ett år – "husk meg"-varighet var eksplisitt ønsket (Henrik, 26.09.2026:
    // "ett enkelt passord er smart"), pluss at nettleserens egen lagrede
    // passord+Face ID/Touch ID-autofyll (se autoComplete på passordfeltet i
    // components/SiteAccessForm.tsx) uansett gjør en eventuell ny
    // innlogging rask selv om denne cookien skulle utløpe eller bli slettet.
    maxAge: 60 * 60 * 24 * 365,
  });

  // Kun relative stier innenfor egen side (aldri en ekstern URL som skulle
  // ha sneket seg inn i ?next=, som ellers kunne blitt en åpen redirect).
  const nextPath = String(formData.get("next") ?? "/");
  redirect(nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/");
}

export interface UpdateSitePasswordState {
  error: string | null;
  success: boolean;
}

/**
 * Admin bytter fellespassordet fra /admin/innstillinger (26.09.2026, Henrik:
 * "det må også være noe admin skal kunne fikse senere") – dobbelt håndhevet:
 * requireAdmin() her OG is_admin()-sjekken INNI selve set_site_password i
 * databasen (se migrasjonen), i tråd med prosjektets vanlige
 * "RLS/DB håndhever alltid tilgangen til slutt"-prinsipp (se filheaderen til
 * getCurrentUserFast i lib/auth.ts). Endrer KUN selve passordet – gjør
 * bevisst ingenting med allerede utstedte site_access-cookies (se
 * filheaderen i lib/site-access/token.ts for hvorfor det er trygt: cookien
 * signeres med en egen, separat hemmelighet, ikke passordet selv).
 */
export async function updateSitePassword(
  _prevState: UpdateSitePasswordState,
  formData: FormData,
): Promise<UpdateSitePasswordState> {
  await requireAdmin();

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 4) {
    return { error: "Passordet må være på minst 4 tegn.", success: false };
  }
  if (password !== confirmPassword) {
    return { error: "De to feltene er ikke like.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_site_password", { new_password: password });

  if (error) {
    return { error: "Klarte ikke å bytte passordet. Prøv igjen.", success: false };
  }

  return { error: null, success: true };
}
