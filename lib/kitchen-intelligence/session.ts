import type { IngredientGroup, Recipe } from "@/lib/types";
import { scaleAmount } from "@/lib/utils/scale";
import { convertAmountToUs } from "@/lib/utils/units";
import type { Lang } from "@/lib/i18n";
import type {
  ChosenImprovement,
  ChosenSubstitution,
  RecipeSession,
  RecipeSessionContext,
} from "@/lib/kitchen-intelligence/types";

/**
 * REN, DETERMINISTISK LOGIKK for RecipeSession. Ingen AI-kall, ingen
 * databasetilgang – kun regning/transformasjon, slik at den kan kalles
 * synkront fra render uten loading-tilstand (jf. filheaderen i types.ts).
 */

/** Ny, tom sesjon for en gitt oppskrift – utgangspunktet før brukeren har
 * endret noe. `servings`/`lang` speiler oppskriftens/sidens egne
 * startverdier, ikke hardkodede tall. */
export function createEmptyRecipeSession(recipe: Pick<Recipe, "id" | "servings">, lang: Lang): RecipeSession {
  const now = new Date(0).toISOString();
  return {
    recipeId: recipe.id,
    servings: recipe.servings,
    unitSystem: "metric",
    lang,
    variant: "original",
    substitutions: [],
    improvements: [],
    desiredReadyAt: null,
    cookMode: { currentStepIndex: 0, checkedStepIds: [], checkedIngredientIds: [] },
    timers: [],
    notes: "",
    updatedAt: now,
  };
}

/** true dersom brukeren faktisk har endret noe fra utgangspunktet – lar
 * UI-et f.eks. vise en "nullstill"-knapp kun når det er noe å nullstille. */
export function isSessionModified(session: RecipeSession, originalServings: number): boolean {
  return (
    session.servings !== originalServings ||
    session.unitSystem !== "metric" ||
    session.variant !== "original" ||
    session.substitutions.length > 0 ||
    session.improvements.length > 0 ||
    session.desiredReadyAt !== null ||
    session.notes.trim() !== ""
  );
}

/** Bytter ut én ingrediens i en ingrediensgruppe-liste med den valgte
 * erstatningen, uten å røre resten av strukturen. Brukes ETTER
 * porsjonsskalering er regnet ut på originalen (se
 * deriveEffectiveIngredientGroups), så en eventuell egen
 * erstatningsmengde IKKE skaleres på nytt – den er allerede oppgitt for
 * målporsjonene i erstatningsforslaget. */
export function applySubstitutions(
  groups: IngredientGroup[],
  substitutions: ChosenSubstitution[],
): IngredientGroup[] {
  if (substitutions.length === 0) return groups;
  const bySourceId = new Map(substitutions.map((s) => [s.ingredientItemId, s]));

  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const sub = bySourceId.get(item.id);
      if (!sub) return item;
      return {
        ...item,
        name: sub.substituteName,
        amount: sub.substituteAmount ?? item.amount,
        unit: sub.substituteUnit ?? item.unit,
        note: sub.reason || item.note,
      };
    }),
  }));
}

/**
 * Fullstendig, deterministisk pipeline fra en oppskrifts basis-
 * ingrediensgrupper til det brukeren faktisk skal se, gitt sesjonen:
 * porsjonsskalering → enhetsbytte (metrisk/US) → valgte erstatninger.
 * Rekkefølgen er bevisst: erstatninger appliseres SIST, slik at en
 * erstatnings egen (allerede riktige) mengde/enhet ikke blir dobbelt-
 * konvertert eller -skalert.
 *
 * `baseGroups`/`baseServings` lar kallere sende inn en allerede språk-
 * eller variant-valgt ingrediensliste (f.eks. den engelske AI-oversettelsen
 * fra RecipeInteractive.tsx) i stedet for alltid den norske originalen –
 * denne funksjonen tar ikke stilling til SPRÅK/VARIANT-valg selv, kun til
 * porsjoner/enheter/erstatninger.
 */
export function deriveEffectiveIngredientGroups(
  baseGroups: IngredientGroup[],
  baseServings: number,
  session: Pick<RecipeSession, "servings" | "unitSystem" | "substitutions">,
): IngredientGroup[] {
  const scaled = baseGroups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      amount: scaleAmount(item.amount, baseServings, session.servings),
    })),
  }));

  const withUnits =
    session.unitSystem === "metric"
      ? scaled
      : scaled.map((group) => ({
          ...group,
          items: group.items.map((item) => {
            const converted = convertAmountToUs(item.amount, item.unit);
            return { ...item, amount: converted.amount, unit: converted.unit };
          }),
        }));

  return applySubstitutions(withUnits, session.substitutions);
}

/** Bygger den kompakte konteksten AI-server-actions bør ta imot sammen med
 * selve oppskriftsteksten – se RecipeSessionContext i types.ts. */
export function toSessionContext(session: RecipeSession): RecipeSessionContext {
  return {
    servings: session.servings,
    unitSystem: session.unitSystem,
    lang: session.lang,
    variant: session.variant,
    activeSubstitutions: session.substitutions.map((s) => ({
      originalName: s.originalName,
      substituteName: s.substituteName,
    })),
    activeImprovements: session.improvements.map((i) => ({ title: i.title })),
  };
}

/** Legger til/oppdaterer én erstatning (samme ingrediens byttes ut på
 * nytt = erstatter forrige valg, ikke stables). Ren funksjon – hooken i
 * useRecipeSession.ts kaller denne og lagrer resultatet. */
export function withSubstitution(session: RecipeSession, substitution: ChosenSubstitution): RecipeSession {
  return {
    ...session,
    substitutions: [
      ...session.substitutions.filter((s) => s.ingredientItemId !== substitution.ingredientItemId),
      substitution,
    ],
  };
}

export function withoutSubstitution(session: RecipeSession, ingredientItemId: string): RecipeSession {
  return {
    ...session,
    substitutions: session.substitutions.filter((s) => s.ingredientItemId !== ingredientItemId),
  };
}

export function withImprovement(session: RecipeSession, improvement: ChosenImprovement): RecipeSession {
  if (session.improvements.some((i) => i.id === improvement.id)) return session;
  return { ...session, improvements: [...session.improvements, improvement] };
}

export function withoutImprovement(session: RecipeSession, improvementId: string): RecipeSession {
  return { ...session, improvements: session.improvements.filter((i) => i.id !== improvementId) };
}
