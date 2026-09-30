-- ─────────────────────────────────────────────────────────────────────────
-- Nytt humør: "Noe digg" (30.09.2026) – Henrik: "vi trenger ett humør til!
-- 'Noe digg'". Utvider CHECK-constrainten fra 0020_recipe_mood.sql med den
-- sjette verdien ("tasty", se lib/kitchen-intelligence/moods.ts sin
-- MOOD_DEFINITIONS, som denne constrainten fortsatt holdes manuelt i synk
-- med) – selve kolonnen (recipes.moods, et array) er uendret, kun listen
-- med gyldige verdier utvides.
--
-- Postgres har ingen "alter constraint" for et CHECK – må droppes og
-- legges til på nytt med den utvidede listen.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.recipes drop constraint if exists recipes_moods_check;

alter table public.recipes add constraint recipes_moods_check
  check (moods <@ array['quick', 'cozy', 'impress', 'crowd', 'healthy', 'tasty']::text[]);
