"use client";

import { useTransition } from "react";
import { signOut } from "@/lib/actions/auth";
import { LogOutIcon } from "@/components/ui/icons";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => signOut())}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink disabled:opacity-50"
    >
      <LogOutIcon className="h-4 w-4" />
      Logg ut
    </button>
  );
}
