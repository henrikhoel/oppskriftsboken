-- ─────────────────────────────────────────────────────────────────────────
-- "I SESONG" → komplett, kildebasert råvareguide. Bygget 28.08.2026 etter
-- ønske fra Henrik ("gjør 'I sesong' til en komplett, kildebasert og
-- elegant råvareguide"). Utvider seasonal_ingredients (fra 0014) med det
-- tre-lags tidsbegrepet TILGJENGELIG/SESONG/PEAK, redaksjonell gruppering,
-- opprinnelse, og strukturert kildegrunnlag – se den fulle begrunnelsen i
-- filheaderen til SeasonalIngredient i lib/types.ts, som er identisk med
-- kommentarene under.
--
-- Rører IKKE seasons-tabellen eller de eksisterende kolonnene på
-- seasonal_ingredients (season_id, name_no, name_en, aliases,
-- peak_start_month, peak_end_month, description_no, description_en,
-- sort_order) – kun nye, tilleggs-kolonner. Eksisterende rader får `slug`
-- generert fra name_no (midlertidig, admin bør justere) og default-verdier
-- for category/origin_group/origin slik at raden fortsatt er gyldig; disse
-- bør uansett overskrives av lib/demo-data/seasons.ts sitt betydelig
-- utvidede innhold via `npm run seed`.
--
-- Kjøres som de foregående migrasjonene: lim hele filen inn i Supabase
-- dashbordet -> SQL Editor -> Run.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.seasonal_ingredients
  add column if not exists slug text,
  add column if not exists category text,
  add column if not exists origin_group text,
  add column if not exists origin text,
  add column if not exists available_start_month integer,
  add column if not exists available_end_month integer,
  add column if not exists season_start_month integer,
  add column if not exists season_end_month integer,
  add column if not exists season_note_no text,
  add column if not exists season_note_en text,
  add column if not exists source_name text,
  add column if not exists source_url text,
  add column if not exists source_note text,
  add column if not exists verified_at date;

-- Midlertidig slug for eksisterende rader (før seed overskriver med de
-- riktige, håndskrevne slug-ene) – slugifisering av name_no som translittererer
-- æ/ø/å til ae/o/a FØR resten av navnet strippes til [a-z0-9-] (samme
-- translittereringsprinsipp som lib/utils/slug.ts sin slugify() bruker
-- klient-/server-side, f.eks. "Høst" -> "host"). Første forsøket her hoppet
-- over translittereringen og lot æøåÆØÅ stå igjen i slug-en, noe som brøt
-- seasonal_ingredients_slug_format-constrainten under for enhver eksisterende
-- rad med et norsk tegn i navnet (f.eks. "Grønnkål") – rettet her.
-- row_number()-vinduet håndterer det (i praksis usannsynlige, men mulige)
-- tilfellet at to eksisterende rader slugifiserer til samme grunnform, ved å
-- legge på et løpenummer på alle unntatt den første.
with slugged as (
  select
    id,
    trim(both '-' from
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(lower(trim(name_no)), 'æ', 'ae', 'g'),
            'ø', 'o', 'g'
          ),
          'å', 'a', 'g'
        ),
        '[^a-z0-9]+', '-', 'g'
      )
    ) as base_slug
  from public.seasonal_ingredients
  where slug is null
),
numbered as (
  select
    id,
    base_slug,
    row_number() over (partition by base_slug order by id) as rn
  from slugged
)
update public.seasonal_ingredients si
set slug = case
  when n.base_slug = '' then 'ravare-' || substr(n.id::text, 1, 8)
  when n.rn = 1 then n.base_slug
  else n.base_slug || '-' || n.rn
end
from numbered n
where si.id = n.id;

-- Konservative defaults for eksisterende rader slik at check-constraintene
-- under kan legges på uten å knekke på gammel data – reelt innhold kommer
-- fra den utvidede lib/demo-data/seasons.ts via seed.
update public.seasonal_ingredients set category = 'vegetable' where category is null;
update public.seasonal_ingredients set origin_group = 'jorda' where origin_group is null;
update public.seasonal_ingredients set origin = 'norwegian' where origin is null;

alter table public.seasonal_ingredients
  alter column slug set not null,
  alter column category set not null,
  alter column origin_group set not null,
  alter column origin set not null;

-- Hver constraint droppes først (if exists) og legges så til på nytt –
-- gjør det trygt å kjøre denne migrasjonen flere ganger på rad (f.eks.
-- etter at et tidligere forsøk feilet på selve dataene, ikke på
-- constraint-definisjonen), i motsetning til en ren "add constraint" som
-- feiler hardt dersom den fra et forrige, delvis vellykket forsøk allerede
-- finnes. Postgres har ingen "add constraint if not exists"-syntaks.
alter table public.seasonal_ingredients drop constraint if exists seasonal_ingredients_slug_format;
alter table public.seasonal_ingredients
  add constraint seasonal_ingredients_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

alter table public.seasonal_ingredients drop constraint if exists seasonal_ingredients_category_valid;
alter table public.seasonal_ingredients
  add constraint seasonal_ingredients_category_valid check (
    category in ('vegetable', 'fruit', 'berry', 'herb', 'mushroom', 'fish', 'shellfish', 'game', 'meat')
  );

alter table public.seasonal_ingredients drop constraint if exists seasonal_ingredients_origin_group_valid;
alter table public.seasonal_ingredients
  add constraint seasonal_ingredients_origin_group_valid check (
    origin_group in ('havet', 'skogen', 'jorda', 'hagen', 'beite')
  );

alter table public.seasonal_ingredients drop constraint if exists seasonal_ingredients_origin_valid;
alter table public.seasonal_ingredients
  add constraint seasonal_ingredients_origin_valid check (origin in ('norwegian', 'imported'));

alter table public.seasonal_ingredients drop constraint if exists seasonal_ingredients_available_start_valid;
alter table public.seasonal_ingredients
  add constraint seasonal_ingredients_available_start_valid check (
    available_start_month is null or available_start_month between 1 and 12
  );

alter table public.seasonal_ingredients drop constraint if exists seasonal_ingredients_available_end_valid;
alter table public.seasonal_ingredients
  add constraint seasonal_ingredients_available_end_valid check (
    available_end_month is null or available_end_month between 1 and 12
  );

alter table public.seasonal_ingredients drop constraint if exists seasonal_ingredients_season_start_valid;
alter table public.seasonal_ingredients
  add constraint seasonal_ingredients_season_start_valid check (
    season_start_month is null or season_start_month between 1 and 12
  );

alter table public.seasonal_ingredients drop constraint if exists seasonal_ingredients_season_end_valid;
alter table public.seasonal_ingredients
  add constraint seasonal_ingredients_season_end_valid check (
    season_end_month is null or season_end_month between 1 and 12
  );

-- Slug må være unikt PÅ TVERS av alle råvarer (ikke bare innad i én sesong)
-- – /sesong/[slug] slår opp både sesonger og råvarer i samme navnerom, se
-- filheaderen til app/sesong/[slug]/page.tsx.
create unique index if not exists seasonal_ingredients_slug_key on public.seasonal_ingredients (slug);

comment on column public.seasonal_ingredients.slug is
  'Unikt (på tvers av alle råvarer) URL-vennlig navn – brukes av /sesong/[slug] til å slå opp råvaresiden når slug ikke matcher en sesong. Se app/sesong/[slug]/page.tsx.';
comment on column public.seasonal_ingredients.category is
  'Kulinarisk/biologisk type (vegetable/fruit/berry/herb/mushroom/fish/shellfish/game/meat) – brukes til søk/filtrering. Se IngredientCategory i lib/types.ts.';
comment on column public.seasonal_ingredients.origin_group is
  'Redaksjonell visningsgruppe på sesongsidene (havet/skogen/jorda/hagen/beite, vist som "FRA HAVET" osv.) – eget felt fra category, se IngredientOriginGroup i lib/types.ts.';
comment on column public.seasonal_ingredients.origin is
  'norwegian eller imported – À TABLE skal aldri fremstille en importert råvare som norsk. Se IngredientOrigin i lib/types.ts.';
comment on column public.seasonal_ingredients.available_start_month is
  'Bredeste vindu: når råvaren normalt kan skaffes, uavhengig av kulinarisk relevans. NULL/NULL = ikke satt/ukjent.';
comment on column public.seasonal_ingredients.season_start_month is
  'Den naturlige/relevante sesongen À TABLE faktisk fremhever råvaren i. NULL/NULL = bruk foreldre-sesongens months. Kan strekke seg utover én sesongs months og dermed la råvaren vises på flere sesongsider – se resolveIngredientsForSeasonPage() i lib/kitchen-intelligence/seasonal.ts.';
comment on column public.seasonal_ingredients.season_note_no is
  'Lengre, kildebasert forklaring på HVORFOR råvaren er i sesong nå – kun vist på råvaresiden (progressive disclosure), aldri i oversiktslisten.';
comment on column public.seasonal_ingredients.source_name is
  'Kildegrunnlag lagret strukturert (f.eks. "Norges sjømatråd") i stedet for hardkodet tekst uten sporbart opphav. Se spesifikasjonens kildekritikk-krav.';
comment on column public.seasonal_ingredients.verified_at is
  'Datoen sesonginformasjonen sist ble kontrollert mot kilden – rent redaksjonelt, ingen automatisk logikk avhenger av denne.';
