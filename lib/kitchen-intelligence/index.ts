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
  MealOccasion,
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
  ALL_MEAL_COURSE_ROLES,
  ALL_MEAL_OCCASIONS,
  countSlotsBySource,
  createEmptyMealSession,
  inferCourseRoleFromCategory,
  markSuggestionConverted,
  MEAL_OCCASION_LABELS,
  removeSlot,
  renameMeal,
  replaceSlotContent,
  setMealDesiredReadyAt,
  setMealNotes,
  setMealOccasion,
  setSlotServings,
  sortSlotsByRole,
} from "@/lib/kitchen-intelligence/meal-session";
export type {
  MealTaskStreamEntry,
  MealTimeline,
  MealTimelineDishEntry,
  MealTimelineDishInput,
} from "@/lib/kitchen-intelligence/meal-timeline";
export { computeMealTaskStream, computeMealTimeline } from "@/lib/kitchen-intelligence/meal-timeline";
export type {
  Ambition,
  ProteinPreference,
  VibeFacet,
  WhatToEatCriteria,
  WhatToEatMatch,
} from "@/lib/kitchen-intelligence/what-to-eat";
export {
  ALL_AMBITIONS,
  ALL_PROTEIN_PREFERENCES,
  ALL_VIBE_FACETS,
  AMBITION_LABELS,
  buildReasonText,
  PROTEIN_PREFERENCE_LABELS,
  scoreRecipesForDecision,
  VIBE_FACET_LABELS,
} from "@/lib/kitchen-intelligence/what-to-eat";
export type {
  InSeasonIngredient,
  IngredientStatus,
  RecipeSeasonalMatch,
  SeasonPageIngredient,
} from "@/lib/kitchen-intelligence/seasonal";
export {
  computeIngredientStatus,
  effectivePeakRange,
  effectiveSeasonRange,
  expandMonthsInRange,
  findNextMonthInSet,
  findRecipesForIngredient,
  findRecipesForInSeasonIngredients,
  groupIngredientsByOriginGroup,
  ingredientAppliesToSeasonPage,
  matchRecipeToSeasonalIngredients,
  monthsToRange,
  ORIGIN_GROUP_ORDER,
  resolveCurrentSeason,
  resolveInSeasonIngredients,
  resolveIngredientsForSeasonPage,
  searchIngredients,
} from "@/lib/kitchen-intelligence/seasonal";
