-- Lar admin skrive et intervall ("5-7") i "Tilberedning (min)"-feltet i
-- stedet for bare ett eksakt tall (ønsket av Henrik 26.08.2026 – f.eks.
-- crème brûlée-brenning som varierer litt fra gang til gang). cook_time_minutes
-- forblir det EKSISTERENDE, påkrevde tallfeltet (nedre/typiske verdi – brukes
-- fortsatt uendret alle steder som i dag: schema.org-tid i lib/utils/seo.ts,
-- osv.). cook_time_minutes_max er et NYTT, valgfritt felt for øvre grense –
-- NULL = ingen intervall, vis bare cook_time_minutes som før (helt
-- bakoverkompatibelt med alle eksisterende oppskrifter).
--
-- Kjøres på samme måte som de foregående migrasjonene: lim hele filen inn i
-- Supabase-dashbordet → SQL Editor → Run.

alter table public.recipes add column if not exists cook_time_minutes_max integer;

comment on column public.recipes.cook_time_minutes_max is
  'Valgfri ØVRE grense for tilberedningstid, for å vise et intervall som "5-7 min" i admin/på oppskriftssiden. NULL = ikke satt, vis kun cook_time_minutes som ett tall (som før). cook_time_minutes selv er fortsatt det eneste feltet som brukes i strukturert data (schema.org)/beregninger – dette feltet er rent presentasjon.';
