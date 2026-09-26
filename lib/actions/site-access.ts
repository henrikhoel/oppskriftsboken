"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Handlingen bak fellespassordet for hele nettstedet (26.09.2026) – se
 * filheaderen i proxy.ts og supabase/migrations/0019_site_access_password.sql
 * for hele bildet. Ikke å forveksle med lib/actions/auth.ts sin
 * admin-innlogging: dette er ETT delt passord alle besøkende bruker for å
 * slippe inn på det offentlige nettstedet i det hele tatt, ikke en
 * personlig konto.
 *
 * Selve verifiseringen av passordet (som besøkende taster inn på /adgang)
 * skjer IKKE lenger her som en Server Action – se app/api/adgang/route.ts
 * for hvorfor (26.09.2026, Henrik: "jeg får ikke opp muligheten til å lagre
 * passordet eller face id på telefon" – en Server Action sendes som et
 * usynlig fetch-kall når JavaScript er lastet, og blir dermed ALDRI fanget
 * opp av nettleserens "lagre passord?"/Face ID-tilbud, i motsetning til en
 * ordentlig skjema-innsending). Denne filen har derfor kun igjen
 * admin-siden av fellespassordet: selve BYTTET av det.
 */

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
