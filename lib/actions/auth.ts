"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export interface AuthActionState {
  error: string | null;
}

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase er ikke konfigurert. Admin er utilgjengelig i demo-modus." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Fyll ut både e-post og passord." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Feil e-post eller passord." };
  }

  const nextPath = String(formData.get("next") ?? "/admin");
  redirect(nextPath.startsWith("/admin") ? nextPath : "/admin");
}

export async function signOut() {
  if (!isSupabaseConfigured) return;
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
