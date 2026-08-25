import type { ParallelTaskGroup } from "@/lib/actions/kitchen-intelligence";

/**
 * Delt, ren hjelpefunksjon for å vise AI-forslagene om hvilke steg som kan
 * gjøres SAMTIDIG (se lib/actions/kitchen-intelligence.ts ->
 * getParallelTaskHints) som en liten, konsistent bokstav-merking ("A", "B",
 * …) i UI-et – brukt av både CookingTimelinePanel.tsx (der forslagene
 * hentes) og RecipeInteractive.tsx (fremgangsmåte-listen, der samme
 * bokstaver vises inline per steg). Kun type-importen fra
 * lib/actions/kitchen-intelligence.ts brukes her (ingen runtime-kode fra
 * den "use server"-fila havner i klientbunten).
 */
export interface ParallelGroupInfo {
  letter: string;
  note: string;
}

export function groupInfoByStepId(
  groups: ParallelTaskGroup[] | null | undefined,
): Map<string, ParallelGroupInfo> {
  const map = new Map<string, ParallelGroupInfo>();
  if (!groups) return map;
  groups.forEach((group, index) => {
    const letter = String.fromCharCode(65 + (index % 26));
    for (const stepId of group.stepIds) {
      if (!map.has(stepId)) map.set(stepId, { letter, note: group.note });
    }
  });
  return map;
}
