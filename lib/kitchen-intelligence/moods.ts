/**
 * Delt register for "Stemningsvelger" (Mood Mode, Fase 4 – Smak). Fem faste
 * stemninger – IKKE fritekst – nettopp for å holde AI-bruken avgrenset til
 * et lite, forutsigbart sett med spørsmål som kan caches PER STEMNING (se
 * getMoodRecommendations i lib/actions/kitchen-intelligence.ts), i stedet
 * for ett AI-kall per besøkende. "quick" er det ene unntaket som ikke
 * trenger AI i det hele tatt – total tid er allerede et ekte, deterministisk
 * felt på hver oppskrift (se samme funksjon).
 */

export const MOOD_DEFINITIONS = [
  { id: "quick", labelKey: "moodMode.quick" },
  { id: "cozy", labelKey: "moodMode.cozy" },
  { id: "impress", labelKey: "moodMode.impress" },
  { id: "crowd", labelKey: "moodMode.crowd" },
  { id: "healthy", labelKey: "moodMode.healthy" },
] as const;

export type MoodId = (typeof MOOD_DEFINITIONS)[number]["id"];
