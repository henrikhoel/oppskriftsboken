-- ─────────────────────────────────────────────────────────────────────────
-- "HVORDAN GJØR JEG DET?" – À TABLEs kunnskapsbibliotek for praktiske
-- kjøkkenteknikker og problemløsning (koke poteter, lage roux, redde en
-- skilt saus osv.). Bygget 27.08.2026 etter ønske fra Henrik.
--
-- Dette er et EGET innholdsområde ved siden av oppskrifter – ikke en
-- utvidelse av `recipes`. Guider har sin egen kategori-tabell
-- (guide_categories, IKKE samme rader som `categories`, siden kategoriene
-- er konseptuelt ulike: "Sauser og dip" som OPPSKRIFT-kategori vs.
-- "SAUSER" som TEKNIKK-kategori er ikke samme akse), egne steg
-- (knowledge_guide_steps, IKKE recipe_steps – en guide er ikke en
-- oppskrift), og egne relasjoner.
--
-- Design speiler public.recipes/recipe_steps/categories bevisst tett
-- (samme RLS-mønster, samme is_published-konvensjon, samme
-- generated-tsvector-søk) – se supabase/migrations/0001_init.sql. Kjøres på
-- samme måte som de foregående migrasjonene: lim hele filen inn i
-- Supabase-dashbordet → SQL Editor → Run.
--
-- INGEN INNHOLD SEEDES HER. Demo-/placeholder-guidene
-- (lib/demo-data/guides.ts, lib/demo-data/guide-categories.ts) seedes inn
-- via `npm run seed` (scripts/seed.ts), akkurat som demo-oppskriftene –
-- denne filen bygger kun selve skjemaet.
-- ─────────────────────────────────────────────────────────────────────────

-- pg_trgm gir trigram-likhet (similarity()/%) – brukt som SISTE utvei i
-- søket under for å fange opp skrivefeil/nære formuleringer ("vannete
-- saus" -> "sausen er for tynn") uten en ekstern søketjeneste. Innebygd
-- Postgres-extension, ingen ny avhengighet.
create extension if not exists "pg_trgm";

-- to_tsvector(regconfig, text) er ikke garantert markert IMMUTABLE i alle
-- Postgres-bygg (avhenger av versjon) – en GENERATED ALWAYS AS ... STORED-
-- kolonne (se knowledge_guides.search_vector under) krever en funksjon
-- Postgres kan bevise er immutable, ellers feiler CREATE med
-- "42P17: generation expression is not immutable". Denne tynne wrapperen
-- løser det ved eksplisitt å erklære seg immutable – trygt her siden
-- konfigurasjonen alltid er den faste konstanten 'simple', aldri en
-- kolonneverdi eller noe som kan endres i databasen underveis.
create or replace function public.guide_immutable_tsvector(config regconfig, input text)
returns tsvector
language sql
immutable
parallel safe
as $$
  select to_tsvector(config, coalesce(input, ''));
$$;

-- Samme problem, samme løsning: array_to_string(anyarray, text) er markert
-- STABLE (ikke IMMUTABLE) i Postgres siden den er polymorf – selv med en
-- fast text[]-kolonne blokkerer det bruk inni en generert kolonne. Denne
-- wrapperen er typet konkret til text[] (ikke anyarray), så Postgres kan
-- garantere immutable her.
create or replace function public.guide_immutable_array_to_string(input text[], sep text)
returns text
language sql
immutable
parallel safe
as $$
  select array_to_string(coalesce(input, '{}'), sep);
$$;

-- ───────────────────────── Guide-kategorier ────────────────────────────

create table if not exists public.guide_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_en text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.guide_categories is
  'Kategorier for "Hvordan gjør jeg det?"-guider (GRUNNTEKNIKKER, SAUSER, REDDE MATEN osv.) – bevisst EGEN tabell fra public.categories (oppskrift-kategorier), se filheader. Foreløpige kategorier seedes av lib/demo-data/guide-categories.ts; admin kan opprette/redigere/slette flere via /admin/guider/kategorier, samme mønster som CategoryManager.tsx.';

-- ──────────────────────────── Guider ───────────────────────────────────

create table if not exists public.knowledge_guides (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  title_en text,
  -- Kort intro/underoverskrift ("shortDescription"), IKKE steg-teksten.
  intro text not null default '',
  intro_en text,
  -- "Kort svar"-blokken (spesifikasjon punkt 11) – en liste med korte
  -- linjer ("Små: ca. 15 min", "Mellomstore: ca. 20 min" osv.), vist FØR
  -- selve stegene. text[] (ikke ett langt tekstfelt) slik at hver linje kan
  -- vises som egen, lettlest rad – tomt array = ingen quick answer for
  -- denne guiden (ikke alle guider trenger det).
  quick_answer_lines text[] not null default '{}',
  quick_answer_lines_en text[],
  category_id uuid references public.guide_categories (id) on delete set null,
  difficulty text not null default 'enkel'
    check (difficulty in ('enkel', 'middels', 'avansert')),
  -- Samme min/max-intervall-mønster som recipes.cook_time_minutes(_max) –
  -- se migrasjon 0011. NULL/NULL = ikke satt, vis ingen tidsangivelse.
  estimated_time_minutes integer check (estimated_time_minutes is null or estimated_time_minutes >= 0),
  estimated_time_minutes_max integer check (estimated_time_minutes_max is null or estimated_time_minutes_max >= 0),
  tips text[] not null default '{}',
  tips_en text[],
  warnings text[] not null default '{}',
  warnings_en text[],
  -- Frie søkefraser ("vannete saus", "sausen tykner ikke") – se
  -- filheaderen til search_knowledge_guides under for hvordan disse brukes
  -- i rangeringen.
  search_terms text[] not null default '{}',
  search_terms_en text[],
  -- Alias/synonymer for selve BEGREPET ("roux" = "lys innbakning" e.l.) –
  -- egen kolonne fra search_terms fordi de vektes HØYERE i søket (nærmere
  -- et eksakt tittel-treff enn en løs frase, se spesifikasjonens
  -- prioriterte rekkefølge i punkt 3).
  aliases text[] not null default '{}',
  aliases_en text[],
  is_published boolean not null default false,
  -- Tydelig merking av de få demo-/placeholder-guidene som legges inn for
  -- å teste UI/søk (spesifikasjon punkt 22) – IKKE brukt til noen
  -- filtrering i vanlig visning (en publisert demo-guide vises som enhver
  -- annen guide), kun en synlig admin-merkelapp + en enkel måte å finne og
  -- rydde dem senere når ekte innhold er klart.
  is_demo boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.knowledge_guides is
  '"Hvordan gjør jeg det?" – À TABLEs kunnskapsbibliotek for kjøkkenteknikker og problemløsning. Se filheader for hvorfor dette er atskilt fra public.recipes.';

create index if not exists knowledge_guides_category_idx on public.knowledge_guides (category_id);
create index if not exists knowledge_guides_published_idx on public.knowledge_guides (is_published);

drop trigger if exists knowledge_guides_set_updated_at on public.knowledge_guides;
create trigger knowledge_guides_set_updated_at
  before update on public.knowledge_guides
  for each row execute procedure public.set_updated_at();

-- Fulltekstsøk (norsk – 'simple'-konfigurasjon, samme valg og begrunnelse
-- som recipes.search_vector i 0001_init.sql: ingen innebygd norsk
-- stemming-konfigurasjon i standard Postgres, 'simple' unngår feil
-- ord-stamming fremfor å late som vi har ekte norsk lingvistikk).
-- Dekker tittel, intro, kort svar, tips/pass på, søketermer og alias – IKKE
-- selve steg-teksten (ligger i en barne-tabell, kan ikke inngå i en
-- generert kolonne på foreldre-raden), akkurat som recipe_steps heller
-- ikke inngår i recipes.search_vector i dag.
alter table public.knowledge_guides
  add column if not exists search_vector tsvector
  generated always as (
    setweight(public.guide_immutable_tsvector('simple', title), 'A') ||
    setweight(public.guide_immutable_tsvector('simple', title_en), 'A') ||
    setweight(public.guide_immutable_tsvector('simple', public.guide_immutable_array_to_string(aliases, ' ')), 'A') ||
    setweight(public.guide_immutable_tsvector('simple', public.guide_immutable_array_to_string(aliases_en, ' ')), 'A') ||
    setweight(public.guide_immutable_tsvector('simple', public.guide_immutable_array_to_string(search_terms, ' ')), 'B') ||
    setweight(public.guide_immutable_tsvector('simple', public.guide_immutable_array_to_string(search_terms_en, ' ')), 'B') ||
    setweight(public.guide_immutable_tsvector('simple', intro), 'C') ||
    setweight(public.guide_immutable_tsvector('simple', intro_en), 'C') ||
    setweight(public.guide_immutable_tsvector('simple', public.guide_immutable_array_to_string(quick_answer_lines, ' ')), 'C') ||
    setweight(public.guide_immutable_tsvector('simple', public.guide_immutable_array_to_string(tips, ' ')), 'D') ||
    setweight(public.guide_immutable_tsvector('simple', public.guide_immutable_array_to_string(warnings, ' ')), 'D')
  ) stored;

create index if not exists knowledge_guides_search_idx on public.knowledge_guides using gin (search_vector);

-- Trigram-indeks for fuzzy-fallback (similarity()) mot tittelen – se
-- search_knowledge_guides under.
create index if not exists knowledge_guides_title_trgm_idx
  on public.knowledge_guides using gin (title gin_trgm_ops);

-- ────────────────────────── Guide-steg ─────────────────────────────────

create table if not exists public.knowledge_guide_steps (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.knowledge_guides (id) on delete cascade,
  step_number integer not null,
  text text not null,
  text_en text,
  note text,
  note_en text,
  -- Valgfri varighet i minutter – lar UI-et tilby en "start timer"-knapp
  -- for akkurat dette steget (spesifikasjon punkt 10/15), samme prinsipp
  -- som CookMode.tsx sin steg-baserte tidtaking. NULL = ingen timer-knapp.
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  -- Valgfri temperatur, tekst (ikke tall) siden det ofte er
  -- "middels varme"/"180°C" snarere enn et rent tall.
  temperature text,
  sort_order integer not null default 0
);

comment on table public.knowledge_guide_steps is
  'Strukturerte steg for én knowledge_guides-rad – IKKE ett stort markdown-felt, nettopp slik at hvert steg senere kan brukes enkeltvis i en Cook Mode-lignende visning (se GuideContent.tsx/GuideStepsList.tsx).';

create index if not exists knowledge_guide_steps_guide_idx on public.knowledge_guide_steps (guide_id);

-- ─────────────────────── Relaterte guider ──────────────────────────────

-- Ekte, admin-kuraterte relasjoner (spesifikasjon punkt 13: "IKKE
-- AI-genererte forslag hver gang siden åpnes"). Bevisst RETNINGSBESTEMT
-- (guide A -> B betyr ikke automatisk B -> A) – admin styrer eksplisitt
-- hva som vises under "Relatert" på hver guide, samme enkle
-- "dupliser det lille fremfor tidlig abstraksjon"-prinsipp som resten av
-- appen.
create table if not exists public.knowledge_guide_relations (
  guide_id uuid not null references public.knowledge_guides (id) on delete cascade,
  related_guide_id uuid not null references public.knowledge_guides (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (guide_id, related_guide_id),
  check (guide_id <> related_guide_id)
);

create index if not exists knowledge_guide_relations_guide_idx on public.knowledge_guide_relations (guide_id);

-- ────────── Fremtidig kobling: oppskriftssteg -> guider ────────────────

-- Arkitektur-forberedelse for spesifikasjon punkt 14/16 ("Lag en lys roux
-- av smør og mel" i en oppskrift -> lenke til roux-guiden), IKKE tatt i
-- bruk av noen UI/admin-flyt ennå. Mange-til-mange fordi ett steg i
-- prinsippet kan peke til flere guider (f.eks. både "roux" og
-- "hvit saus"), og én guide kan være relevant for mange oppskriftssteg på
-- tvers av hele katalogen.
create table if not exists public.recipe_step_guides (
  recipe_step_id uuid not null references public.recipe_steps (id) on delete cascade,
  guide_id uuid not null references public.knowledge_guides (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (recipe_step_id, guide_id)
);

comment on table public.recipe_step_guides is
  'IKKE i bruk av noen UI ennå – ren arkitektur-forberedelse (spesifikasjon punkt 14) for å senere kunne koble et bestemt oppskriftssteg til én eller flere "Hvordan gjør jeg det?"-guider, uten å måtte migrere skjemaet på nytt da den funksjonen bygges.';

create index if not exists recipe_step_guides_step_idx on public.recipe_step_guides (recipe_step_id);
create index if not exists recipe_step_guides_guide_idx on public.recipe_step_guides (guide_id);

-- ───────────────────────── Row Level Security ──────────────────────────

alter table public.guide_categories enable row level security;
alter table public.knowledge_guides enable row level security;
alter table public.knowledge_guide_steps enable row level security;
alter table public.knowledge_guide_relations enable row level security;
alter table public.recipe_step_guides enable row level security;

create policy "guide_categories_select_all" on public.guide_categories
  for select using (true);
create policy "guide_categories_write_admin" on public.guide_categories
  for all using (public.is_admin()) with check (public.is_admin());

create policy "knowledge_guides_select_published_or_admin" on public.knowledge_guides
  for select using (is_published = true or public.is_admin());
create policy "knowledge_guides_write_admin" on public.knowledge_guides
  for all using (public.is_admin()) with check (public.is_admin());

create policy "knowledge_guide_steps_select" on public.knowledge_guide_steps
  for select using (
    exists (
      select 1 from public.knowledge_guides g
      where g.id = guide_id and (g.is_published or public.is_admin())
    )
  );
create policy "knowledge_guide_steps_write_admin" on public.knowledge_guide_steps
  for all using (public.is_admin()) with check (public.is_admin());

create policy "knowledge_guide_relations_select" on public.knowledge_guide_relations
  for select using (
    exists (
      select 1 from public.knowledge_guides g
      where g.id = guide_id and (g.is_published or public.is_admin())
    )
  );
create policy "knowledge_guide_relations_write_admin" on public.knowledge_guide_relations
  for all using (public.is_admin()) with check (public.is_admin());

create policy "recipe_step_guides_select" on public.recipe_step_guides
  for select using (
    exists (
      select 1 from public.knowledge_guides g
      where g.id = guide_id and (g.is_published or public.is_admin())
    )
  );
create policy "recipe_step_guides_write_admin" on public.recipe_step_guides
  for all using (public.is_admin()) with check (public.is_admin());

-- ───────────────────────────── Søk-RPC ─────────────────────────────────

-- Rangert søk over PUBLISERTE guider, kalt via supabase.rpc(...) fra
-- lib/data/guides.ts -> searchGuides. Gjør selve rangeringen i databasen
-- (ikke i appen) slik at søket skalerer uendret uansett hvor mange guider
-- biblioteket etter hvert inneholder (spesifikasjon punkt 21) – appen
-- henter ALDRI hele guide-tabellen for å søke i den client-side.
--
-- Prioritert rangering, se spesifikasjon punkt 3:
--   100  eksakt tittel-treff (norsk ELLER engelsk)
--    90  eksakt alias/synonym-treff
--    70  alias/synonym inneholder søket
--    60  søketerm inneholder søket
--  40-50  fulltekstsøk (websearch_to_tsquery mot search_vector, vektet)
--   0-25  fuzzy trigram-likhet mot tittelen (siste utvei for skrivefeil/
--         nære formuleringer, f.eks. "vannete saus" -> "Sausen er for tynn"
--         dersom ingen av treffene over slo til)
-- Kun rader med rank > 0 returneres, sortert høyest først.
create or replace function public.search_knowledge_guides(
  search_query text,
  result_limit integer default 8
)
returns table (
  id uuid,
  slug text,
  title text,
  title_en text,
  intro text,
  intro_en text,
  difficulty text,
  estimated_time_minutes integer,
  estimated_time_minutes_max integer,
  is_demo boolean,
  category_id uuid,
  category_slug text,
  category_name text,
  category_name_en text,
  rank real
)
language sql
stable
security definer
set search_path = public
as $$
  with q as (
    select nullif(trim(search_query), '') as text
  ),
  scored as (
    select
      g.*,
      (case
        when q.text is null then 0::real
        when lower(g.title) = lower(q.text) or lower(coalesce(g.title_en, '')) = lower(q.text)
          then 100::real
        when exists (
          select 1 from unnest(coalesce(g.aliases, '{}') || coalesce(g.aliases_en, '{}')) a
          where lower(a) = lower(q.text)
        ) then 90::real
        when exists (
          select 1 from unnest(coalesce(g.aliases, '{}') || coalesce(g.aliases_en, '{}')) a
          where lower(a) like '%' || lower(q.text) || '%'
        ) then 70::real
        when exists (
          select 1 from unnest(coalesce(g.search_terms, '{}') || coalesce(g.search_terms_en, '{}')) s
          where lower(s) like '%' || lower(q.text) || '%'
        ) then 60::real
        when g.search_vector @@ websearch_to_tsquery('simple', q.text)
          then 40::real + least(ts_rank(g.search_vector, websearch_to_tsquery('simple', q.text)) * 10, 10::real)
        when similarity(g.title, q.text) > 0.25
          then similarity(g.title, q.text) * 25
        else 0::real
      end) as computed_rank
    from public.knowledge_guides g, q
    where g.is_published = true
  )
  select
    s.id, s.slug, s.title, s.title_en, s.intro, s.intro_en, s.difficulty,
    s.estimated_time_minutes, s.estimated_time_minutes_max, s.is_demo,
    c.id as category_id, c.slug as category_slug, c.name as category_name, c.name_en as category_name_en,
    s.computed_rank as rank
  from scored s
  left join public.guide_categories c on c.id = s.category_id
  where s.computed_rank > 0
  order by s.computed_rank desc, s.title asc
  limit result_limit;
$$;

grant execute on function public.search_knowledge_guides(text, integer) to anon, authenticated;
