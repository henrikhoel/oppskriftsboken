/**
 * Delt register for "Helg & gjester" (03.10.2026) – en kuratert
 * inspirasjonsside for retter man gjør litt mer ut av (helg, date night,
 * venner på middag, søndagsmiddag, feiring), IKKE en generator som
 * Ukesmeny.
 * Henrik, i spesifikasjonen for siden: "Dette skal IKKE fungere som
 * Ukesmeny. Det skal ikke genereres noe. Brukeren skal lande direkte i et
 * kuratert utvalg av retter og kunne filtrere dem etter anledning."
 *
 * Fem faste anledninger – IKKE fritekst, samme "lite, fast sett fremfor
 * fri tagging"-begrunnelse som WEEKLY_MENU_STYLE_DEFINITIONS
 * (weekly-menu-styles.ts) og MOOD_DEFINITIONS (moods.ts): Henrik velger
 * selv hvilke oppskrifter som passer hvor, fra /admin/helg-og-gjester – en
 * oppskrift kan stå i FLERE anledninger samtidig (samme
 * "flere-samtidig"-mønster som moods/courses/weekly_menu_styles).
 *
 * "Alle" (ALL_OCCASIONS_FILTER under) er BEVISST IKKE en av disse fem – det
 * er ikke en admin-satt kategori en oppskrift kan tagges med i databasen,
 * men standardfilteret på selve /helg-og-gjester, som betyr "alle
 * oppskrifter med Helg & gjester aktivert" (recipes.weekend_guests = true),
 * uavhengig av hvilke(n) anledning(er) de i tillegg måtte ha. Se migrasjon
 * 0030_recipe_weekend_guests.sql for selve databasekolonnene denne lista
 * speiler (CHECK-constrainten der holdes manuelt i synk med id-ene under).
 *
 * "familie" ble erstattet med "sondagsmiddag" (visningsnavn "Søndagsmiddag")
 * 03.10.2026 på Henriks forespørsel – se migrasjon
 * 0031_recipe_weekend_guests_rename_familie_to_sondagsmiddag.sql for
 * CHECK-constrainten og datamigreringen av allerede-tagg­ede oppskrifter.
 */

export const WEEKEND_GUESTS_OCCASION_DEFINITIONS = [
  { id: "fredagskveld", labelKey: "weekendGuests.occasion.fredagskveld" },
  { id: "date_night", labelKey: "weekendGuests.occasion.date_night" },
  { id: "venner_pa_middag", labelKey: "weekendGuests.occasion.venner_pa_middag" },
  { id: "sondagsmiddag", labelKey: "weekendGuests.occasion.sondagsmiddag" },
  { id: "feiring", labelKey: "weekendGuests.occasion.feiring" },
] as const;

export type WeekendGuestsOccasionId = (typeof WEEKEND_GUESTS_OCCASION_DEFINITIONS)[number]["id"];

/** Pseudo-filteret "Alle" på selve /helg-og-gjester – se filheaderen over
 * for hvorfor dette IKKE er en sjette admin-kategori. Flyttet hit (samme
 * mønster som VARIED_CHOICE i weekly-menu-styles.ts) slik at både siden
 * (klientkomponent) og ev. fremtidig server-kode kan referere samme
 * konstant/type uten en klientkomponent-import. */
export const ALL_OCCASIONS_FILTER = "alle" as const;
export type WeekendGuestsOccasionFilter = typeof ALL_OCCASIONS_FILTER | WeekendGuestsOccasionId;
