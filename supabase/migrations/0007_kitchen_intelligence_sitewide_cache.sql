-- FASE 4 (Smak) av "Kjøkkenintelligens"-utvidelsen – Stemningsvelgeren
-- (Mood Mode).
--
-- Alle kjøkkenintelligens-cache-funksjoner så langt (erstatninger,
-- parallelle steg, smaksprofil, meny-forslag) har vært knyttet til ÉN
-- bestemt oppskrift. Stemningsvelgeren er annerledes: spørsmålet
-- ("hvilke oppskrifter passer til stemningen 'koselig'?") er sidevidt, ikke
-- knyttet til noen bestemt oppskrift, og gjelder likt for alle besøkende.
--
-- Fremfor å finne opp en helt egen cache-tabell for dette ene tilfellet,
-- gjøres recipe_id her nullable på den delte ai_suggestion_cache-tabellen
-- fra 0006 – NULL = "ikke knyttet til én bestemt oppskrift". Se
-- lib/kitchen-intelligence/ai-cache.ts for hvordan NULL-tilfellet håndteres
-- i selve applikasjonskoden (unik-constrainten under skiller ikke to
-- NULL-rader fra hverandre, så det slås opp/oppdateres manuelt i koden i
-- stedet for å stole på databasens ON CONFLICT der).
--
-- Kjøres på samme måte som de foregående migrasjonene: lim hele filen inn i
-- Supabase-dashbordet → SQL Editor → Run.

alter table public.ai_suggestion_cache alter column recipe_id drop not null;

comment on column public.ai_suggestion_cache.recipe_id is
  'Hvilken oppskrift svaret gjelder for. NULL = sidevidt svar, ikke knyttet til én bestemt oppskrift (f.eks. mood_mode) – se lib/kitchen-intelligence/ai-cache.ts.';
