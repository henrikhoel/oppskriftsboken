"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { siteConfig } from "@/lib/config";
import { loginToDsvdv } from "@/lib/actions/dsvdv";

/**
 * Innloggingsskjemaet for DSVDV. Bevisst norsk-only, ingen t(lang, ...) –
 * dette er en liten, intern easter egg-del for norske kolleger, ikke en
 * del av CONVITEs vanlige, tospråklige opplevelse (se filheaderen i
 * lib/dsvdv/session.ts for hele bakgrunnen).
 *
 * "Ingen unødvendige bokser eller vanlig login-dashboard-estetikk" – derfor
 * IKKE samme `rounded-card border bg-paper p-6 shadow-card`-panel som
 * components/auth/LoginForm.tsx sin vanlige innloggingsside pakkes inn i;
 * feltet og knappen flyter fritt på den mørke bakgrunnen i stedet.
 *
 * Etter vellykket innlogging: `router.refresh()`, ikke en omdirigering.
 * app/dsvdv/page.tsx (Server Component) sjekker sesjonen ved hver rendring
 * og viser enten dette skjemaet eller selve Jobbmat-hub-en – et refresh er
 * nok til at den nysatte cookien plukkes opp og riktig innhold vises på
 * samme URL, uten et synlig, unødvendig mellomsteg.
 */
export function DsvdvLoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await loginToDsvdv(password);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? "Feil passord.");
      }
    });
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-xs text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-clay font-serif text-base text-cream">
          {siteConfig.logoInitial}
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.35em] text-clay">DSVDV</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <label htmlFor="dsvdv-password" className="sr-only">
            Passord
          </label>
          <input
            id="dsvdv-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="off"
            // text-base (16px), ikke text-sm – samme iOS Safari-begrunnelse
            // som resten av sidens søke-/tekstfelt (se f.eks. SearchBar.tsx).
            className="w-full rounded-full border border-line-strong bg-ink px-5 py-3 text-center text-base text-cream placeholder:text-cream/40 focus:border-clay/50 focus:outline-none"
            placeholder="Passord"
          />

          {error && <p className="text-xs text-clay-dark">{error}</p>}

          <button
            type="submit"
            disabled={isPending || !password}
            className="w-full rounded-full bg-clay px-5 py-3 text-sm font-medium text-cream transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:bg-ink-faint"
          >
            {isPending ? "…" : "Kom inn"}
          </button>
        </form>
      </div>
    </div>
  );
}
