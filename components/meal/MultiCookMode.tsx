"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { getMealShoppingIngredients } from "@/lib/actions/meal-shopping-list";
import { CookMode } from "@/components/recipe/CookMode";
import type { ExistingMealCourseSlot, MealCourseRole, MealCourseSlot } from "@/lib/kitchen-intelligence";
import { scaleAmount } from "@/lib/utils/scale";
import type { IngredientGroup, RecipeStep } from "@/lib/types";
import { t, type Lang } from "@/lib/i18n";

/**
 * MULTI-OPPSKRIFT COOK MODE (Fase 5 – Experience, 5.17). Flagget som en av
 * de mest kompliserte delene av hele fasen – løsningen som er valgt her er
 * BEVISST å IKKE bygge en ny, parallell kokemodus fra bunnen, men å la
 * denne komponenten være et tynt lag rundt den eksisterende, veltestede
 * ett-oppskrift-CookMode.tsx (som allerede har tidtakere, talestyring og
 * Wake Lock): én rette-bytter-stripe øverst, og under den ligger den
 * eksisterende CookMode uendret, én rett om gangen.
 *
 * Hvorfor dette er trygt: CookMode.tsx sin interne tilstand
 * (useCookModeState/useCookModeTimers) er allerede nøkkelert på `recipeId`
 * i localStorage – se filheaderne der. Ved å montere CookMode med
 * `key={recipeId}` her tvinges React til å montere en HELT FERSK CookMode
 * (og dermed HELT FERSKE hooks) hver gang brukeren bytter rett, i stedet
 * for å gjenbruke samme instans med skiftende props – det siste ville
 * risikert ett render-bilde med FORRIGE retts avhukede steg/tidtakere vist
 * under NYE rettens overskrift, fordi useLocalStorage sin
 * nøkkel-bytte-effekt kjører étt render ETTER selve prop-endringen (se
 * useLocalStorage.ts). Prisen for denne enkelheten: talestyring/Wake Lock
 * slås av og på igjen ved hvert rettebytte (samme oppførsel som å lukke og
 * åpne Cook Mode på nytt for én oppskrift) – en bevisst, dokumentert
 * forenkling fremfor å bygge en egen, delt tidtaker-/talestyrings-kontekst
 * på tvers av retter.
 *
 * Ingen fremdriftsindikator per fane (f.eks. "3/6 steg") er bygget inn –
 * det ville krevd enten å løfte useCookModeState opp hit (et større,
 * risikabelt omskriv av en fil som allerede fungerer for enkeltoppskrifter)
 * eller en egen, parallell lesing av de samme localStorage-nøklene utenfra
 * (fare for at de to lesingene kommer i utakt). Bevisst utelatt – samme
 * "ærlig enkelt fremfor overbygget" prinsipp som resten av Fase 5.
 *
 * Ingrediensmengder skaleres til MENYENS porsjonstall per rett
 * (slot.servings, IKKE oppskriftens egen grunnporsjon) via samme
 * `scaleAmount` som RecipeInteractive.tsx og MealShoppingListSection.tsx
 * allerede bruker – konsistent skalering på tvers av hele
 * Kitchen Intelligence-fundamentet.
 *
 * Kun "existing"-retter (ekte oppskrifter) kan lages i Cook Mode –
 * "suggested"-forslag har ingen steg å vise, samme filter som
 * MealShoppingListSection/MealTimelineSection bruker. En rett uten steg i
 * det hele tatt (uvanlig, men mulig for en tynt utfylt oppskrift) hoppes
 * også stille over fra rette-bytteren, siden CookMode selv returnerer
 * `null` for en tom stegliste.
 */

interface LoadedDish {
  slotId: string;
  recipeId: string;
  role: MealCourseRole;
  title: string;
  servings: number;
  ingredientGroups: IngredientGroup[];
  steps: RecipeStep[];
}

function scaleGroups(groups: IngredientGroup[], fromServings: number, toServings: number): IngredientGroup[] {
  if (fromServings <= 0 || fromServings === toServings) return groups;
  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      amount: scaleAmount(item.amount, fromServings, toServings),
    })),
  }));
}

export function MultiCookMode({
  mealTitle,
  slots,
  onClose,
  lang,
}: {
  mealTitle: string;
  slots: MealCourseSlot[];
  onClose: () => void;
  lang: Lang;
}) {
  const [dishes, setDishes] = useState<LoadedDish[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const existingSlots = slots.filter((s): s is ExistingMealCourseSlot => s.source === "existing");

    async function load() {
      try {
        const data = await getMealShoppingIngredients(existingSlots.map((s) => s.recipeId));
        const byId = new Map(data.map((d) => [d.recipeId, d]));

        const loaded = existingSlots
          .map((slot) => {
            const recipeData = byId.get(slot.recipeId);
            if (!recipeData || recipeData.steps.length === 0) return null;
            const entry: LoadedDish = {
              slotId: slot.id,
              recipeId: slot.recipeId,
              role: slot.role,
              title: slot.title,
              servings: slot.servings,
              ingredientGroups: scaleGroups(recipeData.ingredientGroups, recipeData.baseServings, slot.servings),
              steps: recipeData.steps,
            };
            return entry;
          })
          .filter((d): d is LoadedDish => d !== null);

        if (!cancelled) {
          setDishes(loaded);
          setActiveSlotId(loaded[0]?.slotId ?? null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t(lang, "mealCookMode.error"));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-cream px-6 text-center text-ink"
      >
        <p className="text-sm text-clay-dark">{error}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-ink/20 px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5"
        >
          {t(lang, "mealCookMode.closeButton")}
        </button>
      </div>
    );
  }

  if (!dishes) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-cream text-ink"
      >
        <p className="text-sm text-ink-faint">{t(lang, "mealCookMode.loading")}</p>
      </div>
    );
  }

  if (dishes.length === 0) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-cream px-6 text-center text-ink"
      >
        <p className="text-sm text-ink-faint">{t(lang, "mealCookMode.noCookableDishes")}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-ink/20 px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5"
        >
          {t(lang, "mealCookMode.closeButton")}
        </button>
      </div>
    );
  }

  const activeDish = dishes.find((d) => d.slotId === activeSlotId) ?? dishes[0];

  const switcher = dishes.length > 1 && (
    <div
      role="tablist"
      aria-label={t(lang, "mealCookMode.switcherAria")}
      className="flex gap-2 overflow-x-auto border-b border-ink/10 px-4 py-2.5 sm:px-6"
    >
      {dishes.map((dish) => (
        <button
          key={dish.slotId}
          type="button"
          role="tab"
          aria-selected={dish.slotId === activeDish.slotId}
          onClick={() => setActiveSlotId(dish.slotId)}
          className={clsx(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors sm:text-sm",
            dish.slotId === activeDish.slotId
              ? "border-clay bg-clay text-cream"
              : "border-ink/20 text-ink/80 hover:bg-ink/10",
          )}
        >
          {t(lang, `mealBuilder.role.${dish.role}`)} · {dish.title}
        </button>
      ))}
    </div>
  );

  return (
    <CookMode
      key={activeDish.recipeId}
      recipeId={activeDish.recipeId}
      title={`${mealTitle} · ${activeDish.title}`}
      ingredientGroups={activeDish.ingredientGroups}
      steps={activeDish.steps}
      onClose={onClose}
      lang={lang}
      headerExtra={switcher || undefined}
    />
  );
}
