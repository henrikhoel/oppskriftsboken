-- ─────────────────────────────────────────────────────────────────────────
-- "Helg & gjester" (03.10.2026) – ny kuratert inspirasjonsside for retter
-- man gjør litt mer ut av (helg, date night, venner på middag, familie,
-- feiring). Henrik sin spesifikasjon var eksplisitt: "Dette skal IKKE
-- fungere som Ukesmeny. Det skal ikke genereres noe. Brukeren skal lande
-- direkte i et kuratert utvalg av retter og kunne filtrere dem etter
-- anledning", og videre: "Ikke koble dette automatisk til Ukesmeny. En
-- oppskrift kan være: bare Ukesmeny / bare Helg & gjester / begge / ingen
-- av dem" og "Ikke koble Helg & gjester teknisk til 'Gjør det til en
-- kveld'. Jeg styrer selv begge togglene."
--
-- To uavhengige, admin-satte felt – direkte parallell til
-- weekly_menu_excluded + weekly_menu_styles (migrasjon
-- 0024/0025_recipe_weekly_menu_*.sql):
--
-- 1. weekend_guests (boolsk) – selve av/på-bryteren. Standard false
--    (opt-in, motsatt av weekly_menu_excluded sin opt-OUT-logikk) – de
--    fleste oppskriftene er ikke kuratert for denne siden, så Henrik
--    merker aktivt de han faktisk vil ha med, i stedet for å utelate alle
--    de andre én etter én. "Alle" på selve /helg-og-gjester betyr nettopp
--    "alle oppskrifter med weekend_guests = true", se
--    ALL_OCCASIONS_FILTER i lib/kitchen-intelligence/weekend-guests.ts.
-- 2. weekend_guests_occasions (text[]) – hvilken(e) av de fem faste
--    anledningene oppskriften i tillegg passer til. En oppskrift kan stå i
--    FLERE anledninger samtidig, samme "flere-samtidig"-mønster som
--    moods/courses/weekly_menu_styles. Tom liste er gyldig (oppskriften
--    vises da kun under "Alle", ikke under noen spesifikk anledning) –
--    weekend_guests_occasions er bevisst UAVHENGIG av weekend_guests i
--    databasen (ingen CHECK/trigger som krever at den ene impliserer den
--    andre), selv om admin-UI-et i praksis kun lar deg sette anledninger
--    på en oppskrift som allerede har weekend_guests = true (se
--    WeekendGuestsAdminPicker.tsx).
--
-- weekend_guests_occasions <@ ARRAY[...] – gyldige verdier er det lille,
-- FASTE settet i WEEKEND_GUESTS_OCCASION_DEFINITIONS (lib/kitchen-
-- intelligence/weekend-guests.ts), som denne CHECK-constrainten holdes
-- manuelt i synk med, akkurat som moods/courses/weekly_menu_styles sine
-- CHECK-constraints holdes i synk med sine respektive definisjonslister.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.recipes add column if not exists weekend_guests boolean not null default false;

alter table public.recipes add column if not exists weekend_guests_occasions text[] not null default '{}';

alter table public.recipes add constraint recipes_weekend_guests_occasions_check
  check (weekend_guests_occasions <@ array['fredagskveld', 'date_night', 'venner_pa_middag', 'familie', 'feiring']::text[]);

comment on column public.recipes.weekend_guests is
  'true = denne oppskriften er med i den kuraterte "Helg & gjester"-siden (/helg-og-gjester). Admin-satt bryter styrt fra /admin/helg-og-gjester (se WeekendGuestsAdminPicker.tsx). Standard false (opt-in) – uavhengig av weekly_menu_excluded/show_meal_builder, se migrasjonens filheader.';

comment on column public.recipes.weekend_guests_occasions is
  'Admin-satte "Helg & gjester"-anledninger (fredagskveld/date_night/venner_pa_middag/familie/feiring), se WEEKEND_GUESTS_OCCASION_DEFINITIONS i lib/kitchen-intelligence/weekend-guests.ts. En oppskrift kan stå i flere anledninger samtidig. Tom liste (default) = kun med under "Alle" på /helg-og-gjester, ikke under noen spesifikk anledning. Uavhengig av weekend_guests i selve databasen, se migrasjonens filheader.';
