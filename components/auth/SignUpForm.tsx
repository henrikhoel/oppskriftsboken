"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AccountActionState } from "@/lib/actions/account";
import { Button } from "@/components/ui/Button";
import { t, type Lang } from "@/lib/i18n";

const initialState: AccountActionState = { error: null };

export function SignUpForm({ next, lang }: { next: string; lang: Lang }) {
  const [state, formAction, isPending] = useActionState(signUp, initialState);

  // `info` er satt (uten redirect) når registreringen lyktes, men
  // Supabase-prosjektet krever e-postbekreftelse før innlogging – se
  // filheaderen i lib/actions/account.ts. Bytter da ut hele skjemaet med
  // en enkel bekreftelse i stedet for å la brukeren prøve å sende inn på
  // nytt (kontoen finnes allerede på dette tidspunktet).
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
        {isPending ? t(lang, "account.signUpPending") : t(lang, "account.signUpButton")}
      </Button>

      <p className="text-center text-sm text-ink-soft">
        {t(lang, "account.alreadyHaveAccount")}{" "}
        <Link href={`/logg-inn?next=${encodeURIComponent(next)}`} className="font-medium text-clay hover:text-clay-dark">
          {t(lang, "account.loginLink")}
        </Link>
      </p>
    </form>
  );
}
