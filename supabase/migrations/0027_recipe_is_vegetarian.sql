-- ─────────────────────────────────────────────────────────────────────────
-- "Kun vegetar"-filteret på /ukesmeny (01.10.2026). Henrik: "på ukesmeny
-- bør man egentlig ha en knapp 'Kun vegetar'". Henrik valgte (via
-- AskUserQuestion) en ny, enkel admin-bryter fremfor å gjenbruke fri
-- tekst/tags for å avgjøre om en oppskrift er vegetar – samme "eksplisitt
-- admin-satt kategori fremfor AI-gjetting/fritekst-matching"-begrunnelse
-- som moods (0020/0026) og weekly_menu_styles (0025). Styres fra
-- /admin/ukesmeny, samme rad som "utelatt"/stil-ikonene (se
-- WeeklyMenuAdminPicker.tsx). Standardverdi false ("ikke vegetar") – de
-- fleste oppskriftene i en norsk oppskriftsbok er ikke vegetar, så Henrik
-- trenger kun å merke de vegetar-oppskriftene som faktisk finnes, i stedet
-- for å huke av alle de andre én etter én.
--
-- MERK: dette er en HELT ANNEN ting enn den eksisterende
-- recipes.vegetarian_variant (AI-generert vegetar-VARIANT av en
-- kjøtt-/fiskerett) – is_vegetarian sier at SELVE oppskriften, som den
-- står, allerede er vegetar.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.recipes
  add column if not exists is_vegetarian boolean not null default false;

comment on column public.recipes.is_vegetarian is
  'true = denne oppskriften er vegetar (som den står, ikke en generert variant). Admin-satt bryter styrt fra /admin/ukesmeny (se WeeklyMenuAdminPicker.tsx), brukt av "Kun vegetar"-filteret på /ukesmeny (WeeklyMenuView.tsx). Uavhengig av recipes.vegetarian_variant, som er en AI-generert vegetar-variant av en ikke-vegetar oppskrift.';
