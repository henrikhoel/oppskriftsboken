"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { setLangAction } from "@/lib/actions/lang";
import { t, type Lang } from "@/lib/i18n";

/** NO/EN-bryter i hovednavigasjonen. Setter lang-cookien via en Server
 * Action, og laster siden på nytt (router.refresh) slik at alle
 * Server Components rendres med det nye språket – ingen full
 * side-reload, kun en RSC-refetch. */
export function LanguageSwitcher({ lang, className }: { lang: Lang; className?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function choose(next: Lang) {
    if (next === lang || isPending) return;
    startTransition(async () => {
      await setLangAction(next);
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label={t(lang, "nav.language")}
      className={clsx(
        "flex items-center gap-0.5 rounded-full border border-line-strong bg-paper p-0.5 text-xs font-semibold",
        isPending && "opacity-60",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => choose("no")}
        aria-pressed={lang === "no"}
        className={clsx(
          "rounded-full px-2.5 py-1.5 transition-colors",
          lang === "no" ? "bg-ink text-cream" : "text-ink-soft hover:bg-cream-dark",
        )}
      >
        NO
      </button>
      <button
        type="button"
        onClick={() => choose("en")}
        aria-pressed={lang === "en"}
        className={clsx(
          "rounded-full px-2.5 py-1.5 transition-colors",
          lang === "en" ? "bg-ink text-cream" : "text-ink-soft hover:bg-cream-dark",
        )}
      >
        EN
      </button>
    </div>
  );
}
