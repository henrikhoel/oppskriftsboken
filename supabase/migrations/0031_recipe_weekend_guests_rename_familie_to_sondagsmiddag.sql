-- "Helg & gjester" (/helg-og-gjester) – Henrik ba 03.10.2026 om å bytte ut
-- anledningen "familie" med "søndagsmiddag" (id: sondagsmiddag). Dette
-- bygger videre på 0030_recipe_weekend_guests.sql, som må være kjørt FØR
-- denne (denne migrasjonen forutsetter at weekend_guests_occasions-kolonnen
-- og dens CHECK-constraint allerede finnes).
--
-- Rekkefølge er viktig: den GAMLE constrainten tillater kun "familie", ikke
-- "sondagsmiddag" – så den må droppes FØR update-setningen under, ellers
-- feiler selve oppdateringen (satt i feil rekkefølge i en tidligere versjon
-- av denne fila, se "new row ... violates check constraint"-feilen Henrik
-- fikk 03.10.2026). (1) drop gammel constraint, (2) flytt ev.
-- allerede-taggede oppskrifter fra "familie" til "sondagsmiddag", (3) legg
-- på ny, innstrammet constraint igjen.

alter table public.recipes drop constraint if exists recipes_weekend_guests_occasions_check;

update public.recipes
set weekend_guests_occasions = array_replace(weekend_guests_occasions, 'familie', 'sondagsmiddag')
where 'familie' = any(weekend_guests_occasions);

alter table public.recipes add constraint recipes_weekend_guests_occasions_check
  check (weekend_guests_occasions <@ array['fredagskveld', 'date_night', 'venner_pa_middag', 'sondagsmiddag', 'feiring']::text[]);

comment on column public.recipes.weekend_guests_occasions is
  'Admin-satte "Helg & gjester"-anledninger (fredagskveld/date_night/venner_pa_middag/sondagsmiddag/feiring), se WEEKEND_GUESTS_OCCASION_DEFINITIONS i lib/kitchen-intelligence/weekend-guests.ts. "familie" ble omdøpt til "sondagsmiddag" i denne migrasjonen (0031). En oppskrift kan stå i flere anledninger samtidig. Tom liste (default) = kun med under "Alle" på /helg-og-gjester, ikke under noen spesifikk anledning. Uavhengig av weekend_guests i selve databasen, se 0030_recipe_weekend_guests.sql sin filheader.';
