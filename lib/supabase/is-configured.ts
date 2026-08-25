/**
 * Sentral sjekk for om Supabase er satt opp. Brukes av lib/data/* til å
 * falle tilbake til eksempeldata (lib/demo-data) i stedet for å krasje når
 * noen kjører prosjektet lokalt før .env.local er fylt ut, og av UI-et til
 * å vise en tydelig "demo-modus"-beskjed.
 */
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
