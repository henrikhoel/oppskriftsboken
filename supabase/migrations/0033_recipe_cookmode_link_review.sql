-- ─────────────────────────────────────────────────────────────────────────
-- Batch-forslag til Cook Mode-koblinger (07.10.2026). Henrik: "Jeg vil
-- slippe å gå manuelt gjennom 300+ oppskrifter for å opprette Cook Mode-
-- koblinger" – en admin-side (/admin/cook-mode-koblinger) kjører AI-en
-- gjennom ALLE eksisterende oppskrifter og foreslår koblinger mellom
-- eksisterende ingredient_items.id-er og recipe_steps.id-er (se migrasjon
-- 0032_recipe_step_ingredient_links.sql for selve lenke-kolonnen og
-- RecipeStep.ingredientItemIds i lib/types.ts for hele Cook Mode-
-- funksjonen dette støtter opp om).
--
-- To NYE kolonner på recipes, BEVISST atskilt fra recipe_steps.
-- ingredient_item_ids (den LEVENDE, faktisk Cook Mode-styrende koblingen):
--
-- cook_mode_link_status: admin sin "hvor står denne oppskriften"-status i
-- kø-visningen i lib/data/cookmode-link-review.ts/
-- components/admin/CookModeLinkReviewBoard.tsx:
--   - null  = batch har aldri kjørt for denne oppskriften ennå
--   - 'missing'      = batch kjørte, men fant ingen koblinger å foreslå
--   - 'needs_review' = batch fant koblinger, men ett eller flere
--                       tvilstilfeller (se lib/utils/cookmode-link-status.ts)
--                       gjør at en admin bør se over FØR de godkjennes
--   - 'ready'        = enten (a) batch sitt forslag virker entydig og admin
--                       kan bulk-godkjenne det uten å åpne oppskriften, eller
--                       (b) en admin har allerede eksplisitt godkjent og
--                       lagret ekte koblinger for denne oppskriften (se
--                       approveCookModeLinks i
--                       lib/actions/cookmode-link-review.ts – satt
--                       UBETINGET til 'ready' der, siden et menneske da
--                       faktisk har sett over)
--
-- cook_mode_link_suggestions: selve UTKASTET – stepSuggestions (steg-id ->
-- liste med ingredient_items.id-er) PLUSS flaggene som begrunner statusen
-- over (se CookModeLinkSuggestionPayload i
-- lib/utils/cookmode-link-status.ts). ALDRI lest av selve Cook Mode-
-- visningen (CookMode.tsx) – kun recipe_steps.ingredient_item_ids er det.
-- Et forslag her er altså KUN et utkast administrator ser over/retter/
-- godkjenner i review-UI-et, aldri automatisk godkjente koblinger, slik
-- Henrik eksplisitt ba om.
--
-- Kjøres på samme måte som de foregående migrasjonene: lim hele filen inn i
-- Supabase-dashbordet → SQL Editor → Run.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.recipes
  add column if not exists cook_mode_link_status text
    check (cook_mode_link_status in ('ready', 'needs_review', 'missing')),
  add column if not exists cook_mode_link_suggestions jsonb;

comment on column public.recipes.cook_mode_link_status is
  'Admin-kø-status for "I dette steget"-batch-forslag (se lib/utils/cookmode-link-status.ts). null = batch har ikke kjørt ennå. "ready" settes UBETINGET når en admin eksplisitt har godkjent/lagret via components/admin/CookModeLinkReviewBoard.tsx, uavhengig av batch sine egne flagg.';

comment on column public.recipes.cook_mode_link_suggestions is
  'jsonb-utkast fra batch-kjøringen (lib/actions/cookmode-link-review.ts -> runCookModeLinkBatch): { generatedAt, stepSuggestions: {stepId: ingredientItemId[]}, flags }. ALDRI lest av selve Cook Mode (CookMode.tsx) – kun et utkast til admin-gjennomgang, erstattes/fjernes aldri automatisk av recipe_steps.ingredient_item_ids.';
