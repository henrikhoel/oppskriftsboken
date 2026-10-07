/**
 * Status-/flaggberegning for batch-forslåtte Cook Mode-koblinger
 * (07.10.2026, se migrasjon 0033_recipe_cookmode_link_review.sql og
 * lib/actions/cookmode-link-review.ts). Henrik: "Jeg vil slippe å gå
 * manuelt gjennom 300+ oppskrifter for å opprette Cook Mode-koblinger" –
 * denne filen avgjør HVILKE av de batch-foreslåtte oppskriftene som faktisk
 * trenger et menneske til å se over ("Bør sjekkes"), og hvilke som er
 * entydige nok til å stole på uten å åpne hver enkelt ("Klar").
 *
 * BEVISST en egen, REN (ingen "use server", ingen database-/AI-kall) fil
 * uten sideeffekter – brukes av BÅDE lib/actions/cookmode-link-review.ts
 * (rett etter batch-AI-kallet, med AI-ens egne uncertain-flagg som input)
 * OG av godkjennings-/lagre-stegene der (uten uncertain-input, se
 * filheaderen til computeCookModeLinkStatus under for hvorfor), slik at
 * nøyaktig samme regler gjelder begge steder i stedet for å driftes fra
 * hverandre over tid.
 *
 * Reglene under er BEVISST deterministiske (ren tekst-/struktur-
 * sammenligning i kode), IKKE enda et AI-kall som skal "vurdere" – det
 * eneste AI-baserte signalet som går inn her er `uncertainStepIds`, som i
 * seg selv kun er en liste med EKSISTERENDE steg-id-er AI-en selv flagget
 * (se suggestStepIngredientLinks sin `uncertain`-returverdi i
 * lib/actions/ai.ts) – aldri generert/tolket innhold.
 */

export type CookModeLinkStatus = "ready" | "needs_review" | "missing";

export interface CookModeLinkFlags {
  /** To (eller flere) ingredienslinjer i oppskriften har samme navn (f.eks.
   * "smør" til steking OG i sausen, med ulik mengde) – en AI-foreslått
   * kobling kan da ha truffet FEIL linje uten at det er synlig fra selve
   * forslaget alene, se Henriks eksempel "samme råvare finnes i flere
   * ingredienslinjer". Et RECIPE-nivå-flagg (ikke per steg), siden
   * tvetydigheten gjelder ingredienslisten som helhet, uavhengig av hvilket
   * steg som faktisk ble (feil)koblet. */
  hasDuplicateIngredientNames: boolean;
  /** Minst én ingredienslinje er foreslått/koblet til 2+ steg. Dette er i
   * seg selv HELT LOVLIG (Henrik: "samme oppmålte ingrediens kan faktisk
   * brukes over flere steg") – men også eksplisitt nevnt som et
   * tvilstilfelle å sjekke, siden AI-en kan ha anslått gjenbruk som ikke
   * faktisk stemmer. */
  hasSharedIngredientAcrossSteps: boolean;
  /** Steg-id-er der stegteksten inneholder en frase som "resten av",
   * "halvparten av", "litt av" o.l. – indikerer en delmengde av noe som kan
   * være vanskelig å feste entydig til én bestemt ingredienslinje. */
  ambiguousPhraseStepIds: string[];
  /** Steg-id-er AI-en selv markerte som usikre ved generering (se
   * suggestStepIngredientLinks sin `uncertain`-returverdi i
   * lib/actions/ai.ts) – dekker Henriks "ingrediensen omtales indirekte" og
   * "steget ser ut til å bruke en ingrediens som ikke med sikkerhet kan
   * kobles til én eksisterende linje", som ikke lar seg avgjøre med ren
   * tekstsammenligning. Alltid tom etter en admin-godkjenning (se
   * computeCookModeLinkStatus sin filheader under) – et menneske har da
   * allerede vurdert nettopp dette. */
  uncertainStepIds: string[];
}

export interface CookModeLinkStatusResult {
  status: CookModeLinkStatus;
  flags: CookModeLinkFlags;
  linkedStepCount: number;
  totalStepCount: number;
}

/** jsonb-utkastet lagret i recipes.cook_mode_link_suggestions (migrasjon
 * 0033) – se filheaderen der for hele resonnementet. ALDRI lest av selve
 * Cook Mode (CookMode.tsx), kun av admin-review-UI-et. */
export interface CookModeLinkSuggestionPayload {
  generatedAt: string;
  /** steg-id -> liste med ingredient_items.id-er, samme form som
   * RecipeStep.ingredientItemIds i lib/types.ts – men et UTKAST, ikke den
   * levende koblingen. */
  stepSuggestions: Record<string, string[]>;
  flags: CookModeLinkFlags;
}

/** "resten av" / "halvparten av" / "litt av" o.l. – Henriks egne eksempler
 * ordrett. \b${…}\b for å unngå falske treff midt i andre ord; "av" er
 * valgfri etter "resten"/"halvparten" siden begge brukes alene også
 * ("ha i resten", ikke bare "resten av det"). */
const AMBIGUOUS_PHRASE_RE = /\b(resten|halvparten|litt av|noe av|en del av)\b/i;

/**
 * BEVISST ingen tvungen full dekning her (Henrik: "systemet bør ikke tvinge
 * alle ingredienser til å være koblet; pynt/servering/valgfritt kan være
 * legitimt vanskelig eller irrelevant") – `missing` betyr KUN "ingen steg
 * har noen kobling i det hele tatt", ikke "mindre enn 100 % dekning".
 *
 * `uncertainStepIds` er valgfri med vilje: rett etter en AI-batch-kjøring
 * sender lib/actions/cookmode-link-review.ts inn AI-ens egne usikre steg-
 * id-er, men EN ADMIN SIN EGEN GODKJENNING (approveCookModeLinks) kaller
 * denne UTEN det argumentet – et menneske har da allerede sett over akkurat
 * det en AI ville vært usikker på, så det skal ikke kunne holde status
 * nede på "needs_review" for alltid. De tre andre, rent strukturelle
 * flaggene (duplikatnavn/delt ingrediens/tvetydig frase) beregnes derimot
 * likt begge steder – de er fakta om oppskriftens TEKST, ikke om AI-ens
 * selvtillit, og endrer seg ikke av at et menneske har sett på den.
 */
export function computeCookModeLinkStatus(params: {
  ingredientGroups: { items: { id: string; name: string }[] }[];
  steps: { id: string; text: string; ingredientItemIds: string[] }[];
  uncertainStepIds?: string[];
}): CookModeLinkStatusResult {
  const { ingredientGroups, steps, uncertainStepIds = [] } = params;

  const nameCounts = new Map<string, number>();
  for (const item of ingredientGroups.flatMap((g) => g.items)) {
    const key = item.name.trim().toLowerCase();
    if (!key) continue;
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }
  const hasDuplicateIngredientNames = [...nameCounts.values()].some((count) => count > 1);

  const stepCountByItemId = new Map<string, number>();
  for (const step of steps) {
    for (const id of step.ingredientItemIds) {
      stepCountByItemId.set(id, (stepCountByItemId.get(id) ?? 0) + 1);
    }
  }
  const hasSharedIngredientAcrossSteps = [...stepCountByItemId.values()].some((count) => count > 1);

  const ambiguousPhraseStepIds = steps
    .filter((s) => s.ingredientItemIds.length > 0 && AMBIGUOUS_PHRASE_RE.test(s.text))
    .map((s) => s.id);

  const realStepIds = new Set(steps.map((s) => s.id));
  const resolvedUncertainStepIds = uncertainStepIds.filter((id) => realStepIds.has(id));

  const flags: CookModeLinkFlags = {
    hasDuplicateIngredientNames,
    hasSharedIngredientAcrossSteps,
    ambiguousPhraseStepIds,
    uncertainStepIds: resolvedUncertainStepIds,
  };

  const linkedStepCount = steps.filter((s) => s.ingredientItemIds.length > 0).length;
  const totalStepCount = steps.length;

  const anyFlag =
    hasDuplicateIngredientNames ||
    hasSharedIngredientAcrossSteps ||
    ambiguousPhraseStepIds.length > 0 ||
    resolvedUncertainStepIds.length > 0;

  let status: CookModeLinkStatus;
  if (linkedStepCount === 0) {
    status = "missing";
  } else if (anyFlag) {
    status = "needs_review";
  } else {
    status = "ready";
  }

  return { status, flags, linkedStepCount, totalStepCount };
}
