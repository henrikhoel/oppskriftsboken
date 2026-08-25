import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { siteConfig } from "@/lib/config";
import { LoginForm } from "@/components/admin/LoginForm";
import { LockKeyholeIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Logg inn",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-cream-dark text-ink-faint">
          <LockKeyholeIcon className="h-8 w-8" />
        </div>
        <h1 className="font-serif text-2xl text-ink">Admin er utilgjengelig i demo-modus</h1>
        <p className="mt-3 text-ink-soft">
          Koble til et Supabase-prosjekt i .env.local for å kunne logge inn. Se README.md.
        </p>
        <div className="mt-8">
          <Button href="/">Tilbake til forsiden</Button>
        </div>
      </div>
    );
  }

  const user = await getCurrentUser();
  if (user?.isAdmin) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-clay font-serif text-lg text-cream">
          {siteConfig.logoInitial}
        </span>
        <h1 className="font-serif text-2xl text-ink">Logg inn på admin</h1>
        <p className="mt-1.5 text-sm text-ink-soft">{siteConfig.name}</p>
      </div>
      <div className="rounded-card border border-line bg-paper p-6 shadow-card sm:p-8">
        <LoginForm next={next ?? "/admin"} />
      </div>
    </div>
  );
}
