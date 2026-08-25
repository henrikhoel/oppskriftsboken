/**
 * Klient-trygg barrel for Kitchen Intelligence-fundamentet. Bevisst UTEN
 * ai-cache.ts (den bruker lib/supabase/server.ts → next/headers, som ikke
 * kan inngå i en "use client"-fil sin modulgraf – se lib/i18n/index.ts for
 * presedens på akkurat dette skillet). Server-kode som trenger caching
 * importerer @/lib/kitchen-intelligence/ai-cache direkte.
 */
export type {
  AiCacheFeature,
  ChosenImprovement,
  ChosenSubstitution,
  CookModeProgress,
  ExistingMealCourseSlot,
  ImprovementTier,
  MealCourseRole,
  MealCourseSlot,
  MealSession,
  RecipeSession,
  RecipeSessionContext,
  RecipeSessionTimer,
  RecipeVariant,
  SuggestedMealCourseSlot,
} from "@/lib/kitchen-intelligence/types";
export { AI_CACHE_FEATURES } from "@/lib/kitchen-intelligence/types";
export {
  applySubstitutions,
  createEmptyRecipeSession,
  deriveEffectiveIngredientGroups,
  isSessionModified,
  toSessionContext,
  withImprovement,
  withoutImprovement,
  withSubstitution,
  withoutSubstitution,
} from "@/lib/kitchen-intelligence/session";
export {
  addExistingSlot,
  addSuggestedSlot,
  countSlotsBySource,
  createEmptyMealSession,
  markSuggestionConverted,
  removeSlot,
  renameMeal,
  replaceSlotContent,
  setMealDesiredReadyAt,
  setMealNotes,
  setSlotServings,
  sortSlotsByRole,
} from "@/lib/kitchen-intelligence/meal-session";
