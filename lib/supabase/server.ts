import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

/**
 * Supabase-klient for bruk i Server Components, Server Actions og Route
 * Handlers. Leser/skriver auth-cookies via next/headers slik at
 * innloggingssesjonen henger sammen på tvers av navigasjon.
 *
 * `setAll` kan feile når den kalles fra en ren Server Component (de kan
 * ikke sette cookies) – det er trygt å ignorere så lenge middleware.ts
 * fornyer sesjonen på hvert kall, som er tilfellet her.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase er ikke konfigurert. Sett NEXT_PUBLIC_SUPABASE_URL og NEXT_PUBLIC_SUPABASE_ANON_KEY i .env.local.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Kalt fra en Server Component – håndteres av middleware.
        }
      },
    },
  });
}
