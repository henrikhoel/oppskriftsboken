import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

/**
 * Bekrefter e-postlenker for BÅDE ny-registrering ("Confirm signup") og
 * "glemt passord" ("Reset Password") – samme mekanisme, kun ulik `type` i
 * URL-en. Se lib/actions/account.ts (signUp/requestPasswordReset).
 *
 * VIKTIG, manuelt oppsett i Supabase-dashbordet (README.md har full
 * oppskrift): standard-e-postmalene i Supabase bruker `{{ .ConfirmationURL }}`,
 * som peker til Supabase sin EGEN /auth/v1/verify-endepunkt og en eldre
 * flyt (token i URL-fragmentet, kun lesbart klientsidig). Denne appen
 * bruker i stedet den anbefalte server-side-flyten for @supabase/ssr:
 * e-postmalene MÅ redigeres til å lenke hit direkte med `token_hash` og
 * `type` som vanlige spørrestrenger, f.eks. (for "Reset Password"-malen):
 *
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/tilbakestill-passord
 *
 * og tilsvarende for "Confirm signup"-malen med `type=signup` og
 * `next=/` (eller utelatt – default under er allerede "/").
 *
 * `verifyOtp` kjører mot samme Supabase-klient som resten av appen
 * (lib/supabase/server.ts) – lykkes den, er sesjons-cookien satt FØR
 * redirect(next) pushes videre, så f.eks. /tilbakestill-passord kan stole
 * blindt på at brukeren allerede er innlogget når den rendres.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (isSupabaseConfigured && tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      redirect(next);
    }
  }

  // Ugyldig, allerede brukt, eller utløpt lenke (Supabase sine
  // bekreftelseslenker gjelder i et begrenset tidsrom) – tilbake til
  // "glemt passord"-siden med en feilbeskjed fremfor en egen, separat
  // feilside. Fanger også opp `type=recovery`-lenker spesifikt siden det
  // er den desidert vanligste årsaken til at noen havner her; fungerer
  // like fint for en utløpt registreringslenke (brukeren kan da bare
  // registrere seg på nytt fra /registrer).
  redirect("/glemt-passord?feil=utlopt");
}
