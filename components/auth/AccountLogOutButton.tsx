"use client";

import { useTransition } from "react";
import { signOutAccount } from "@/lib/actions/account";
import { LogOutIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * Logger ut av en vanlig brukerkonto – speiler components/admin/
 * SignOutButton.tsx sitt oppsett, men går mot signOutAccount (redirect til
 * "/" i stedet for "/admin/login") og bruker nav.logOut fra ordboken i
 * stedet for hardkodet norsk tekst.
 */
export function AccountLogOutButton({ lang, className }: { lang: Lang; className?: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => signOutAccount())}
      aria-label={t(lang, "nav.logOut")}
      className={className ?? "flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink disabled:opacity-50"}
    >
      <LogOutIcon className="h-4 w-4" />
    </button>
  );
}
