import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Anonym Supabase-klient uten avhengighet til next/headers sin cookies().
 *
 * Brukes kun i kontekster som kjører UTEN en ekte HTTP-forespørsel –
 * `generateStaticParams` og `app/sitemap.ts` – der cookies() kaster en feil
 * fordi det ikke finnes noen request å lese dem fra (se
 * https://nextjs.org/docs/messages/next-dynamic-api-wrong-context).
 *
 * Har ingen brukersesjon, så `public.is_admin()` evaluerer alltid til
 * false i RLS-policyene – det er riktig her uansett, siden både sitemap og
 * forhåndsgenererte sider kun skal inkludere offentlig, publisert innhold.
 * Vanlige sideoppslag i en ekte request skal fortsatt bruke den
 * cookie-baserte klienten i lib/supabase/server.ts.
 */
export function createStaticClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase er ikke konfigurert. Sett NEXT_PUBLIC_SUPABASE_URL og NEXT_PUBLIC_SUPABASE_ANON_KEY i .env.local.",
    );
  }

  return createSupabaseClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
