-- ─────────────────────────────────────────────────────────────────────────
-- Automatisk ukesmeny – hvilke oppskrifter er egnet for en hverdagsmeny
-- (29.09.2026). Henrik: "det er urealistisk å skulle lage indrefilet med
-- rødvinssaus midt i uka" – enkelte publiserte oppskrifter (helgemat,
-- store prosjekter) skal derfor kunne utelates fra den automatiske
-- man–fre-ukesmenyen (se /ukesmeny og admin-siden /admin/ukesmeny) uten at
-- de forsvinner fra resten av siden. Standardverdi false ("med i
-- ukesmenyen") – samme "opt-out fremfor opt-in"-begrunnelse som
-- favorited_by_admin/moods: de aller fleste hverdagsoppskriftene i en
-- oppskriftsbok ER egnet for en hverdag, så Henrik skal kun trenge å merke
-- unntakene, ikke huke av alle de vanlige rettene én etter én.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.recipes
  add column weekly_menu_excluded boolean not null default false;

comment on column public.recipes.weekly_menu_excluded is
  'true = denne oppskriften skal ALDRI trekkes ut i den automatiske man–fre-ukesmenyen (/ukesmeny), f.eks. helgemat eller store prosjekter som ikke passer på en hverdag. Styres fra /admin/ukesmeny (se komponent WeeklyMenuExclusionPicker.tsx). Uavhengig av is_published – en upublisert oppskrift er uansett aldri kandidat.';
