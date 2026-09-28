-- ─────────────────────────────────────────────────────────────────────────
-- Ukesmeny-stiler – la brukeren velge HVORDAN uken skal være (30.09.2026).
-- Henrik: "Jeg vil at brukeren skal få muligheten til å velge hvordan uken
-- skal være. da tenker jeg 5 kategorier: Variert (standardvalget) / Sunt
-- og enkelt / Rask uke / Familievennlig / Litt ekstra ... dette blir
-- igjen, likt som de andre kategoriene og humør, noe jeg kan velge inne på
-- admin siden selv, slik at det kun genereres ut ifra rettene i den
-- bestemte kategorien brukeren velger."
--
-- Samme mønster som moods (0020) og courses (0022): et ARRAY-felt (en
-- oppskrift kan passe i flere stiler samtidig, f.eks. både "Rask uke" og
-- "Sunt og enkelt"), gyldige verdier låst til et lite, fast sett via CHECK
-- (holdt manuelt i synk med lib/kitchen-intelligence/weekly-menu-styles.ts
-- sin WEEKLY_MENU_STYLE_DEFINITIONS), IKKE en fremmednøkkel-tabell.
--
-- "Variert" (Henriks standardvalg) er BEVISST IKKE en av de fire gyldige
-- verdiene her – den betyr "ingen stilfilter", ikke en tag en oppskrift
-- kan ha, og håndteres derfor kun klient-side (se WeeklyMenuView.tsx).
-- ─────────────────────────────────────────────────────────────────────────

alter table public.recipes add column if not exists weekly_menu_styles text[] not null default '{}';

alter table public.recipes add constraint recipes_weekly_menu_styles_check
  check (weekly_menu_styles <@ array['sunt_enkelt', 'rask', 'familievennlig', 'litt_ekstra']::text[]);

comment on column public.recipes.weekly_menu_styles is
  'Admin-satte "ukesmeny-stil"-kategorier, satt fra /admin/ukesmeny (se WeeklyMenuAdminPicker.tsx). Delmengde av de fire faste verdiene i lib/kitchen-intelligence/weekly-menu-styles.ts sin WEEKLY_MENU_STYLE_DEFINITIONS – en oppskrift kan stå i flere stiler samtidig. Tom liste (default) = ingen spesifikk stil satt; oppskriften dukker da kun opp under "Variert" (som ikke filtrerer på denne kolonnen i det hele tatt), ikke under noen av de fire spesifikke stilene.';
