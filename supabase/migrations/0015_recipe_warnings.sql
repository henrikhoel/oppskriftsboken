-- ─────────────────────────────────────────────────────────────────────────
-- "Pass på" for oppskrifter – bygget 27.08.2026 etter ønske fra Henrik: en
-- kort, fritekst "ting å passe på"-notis nederst på oppskriften, samme idé
-- som knowledge_guides.warnings (migrasjon 0013), men ETT enkelt tekstfelt
-- (ikke text[]) for å matche det eksisterende recipes.tips-feltet den står
-- rett ved siden av i admin-skjemaet – se filheaderen til Recipe.warnings i
-- lib/types.ts.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.recipes add column if not exists warnings text;

comment on column public.recipes.warnings is
  'Kort "pass på"-notis (fritekst, ett felt – ikke en liste) vist sammen med tips på oppskriftssiden. Kan skrives for hånd eller genereres med AI (se generateRecipeTipsAndWarnings i lib/actions/recipes.ts). NULL = ingen notis.';
