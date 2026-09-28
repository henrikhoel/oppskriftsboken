"use server";

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * (29.09.2026, generalisert samme dag – se "angre"-notatet under) Kalles
 * fra CookModeTutorial.tsx når "ikke vis denne veiledningen igjen"-
 * avkrysningen (dontShowAgain i CookModeTutorialOverlay.tsx, kun synlig i
 * mode="recipe") er ENDRET og brukeren avslutter tutorialen – enten ved å
 * fullføre den ("Start matlaging" på siste steg), hoppe over den
 * ("Hopp over" på et hvilket som helst steg), eller lukke Cook Mode helt
 * via dens egen X/ESC. Lagres på selve profilen (ikke localStorage) slik
 * at valget gjelder på tvers av enheter, akkurat som favoritter/
 * handleliste (se lib/actions/favorites.ts).
 *
 * `completed` tar eksplisitt BÅDE true og false (ikke bare en
 * "marker fullført"-funksjon uten parameter) – Henrik, 29.09.2026, etter å
 * ha prøvd CookMode.tsx sin nye "vis tutorial igjen"-knapp: avkrysningen
 * åpnes nå FORHÅNDSHUKET for en bruker som allerede har valgt "ikke vis
 * igjen" (se initialDontShowAgain i CookModeTutorial.tsx), og et "man kan
 * jo angre liksom" krever da at man faktisk KAN huke den AV igjen og få
 * tutorialen til å dukke opp automatisk igjen – ikke bare en envegs
 * "sett til true"-bryter.
 *
 * Bruker getCurrentUser() (den ekte, revaliderende varianten), ikke
 * getCurrentUserFast() – dette er en skriveoperasjon, og konvensjonen i
 * lib/auth.ts er at alle Server Actions som skriver må bruke den ekte
 * sjekken. En ikke-innlogget bruker kan uansett aldri havne i mode="recipe"
 * (Cook Mode på en ekte oppskrift krever innlogging, se
 * app/oppskrifter/[slug]/page.tsx) – denne no-op'er derfor stille for en
 * gjest i stedet for å kaste, i tilfelle sesjonen skulle ha utløpt akkurat
 * idet tutorialen avsluttes.
 */
export async function setCookModeTutorialCompleted(completed: boolean): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ cook_mode_tutorial_completed: completed })
    .eq("id", user.id);

  if (error) {
    throw new Error(`Kunne ikke lagre Cook Mode-tutorial-preferansen: ${error.message}`);
  }
}
