"use client";

import { useTransition } from "react";
import { logoutFromDsvdv } from "@/lib/actions/dsvdv";

/**
 * Den ENESTE navigasjonen synlig inne i DSVDV (Header/Footer/BottomNav er
 * skjult her, se components/layout/HideOnDsvdv.tsx) – kun en diskret "Ut"-
 * knapp øverst til høyre, vist på hub-en og alle fire kategorisidene (satt
 * opp i app/dsvdv/layout.tsx, IKKE på selve innloggingsskjermaet – der er
 * man jo ikke inne ennå).
 *
 * Samme redirect()-i-Server Action-mønster som components/auth/
 * AccountLogOutButton.tsx sin vanlige utlogging – se lib/actions/dsvdv.ts
 * (logoutFromDsvdv). Sletter sesjonscookien og sender til forsiden; et nytt
 * besøk på /dsvdv krever passordet på nytt.
 */
export function DsvdvTopBar() {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="border-b border-ink/10">
      <div className="mx-auto flex max-w-7xl items-center justify-end px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => logoutFromDsvdv())}
          className="text-xs font-medium text-ink-faint transition-colors hover:text-clay-dark disabled:opacity-50"
        >
          {isPending ? "…" : "Ut"}
        </button>
      </div>
    </div>
  );
}
