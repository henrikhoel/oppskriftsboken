"use client";

import Link from "next/link";
import { useMealSession, useMealSessionIndex } from "@/lib/hooks/useMealSession";
import { sortSlotsByRole } from "@/lib/kitchen-intelligence";
import { Button } from "@/components/ui/Button";
import { t, type Lang } from "@/lib/i18n";

/**
 * "Dine menyer" (27.09.2026) – se app/mine-menyer/page.tsx sin filheader
 * for hele bakgrunnen. Leser useMealSessionIndex() (mealIds, nyeste
 * først, se filheaderen der – dette registeret fantes fra før, bygget
 * nettopp for denne oversikten, men var aldri koblet til noe UI før nå).
 *
 * Én <SavedMealCard>-instans PER meny, IKKE ett samlet useMealSession-kall
 * med en liste av id-er – Reacts hook-regler tillater ikke et varierende
 * antall hook-kall i én komponent, så hver rad må være sin egen
 * komponentinstans for å kunne kalle useMealSession(mealId, …) (som selv
 * er en localStorage-hook) trygt for akkurat DEN id-en. Samme mønster som
 * f.eks. ShoppingListBadgeCount.tsx/ShoppingListView.tsx sine uavhengige
 * useLocalStorage-instanser mot forskjellige nøkler.
 */
export function SavedMealsList({ lang }: { lang: Lang }) {
  const { mealIds, hydrated, removeFromIndex } = useMealSessionIndex();

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink sm:text-4xl">{t(lang, "savedMealsPage.heading")}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t(lang, "savedMealsPage.intro")}</p>

      {!hydrated ? (
        <div className="mt-8 h-24 animate-pulse rounded-card bg-cream-dark/60" />
      ) : mealIds.length === 0 ? (
        <div className="mt-8 rounded-card border border-line bg-cream-dark/40 p-6 text-center">
          <p className="text-sm text-ink-faint">{t(lang, "savedMealsPage.empty")}</p>
          {/* Pekte tidligere til /meny/ny ("Bygg en meny selv") – den
              manuelle menybyggeren er fjernet 03.10.2026 (Henrik: "det er
              bare overflødig når man egentlig kan gjøre det via oppskrifter
              uansett"). Menyer bygges nå kun via "Gjør det til en kveld" på
              den enkelte oppskriftssiden, så CTA-en herfra peker i stedet
              til /oppskrifter – naturlig startpunkt for å finne en rett å
              bygge videre fra. */}
          <div className="mt-4">
            <Button href="/oppskrifter" variant="primary" size="sm">
              {t(lang, "nav.recipes")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {mealIds.map((mealId) => (
            <SavedMealCard key={mealId} mealId={mealId} lang={lang} onRemove={() => removeFromIndex(mealId)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SavedMealCard({
  mealId,
  lang,
  onRemove,
}: {
  mealId: string;
  lang: Lang;
  onRemove: () => void;
}) {
  const { session, hydrated } = useMealSession(mealId, "");

  if (!hydrated) {
    return <div className="h-24 animate-pulse rounded-card bg-cream-dark/60" />;
  }

  const slots = sortSlotsByRole(session.slots);
  const dishSummary =
    slots.length > 0
      ? slots.map((slot) => `${t(lang, `mealBuilder.role.${slot.role}`)}: ${slot.title}`).join(" · ")
      : t(lang, "savedMealsPage.noDishes");

  let dateLabel = "";
  try {
    dateLabel = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "nb-NO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(session.updatedAt));
  } catch {
    dateLabel = session.updatedAt;
  }

  return (
    <div className="rounded-card border border-line bg-paper p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/meny/${mealId}`}
            className="font-serif text-lg text-ink transition-colors hover:text-clay-dark"
          >
            {session.title || t(lang, "mealPage.metaTitle")}
          </Link>
          {session.description && <p className="mt-1 text-sm italic text-ink-soft">{session.description}</p>}
          <p className="mt-1.5 text-xs text-ink-faint">{dishSummary}</p>
          <p className="mt-1 text-xs text-ink-faint">{dateLabel}</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-xs font-medium text-ink-soft underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
        >
          {t(lang, "savedMealsPage.removeButton")}
        </button>
      </div>
    </div>
  );
}
