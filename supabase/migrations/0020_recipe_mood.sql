-- ─────────────────────────────────────────────────────────────────────────
-- "Humør" for oppskrifter – bygget 26.09.2026 etter ønske fra Henrik, som
-- erstatning for den AI-baserte "Hva passer humøret ditt?"-matchingen
-- (getMoodRecommendations i lib/actions/kitchen-intelligence.ts): "jeg
-- tror kanskje dette bør være noe jeg velger selv inne på hver rett...
-- hvis jeg ikke velger en, så dukker den heller ikke opp på noen av dem" –
-- fulgt opp med et konkret ønske om en egen admin-side ("lag en 'humør'
-- del, hvor jeg kan legge rettene enkelt til i hver bås", se
-- app/admin/(dashboard)/humor/page.tsx og components/admin/MoodPicker.tsx,
-- samme "egen kuraterings-side"-mønster som /admin/utvalg (is_featured)) –
-- og til slutt presisert: "viktig at hver rett kan ligge inne i flere enn
-- ett humør". Derfor et ARRAY-felt (moods), ikke én enkelt verdi (mood).
--
-- Bakgrunn for hvorfor AI-matchingen ble forlatt helt (ikke bare
-- feilrettet): selv etter at cache-buggen ble fikset (se
-- 2d229a7-commiten – et tomt AI-svar ble feilaktig cachet for alltid) ga
-- fortsatt "koselig kveld" og "imponer gjestene" ingen treff, og
-- "quick"-varianten (deterministisk sortert på total_time_minutes, ingen
-- AI) viste panna cotta under "rask middag" bare fordi den tar 20 minutter
-- – selv om det er en dessert, ikke en middagsrett. Et enkelt,
-- forutsigbart, admin-satt felt slår begge problemene i hjel på én gang:
-- ingen gjetting, ingen AI-kostnad, og Henrik har fullstendig kontroll over
-- nøyaktig hvilke retter som vises hvor.
--
-- moods <@ ARRAY[...] (ikke en fremmednøkkel-tabell) – gyldige verdier er
-- et lite, FAST sett (se lib/kitchen-intelligence/moods.ts sin
-- MOOD_DEFINITIONS, som denne CHECK-constrainten er holdt manuelt i synk
-- med), ikke noe admin selv skal kunne dikte opp nye av, så en egen
-- junction-tabell (slik som recipe_tags for de frie tag-ene) ville vært
-- unødvendig maskineri. NOT NULL DEFAULT '{}' (ikke NULL) – slipper
-- null-sjekk overalt i spørringer/app-kode, tom liste UTTRYKKER allerede
-- "ikke valgt" like godt som NULL ville gjort.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.recipes add column if not exists moods text[] not null default '{}';

alter table public.recipes add constraint recipes_moods_check
  check (moods <@ array['quick', 'cozy', 'impress', 'crowd', 'healthy']::text[]);

comment on column public.recipes.moods is
  'Admin-satte "humør"-kategorier for forsidens "Hva passer humøret ditt?"-seksjon, satt fra /admin/humor (se MoodPicker.tsx). Delmengde av de fem faste verdiene i lib/kitchen-intelligence/moods.ts sin MOOD_DEFINITIONS – en oppskrift kan stå i flere humør samtidig. Tom liste (default) = ikke valgt, vises da under ingen stemning. Erstatter den tidligere AI-baserte matchingen (getMoodRecommendations) fullstendig.';
