import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserFast } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { siteConfig } from "@/lib/config";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { LockKeyholeIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: t(lang, "account.signUpTitle") };
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const lang = await getLang();

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-cream-dark text-ink-faint">
          <LockKeyholeIcon className="h-8 w-8" />
        </div>
        <h1 className="font-serif text-2xl text-ink">{t(lang, "account.demoModeTitle")}</h1>
        <p className="mt-3 text-ink-soft">{t(lang, "account.demoModeDescription")}</p>
        <div className="mt-8">
          <Button href="/">{t(lang, "account.backToHome")}</Button>
        </div>
      </div>
    );
  }

  const user = await getCurrentUserFast();
  if (user) {
    redirect(next ?? "/");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-clay font-serif text-lg text-cream">
          {siteConfig.logoInitial}
        </span>
        <h1 className="font-serif text-2xl text-ink">{t(lang, "account.signUpTitle")}</h1>
        <p className="mt-1.5 text-sm text-ink-soft">{siteConfig.name}</p>
      </div>
      <p className="mb-6 text-center text-sm text-ink-soft">{t(lang, "account.signUpIntro")}</p>
      <div className="rounded-card border border-line bg-paper p-6 shadow-card sm:p-8">
        <SignUpForm next={next ?? "/"} lang={lang} />
      </div>
    </div>
  );
}
