import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { AdminNav } from "@/components/admin/AdminNav";
import { LockKeyholeIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";

/**
 * Server-side portvakt for hele /admin-treet. Dette er den ekte
 * sikkerhetsbarrieren – middleware.ts sjekker kun at NOEN er innlogget,
 * mens dette laget sjekker at brukeren faktisk har is_admin=true i
 * databasen. Ingen skriveoperasjon i lib/actions/ stoler på at man kom seg
 * forbi denne siden heller – de kaller alle requireAdmin() på nytt selv.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-cream-dark text-ink-faint">
          <LockKeyholeIcon className="h-8 w-8" />
        </div>
        <h1 className="font-serif text-2xl text-ink">Admin er utilgjengelig i demo-modus</h1>
        <p className="mt-3 text-ink-soft">
          Koble til et Supabase-prosjekt i .env.local for å kunne logge inn og redigere
          oppskrifter. Se README.md for full oppsett-guide.
        </p>
        <div className="mt-8">
          <Button href="/">Tilbake til forsiden</Button>
        </div>
      </div>
    );
  }

  const user = await getCurrentUser();

  // Innlogget, men ikke admin (skjer f.eks. hvis noen registrerer en konto
  // uten at du har satt is_admin=true manuelt i databasen).
  if (user && !user.isAdmin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-clay-light text-clay-dark">
          <LockKeyholeIcon className="h-8 w-8" />
        </div>
        <h1 className="font-serif text-2xl text-ink">Ingen admin-tilgang</h1>
        <p className="mt-3 text-ink-soft">
          Kontoen din ({user.email}) har ikke admin-rettigheter ennå. Sett{" "}
          <code className="rounded bg-cream-dark px-1.5 py-0.5 text-sm">is_admin = true</code> for
          denne brukeren i Supabase for å få tilgang.
        </p>
        <div className="mt-8">
          <Button href="/">Tilbake til forsiden</Button>
        </div>
      </div>
    );
  }

  // Ikke innlogget i det hele tatt – middleware skal allerede ha
  // omdirigert til /admin/login, men vi sjekker igjen her i tilfelle
  // denne layouten av en eller annen grunn nås direkte.
  if (!user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-cream-dark text-ink-faint">
          <LockKeyholeIcon className="h-8 w-8" />
        </div>
        <h1 className="font-serif text-2xl text-ink">Krever innlogging</h1>
        <p className="mt-3 text-ink-soft">Du må logge inn for å få tilgang til admin.</p>
        <div className="mt-8">
          <Button href="/admin/login">Logg inn</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-cream-dark/30">
      <AdminNav userEmail={user.email} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
