-- ─────────────────────────────────────────────────────────────────────────
-- "Mikse rekkefølgen" (03.10.2026). Henrik opprettet alle ~290 oppskriftene
-- i bølger på ca. 10 om gangen, kategori for kategori – den OFFENTLIGE
-- oppskriftsoversikten (/oppskrifter) og "Nyeste oppskrifter" på forsiden,
-- som begge til nå har sortert på created_at (nyeste øverst), endte derfor
-- opp med lange strekk av samme kategori etter hverandre i stedet for en
-- god miks: "jeg vil nå at du lager en knapp for meg som admin inne på
-- 'alle oppskrifter' siden. en funksjon hvor jeg kan mikse rekkefølgen på
-- oppskriftene ... rekkefølgen vil også påvirke det som står under 'nyeste
-- oppskrifter' på forsiden."
--
-- Egen kolonne i stedet for å stokke om på created_at selv (som ville
-- endret den ekte opprettelsestiden) – Henrik presiserte i tillegg to
-- ganger at ingenting inne i /admin skal påvirkes: verken admin sin egen
-- "Alle oppskrifter"-liste (getAllRecipesForAdmin, fortsatt sortert på
-- created_at, uendret), eller noen av de andre admin-sidene som også
-- lister oppskrifter (humør, ukesmeny, utvalg, roller – disse bruker ALLE
-- samme getAllRecipesForAdmin, se lib/data/recipes.ts, og er dermed
-- allerede trygge). display_order brukes KUN av de to offentlige stedene
-- nevnt over, se getBrowseRecipeSummaries/getNewestRecipes i
-- lib/data/recipes.ts – resten av appen (søk, kjøkken-AI-matching,
-- vinmatching, sesongsidene, /ukesmeny sin oppskriftsvelger osv.) bruker
-- fortsatt den opprinnelige, created_at-sorterte delte cachen helt
-- uendret, nettopp for å unngå å røre noe Henrik ikke ba om å endre.
--
-- NOT NULL med default – i motsetning til featured_sort_order (0012,
-- NULL = "ikke i utvalget") trenger ALLE oppskrifter en verdi her, ikke
-- bare et fåtall. Default settes til extract(epoch from now()) slik at en
-- NY oppskrift fortsatt dukker opp øverst ("nyest") helt til neste gang
-- noen trykker "Miks rekkefølgen" – samme intuitive oppførsel som
-- created_at ga før. shuffleRecipeDisplayOrder() (lib/actions/recipes.ts)
-- setter alltid verdier et godt stykke under dagens epoch-sekund-tall
-- (0–1 000 000), så en ny oppskrift alltid havner øverst igjen uansett
-- hvor nylig det ble mikset.
--
-- Initialverdi for EKSISTERENDE rader: satt til nøyaktig samme rekkefølge
-- som created_at ga til nå (eldst = lavest tall, nyest = høyest) – ingen
-- synlig endring noe sted før admin trykker knappen første gang.
--
-- Kjøres på samme måte som de foregående migrasjonene: lim hele filen inn
-- i Supabase-dashbordet → SQL Editor → Run.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.recipes add column if not exists display_order double precision
  not null default extract(epoch from now());

with ranked as (
  select id, row_number() over (order by created_at asc) as rn
  from public.recipes
)
update public.recipes
set display_order = ranked.rn
from ranked
where public.recipes.id = ranked.id;

comment on column public.recipes.display_order is
  'Admin-styrt visningsrekkefølge for KUN den offentlige oppskriftsoversikten (/oppskrifter) og "Nyeste oppskrifter" på forsiden, se getBrowseRecipeSummaries/getNewestRecipes i lib/data/recipes.ts. IKKE admin-dashbordets egne lister (de sorterer fortsatt på created_at). Høyere tall vises først. Satt om til tilfeldige verdier av shuffleRecipeDisplayOrder() i lib/actions/recipes.ts når admin trykker "Miks rekkefølgen" på /oppskrifter.';
