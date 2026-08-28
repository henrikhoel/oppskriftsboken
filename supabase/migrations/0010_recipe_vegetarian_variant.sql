-- Vegetarversjon – samme mønster som nutrition_info i
-- 0009_recipe_nutrition.sql: forhåndsgenerert/redigert i admin (aldri en
-- live AI-generering hvem som helst på oppskriftssiden kan trigge), lagret
-- fast på selve oppskrift-raden, ikke beregnet på nytt ved hvert besøk.
-- Vises bak en "Ønsker du en vegetarversjon?"-knapp på oppskriftssiden KUN
-- dersom en variant faktisk er lagret (ønsket av Henrik 25.08.2026 – det
-- ga ikke mening at knappen dukket opp og genererte live selv på en
-- oppskrift som allerede er vegetarisk).
--
-- Kjøres på samme måte som de foregående migrasjonene: lim hele filen inn i
-- Supabase-dashbordet → SQL Editor → Run.

alter table public.recipes add column if not exists vegetarian_variant jsonb;

comment on column public.recipes.vegetarian_variant is
  'Forhåndslagret vegetarversjon (se VegetarianVariant i lib/types.ts – note/ingredientGroups/steps). Generert med AI OG/ELLER håndredigert av admin, IKKE generert live for besøkende. NULL = ingen variant lagret ennå, skjul da "Ønsker du en vegetarversjon?"-knappen på oppskriftssiden.';
