-- ─────────────────────────────────────────────────────────────────────────
-- "I SESONG" – À TABLEs redaksjonelle sesonglag. Bygget 27.08.2026 etter
-- ønske fra Henrik, sammen med "Hva skal vi spise?" (som bruker denne
-- tabellen som ett av flere deterministiske rangeringssignaler, se
-- lib/kitchen-intelligence/what-to-eat.ts – selve rangeringsmotoren
-- trenger ingen egen migrasjon, den leser kun fra recipes/seasons).
--
-- To tabeller, samme "eget innholdsområde ved siden av oppskrifter"-prinsipp
-- som knowledge_guides i 0013: en sesong ("SENSOMMER") er en tidsperiode med
-- en fast, redaksjonelt skrevet introtekst, og en råvare-liste under den er
-- ikke det samme som en oppskrift-kategori eller en tag. Se filheaderen til
-- Season/SeasonalIngredient i lib/types.ts for den fulle modell-
-- begrunnelsen (særlig hvorfor råvarer har SITT EGET topp-vindu atskilt fra
-- foreldre-sesongens måneder).
--
-- INGEN INNHOLD SEEDES HER. Demo-/seed-dataene (lib/demo-data/seasons.ts)
-- seedes inn via `npm run seed` (scripts/seed.ts), samme totrinns
-- upsert-mønster som seedGuides(). Kjøres på samme måte som de foregående
-- migrasjonene: lim hele filen inn i Supabase-dashbordet -> SQL Editor ->
-- Run.
-- ─────────────────────────────────────────────────────────────────────────

-- ────────────────────────────── Sesonger ───────────────────────────────

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_no text not null,
  name_en text,
  -- Kalendermåneder (1-12) denne sesongen "eier" for spørsmålet "hvilken
  -- sesong er det NÅ" (resolveCurrentSeason() i
  -- lib/kitchen-intelligence/seasonal.ts). De seks demo-sesongene
  -- partisjonerer alle 12 månedene seg imellom (ingen overlapp DEM
  -- IMELLOM) – overlappende vinduer for enkeltråvarer løses i stedet på
  -- seasonal_ingredients-nivå, se der. int[] (ikke start/slutt-måned) fordi
  -- vinter naturlig pakker rundt årsskiftet ({12,1,2}) og et array slipper
  -- spesialhåndtering av det tilfellet både her og i applikasjonskoden.
  months integer[] not null default '{}',
  intro_no text not null default '',
  intro_en text,
  sort_order integer not null default 0,
  -- Samme mønster som knowledge_guides.is_published: lar admin forberede
  -- en sesong (eller justere neste års tekst) uten at den vises live før
  -- den er klar. IKKE brukt til å avgjøre "hvilken sesong er det nå" -
  -- resolveCurrentSeason() slår kun opp på måned; en upublisert sesong som
  -- inneholder inneværende måned vises rett og slett ikke noe sted (heller
  -- enn å falle tilbake på en annen sesong), se filheaderen til
  -- lib/kitchen-intelligence/seasonal.ts for hvordan UI-et håndterer det.
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_months_valid check (
    months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]
  )
);

comment on table public.seasons is
  'À TABLEs redaksjonelle sesonger (VÅR, FORSOMMER, SOMMER, SENSOMMER, HØST, VINTER) – se filheaderen til Season i lib/types.ts. Demo-/startsesongene seedes av lib/demo-data/seasons.ts; admin kan opprette/redigere/slette flere via /admin/sesonger.';

create index if not exists seasons_published_idx on public.seasons (is_published);

drop trigger if exists seasons_set_updated_at on public.seasons;
create trigger seasons_set_updated_at
  before update on public.seasons
  for each row execute procedure public.set_updated_at();

-- ─────────────────────────── Sesongråvarer ─────────────────────────────

create table if not exists public.seasonal_ingredients (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  name_no text not null,
  name_en text,
  -- Alternative skriveformer/bøyningsformer å matche mot oppskriftenes
  -- frie ingrediens-tekst (f.eks. "tomat" med aliases {"tomater",
  -- "cherrytomater"}) – se matchRecipeToSeasonalIngredients() i
  -- lib/kitchen-intelligence/seasonal.ts, som normaliserer og gjør
  -- bidireksjonell substring-matching, samme prinsipp som
  -- ingredientMatches() i pantry-match.ts.
  aliases text[] not null default '{}',
  -- Valgfritt, EGET topp-vindu atskilt fra foreldre-sesongens `months` –
  -- se filheaderen til SeasonalIngredient i lib/types.ts for hvorfor.
  -- NULL/NULL = bruk foreldre-sesongens months som vindu.
  peak_start_month integer check (peak_start_month is null or peak_start_month between 1 and 12),
  peak_end_month integer check (peak_end_month is null or peak_end_month between 1 and 12),
  description_no text,
  description_en text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.seasonal_ingredients is
  'Råvarer knyttet til én sesong, med valgfritt eget topp-vindu – se filheaderen til seasons over og til SeasonalIngredient i lib/types.ts.';

create index if not exists seasonal_ingredients_season_idx on public.seasonal_ingredients (season_id);

drop trigger if exists seasonal_ingredients_set_updated_at on public.seasonal_ingredients;
create trigger seasonal_ingredients_set_updated_at
  before update on public.seasonal_ingredients
  for each row execute procedure public.set_updated_at();

-- ───────────────────────── Row Level Security ──────────────────────────

alter table public.seasons enable row level security;
alter table public.seasonal_ingredients enable row level security;

create policy "seasons_select_published_or_admin" on public.seasons
  for select using (is_published = true or public.is_admin());
create policy "seasons_write_admin" on public.seasons
  for all using (public.is_admin()) with check (public.is_admin());

create policy "seasonal_ingredients_select" on public.seasonal_ingredients
  for select using (
    exists (
      select 1 from public.seasons s
      where s.id = season_id and (s.is_published or public.is_admin())
    )
  );
create policy "seasonal_ingredients_write_admin" on public.seasonal_ingredients
  for all using (public.is_admin()) with check (public.is_admin());
