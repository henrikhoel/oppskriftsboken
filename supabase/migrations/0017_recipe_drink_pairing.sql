-- "Drikke til" (vin/øl/alkoholfritt-forslaget på oppskriftssiden) –
-- samme mønster som taste_profile (0008) og nutrition_info (0009):
-- forhåndsgenerert i admin ("Generer drikkeforslag"), lagret fast på selve
-- oppskrift-raden, IKKE beregnet på nytt for hver besøkende. Erstatter den
-- tidligere live, cachede (ai_suggestion_cache, feature="drink_pairing")
-- varianten – ønsket av Henrik 11.09.2026 ("smartere økonomisk å la
-- vinforslaget være noe jeg genererer en gang for hver rett"). Vises
-- fortsatt bak samme "DRIKKE TIL"-knapp på oppskriftssiden som før, se
-- lib/kitchen-intelligence/drink-pairing.ts sin filheader.
--
-- Kjøres på samme måte som de foregående migrasjonene: lim hele filen inn i
-- Supabase-dashbordet → SQL Editor → Run.

alter table public.recipes add column if not exists drink_pairing jsonb;

comment on column public.recipes.drink_pairing is
  'Forhåndsgenerert drikkeforslag (vin/øl/alkoholfritt), begge språk i ett objekt – se lib/kitchen-intelligence/drink-pairing.ts (DrinkPairing/DrinkPairingOption). Generert on-demand fra admin ("Generer drikkeforslag", lib/actions/recipes.ts -> generateDrinkPairing), et AI-forslag, ikke en live per-besøk beregning. NULL = ikke generert ennå.';
