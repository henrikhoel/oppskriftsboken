-- ─────────────────────────────────────────────────────────────────────────
-- Brukerkontoer for vanlige besøkende (27.09.2026) – Henrik: "burde egentlig
-- hatt en 'opprett konto' funksjon, sånn at favoritter og handleliste osv
-- lagres på kontoen", senere presisert til at favoritter og handleliste
-- (og etter hvert "I kjøleskapet" og "Bygg din egen meny") skal være
-- KONTOEKSKLUSIVE – ikke lenger tilgjengelig for en ikke-innlogget
-- besøkende slik de er i dag via localStorage (lib/hooks/useFavorites.ts,
-- lib/hooks/useShoppingList.ts). Se prosjektnotatet "Plan: brukerkonto" for
-- hele bildet.
--
-- Selve konto-infrastrukturen (Supabase Auth + public.profiles +
-- on_auth_user_created-triggeren) finnes allerede fra 0001_init.sql – den
-- har til nå kun vært brukt til admin-innlogging. Denne migrasjonen legger
-- IKKE til noe nytt der; enhver ny bruker som registrerer seg får allerede
-- automatisk en profiles-rad (med is_admin=false). Det som mangler er en
-- offentlig registrerings-/innloggingsflyt i appkoden (kommer i en egen
-- kodeendring, ikke i denne SQL-filen) og – her – tabellene selve dataene
-- skal ligge i.
--
-- To nye tabeller, samme eier-mønster (user_id = auth.uid()) på begge:
-- ingen admin-unntak, dette er ikke redaksjonelt innhold, kun personlige
-- data hver bruker selv eier.
-- ─────────────────────────────────────────────────────────────────────────

-- ───────────────────────────── Favoritter ──────────────────────────────

-- Sammensatt primærnøkkel (user_id, recipe_id) i stedet for egen id-kolonne
-- – en favoritt ER nettopp kombinasjonen bruker+oppskrift, og PK-en gir oss
-- automatisk "kan ikke favorittmarkere samme oppskrift to ganger" uten en
-- egen unique-constraint.
create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

comment on table public.favorites is
  'Kontoeksklusive favoritter – én rad per bruker+oppskrift. Erstatter localStorage-varianten (lib/hooks/useFavorites.ts) for innloggede brukere.';

alter table public.favorites enable row level security;

create policy "favorites_select_own" on public.favorites
  for select using (user_id = auth.uid());
create policy "favorites_insert_own" on public.favorites
  for insert with check (user_id = auth.uid());
create policy "favorites_delete_own" on public.favorites
  for delete using (user_id = auth.uid());
-- Ingen update-policy – en favoritt legges til eller fjernes, endres aldri.

-- ───────────────────────────── Handleliste ─────────────────────────────

-- `entry` holder HELE varelinjen som jsonb (speiler ShoppingListEntry i
-- lib/types.ts, minus dens klientsidige `id` – radens egen `id` under ER
-- entry-id-en så snart brukeren er innlogget). Bevisst valgt fremfor å
-- normalisere hvert felt (amount/displayAmount/unit/name/checked/
-- fromRecipes/sources/note) til egne kolonner: ShoppingListEntry har
-- allerede vokst med nye valgfrie felt flere ganger (senest `sources`,
-- 25.08.2026) – én jsonb-kolonne slipper oss unna en ny migrasjon hver
-- gang klient-formen endrer seg, på samme måte som f.eks. `payload` i
-- 0006_kitchen_intelligence_foundation.sql.
create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry jsonb not null,
  created_at timestamptz not null default now()
);

comment on table public.shopping_list_items is
  'Kontoeksklusiv handleliste – én rad per varelinje. `entry` speiler ShoppingListEntry (lib/types.ts). Erstatter localStorage-varianten (lib/hooks/useShoppingList.ts) for innloggede brukere.';

alter table public.shopping_list_items enable row level security;

create policy "shopping_list_items_all_own" on public.shopping_list_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
