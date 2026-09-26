"use client";

import { useActionState } from "react";
import { updateSitePassword, type UpdateSitePasswordState } from "@/lib/actions/site-access";
import { Button } from "@/components/ui/Button";

const initialState: UpdateSitePasswordState = { error: null, success: false };

/**
 * Bytt fellespassordet for hele nettstedet (26.09.2026) – se
 * app/admin/(dashboard)/innstillinger/page.tsx og filheaderen til
 * updateSitePassword i lib/actions/site-access.ts. Endrer KUN selve
 * passordet – kaster IKKE ut besøkende som allerede er logget inn andre
 * steder (se filheaderen i lib/site-access/token.ts).
 */
export function SitePasswordForm() {
  const [state, formAction, isPending] = useActionState(updateSitePassword, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="new-site-password" className="mb-1.5 block text-sm font-medium text-ink">
          Nytt passord
        </label>
        <input
          id="new-site-password"
          name="password"
          type="password"
          required
          minLength={4}
          autoComplete="new-password"
          className="w-full rounded-xl border border-line-strong bg-paper px-4 py-2.5 text-ink focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="confirm-site-password" className="mb-1.5 block text-sm font-medium text-ink">
          Gjenta nytt passord
        </label>
        <input
          id="confirm-site-password"
          name="confirmPassword"
          type="password"
          required
          minLength={4}
          autoComplete="new-password"
          className="w-full rounded-xl border border-line-strong bg-paper px-4 py-2.5 text-ink focus:outline-none"
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-xl bg-clay-light px-4 py-2.5 text-sm text-clay-dark">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-xl bg-cream-dark px-4 py-2.5 text-sm text-ink">
          Passordet er byttet. Besøkende som allerede er logget inn beholder tilgangen sin – kun nye
          innlogginger bruker det nye passordet.
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Bytter …" : "Bytt passord"}
      </Button>
    </form>
  );
}
