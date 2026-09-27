"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { siteConfig } from "@/lib/config";

/**
 * Registrering/innlogging/utlogging/passord-tilbakestilling for VANLIGE
 * besøkende (27.09.2026) – atskilt fra lib/actions/auth.ts, som er
 * admin-innloggingen (uendret, ikke rørt her). Samme Supabase Auth-bruk
 * under (auth.users + profiles-triggeren i 0001_init.sql), bare uten
 * is_admin-krav og med redirect tilbake dit brukeren faktisk kom fra i
 * stedet for til /admin.
 *
 * Bakgrunn: Henrik ønsket kontoer slik at favoritter, handleliste,
 * "I kjøleskapet" og "Bygg din egen meny" kan bli kontoeksklusive – se
 * prosjektnotatet "Plan: brukerkonto". Denne filen er selve
 * innloggingsgrunnmuren de fire punktene bygges videre på.
 */

export interface AccountActionState {
  error: string | null;
  /** Satt i stedet for (aldri sammen med) en redirect – for tilfeller der
   * handlingen lyktes, men brukeren skal bli værende på siden og lese en
   * beskjed (f.eks. "sjekk e-posten din"), ikke sendes videre. */
  info?: string | null;
}

const DEMO_MODE_ERROR = "Kontoer er utilgjengelig i demo-modus. Koble til et Supabase-prosjekt i .env.local.";

/**
 * Kun relative stier tillatt for `next`-parameteren – må starte med ETT
 * skråstrek, ikke to ("//evil.com" tolkes av nettlesere som
 * protokoll-relativt og ville sendt brukeren videre til en ekstern side).
 * Hindrer at next-parameteren kan misbrukes til en åpen omdirigering.
 */
function safeNextPath(value: FormDataEntryValue | null): string {
  const path = String(value ?? "/");
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

export async function signUp(
  _prevState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  if (!isSupabaseConfigured) return { error: DEMO_MODE_ERROR };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const next = safeNextPath(formData.get("next"));

  if (!email || !password) {
    return { error: "Fyll ut både e-post og passord." };
  }
  if (password.length < 8) {
    return { error: "Passordet må være minst 8 tegn." };
  }
  if (password !== confirmPassword) {
    return { error: "Passordene er ikke like." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Se app/auth/confirm/route.ts – bekreftelseslenken i e-posten må pekes
    // dit fra Supabase-dashbordets "Confirm signup"-e-postmal (README.md har
    // nøyaktig oppskrift). Denne opsjonen alene sender IKKE lenken dit;
    // malen i dashbordet avgjør faktisk URL, dette er kun et forslag
    // Supabase gjør tilgjengelig som {{ .RedirectTo }} i malen.
    options: { emailRedirectTo: `${siteConfig.url}/auth/confirm` },
  });

  if (error) {
    // Supabase sin egen feilmelding for en e-post som allerede har konto
    // er engelsk og ganske teknisk ("User already registered") – oversatt
    // og gjort litt mer hjelpsom her.
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "Denne e-postadressen har allerede en konto. Prøv å logge inn i stedet." };
    }
    return { error: "Kunne ikke opprette konto. Prøv igjen." };
  }

  // Om Supabase-prosjektet krever e-postbekreftelse før innlogging (styres
  // fra Supabase-dashbordet, ikke herfra) kommer IKKE data.session med det
  // samme – brukeren må da klikke bekreftelseslenken i e-posten først. Er
  // bekreftelse avslått i dashbordet, er brukeren allerede innlogget og kan
  // sendes videre direkte.
  if (!data.session) {
    return {
      error: null,
      info: "Sjekk e-posten din – vi har sendt deg en bekreftelseslenke for å fullføre registreringen.",
    };
  }

  redirect(next);
}

export async function signInAccount(
  _prevState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  if (!isSupabaseConfigured) return { error: DEMO_MODE_ERROR };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  if (!email || !password) {
    return { error: "Fyll ut både e-post og passord." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Feil e-post eller passord." };
  }

  redirect(next);
}

export async function signOutAccount() {
  if (!isSupabaseConfigured) return;
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(
  _prevState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  if (!isSupabaseConfigured) return { error: DEMO_MODE_ERROR };

  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Fyll ut e-postadressen din." };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteConfig.url}/tilbakestill-passord`,
  });

  // Bevisst ALLTID samme melding uansett om e-posten faktisk har en konto
  // hos oss eller ikke – ellers kunne skjemaet brukes til å avdekke hvilke
  // e-postadresser som er registrert (informasjonslekkasje). Supabase sitt
  // eget resetPasswordForEmail-kall gir uansett ingen feil for en ukjent
  // e-post, så vi taper ikke noe på denne forsiktigheten.
  return {
    error: null,
    info: "Om e-postadressen finnes hos oss, har vi nå sendt deg en lenke for å tilbakestille passordet.",
  };
}

export async function updatePassword(
  _prevState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  if (!isSupabaseConfigured) return { error: DEMO_MODE_ERROR };

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!password) {
    return { error: "Fyll ut et nytt passord." };
  }
  if (password.length < 8) {
    return { error: "Passordet må være minst 8 tegn." };
  }
  if (password !== confirmPassword) {
    return { error: "Passordene er ikke like." };
  }

  const supabase = await createClient();
  // Krever en gyldig "recovery"-sesjon, etablert av ResetPasswordForm.tsx
  // (klientsidig, se filheaderen der) FØR dette skjemaet i det hele tatt
  // vises – uten den sesjonen feiler kallet under med en Supabase-feil.
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "Kunne ikke oppdatere passordet. Be om en ny tilbakestillingslenke og prøv igjen." };
  }

  redirect("/");
}
