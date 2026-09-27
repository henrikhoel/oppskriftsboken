"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAccount, type AccountActionState } from "@/lib/actions/account";
import { Button } from "@/components/ui/Button";
import { t, type Lang } from "@/lib/i18n";

const initialState: AccountActionState = { error: null };

/**
 * Innlogging for VANLIGE brukere – se lib/actions/account.ts sin
 * filheader. Speiler components/admin/LoginForm.tsx sitt oppsett bevisst
 * (samme felt/klasser), men egen fil siden de går mot ulike Server
 * Actions med ulik redirect-oppførsel.
 */
export function LoginForm({ next, lang }: { next: string; lang: Lang }) {
  const [state, formAction, isPending] = useActionState(signInAccount, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
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
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
          {t(lang, "account.passwordLabel")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-xl border border-line-strong bg-paper px-4 py-2.5 text-ink focus:outline-none"
        />
        <Link href="/glemt-passord" className="mt-1.5 inline-block text-sm text-ink-faint hover:text-ink">
          {t(lang, "account.forgotPasswordLink")}
        </Link>
      </div>

      {state.error && (
        <p role="alert" className="rounded-xl bg-clay-light px-4 py-2.5 text-sm text-clay-dark">
          {state.error}
        </p>
      )}

      <Button type="submit" fullWidth disabled={isPending}>
        {isPending ? t(lang, "account.loginPending") : t(lang, "account.loginButton")}
      </Button>

      <p className="text-center text-sm text-ink-soft">
        {t(lang, "account.noAccountYet")}{" "}
        <Link href={`/registrer?next=${encodeURIComponent(next)}`} className="font-medium text-clay hover:text-clay-dark">
          {t(lang, "account.signUpLink")}
        </Link>
      </p>
    </form>
  );
}
