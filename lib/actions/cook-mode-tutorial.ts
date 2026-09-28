"use server";

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * (29.09.2026) Kalles fra CookModeTutorial.tsx når brukeren har huket av
 * "ikke vis denne veiledningen igjen" (dontShowAgain-avkrysningen i
 * CookModeTutorialOverlay.tsx, kun synlig i mode="recipe") OG avslutter
 * tutorialen – enten ved å fullføre den ("Start matlaging" på siste steg),
 * hoppe over den ("Hopp over" på et hvilket som helst steg), eller lukke
 * Cook Mode helt via dens egen X/ESC. Lagres på selve profilen (ikke
 * localStorage) slik at valget gjelder på tvers av enheter, akkurat som
 * favoritter/handleliste (se lib/actions/favorites.ts).
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
export async function markCookModeTutorialCompleted(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ cook_mode_tutorial_completed: true })
    .eq("id", user.id);

  if (error) {
    throw new Error(`Kunne ikke lagre at tutorialen er fullført: ${error.message}`);
  }
}
