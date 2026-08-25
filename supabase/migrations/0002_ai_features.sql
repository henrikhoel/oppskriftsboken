-- Legger til kolonner og funksjonalitet for tre nye funksjoner:
--   1. Vinanbefaling (AI-generert i admin, redigerbar, vist på oppskriftssiden)
--   2. Vegetarvariant (AI-generert i admin, redigerbar, vises via avkrysning)
--   3. Stjernevurdering (1-5 stjerner, gitt av besøkende, aggregert på oppskriften)
--
-- Kjøres på samme måte som 0001_init.sql: lim hele filen inn i
-- Supabase-dashbordet → SQL Editor → Run.

alter table public.recipes
  add column if not exists wine_pairing text,
  add column if not exists vegetarian_note text,
  add column if not exists vegetarian_ingredient_groups jsonb,
  add column if not exists vegetarian_steps jsonb,
  add column if not exists rating_sum integer not null default 0,
  add column if not exists rating_count integer not null default 0;

comment on column public.recipes.wine_pairing is
  'Kort AI-generert (eller admin-skrevet) vinanbefaling. Null = ingen anbefaling satt.';
comment on column public.recipes.vegetarian_note is
  'Kort forklaring av hva som er byttet ut i vegetarvarianten, f.eks. "Byttet kjøttdeig med linser".';
comment on column public.recipes.vegetarian_ingredient_groups is
  'Fullstendig alternativ ingrediensliste for vegetarvarianten, samme JSON-form som frontendens IngredientGroup[]. Null = ingen vegetarvariant finnes.';
comment on column public.recipes.vegetarian_steps is
  'Fullstendig alternativ fremgangsmåte for vegetarvarianten, samme JSON-form som frontendens RecipeStep[] (uten id/sortOrder). Null = ingen vegetarvariant finnes.';
comment on column public.recipes.rating_sum is
  'Sum av alle innsendte stjernevurderinger (1-5 per gjest). Snitt = rating_sum / rating_count.';
comment on column public.recipes.rating_count is
  'Antall innsendte stjernevurderinger.';

-- Gjester har ingen innlogging, så vurderinger kan ikke knyttes til en
-- bruker-rad slik admin-favoritter gjør. I stedet lagres gjestens EGEN
-- vurdering i nettleserens localStorage (se lib/hooks/useRecipeRatings.ts),
-- mens denne funksjonen kun oppdaterer det aggregerte tallet i databasen.
-- SECURITY DEFINER + en smal, validert oppdatering gjør dette trygt å åpne
-- for anonyme brukere uten å gi dem generell skrivetilgang til recipes-tabellen.
create or replace function public.rate_recipe(
  recipe_id uuid,
  new_stars integer,
  previous_stars integer default null
)
returns table(rating_sum integer, rating_count integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  if new_stars is null or new_stars < 1 or new_stars > 5 then
    raise exception 'Vurdering må være et heltall mellom 1 og 5';
  end if;
  if previous_stars is not null and (previous_stars < 1 or previous_stars > 5) then
    previous_stars := null;
  end if;

  if previous_stars is null then
    update public.recipes r
    set rating_sum = r.rating_sum + new_stars,
        rating_count = r.rating_count + 1
    where r.id = recipe_id and r.is_published = true;
  else
    update public.recipes r
    set rating_sum = r.rating_sum - previous_stars + new_stars
    where r.id = recipe_id and r.is_published = true;
  end if;

  return query select r.rating_sum, r.rating_count from public.recipes r where r.id = recipe_id;
end;
$$;

grant execute on function public.rate_recipe(uuid, integer, integer) to anon, authenticated;
