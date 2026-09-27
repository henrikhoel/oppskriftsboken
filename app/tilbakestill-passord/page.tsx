import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";
import { getCurrentUserFast } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { LockKeyholeIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: t(lang, "account.resetPasswordTitle") };
}

/**
 * Landingssiden e-postlenken fra "glemt passord" til slutt peker på – MEN
 * kun etter at app/auth/confirm/route.ts allerede har bekreftet lenken og
 * satt en gyldig "recovery"-sesjon (se filheaderen der). Denne siden
 * stoler derfor blindt på getCurrentUserFast(): finnes ingen bruker her,
 * var lenken ugyldig/utløpt/allerede brukt (eller siden ble besøkt
 * direkte, uten om veien om e-postlenken) – da vises en feilmelding i
 * stedet for skjemaet, ALDRI selve passord-skjemaet uten en reell sesjon.
 */
export default async function ResetPasswordPage() {
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

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-clay font-serif text-lg text-cream">
          {siteConfig.logoInitial}
        </span>
        <h1 className="font-serif text-2xl text-ink">{t(lang, "account.resetPasswordTitle")}</h1>
        <p className="mt-1.5 text-sm text-ink-soft">{siteConfig.name}</p>
      </div>
      <div className="rounded-card border border-line bg-paper p-6 shadow-card sm:p-8">
        {user ? (
          <ResetPasswordForm lang={lang} />
        ) : (
          <div className="text-center">
            <h2 className="font-serif text-lg text-ink">{t(lang, "account.resetPasswordInvalidTitle")}</h2>
            <p className="mt-2 text-sm text-ink-soft">{t(lang, "account.resetPasswordInvalidDescription")}</p>
            <div className="mt-6">
              <Button href="/glemt-passord" size="sm">
                {t(lang, "account.forgotPasswordLink")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
