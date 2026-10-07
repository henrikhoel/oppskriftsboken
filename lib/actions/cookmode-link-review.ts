"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { suggestStepIngredientLinks as suggestStepIngredientLinksAi } from "@/lib/actions/ai";
import {
  computeCookModeLinkStatus,
  type CookModeLinkStatus,
  type CookModeLinkSuggestionPayload,
} from "@/lib/utils/cookmode-link-status";
import type { CookModeLinkQueueItem } from "@/lib/data/cookmode-link-review";
import type { IngredientGroup, RecipeStep } from "@/lib/types";

/**
 * Batch-forslag + godkjenning av Cook Mode-koblinger for ALLE eksisterende
 * oppskrifter (07.10.2026, Henrik: "Jeg vil slippe å gå manuelt gjennom
 * 300+ oppskrifter for å opprette Cook Mode-koblinger"). Se migrasjon
 * 0033_recipe_cookmode_link_review.sql og lib/utils/cookmode-link-status.ts
 * for datamodellen/statuslogikken dette bygger på, og
 * components/admin/CookModeLinkReviewBoard.tsx for selve admin-UI-et.
 *
 * Nøyaktig samme "AI returnerer ALDRI ingrediens-/stegINNHOLD, kun
 * indekser inn i en liste klienten allerede sender"-prinsipp som den
 * eksisterende, enkelt-oppskrift-varianten (suggestStepIngredientLinks i
 * lib/actions/recipes.ts/ai.ts) – denne filen kjører bare NØYAKTIG samme
 * AI-kall for mange oppskrifter etter hverandre, og lagrer resultatet som
 * et UTKAST (recipes.cook_mode_link_suggestions), ALDRI direkte inn i den
 * levende recipe_steps.ingredient_item_ids. Kun approveCookModeLinks/
 * approveAllReadyCookModeLinks under skriver til den levende kolonnen – og
 * kun etter at en admin (eksplisitt, eller via "Godkjenn alle klare" for
 * de batch selv vurderte som entydige) har godkjent.
 */

interface RawReviewRow {
  id: string;
  slug: string;
  title: string;
  cook_mode_link_status: CookModeLinkStatus | null;
  cook_mode_link_suggestions: unknown | null;
  ingredient_groups:
    | {
        id: string;
        title: string | null;
        sort_order: number;
        ingredient_items:
          | { id: string; amount: string | null; unit: string | null; name: string; note: string | null; sort_order: number }[]
          | null;
      }[]
    | null;
  recipe_steps:
    | {
        id: string;
        group_title: string | null;
        step_number: number;
        text: string;
        sort_order: number;
        ingredient_item_ids: string[];
      }[]
    | null;
}

/** Samme embedding-form som RECIPE_SELECT i lib/data/mappers.ts, men
 * BEVISST en lean, egen select her – denne filen trenger verken bilder,
 * tags, kategori, ernæring eller de andre tunge feltene RECIPE_SELECT
 * henter for vanlig oppskrift-redigering, og en batch over 300+ rader
 * trenger ikke den ekstra vekten. */
const REVIEW_SELECT = `
  id, slug, title, cook_mode_link_status, cook_mode_link_suggestions,
  ingredient_groups(id, title, sort_order, ingredient_items(id, amount, unit, name, note, sort_order)),
  recipe_steps(id, group_title, step_number, text, sort_order, ingredient_item_ids)
`;

/** Samme mapping-logikk som mapIngredientGroups/mapSteps i
 * lib/data/mappers.ts (ikke eksportert derfra) – duplisert bevisst fremfor
 * å eksportere interne hjelpefunksjoner fra et annet modul kun for denne
 * admin-only batch-funksjonen. */
function mapReviewRow(row: RawReviewRow): { ingredientGroups: IngredientGroup[]; steps: RecipeStep[] } {
  const ingredientGroups: IngredientGroup[] = [...(row.ingredient_groups ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((g) => ({
      id: g.id,
      title: g.title,
      sortOrder: g.sort_order,
      items: [...(g.ingredient_items ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((it) => ({ id: it.id, amount: it.amount, unit: it.unit, name: it.name, note: it.note, sortOrder: it.sort_order })),
    }));

  const steps: RecipeStep[] = [...(row.recipe_steps ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({
      id: s.id,
      groupTitle: s.group_title,
      stepNumber: s.step_number,
      text: s.text,
      sortOrder: s.sort_order,
      ingredientItemIds: s.ingredient_item_ids ?? [],
    }));

  return { ingredientGroups, steps };
}

/** Selve AI-kallet for ÉN oppskrift – delt mellom runCookModeLinkBatch og
 * regenerateCookModeLinkSuggestion under, slik at nøyaktig samme logikk
 * brukes uansett om forslaget genereres som del av en stor batch eller
 * trigges på nytt for én enkelt oppskrift fra review-UI-et. Tom liste/ingen
 * ingredienser eller steg → tomt forslag UTEN noe AI-kall i det hele tatt
 * (ingenting å foreslå, ikke en feilsituasjon). */
async function generateSuggestionForRecipe(
  row: Pick<RawReviewRow, "title">,
  base: { ingredientGroups: IngredientGroup[]; steps: RecipeStep[] },
): Promise<{ stepSuggestions: Record<string, string[]>; uncertainStepIds: string[] }> {
  const flatItems = base.ingredientGroups.flatMap((g) => g.items);
  if (flatItems.length === 0 || base.steps.length === 0) {
    return { stepSuggestions: {}, uncertainStepIds: [] };
  }

  const suggestions = await suggestStepIngredientLinksAi({
    title: row.title,
    ingredients: flatItems.map((item) => ({ amount: item.amount, unit: item.unit, name: item.name, note: item.note })),
    steps: base.steps.map((s) => ({ groupTitle: s.groupTitle, text: s.text })),
  });

  const stepSuggestions: Record<string, string[]> = {};
  const uncertainStepIds: string[] = [];
  for (const suggestion of suggestions) {
    const step = base.steps[suggestion.stepIndex];
    if (!step) continue;
    stepSuggestions[step.id] = suggestion.itemIndices
      .map((itemIndex) => flatItems[itemIndex]?.id)
      .filter((id): id is string => id != null);
    if (suggestion.uncertain) uncertainStepIds.push(step.id);
  }
  return { stepSuggestions, uncertainStepIds };
}

/** Beregner status/flagg (lib/utils/cookmode-link-status.ts) for et UTKAST
 * og lagrer det på recipes-raden – brukt av både batch og
 * enkelt-regenerering. Skriver ALDRI til recipe_steps her – kun til de to
 * utkast-kolonnene fra migrasjon 0033. */
async function persistSuggestion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recipeId: string,
  base: { ingredientGroups: IngredientGroup[]; steps: RecipeStep[] },
  draft: { stepSuggestions: Record<string, string[]>; uncertainStepIds: string[] },
) {
  const result = computeCookModeLinkStatus({
    ingredientGroups: base.ingredientGroups.map((g) => ({ items: g.items.map((item) => ({ id: item.id, name: item.name })) })),
    steps: base.steps.map((s) => ({ id: s.id, text: s.text, ingredientItemIds: draft.stepSuggestions[s.id] ?? [] })),
    uncertainStepIds: draft.uncertainStepIds,
  });

  const payload: CookModeLinkSuggestionPayload = {
    generatedAt: new Date().toISOString(),
    stepSuggestions: draft.stepSuggestions,
    flags: result.flags,
  };

  const { error } = await supabase
    .from("recipes")
    .update({ cook_mode_link_status: result.status, cook_mode_link_suggestions: payload })
    .eq("id", recipeId);
  if (error) throw new Error(`Kunne ikke lagre forslag: ${error.message}`);

  return result;
}

export interface CookModeLinkBatchResult {
  processed: CookModeLinkQueueItem[];
  /** Antall oppskrifter som fortsatt mangler en batch-kjøring (status
   * null) – lar klienten (CookModeLinkReviewBoard.tsx) løkke "Kjør batch"
   * automatisk til denne er 0, med en fremdriftsindikator underveis. */
  remaining: number;
  failed: { id: string; title: string; error: string }[];
}

/**
 * Kjører AI-forslaget for inntil `limit` oppskrifter som ALDRI har hatt en
 * batch-kjøring (cook_mode_link_status IS NULL), parallelt (Promise.all) –
 * hver oppskrifts AI-kall er uavhengig av de andre, så en liten bolk
 * fullfører på omtrent samme tid som det TREGESTE enkeltkallet, ikke summen
 * av alle. Standard-grensen (10) er bevisst lav: ingen "maxDuration" er
 * satt for Server Actions i dette prosjektet (default Vercel-tidsavbrudd),
 * og klienten kaller denne gjentatte ganger i en løkke (se
 * CookModeLinkReviewBoard.tsx) i stedet for å prøve å behandle alle 300+
 * oppskrifter i ett eneste, skjørt kall.
 *
 * BEVISST kun status=null i utvalget – en oppskrift som allerede har kjørt
 * (uansett om den endte som "ready"/"needs_review"/"missing") røres ALDRI
 * av en vanlig batch-kjøring, slik at en admins allerede tatte
 * beslutninger (godkjenninger) aldri overskrives stille. Vil admin ha et
 * helt NYTT forslag for én bestemt, allerede kjørt oppskrift, bruker
 * review-UI-et sin "Generer forslag på nytt"-knapp (regenerateCookModeLinkSuggestion).
 */
export async function runCookModeLinkBatch(limit = 10): Promise<CookModeLinkBatchResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipes")
    .select(REVIEW_SELECT)
    .is("cook_mode_link_status", null)
    .order("title", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Kunne ikke hente oppskrifter for batch: ${error.message}`);

  const rows = (data ?? []) as unknown as RawReviewRow[];
  const processed: CookModeLinkQueueItem[] = [];
  const failed: { id: string; title: string; error: string }[] = [];

  await Promise.all(
    rows.map(async (row) => {
      try {
        const base = mapReviewRow(row);
        const draft = await generateSuggestionForRecipe(row, base);
        const result = await persistSuggestion(supabase, row.id, base, draft);
        processed.push({
          id: row.id,
          slug: row.slug,
          title: row.title,
          status: result.status,
          linkedStepCount: result.linkedStepCount,
          totalStepCount: result.totalStepCount,
        });
      } catch (err) {
        failed.push({ id: row.id, title: row.title, error: err instanceof Error ? err.message : "Ukjent feil" });
      }
    }),
  );

  const { count } = await supabase
    .from("recipes")
    .select("id", { count: "exact", head: true })
    .is("cook_mode_link_status", null);

  return { processed, remaining: count ?? 0, failed };
}

export interface CookModeLinkReviewRecipe {
  id: string;
  slug: string;
  title: string;
  ingredientGroups: IngredientGroup[];
  /** Den LEVENDE koblingen (RecipeStep.ingredientItemIds) – det review-UI-et
   * faktisk viser forhåndshuket, ikke utkastet alene, se
   * CookModeLinkReviewBoard.tsx: er recipe_steps allerede koblet fra før
   * (manuelt, eller en tidligere godkjenning), har det forrang over et
   * eldre/ubrukt utkast. */
  steps: RecipeStep[];
  status: CookModeLinkStatus | null;
  suggestion: CookModeLinkSuggestionPayload | null;
}

/** Full enkelt-oppskrift-visning for review-editoren – kalt når admin åpner
 * en oppskrift (manuelt, eller via "neste i køen"). */
export async function getCookModeLinkReview(recipeId: string): Promise<CookModeLinkReviewRecipe | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("recipes").select(REVIEW_SELECT).eq("id", recipeId).maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as RawReviewRow;
  const { ingredientGroups, steps } = mapReviewRow(row);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    ingredientGroups,
    steps,
    status: row.cook_mode_link_status,
    suggestion: (row.cook_mode_link_suggestions as CookModeLinkSuggestionPayload | null) ?? null,
  };
}

/** "Generer forslag på nytt" i review-editoren – samme AI-kall som batch,
 * for ÉN oppskrift, brukt når admin har endret ingredienser/fremgangsmåte
 * siden sist (eller rett og slett vil ha et ferskt forsøk). Overskriver
 * KUN utkastet, aldri den levende koblingen. */
export async function regenerateCookModeLinkSuggestion(recipeId: string): Promise<CookModeLinkReviewRecipe> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.from("recipes").select(REVIEW_SELECT).eq("id", recipeId).maybeSingle();
  if (error || !data) throw new Error("Fant ikke oppskriften.");

  const row = data as unknown as RawReviewRow;
  const base = mapReviewRow(row);
  const draft = await generateSuggestionForRecipe(row, base);
  await persistSuggestion(supabase, recipeId, base, draft);

  const refreshed = await getCookModeLinkReview(recipeId);
  if (!refreshed) throw new Error("Fant ikke oppskriften etter regenerering.");
  return refreshed;
}

/**
 * Selve skrivingen til den LEVENDE koblingen (recipe_steps.ingredient_item_ids)
 * – delt mellom approveCookModeLinks (ett steg-sett fra review-editoren,
 * evt. rettet av admin) og approveAllReadyCookModeLinks (bulk, rett fra et
 * allerede "ready"-vurdert utkast) under, slik at nøyaktig samme
 * validering/statusetting/revalidering skjer uansett hvilken vei en
 * kobling godkjennes.
 *
 * Validerer id-ene MOT databasen (aldri klientens/et gammelt utkasts egne
 * id-er blindt) – samme "allValidItemIds"-prinsipp som writeRecipeChildren
 * i lib/actions/recipes.ts.
 */
async function writeApprovedLinks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recipeId: string,
  slug: string,
  title: string,
  stepIds: string[],
  stepLinks: Record<string, string[]>,
): Promise<CookModeLinkQueueItem> {
  const { data: groupRows, error: groupError } = await supabase
    .from("ingredient_groups")
    .select("ingredient_items(id)")
    .eq("recipe_id", recipeId);
  if (groupError) throw new Error(`Kunne ikke hente ingredienser: ${groupError.message}`);

  // as unknown as (samme mønster som RawReviewRow over, og RawRecipeRow i
  // lib/data/mappers.ts) – PostgREST sin embedding-syntaks lar seg ikke
  // type-utlede pålitelig uten kodegenerering, så hele prosjektet caster
  // eksplisitt fremfor å stole på supabase-js sin egen (ofte for brede/for
  // smale) utledning for en flertabell-select som denne.
  const validItemIds = new Set(
    ((groupRows ?? []) as unknown as { ingredient_items: { id: string }[] | null }[]).flatMap(
      (g) => (g.ingredient_items ?? []).map((item) => item.id),
    ),
  );

  const updates = await Promise.all(
    stepIds.map(async (stepId) => {
      const ids = (stepLinks[stepId] ?? []).filter((id) => validItemIds.has(id));
      const { error } = await supabase
        .from("recipe_steps")
        .update({ ingredient_item_ids: ids })
        .eq("id", stepId)
        .eq("recipe_id", recipeId);
      return { stepId, ids, error };
    }),
  );
  const failedUpdate = updates.find((u) => u.error);
  if (failedUpdate?.error) throw new Error(`Kunne ikke lagre koblinger: ${failedUpdate.error.message}`);

  // En admin har nå eksplisitt sett over (enten direkte i review-editoren,
  // eller indirekte via "Godkjenn alle klare" for et utkast batch selv
  // vurderte som entydig) – status settes UBETINGET til "ready", se
  // filheaderen til computeCookModeLinkStatus i
  // lib/utils/cookmode-link-status.ts for hvorfor.
  const { error: statusError } = await supabase
    .from("recipes")
    .update({ cook_mode_link_status: "ready" satisfies CookModeLinkStatus })
    .eq("id", recipeId);
  if (statusError) throw new Error(`Kunne ikke oppdatere status: ${statusError.message}`);

  // Cook Mode (CookMode.tsx) leser koblingen via den vanlige oppskrift-
  // sidens allerede skalerte ingrediensdata – samme revalidering som
  // revalidateRecipePaths() i lib/actions/recipes.ts bruker for selve
  // oppskriftssiden (ikke hele den RECIPES_TAG-tagget sammendrags-cachen –
  // RecipeSummary inneholder ikke steg/ingredienser i det hele tatt, så den
  // er urørt av denne endringen).
  revalidatePath(`/oppskrifter/${slug}`);

  const linkedStepCount = updates.filter((u) => u.ids.length > 0).length;
  return { id: recipeId, slug, title, status: "ready", linkedStepCount, totalStepCount: stepIds.length };
}

/**
 * "Godkjenn og lagre" i review-editoren – `stepLinks` er HELE skjemaets
 * nåværende tilstand (steg-id -> koblede ingrediens-id-er), ikke en diff,
 * akkurat som en vanlig lagring av StepsEditor.tsx sine avkrysninger. Et
 * steg som ikke er med i `stepLinks` (bør i praksis aldri skje, review-UI-et
 * sender alltid med ALLE oppskriftens steg) nullstilles til ingen koblinger
 * fremfor å la en gammel verdi henge igjen.
 */
export async function approveCookModeLinks(
  recipeId: string,
  stepLinks: Record<string, string[]>,
): Promise<CookModeLinkQueueItem> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipes")
    .select("id, slug, title, recipe_steps(id)")
    .eq("id", recipeId)
    .maybeSingle();
  if (error || !data) throw new Error("Fant ikke oppskriften.");

  const row = data as unknown as { slug: string; title: string; recipe_steps: { id: string }[] | null };
  const stepIds = (row.recipe_steps ?? []).map((s) => s.id);
  return writeApprovedLinks(supabase, recipeId, row.slug, row.title, stepIds, stepLinks);
}

/** Har denne oppskriftens LEVENDE koblinger allerede nøyaktig det
 * utkastet beskriver? Brukt av approveAllReadyCookModeLinks under for å
 * vite hvilke "ready"-oppskrifter som faktisk GJENSTÅR å bulk-godkjenne,
 * siden cook_mode_link_suggestions (med vilje) aldri nullstilles av en
 * godkjenning – uten denne sjekken ville en allerede godkjent oppskrift
 * dukket opp som "gjenstående" for alltid. */
function isSuggestionAlreadyApplied(
  steps: { id: string; ingredient_item_ids: string[] }[],
  stepSuggestions: Record<string, string[]>,
): boolean {
  return steps.every((step) => {
    const suggested = new Set(stepSuggestions[step.id] ?? []);
    const live = new Set(step.ingredient_item_ids ?? []);
    if (suggested.size !== live.size) return false;
    for (const id of suggested) if (!live.has(id)) return false;
    return true;
  });
}

export interface CookModeLinkBulkApproveResult {
  approved: CookModeLinkQueueItem[];
  remaining: number;
  failed: { id: string; title: string; error: string }[];
}

/**
 * "Godkjenn alle klare" (07.10.2026) – selve poenget med at batch skiller
 * "ready" fra "needs_review": Henrik skal IKKE måtte åpne hver av de 280+
 * oppskriftene batch selv vurderte som entydige, bare bekrefte dem samlet.
 * Tar forslaget AKKURAT SLIK batch la det fra seg (ingen admin-redigering
 * involvert for disse) og skriver det til den levende koblingen via samme
 * writeApprovedLinks som den individuelle godkjenningen over.
 *
 * `limit` av samme "ingen maxDuration satt"-grunn som runCookModeLinkBatch
 * – klienten løkker gjentatte kall til `remaining` er 0, se
 * CookModeLinkReviewBoard.tsx.
 */
export async function approveAllReadyCookModeLinks(limit = 25): Promise<CookModeLinkBulkApproveResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipes")
    .select("id, slug, title, cook_mode_link_suggestions, recipe_steps(id, ingredient_item_ids)")
    .eq("cook_mode_link_status", "ready");
  if (error) throw new Error(`Kunne ikke hente godkjente forslag: ${error.message}`);

  type Row = {
    id: string;
    slug: string;
    title: string;
    cook_mode_link_suggestions: unknown | null;
    recipe_steps: { id: string; ingredient_item_ids: string[] }[] | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  const pending = rows.filter((row) => {
    const suggestion = row.cook_mode_link_suggestions as CookModeLinkSuggestionPayload | null;
    // Intet utkast å bruke (f.eks. en oppskrift som ble satt til "ready" av
    // en TIDLIGERE individuell godkjenning, ikke batch) – ingenting å
    // bulk-godkjenne for den, den er jo allerede godkjent.
    if (!suggestion) return false;
    return !isSuggestionAlreadyApplied(row.recipe_steps ?? [], suggestion.stepSuggestions);
  });

  const toApply = pending.slice(0, limit);
  const approved: CookModeLinkQueueItem[] = [];
  const failed: { id: string; title: string; error: string }[] = [];

  for (const row of toApply) {
    try {
      const suggestion = row.cook_mode_link_suggestions as CookModeLinkSuggestionPayload;
      const stepIds = (row.recipe_steps ?? []).map((s) => s.id);
      const result = await writeApprovedLinks(supabase, row.id, row.slug, row.title, stepIds, suggestion.stepSuggestions);
      approved.push(result);
    } catch (err) {
      failed.push({ id: row.id, title: row.title, error: err instanceof Error ? err.message : "Ukjent feil" });
    }
  }

  return { approved, remaining: Math.max(0, pending.length - toApply.length), failed };
}

export interface CookModeLinkRecomputeResult {
  /** Oppskrifter der status/flagg faktisk endret seg etter de nye reglene –
   * brukt av CookModeLinkReviewBoard.tsx til å oppdatere kølisten live. */
  updated: CookModeLinkQueueItem[];
  nextOffset: number;
  done: boolean;
}

/**
 * "den treffer perfekt på hver oppskrift, så den er kanskje litt for
 * kritisk?" (07.10.2026) – etter at computeCookModeLinkStatus ble gjort
 * mindre streng (se lib/utils/cookmode-link-status.ts: duplikatnavn kun
 * når faktisk i bruk, delt-ingrediens-over-steg ikke lenger blokkerende),
 * regner denne UTEN NYE AI-KALL om status/flagg på nytt for alle
 * oppskrifter som allerede har kjørt batch – rett fra det allerede lagrede
 * utkastet (cook_mode_link_suggestions.stepSuggestions +
 * .flags.uncertainStepIds, akkurat det AI-en selv returnerte forrige gang).
 *
 * Hopper BEVISST over en oppskrift der utkastet allerede er skrevet til den
 * levende koblingen (isSuggestionAlreadyApplied) – det betyr en admin
 * allerede har godkjent nøyaktig dette utkastet, og status skal IKKE kunne
 * falle tilbake til "needs_review" av en regelendring etter at et menneske
 * har sett over det (se samme prinsipp i writeApprovedLinks/
 * computeCookModeLinkStatus sin filheader).
 *
 * `offset`/`limit`-paginert (samme "ingen maxDuration"-grunn som batch og
 * bulk-godkjenning) – klienten løkker til `done`, se
 * CookModeLinkReviewBoard.tsx.
 */
export async function recomputeCookModeLinkStatuses(offset = 0, limit = 50): Promise<CookModeLinkRecomputeResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipes")
    .select(
      "id, slug, title, cook_mode_link_status, cook_mode_link_suggestions, recipe_steps(id, text, ingredient_item_ids), ingredient_groups(ingredient_items(id, name))",
    )
    .not("cook_mode_link_status", "is", null)
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`Kunne ikke hente oppskrifter for omregning: ${error.message}`);

  type Row = {
    id: string;
    slug: string;
    title: string;
    cook_mode_link_status: CookModeLinkStatus;
    cook_mode_link_suggestions: unknown | null;
    recipe_steps: { id: string; text: string; ingredient_item_ids: string[] }[] | null;
    ingredient_groups: { ingredient_items: { id: string; name: string }[] | null }[] | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  const updated: CookModeLinkQueueItem[] = [];

  await Promise.all(
    rows.map(async (row) => {
      const suggestion = row.cook_mode_link_suggestions as CookModeLinkSuggestionPayload | null;
      // Intet utkast å regne om (f.eks. "missing" uten ingredienser/steg i
      // det hele tatt) – ingenting de nye reglene kan endre her.
      if (!suggestion) return;

      const liveSteps = row.recipe_steps ?? [];
      // Allerede eksplisitt godkjent av en admin – rør ikke status.
      if (isSuggestionAlreadyApplied(liveSteps, suggestion.stepSuggestions)) return;

      const items = (row.ingredient_groups ?? []).flatMap((g) => g.ingredient_items ?? []);
      const result = computeCookModeLinkStatus({
        ingredientGroups: [{ items }],
        steps: liveSteps.map((s) => ({ id: s.id, text: s.text, ingredientItemIds: suggestion.stepSuggestions[s.id] ?? [] })),
        uncertainStepIds: suggestion.flags.uncertainStepIds,
      });

      if (result.status === row.cook_mode_link_status) return;

      const payload: CookModeLinkSuggestionPayload = { ...suggestion, flags: result.flags };
      const { error: updateError } = await supabase
        .from("recipes")
        .update({ cook_mode_link_status: result.status, cook_mode_link_suggestions: payload })
        .eq("id", row.id);
      if (updateError) throw new Error(`Kunne ikke lagre ny status for "${row.title}": ${updateError.message}`);

      updated.push({
        id: row.id,
        slug: row.slug,
        title: row.title,
        status: result.status,
        linkedStepCount: liveSteps.filter((s) => (s.ingredient_item_ids ?? []).length > 0).length,
        totalStepCount: liveSteps.length,
      });
    }),
  );

  return { updated, nextOffset: offset + rows.length, done: rows.length < limit };
}
