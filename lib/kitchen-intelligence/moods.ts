/**
 * Delt register for "Stemningsvelger" (Mood Mode, Fase 4 – Smak). Seks
 * faste stemninger – IKKE fritekst.
 *
 * OMLAGT 26.09.2026 (se migrasjon 0020_recipe_mood.sql sin filheader for
 * hele bakgrunnen): var opprinnelig AI-matchet og cachet PER STEMNING, men
 * Henrik fant AI-en upålitelig ("jeg får fortsatt ikke treff på 'koselig
 * kveld' og 'imponer gjestene'") og ba om admin-satte kategorier i stedet
 * – "viktig at hver rett kan ligge inne i flere enn ett humør". Denne
 * filen (MOOD_DEFINITIONS/MoodId) er fortsatt selve kilden til de fem
 * faste verdiene, men de leses nå administrativt fra recipes.moods (satt
 * via addRecipeToMood/removeRecipeFromMood i lib/actions/recipes.ts og
 * /admin/humor, MoodPicker.tsx) og hentes deterministisk med
 * getRecipesByMood – ingen AI involvert lenger.
 */

export const MOOD_DEFINITIONS = [
  { id: "quick", labelKey: "moodMode.quick" },
  { id: "cozy", labelKey: "moodMode.cozy" },
  { id: "impress", labelKey: "moodMode.impress" },
  { id: "crowd", labelKey: "moodMode.crowd" },
  { id: "healthy", labelKey: "moodMode.healthy" },
  // Lagt til 30.09.2026, Henrik: "vi trenger ett humør til! 'Noe digg'" –
  // se migrasjon 0026_recipe_mood_tasty.sql for CHECK-constrainten denne
  // nye verdien må holdes manuelt i synk med (Henrik må kjøre den selv,
  // som vanlig).
  { id: "tasty", labelKey: "moodMode.tasty" },
] as const;

export type MoodId = (typeof MOOD_DEFINITIONS)[number]["id"];
