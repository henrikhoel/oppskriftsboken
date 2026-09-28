"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useSavedWeeklyMenus, type SavedWeeklyMenu } from "@/lib/hooks/useSavedWeeklyMenus";
import { stashActiveWeeklyMenu } from "@/lib/hooks/useActiveWeeklyMenu";
import { VARIED_CHOICE } from "@/lib/kitchen-intelligence/weekly-menu-styles";
import { localizedTitle } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import { t, type Lang, type DictKey } from "@/lib/i18n";
import type { SearchableRecipe } from "@/lib/utils/search";

/**
 * "Se lagrede ukesmenyer" (28.09.2026) – speiler SavedMealsList.tsx
 * (samme "/mine-menyer"-mønster) for ukesmenyen, se filheaderen i
 * lib/hooks/useSavedWeeklyMenus.ts for hele bakgrunnen/resonnementet.
 *
 * Til forskjell fra SavedMealsList.tsx trengs INGEN egen
 * <SavedWeeklyMenuCard>-underkomponent med sin egen hook per rad – en
 * lagret ukesmeny er et ferdig, ikke-videre-redigerbart øyeblikksbilde
 * (ingen egen localStorage-nøkkel per uke, se filheaderen i
 * useSavedWeeklyMenus.ts), så all data ligger allerede i selve
 * `saved`-lista fra ÉN useSavedWeeklyMenus()-kall.
 */
export function SavedWeeklyMenusList({ recipes, lang }: { recipes: SearchableRecipe[]; lang: Lang }) {
  const { saved, hydrated, removeMenu } = useSavedWeeklyMenus();
  const router = useRouter();
  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  function handleUseAgain(menu: SavedWeeklyMenu) {
    // Samme ett-skudds "returøyeblikksbilde"-mekanisme som "tilbake til
    // ukesmenyen" fra en oppskrift (se filheaderen i
    // useActiveWeeklyMenu.ts) – stashActiveWeeklyMenu() skriver, og
    // WeeklyMenuView.tsx leser OG SLETTER med det samme ved sin egen mount
    // rett etter navigeringen under.
    stashActiveWeeklyMenu({ style: menu.style, recipeIds: menu.recipeIds });
    router.push("/ukesmeny");
  }

  let dateFormatter: Intl.DateTimeFormat | null = null;
  try {
    dateFormatter = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "nb-NO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    dateFormatter = null;
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink sm:text-4xl">{t(lang, "savedWeeklyMenusPage.heading")}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t(lang, "savedWeeklyMenusPage.intro")}</p>

      {!hydrated ? (
        <div className="mt-8 h-24 animate-pulse rounded-card bg-cream-dark/60" />
      ) : saved.length === 0 ? (
        <div className="mt-8 rounded-card border border-line bg-cream-dark/40 p-6 text-center">
          <p className="text-sm text-ink-faint">{t(lang, "savedWeeklyMenusPage.empty")}</p>
          <div className="mt-4">
            <Button href="/ukesmeny" variant="primary" size="sm">
              {t(lang, "weeklyMenu.title")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {saved.map((menu) => {
            const styleLabel =
              menu.style === VARIED_CHOICE
                ? t(lang, "weeklyMenu.style.variert")
                : t(lang, `weeklyMenu.style.${menu.style}` as DictKey);
            const dishSummary = menu.recipeIds
              .map((id) => byId.get(id))
              .filter((r): r is SearchableRecipe => Boolean(r))
              .map((r) => localizedTitle(r, lang))
              .join(" · ");
            let dateLabel = menu.savedAt;
            try {
              if (dateFormatter) dateLabel = dateFormatter.format(new Date(menu.savedAt));
            } catch {
              // behold ISO-strengen som fallback
            }

            return (
              <div key={menu.id} className="rounded-card border border-line bg-paper p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => handleUseAgain(menu)}
                      className="text-left font-serif text-lg text-ink transition-colors hover:text-clay-dark"
                    >
                      {styleLabel}
                    </button>
                    <p className="mt-1.5 text-xs text-ink-faint">
                      {dishSummary || t(lang, "savedWeeklyMenusPage.noDishes")}
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">{dateLabel}</p>
                    <button
                      type="button"
                      onClick={() => handleUseAgain(menu)}
                      className="mt-2 text-xs font-medium text-clay underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
                    >
                      {t(lang, "savedWeeklyMenusPage.useAgain")}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMenu(menu.id)}
                    className="shrink-0 text-xs font-medium text-ink-soft underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
                  >
                    {t(lang, "savedWeeklyMenusPage.removeButton")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
