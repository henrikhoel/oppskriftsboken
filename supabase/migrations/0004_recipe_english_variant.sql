-- Legger til to kolonner: en forhåndsgenerert engelsk tittel og kort
-- beskrivelse per oppskrift. Brukes til å vise engelsk tekst momentant i
-- lister/forsiden (RecipeCard, "Nyeste oppskrifter", "Ukens utvalg", Mat &
-- vin osv.) når besøkende bytter til engelsk – UTEN et AI-kall ved hver
-- sidevisning. Selve oppskriftssiden (ingredienser/steg) oversettes
-- fortsatt live med AI når man besøker den (se lib/actions/ai.ts ->
-- getEnglishVariant), det endres ikke her.
--
-- Feltene er nullable: eldre oppskrifter har ingen engelsk variant før en
-- admin trykker "Generer med AI" i admin-skjemaet (se
-- components/admin/RecipeForm.tsx) – da faller visningen automatisk
-- tilbake til den norske originalteksten (se lib/utils/format.ts ->
-- localizedTitle/localizedDescription).
--
-- Kjøres på samme måte som de foregående migrasjonene: lim hele filen inn
-- i Supabase-dashbordet → SQL Editor → Run.

alter table public.recipes
  add column if not exists title_en text,
  add column if not exists description_en text;

comment on column public.recipes.title_en is
  'Engelsk tittel, generert med AI (eller manuelt redigert) i admin. Null = ingen engelsk variant ennå, vis norsk tittel.';
comment on column public.recipes.description_en is
  'Engelsk kort beskrivelse, generert med AI (eller manuelt redigert) i admin. Null/tom = ingen engelsk variant ennå, vis norsk beskrivelse.';
