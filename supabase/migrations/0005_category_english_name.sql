-- Legger til én kolonne: en engelsk kategorinavn-variant, samme mønster
-- som 0004_recipe_english_variant.sql (recipes.title_en/description_en).
-- Brukes til å vise kategorinavn ("Kjøtt", "Pizza" osv.) på engelsk i
-- lister/forsiden/kategorisider når besøkende bytter til engelsk – uten et
-- AI-kall ved hver sidevisning.
--
-- Nullable: eksisterende kategorier har ingen engelsk variant før en admin
-- trykker "Generer med AI" i admin-skjemaet (se
-- components/admin/CategoryManager.tsx) – da faller visningen automatisk
-- tilbake til det norske navnet (se lib/utils/format.ts ->
-- localizedCategoryName).
--
-- Kjøres på samme måte som de foregående migrasjonene: lim hele filen inn
-- i Supabase-dashbordet → SQL Editor → Run.

alter table public.categories
  add column if not exists name_en text;

comment on column public.categories.name_en is
  'Engelsk kategorinavn, generert med AI (eller manuelt redigert) i admin. Null = ingen engelsk variant ennå, vis norsk navn.';
