"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CookMode } from "@/components/recipe/CookMode";
import { CookModeTutorialOverlay } from "@/components/cook-mode-tutorial/CookModeTutorialOverlay";
import { getCookModeTutorialRecipe } from "@/lib/cook-mode-tutorial/demo-recipe";
import { setCookModeTutorialCompleted } from "@/lib/actions/cook-mode-tutorial";
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
 * `forcedStepId` (28.09.2026, redesign-runde 2) – løftet hit fra Overlay
 * via `onForcedStepChange`, og sendt videre ned til den ekte CookMode. To
 * av tutorial-stegene (selve stegteksten, og tidtaker-knappen) trenger et
 * HELT BESTEMT ekte demo-steg synlig for at det de faktisk forklarer skal
 * finnes i DOM-en – se doc-kommentaren på CookMode.tsx sin
 * `forcedStepId`-prop og TutorialStep sin `forcedRecipeStepId` i
 * CookModeTutorialOverlay.tsx for hele resonnementet.
 *
 * `mode` (29.09.2026, Henrik: "denne tutorialen også dukker opp første gang
 * man går inn via en oppskrift ... da må det naturligvis ikke stå 'utforsk
 * oppskrifter' på slutten, men at man skal starte å lage mat") – SAMME
 * komponent, samme oppdiktede demo-"oppskrift" under selve gjennomgangen
 * (kun outro-steget sin tekst/knapp endres, se
 * CookModeTutorialOverlay.tsx), men brukt to steder:
 *
 * - "demo" (default): /cook-mode ("Utforsk Cook Mode"-lenken). Både "Hopp
 *   over" og selve CookMode sin X/ESC går til forsiden; siste steg sin
 *   knapp går til /oppskrifter. Ingen avkrysning for "ikke vis igjen" – se
 *   CookModeTutorialEntry.tsx for hvordan DENNE siden i stedet håndterer et
 *   "du har allerede fullført tutorialen"-tilfelle.
 * - "recipe": lagt oppå Cook Mode på en EKTE oppskrift, første gang en
 *   innlogget bruker starter matlaging (se RecipeInteractive.tsx), inntil
 *   de eventuelt huker av for "ikke vis igjen" (dontShowAgain under). To
 *   ULIKE handlinger her, avhengig av HVOR man avslutter fra:
 *     - "Hopp over" (synlig på ethvert steg) ELLER siste steg sin
 *       "Start matlaging"-knapp → `onStartCooking`: dropper resten av
 *       omvisningen, men fortsetter likevel RETT INN i ekte matlaging av
 *       oppskriften man faktisk valgte – å hoppe over en OMVISNING skal jo
 *       ikke bety å avbryte selve matlagingen.
 *     - CookMode sin EGEN lukkeknapp (X/ESC, `data-cookmode-target="close"`)
 *       → `onExitCookMode`: lukker Cook Mode HELT (tilbake til
 *       oppskriftssiden) – dette er den eksplisitte "jeg vil ikke lage mat
 *       akkurat nå"-handlingen, ikke en del av selve omvisningen.
 *   Avkrysningen for "ikke vis igjen" lever her (ikke i Overlay) nettopp
 *   fordi begge disse to avslutningsveiene må sjekke den, ikke bare
 *   Overlay sine egne knapper – speiler forcedStepId-mønstret over
 *   (state eid av denne komponenten, Overlay er "controlled" via en
 *   onDontShowAgainChange-callback).
 */
export function CookModeTutorial({
  lang,
  mode = "demo",
  onExitCookMode,
  onStartCooking,
  initialDontShowAgain = false,
  onDontShowAgainChange,
}: {
  lang: Lang;
  mode?: "demo" | "recipe";
  /** Kun i bruk når mode="recipe" – se filheaderen over. */
  onExitCookMode?: () => void;
  /** Kun i bruk når mode="recipe" – se filheaderen over. */
  onStartCooking?: () => void;
  /**
   * (29.09.2026, Henrik, etter å ha prøvd den nye "vis tutorial igjen"-
   * knappen i CookMode.tsx sin header: "det er forvirrende at det står
   * 'ikke vis denne veiledningen igjen', for da begynner man å lure på om
   * den glemmer at man har huket av på det fordi man trykker på symbolet")
   * – avkrysningen startet ALLTID uhuket ved hver ny visning, selv for en
   * bruker som allerede HAR huket av fra før (profiles.cook_mode_
   * tutorial_completed = true) og bare åpner tutorialen på nytt for å se
   * den, uten noen intensjon om å endre valget sitt. Boksen skal i stedet
   * gjenspeile det FAKTISKE, allerede lagrede valget med én gang – satt av
   * RecipeInteractive.tsx til samme (lokalt speilede, se
   * onDontShowAgainChange under) `hasCompletedCookModeTutorial`-verdi som
   * styrer om tutorialen vises automatisk i utgangspunktet. Uendret
   * (false) i mode="demo", der avkrysningen uansett ikke finnes.
   */
  initialDontShowAgain?: boolean;
  /**
   * (29.09.2026, samme tilbakemelding som over: "man kan jo angre
   * liksom") – siden boksen nå åpnes FORHÅNDSHUKET for en bruker som
   * allerede har valgt "ikke vis igjen", må den også kunne HUKES AV igjen
   * med faktisk effekt, ikke bare fremstå som avkrysningsbar. Kalt med
   * siste `dontShowAgain`-verdi idet tutorialen avsluttes (uansett hvilken
   * av de to avslutningsveiene, se filheaderen), slik at
   * RecipeInteractive.tsx kan oppdatere sin egen speilede state med én
   * gang – ellers ville en ny åpning via CookMode sin "?"-knapp, SENERE i
   * samme sidevisning, vist en utdatert (opprinnelig innlastet) verdi i
   * stedet for det brukeren nettopp faktisk valgte. Kun i bruk i
   * mode="recipe".
   */
  onDontShowAgainChange?: (value: boolean) => void;
}) {
  const router = useRouter();
  const recipe = getCookModeTutorialRecipe(lang);
  const [forcedStepId, setForcedStepId] = useState<string | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(initialDontShowAgain);

  function goHome() {
    router.push("/");
  }

  function exploreRecipes() {
    router.push("/oppskrifter");
  }

  async function syncDontShowAgain() {
    if (mode !== "recipe") return;
    onDontShowAgainChange?.(dontShowAgain);
    if (dontShowAgain === initialDontShowAgain) return; // urørt av brukeren, ingenting å skrive
    try {
      await setCookModeTutorialCompleted(dontShowAgain);
    } catch (error) {
      // Stille feil, bevisst: brukeren skal uansett komme videre til
      // matlagingen (eller ut av Cook Mode) selv om selve LAGRINGEN av
      // preferansen feiler – i verste fall er valget ikke husket til neste
      // gang, ikke noe som bør blokkere det man faktisk holder på med nå.
      console.error("Kunne ikke lagre Cook Mode-tutorial-preferansen:", error);
    }
  }

  async function handleStartCooking() {
    await syncDontShowAgain();
    onStartCooking?.();
  }

  async function handleExitCookMode() {
    await syncDontShowAgain();
    onExitCookMode?.();
  }

  const overlayFinish = mode === "recipe" ? handleStartCooking : goHome;
  const overlayExplore = mode === "recipe" ? handleStartCooking : exploreRecipes;
  const cookModeClose = mode === "recipe" ? handleExitCookMode : goHome;

  return (
    <>
      <CookMode
        recipeId={recipe.id}
        title={recipe.title}
        ingredientGroups={recipe.ingredientGroups}
        steps={recipe.steps}
        onClose={cookModeClose}
        lang={lang}
        forcedStepId={forcedStepId}
      />
      <CookModeTutorialOverlay
        lang={lang}
        mode={mode}
        onFinish={overlayFinish}
        onExplore={overlayExplore}
        onForcedStepChange={setForcedStepId}
        dontShowAgain={dontShowAgain}
        onDontShowAgainChange={setDontShowAgain}
      />
    </>
  );
}
