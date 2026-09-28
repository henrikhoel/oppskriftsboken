"use client";

import { useRouter } from "next/navigation";
import { CookMode } from "@/components/recipe/CookMode";
import { CookModeTutorialOverlay } from "@/components/cook-mode-tutorial/CookModeTutorialOverlay";
import { getCookModeTutorialRecipe } from "@/lib/cook-mode-tutorial/demo-recipe";
import type { Lang } from "@/lib/i18n";

/**
 * (28.09.2026) Toppnivå for /cook-mode (app/cook-mode/page.tsx) – erstatter
 * den forrige "Utforsk Cook Mode"-lenken som tok deg rett inn på en
 * tilfeldig, ekte oppskrift (Henrik: "man havner inne på en random
 * oppskrift ... som kan være forvirrende"). I stedet: den EKTE CookMode.tsx
 * (ikke en forenklet kopi) åpnet med en liten, oppdiktet demo-"oppskrift"
 * (se lib/cook-mode-tutorial/demo-recipe.ts), med en guidet gjennomgang
 * (CookModeTutorialOverlay) lagt oppå som peker ut og forklarer knappene
 * étt om gangen.
 *
 * CookMode sin `onClose` (X-knappen øverst til venstre, ESC-tasten) går
 * bevisst til FORSIDEN, ikke tilbake i historikken – man kom hit via en
 * dedikert lenke, ikke en vanlig oppskriftsside, så "tilbake" har ingen
 * annen naturlig destinasjon.
 */
export function CookModeTutorial({ lang }: { lang: Lang }) {
  const router = useRouter();
  const recipe = getCookModeTutorialRecipe(lang);

  function goHome() {
    router.push("/");
  }

  function exploreRecipes() {
    router.push("/oppskrifter");
  }

  return (
    <>
      <CookMode
        recipeId={recipe.id}
        title={recipe.title}
        ingredientGroups={recipe.ingredientGroups}
        steps={recipe.steps}
        onClose={goHome}
        lang={lang}
      />
      <CookModeTutorialOverlay lang={lang} onFinish={goHome} onExplore={exploreRecipes} />
    </>
  );
}
