-- ─────────────────────────────────────────────────────────────────────────
-- Oppskriftsboken – database-skjema
--
-- Kjør denne filen i Supabase SQL Editor (eller via `supabase db push` /
-- `supabase migration up` hvis du bruker Supabase CLI). Se README.md for
-- fullstendig oppsett-guide.
--
-- Skjemaet er bygget for én administrator (deg). Alle skriveoperasjoner er
-- låst til brukere med `is_admin = true` i `public.profiles`. Alt annet
-- (publiserte oppskrifter, kategorier, tags) er lesbart for alle, også
-- besøkende uten innlogging.
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ───────────────────────── Profiler / admin-styring ────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Én rad per innlogget bruker. is_admin=true gir tilgang til /admin.';

-- Opprett automatisk en profil-rad når en ny bruker registrerer seg i
-- Supabase Auth. Den nyeste brukeren blir IKKE admin automatisk – det må du
-- sette manuelt første gang (se README "Opprett admin-bruker").
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Hjelpefunksjon brukt i RLS-policyene under. SECURITY DEFINER + fast
-- search_path slik at den kan leses trygt fra policies uten rekursjon.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ───────────────────────────── Kategorier & tags ───────────────────────────

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────── Oppskrifter ────────────────────────────────

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  hero_image_url text,
  hero_image_alt text,
  category_id uuid references public.categories (id) on delete set null,
  servings integer not null default 4 check (servings > 0),
  prep_time_minutes integer check (prep_time_minutes is null or prep_time_minutes >= 0),
  cook_time_minutes integer check (cook_time_minutes is null or cook_time_minutes >= 0),
  total_time_minutes integer check (total_time_minutes is null or total_time_minutes >= 0),
  difficulty text not null default 'middels'
    check (difficulty in ('enkel', 'middels', 'avansert')),
  notes text,
  tips text,
  source text,
  is_published boolean not null default false,
  is_featured boolean not null default false,
  favorited_by_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_category_idx on public.recipes (category_id);
create index if not exists recipes_published_idx on public.recipes (is_published);
create index if not exists recipes_created_idx on public.recipes (created_at desc);

-- Enkelt fulltekstsøk på tvers av tittel, beskrivelse og notater.
alter table public.recipes
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(notes, '')), 'C')
  ) stored;

create index if not exists recipes_search_idx on public.recipes using gin (search_vector);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute procedure public.set_updated_at();

create table if not exists public.recipe_tags (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (recipe_id, tag_id)
);

create table if not exists public.recipe_images (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  url text not null,
  alt text,
  sort_order integer not null default 0
);

create index if not exists recipe_images_recipe_idx on public.recipe_images (recipe_id);

-- Ingrediensene er gruppert (f.eks. "Kjøttboller" / "Saus") slik at en
-- oppskrift uten grupper bare får én gruppe med title = null.
create table if not exists public.ingredient_groups (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  title text,
  sort_order integer not null default 0
);

create index if not exists ingredient_groups_recipe_idx on public.ingredient_groups (recipe_id);

create table if not exists public.ingredient_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.ingredient_groups (id) on delete cascade,
  amount text,
  unit text,
  name text not null,
  note text,
  sort_order integer not null default 0
);

create index if not exists ingredient_items_group_idx on public.ingredient_items (group_id);

create table if not exists public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  group_title text,
  step_number integer not null,
  text text not null,
  sort_order integer not null default 0
);

create index if not exists recipe_steps_recipe_idx on public.recipe_steps (recipe_id);

-- ───────────────────────── Row Level Security ──────────────────────────────

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_tags enable row level security;
alter table public.recipe_images enable row level security;
alter table public.ingredient_groups enable row level security;
alter table public.ingredient_items enable row level security;
alter table public.recipe_steps enable row level security;

-- profiles: en bruker kan lese sin egen rad; admin kan lese alle.
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- categories / tags: lesbare for alle, skrivbare kun for admin.
create policy "categories_select_all" on public.categories
  for select using (true);
create policy "categories_write_admin" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

create policy "tags_select_all" on public.tags
  for select using (true);
create policy "tags_write_admin" on public.tags
  for all using (public.is_admin()) with check (public.is_admin());

-- recipes: alle kan se publiserte oppskrifter; admin ser og redigerer alt.
create policy "recipes_select_published_or_admin" on public.recipes
  for select using (is_published = true or public.is_admin());
create policy "recipes_write_admin" on public.recipes
  for all using (public.is_admin()) with check (public.is_admin());

-- Detalj-tabeller arver synlighet fra foreldre-oppskriften.
create policy "recipe_tags_select" on public.recipe_tags
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and (r.is_published or public.is_admin())
    )
  );
create policy "recipe_tags_write_admin" on public.recipe_tags
  for all using (public.is_admin()) with check (public.is_admin());

create policy "recipe_images_select" on public.recipe_images
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and (r.is_published or public.is_admin())
    )
  );
create policy "recipe_images_write_admin" on public.recipe_images
  for all using (public.is_admin()) with check (public.is_admin());

create policy "ingredient_groups_select" on public.ingredient_groups
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and (r.is_published or public.is_admin())
    )
  );
create policy "ingredient_groups_write_admin" on public.ingredient_groups
  for all using (public.is_admin()) with check (public.is_admin());

create policy "ingredient_items_select" on public.ingredient_items
  for select using (
    exists (
      select 1 from public.ingredient_groups g
      join public.recipes r on r.id = g.recipe_id
      where g.id = group_id and (r.is_published or public.is_admin())
    )
  );
create policy "ingredient_items_write_admin" on public.ingredient_items
  for all using (public.is_admin()) with check (public.is_admin());

create policy "recipe_steps_select" on public.recipe_steps
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and (r.is_published or public.is_admin())
    )
  );
create policy "recipe_steps_write_admin" on public.recipe_steps
  for all using (public.is_admin()) with check (public.is_admin());

-- ───────────────────────────── Storage: bilder ─────────────────────────────

insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;

create policy "recipe_images_public_read" on storage.objects
  for select using (bucket_id = 'recipe-images');

create policy "recipe_images_admin_insert" on storage.objects
  for insert with check (bucket_id = 'recipe-images' and public.is_admin());

create policy "recipe_images_admin_update" on storage.objects
  for update using (bucket_id = 'recipe-images' and public.is_admin());

create policy "recipe_images_admin_delete" on storage.objects
  for delete using (bucket_id = 'recipe-images' and public.is_admin());
