"use client";

import { useState } from "react";
import Link from "next/link";
import { CookModeTutorial } from "@/components/cook-mode-tutorial/CookModeTutorial";
import { t, type Lang } from "@/lib/i18n";

/**
 * (29.09.2026) Klient-skallet rundt /cook-mode ("Utforsk Cook Mode"-lenken)
 * – flyttet hit fra selve app/cook-mode/page.tsx fordi det nå trengs LOKAL
 * state (se `showAnyway` under), som en async server-komponent ikke kan ha.
 *
 * Henrik, 29.09.2026, om hva som skal skje her for en bruker som allerede
 * har huket av "ikke vis igjen" på en ekte oppskrift (se
 * profiles.cook_mode_tutorial_completed): "da må det naturligvis ikke stå
 * 'utforsk oppskrifter' på slutten ... går man inn via 'utforsk cook mode'
 * står det at man allerede har fullført tutorial og at man kan utforske
 * oppskrifter" – presisert rett etterpå: "på 'utforsk cook mode' må man
 * likevel ha muligheten til å se den igjen dersom man ønsker det." Altså:
 * IKKE bare en melding – en "vis den på nytt"-knapp må også finnes.
 * `showAnyway` er nettopp den knappens state; `alreadyCompleted` (fra
 * profilen, lest server-side i page.tsx) styrer bare startverdien på
 * HVILKEN av de to (melding vs. selve tutorialen) som vises av default.
 */
export function CookModeTutorialEntry({ lang, alreadyCompleted }: { lang: Lang; alreadyCompleted: boolean }) {
  const [showAnyway, setShowAnyway] = useState(false);

  if (alreadyCompleted && !showAnyway) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-clay/15 bg-cream px-9 py-10 text-center shadow-card-hover sm:px-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-clay">
            {t(lang, "home.cookMode.eyebrow")}
          </p>
          <p className="mt-3 text-balance font-serif text-2xl leading-snug text-ink sm:text-3xl">
            {t(lang, "cookModeTutorial.alreadyCompletedTitle")}
          </p>
          <p className="mx-auto mt-3 max-w-sm text-pretty text-sm text-ink-soft sm:text-base">
            {t(lang, "cookModeTutorial.alreadyCompletedBody")}
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
            <button
              type="button"
              onClick={() => setShowAnyway(true)}
              className="text-xs font-medium text-ink-faint transition-colors hover:text-clay-dark"
            >
              {t(lang, "cookModeTutorial.watchAgain")}
            </button>
            <Link
              href="/oppskrifter"
              className="rounded-full bg-clay px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-clay-dark"
            >
              {t(lang, "cookModeTutorial.exploreRecipes")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <CookModeTutorial lang={lang} mode="demo" />;
}
