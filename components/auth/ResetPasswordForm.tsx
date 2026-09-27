"use client";

import { useActionState } from "react";
import { updatePassword, type AccountActionState } from "@/lib/actions/account";
import { Button } from "@/components/ui/Button";
import { t, type Lang } from "@/lib/i18n";

const initialState: AccountActionState = { error: null };

/**
 * Vises KUN når app/tilbakestill-passord/page.tsx allerede har bekreftet
 * at brukeren har en gyldig "recovery"-sesjon (etablert av
 * app/auth/confirm/route.ts idet e-postlenken ble klikket) – se
 * filheaderen der. Selve skjemaet trenger derfor ingen egen
 * token-håndtering, kun et nytt passord.
 */
export function ResetPasswordForm({ lang }: { lang: Lang }) {
  const [state, formAction, isPending] = useActionState(updatePassword, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
          {t(lang, "account.newPasswordLabel")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-xl border border-line-strong bg-paper px-4 py-2.5 text-ink focus:outline-none"
        />
        <p className="mt-1.5 text-xs text-ink-faint">{t(lang, "account.passwordMinLengthHint")}</p>
      </div>
      <div>
        <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-ink">
          {t(lang, "account.confirmPasswordLabel")}
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-xl border border-line-strong bg-paper px-4 py-2.5 text-ink focus:outline-none"
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-xl bg-clay-light px-4 py-2.5 text-sm text-clay-dark">
          {state.error}
        </p>
      )}

      <Button type="submit" fullWidth disabled={isPending}>
        {isPending ? t(lang, "account.resetPasswordPending") : t(lang, "account.resetPasswordButton")}
      </Button>
    </form>
  );
}
