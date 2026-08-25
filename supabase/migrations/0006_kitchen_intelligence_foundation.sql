-- FASE 1 (Fundament) av "Kjøkkenintelligens"-utvidelsen.
--
-- RecipeSession selv (porsjoner, målesystem, variant, valgte erstatninger,
-- valgte "løft"-forslag, Cook Mode-fremgang, timere, notater) er BEVISST
-- IKKE en tabell her – den er per-besøkende, midlertidig tilstand som lever
-- i nettleserens localStorage (se lib/hooks/useRecipeSession.ts), akkurat
-- som Cook Mode-fremgang og handlelisten allerede gjør i dag. Den skal
-- ALDRI skrives til databasen eller mutere en oppskrift-rad.
--
-- Det databasen DERIMOT trenger fra dag én, er ett delt cache-lag for
-- kostbare AI-svar som flere av de kommende funksjonene (smart
-- ingrediens-erstatning, "Løft retten", pantry-matching, smaksprofil,
-- meny-forslag, restemat, "gjør det til en kveld") alle vil generere og med
-- rimelighet kan gjenbruke i stedet for å kalle AI-en på nytt for samme
-- spørsmål – se lib/kitchen-intelligence/ai-cache.ts. Én tabell for alle
-- disse, fremfor at hver funksjon får sin egen, er selve poenget med et
-- FELLES kjøkkenintelligens-lag.
--
-- Kjøres på samme måte som de foregående migrasjonene: lim hele filen inn i
-- Supabase-dashbordet → SQL Editor → Run.

create table if not exists public.ai_suggestion_cache (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  -- Se AI_CACHE_FEATURES i lib/kitchen-intelligence/types.ts for gyldige
  -- verdier – håndheves i applikasjonskoden, ikke som en db-enum, slik at
  -- nye funksjonsområder kan legges til uten en ny migrasjon.
  feature text not null,
  -- Deterministisk nøkkel bygget av kalleren fra parameterne som faktisk
  -- påvirker svaret (porsjoner, målesystem, variant, hvilken ingrediens/
  -- hvilket steg osv.) – se filheader i ai-cache.ts.
  cache_key text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (recipe_id, feature, cache_key)
);

comment on table public.ai_suggestion_cache is
  'Delt cache for AI-genererte forslag på tvers av kjøkkenintelligens-funksjonene, nøkkel = (recipe_id, feature, cache_key). Se lib/kitchen-intelligence/ai-cache.ts.';

create index if not exists ai_suggestion_cache_recipe_feature_idx
  on public.ai_suggestion_cache (recipe_id, feature);

-- Samme resonnement som stjernevurderinger (0002_ai_features.sql): besøkende
-- har ingen innlogging, og disse forslagene genereres direkte fra
-- oppskriftssiden/nye kjøkkenfunksjoner uten en admin-innlogget bruker
-- involvert. Innholdet er ikke sensitivt (kun AI-genererte tekstforslag
-- knyttet til en allerede publisert oppskrift), så vi åpner select/insert/
-- update for anon+authenticated direkte, fremfor en egen SECURITY DEFINER-
-- funksjon som for rate_recipe (som må validere stjernepoeng). Rydding av
-- gamle cache-rader gjøres evt. av en admin/service-rolle senere; det gis
-- ingen delete-policy for anon her.
alter table public.ai_suggestion_cache enable row level security;

create policy "ai_suggestion_cache: alle kan lese"
  on public.ai_suggestion_cache for select
  to anon, authenticated
  using (true);

create policy "ai_suggestion_cache: alle kan skrive nye forslag"
  on public.ai_suggestion_cache for insert
  to anon, authenticated
  with check (true);

create policy "ai_suggestion_cache: alle kan oppdatere eksisterende (upsert)"
  on public.ai_suggestion_cache for update
  to anon, authenticated
  using (true)
  with check (true);
