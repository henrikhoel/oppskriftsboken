-- FASE 4 (Smak) – Smaksprofil, omgjort fra en live per-besøk AI-beregning
-- til en FORHÅNDSGENERERT, redaksjonell egenskap ved oppskriften – ønsket
-- av Henrik 25.08.2026: smaksprofilen skal ligge fast på oppskriftssiden
-- (langt oppe), ikke være noe en besøkende må trykke for å laste inn hver
-- gang. Samme mønster som recipes.title_en/description_en (se
-- 0001_init.sql): generert via en "Generer med AI"-knapp i admin, lagret
-- direkte på selve oppskrift-raden.
--
-- Kjøres på samme måte som de foregående migrasjonene: lim hele filen inn i
-- Supabase-dashbordet → SQL Editor → Run.

alter table public.recipes add column if not exists taste_profile jsonb;

comment on column public.recipes.taste_profile is
  'Forhåndsgenerert smaksprofil (se lib/kitchen-intelligence/taste.ts – TasteProfile: dimensions + summary/summaryEn). Generert on-demand fra admin ("Generer smaksprofil"), IKKE beregnet på nytt ved hvert besøk. NULL = ikke generert ennå.';
