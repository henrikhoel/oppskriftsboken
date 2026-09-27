"use server";

import { verifyDsvdvPassword, setDsvdvSessionCookie } from "@/lib/dsvdv/session";

/**
 * Eneste inngangen til DSVDV-området (se filheaderen i lib/dsvdv/session.ts
 * for hele resonnementet). Server Action – ikke en Route Handler – fordi
 * dette er akkurat den typen skjema-innsending resten av appen allerede
 * bruker Server Actions til (se f.eks. lib/actions/account.ts), og fordi
 * en Server Action faktisk FÅR sette respons-cookies (i motsetning til en
 * vanlig Server Component-rendring, se samme resonnement dokumentert i
 * proxy.ts sin filheader for den ordinære innloggingsflyten).
 */
export async function loginToDsvdv(password: string): Promise<{ success: boolean; error?: string }> {
  if (!password.trim()) {
    return { success: false, error: "Skriv inn passord." };
  }

  if (!process.env.DSVDV_PASSWORD) {
    // Ikke konfigurert ennå (mangler i .env.local/Vercel) – tydelig
    // feilmelding i stedet for en forvirrende generisk "feil passord" når
    // ingen fasit i det hele tatt finnes å sammenligne mot.
    return { success: false, error: "DSVDV er ikke konfigurert ennå." };
  }

  if (!verifyDsvdvPassword(password)) {
    return { success: false, error: "Feil passord." };
  }

  await setDsvdvSessionCookie();
  return { success: true };
}
