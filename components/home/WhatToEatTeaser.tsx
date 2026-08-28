import Link from "next/link";
import { BowlIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * Liten forsideteaser for "Hva skal vi spise?" (spesifikasjon punkt 6) –
 * bevisst KUN en lenke-inngang her, ikke selve flyten (den ligger på
 * /hva-skal-vi-spise, se WhatToEatView.tsx). Samme rolige kort-stil som
 * SeasonTeaser.tsx – de to teaserne er ment å stå sammen, se app/page.tsx.
 */
export function WhatToEatTeaser({ lang }: { lang: Lang }) {
  return (
    <Link
      href="/hva-skal-vi-spise"
      className="group flex flex-col items-start gap-4 rounded-card border border-line bg-paper p-6 transition-colors hover:bg-cream-dark/40 sm:flex-row sm:items-center sm:justify-between sm:p-8"
    >
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-clay-dark">
          <BowlIcon className="h-3.5 w-3.5" />
          {t(lang, "home.whatToEatTeaser.eyebrow")}
        </p>
        <h2 className="mt-2 font-serif text-2xl text-ink sm:text-3xl">{t(lang, "home.whatToEatTeaser.heading")}</h2>
        <p className="mt-1 max-w-xl text-sm text-ink-soft">{t(lang, "home.whatToEatTeaser.body")}</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-clay px-5 py-2.5 text-sm font-medium text-cream transition-colors group-hover:bg-clay-dark">
        {t(lang, "home.whatToEatTeaser.cta")}
      </span>
    </Link>
  );
}
