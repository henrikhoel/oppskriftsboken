"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

/**
 * Supabase-klient for bruk i client components (f.eks. innloggingsskjema).
 * Kaster en tydelig feil dersom miljøvariablene mangler – kalles kun fra
 * steder som allerede har sjekket `isSupabaseConfigured` (typisk
 * admin/innlogging, som ikke finnes i demo-modus).
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase er ikke konfigurert. Sett NEXT_PUBLIC_SUPABASE_URL og NEXT_PUBLIC_SUPABASE_ANON_KEY i .env.local.",
    );
  }

  return createBrowserClient<Database>(url, key);
}
