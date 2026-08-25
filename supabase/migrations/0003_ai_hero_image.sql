-- Legger til én kolonne: markerer om oppskriftens hovedbilde er AI-generert
-- (via "Generer AI-bilde" i admin) fremfor et ekte opplastet foto. Brukes
-- kun til å vise et lite "AI-generert"-merke i admin-skjemaet, slik at det
-- er lett å se hvilke oppskrifter som fortsatt trenger et ekte bilde.
--
-- Kjøres på samme måte som 0001_init.sql / 0002_ai_features.sql: lim hele
-- filen inn i Supabase-dashbordet → SQL Editor → Run.

alter table public.recipes
  add column if not exists hero_image_is_ai_generated boolean not null default false;

comment on column public.recipes.hero_image_is_ai_generated is
  'true = hero_image_url ble generert av AI (OpenAI) i admin, ikke lastet opp som et ekte foto. Nullstilles til false så snart bildet byttes ut med en vanlig opplasting.';
