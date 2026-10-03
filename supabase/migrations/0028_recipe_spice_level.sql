-- ─────────────────────────────────────────────────────────────────────────
-- "Sterk mat" (03.10.2026). Henrik: "jeg tror vi kan fjerne 'smaksprofil'
-- den gir ingenting. så kan vi heller legge til en checkboks inn på
-- redigeringssiden hvor jeg kan huke av for om den er spicy, og evt hvor
-- spicy. 1-3 chili symboler kanskje." Erstatter den tidligere AI-genererte
-- "spicy"-dimensjonen i smaksprofilen (recipes.taste_profile, 0008) med et
-- enkelt, pålitelig admin-satt felt – samme "eksplisitt admin-kategori
-- fremfor AI-gjetting/fritekst-matching"-begrunnelse som moods (0020/0026),
-- weekly_menu_styles (0025) og is_vegetarian (0027).
--
-- Satt direkte i det vanlige RecipeForm.tsx-skjemaet (ikke en egen
-- "Generer med AI"-knapp/server action som smaksprofilen hadde) – lagres
-- sammen med resten av oppskriften når admin trykker lagre/opprett.
--
-- Ett felt, ikke to: en smallint 1-3 der NULL dekker både "ikke sterk" OG
-- "ikke satt ennå" i samme slag – "er den sterk?"-avkrysningsboksen i
-- RecipeForm.tsx er avledet av om feltet har en verdi eller ikke, i stedet
-- for en egen boolean-kolonne ved siden av.
--
-- MERK: recipes.taste_profile (0008) er BEVISST IKKE droppet her – samme
-- "la foreldreløse kolonner ligge urørt"-konvensjon som resten av
-- prosjektet (se f.eks. MERK-kommentarene i
-- lib/kitchen-intelligence/types.ts for "mood_mode"/"taste_profile"/
-- "drink_pairing"). Den leses/skrives ikke lenger av noe kode etter denne
-- endringen – trygt å ligge urørt, eller slettes manuelt i Supabase-
-- dashbordet senere om ønskelig.
--
-- Kjøres på samme måte som de foregående migrasjonene: lim hele filen inn i
-- Supabase-dashbordet → SQL Editor → Run.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.recipes add column if not exists spice_level smallint;

alter table public.recipes add constraint recipes_spice_level_check
  check (spice_level is null or spice_level between 1 and 3);

comment on column public.recipes.spice_level is
  'Admin-satt styrkegrad for sterk mat (1-3 chili), satt fra "Sterk mat"-avkrysningsboksen + chili-velgeren i components/admin/RecipeForm.tsx. NULL = ikke sterk/ikke satt. Erstatter den tidligere AI-genererte "spicy"-dimensjonen i recipes.taste_profile (nå fjernet fra UI-et, se MERK-kommentaren i lib/actions/recipes.ts).';
