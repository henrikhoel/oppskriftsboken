"use client";

import { useActionState } from "react";
import { verifySitePassword, type SiteAccessActionState } from "@/lib/actions/site-access";
import { Button } from "@/components/ui/Button";

const initialState: SiteAccessActionState = { error: null };

/**
 * Selve passordfeltet på /adgang (se app/adgang/page.tsx og proxy.ts).
 * autoComplete="current-password" på et VANLIG <input type="password">
 * inne i et ekte <form> (26.09.2026, Henrik: "ett enkelt passord er smart!
 * og at den tillater face id hadde også vært bra") – dette er bevisst IKKE
 * en egen WebAuthn/passkey-implementasjon. Safari/Chrome tilbyr selv å
 * lagre passordet i enhetens nøkkelring første gang, og spør deretter om
 * Face ID/Touch ID for å fylle det ut automatisk neste besøk – ren
 * nettleser-funksjonalitet, ingen ekstra kode her utover disse to
 * attributtene og et ordentlig <form>.
 */
export function SiteAccessForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(verifySitePassword, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="site-password" className="mb-1.5 block text-sm font-medium text-ink">
          Passord
        </label>
        <input
          id="site-password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className="w-full rounded-xl border border-line-strong bg-paper px-4 py-2.5 text-ink focus:outline-none"
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-xl bg-clay-light px-4 py-2.5 text-sm text-clay-dark">
          {state.error}
        </p>
      )}

      <Button type="submit" fullWidth disabled={isPending}>
        {isPending ? "Sjekker …" : "Fortsett"}
      </Button>
    </form>
  );
}
