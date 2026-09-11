-- To uavhengige, per-oppskrift brytere for å skjule funksjoner som ikke gir
-- mening for ALLE oppskrifter – lagt til 11.09.2026 (Henrik: "passer denne"
-- gir ikke mening å sjekke ut en vin til cookies, og "gjør det til en
-- kveld" passer heller ikke til cookies eller rundstykker). Begge default
-- TRUE (vises som før for eksisterende oppskrifter) – admin skrur av per
-- oppskrift i RecipeForm.tsx, se show_beverage_match_checker/
-- show_meal_builder i components/recipe/DrinkPairingSection.tsx og
-- components/recipe/RecipeInteractive.tsx.
--
-- Kjøres på samme måte som de foregående migrasjonene: lim hele filen inn i
-- Supabase-dashbordet → SQL Editor → Run.

alter table public.recipes add column if not exists show_beverage_match_checker boolean not null default true;
alter table public.recipes add column if not exists show_meal_builder boolean not null default true;

comment on column public.recipes.show_beverage_match_checker is
  'Om "Passer denne?" (BeverageMatchChecker, live AI-sjekk av en vin/drikke brukeren har mot retten) skal vises på oppskriftssiden. Uavhengig av drink_pairing – en oppskrift kan ha forhåndsgenererte drikkeforslag men likevel ha denne skrudd av (og omvendt). Default true.';

comment on column public.recipes.show_meal_builder is
  'Om "Gjør det til en kveld" (MealBuilder-seksjonen nederst på oppskriftssiden, menybygging med denne retten som ankerrett) skal vises. Skrus av for oppskrifter som ikke gir mening som anker for en hel meny (f.eks. cookies, rundstykker). Default true.';
