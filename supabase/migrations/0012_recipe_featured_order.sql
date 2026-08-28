-- Gir "Fremhevet"-feltet (is_featured, fantes fra før) en EKTE, admin-styrt
-- rekkefølge, i stedet for at forsidens "ukens utvalg" i praksis ble styrt av
-- hvilke oppskrifter Henrik hadde favorisert og i hvilken rekkefølge (ønsket
-- 26.08.2026 – "en enkel måte å velge ukens utvalg på, annet enn ..."). Ny
-- dedikert admin-side (/admin/utvalg) lar ham legge til/fjerne/omorganisere
-- fritt, helt atskilt fra hjerte-/favoritt-systemet (som fortsatt brukes for
-- "Husets favoritter"-seksjonen og besøkendes egne favoritter).
--
-- NULL = ikke i utvalget (samme som is_featured=false). Et lavere tall vises
-- først. Kjøres på samme måte som de foregående migrasjonene: lim hele filen
-- inn i Supabase-dashbordet → SQL Editor → Run.

alter table public.recipes add column if not exists featured_sort_order integer;

comment on column public.recipes.featured_sort_order is
  'Admin-satt rekkefølge for "ukens utvalg" på forsiden, satt fra /admin/utvalg (opp/ned-piler). NULL = ikke i utvalget. Kun meningsfylt sammen med is_featured=true – lavere tall vises først.';
