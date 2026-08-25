-- Kalori-/makro-oversikt ("Næringsinnhold") – samme mønster som
-- taste_profile i 0008_recipe_taste_profile.sql: forhåndsgenerert i admin
-- ("Generer næringsinnhold"), lagret fast på selve oppskrift-raden, IKKE
-- beregnet på nytt ved hvert besøk. Vises bak en "vis næringsinnhold"-knapp
-- på oppskriftssiden (ønsket av Henrik 25.08.2026 – "ikke alle vil ha det").
--
-- Kjøres på samme måte som de foregående migrasjonene: lim hele filen inn i
-- Supabase-dashbordet → SQL Editor → Run.

alter table public.recipes add column if not exists nutrition_info jsonb;

comment on column public.recipes.nutrition_info is
  'Forhåndsgenerert kalori-/makro-oversikt PER PORSJON (se lib/kitchen-intelligence/nutrition.ts – NutritionInfo: calories/fat/saturatedFat/carbs/sugar/fiber/protein/salt). Generert on-demand fra admin ("Generer næringsinnhold"), et AI-estimat, ikke en laboratoriemåling. NULL = ikke generert ennå.';
