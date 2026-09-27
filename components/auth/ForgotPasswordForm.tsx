"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type AccountActionState } from "@/lib/actions/account";
import { Button } from "@/components/ui/Button";
import { t, type Lang } from "@/lib/i18n";

const initialState: AccountActionState = { error: null };

export function ForgotPasswordForm({ lang, expiredLinkError }: { lang: Lang; expiredLinkError: boolean }) {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState);

  // Bevisst ALDRI redirect ved suksess (i motsetning til innlogging/
  // registrering) – `info` erstatter skjemaet med en bekreftelse, se
  // filheaderen i lib/actions/account.ts for hvorfor meldingen er lik
  // uansett om e-posten faktisk har konto hos oss.
  if (state.info) {
    return (
      <div className="text-center">
        <h2 className="font-serif text-xl text-ink">{t(lang, "account.checkYourEmailTitle")}</h2>
        <p className="mt-2 text-sm text-ink-soft">{state.info}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-ink-soft">{t(lang, "account.forgotPasswordIntro")}</p>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
          {t(lang, "account.emailLabel")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className="w-full rounded-xl border border-line-strong bg-paper px-4 py-2.5 text-ink focus:outline-none"
        />
      </div>

      {(state.error || expiredLinkError) && (
        <p role="alert" className="rounded-xl bg-clay-light px-4 py-2.5 text-sm text-clay-dark">
          {state.error ?? t(lang, "account.resetLinkExpiredError")}
        </p>
      )}

      <Button type="submit" fullWidth disabled={isPending}>
        {isPending ? t(lang, "account.forgotPasswordPending") : t(lang, "account.forgotPasswordButton")}
      </Button>

      <p className="text-center text-sm text-ink-soft">
        <Link href="/logg-inn" className="font-medium text-clay hover:text-clay-dark">
          {t(lang, "account.backToLogin")}
        </Link>
      </p>
    </form>
  );
}
