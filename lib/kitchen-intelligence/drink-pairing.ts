/**
 * Delte typer/registeret for "Drikke til" (vin/øl/alkoholfritt-forslaget på
 * oppskriftssiden). Samme mønster som lib/kitchen-intelligence/taste.ts og
 * nutrition.ts: IKKE en live, per-besøk AI-beregning – flyttet 11.09.2026
 * (Henrik: "smartere økonomisk å la vinforslaget være noe jeg genererer en
 * gang for hver rett") fra en cachet, besøkende-trigget AI-beregning
 * (getDrinkPairing, tidligere i lib/actions/kitchen-intelligence.ts, se
 * MERK-kommentaren for "drink_pairing" i types.ts sin AI_CACHE_FEATURES) til
 * en forhåndsgenerert admin-egenskap lagret direkte på oppskriften
 * (recipes.drink_pairing) – se generateDrinkPairing/clearDrinkPairing i
 * lib/actions/recipes.ts. Vises fortsatt bak samme "DRIKKE TIL"-knapp som før
 * på selve oppskriftssiden (components/recipe/DrinkPairingSection.tsx),
 * bevisst med en kort, kunstig "sjekker"-forsinkelse der (IKKE et ekte
 * AI-kall lenger) slik at det fortsatt føles som et valg blir tatt idet
 * knappen trykkes.
 *
 * I MOTSETNING til taste_profile (kun summary/summaryEn er tospråklig, selve
 * 0-5-tallene er språkuavhengige) er HVERT felt her tospråklig – se
 * DrinkPairingOption – siden hele poenget med teksten (stil/detalj/
 * begrunnelse) er språkavhengig. ÉN admin-generering dekker derfor BEGGE
 * språk i ett AI-kall, ikke to separate kall/cache-rader slik den gamle,
 * per-lang-cachede versjonen gjorde.
 */

export interface DrinkPairingOption {
  /** Kort stil-/typenavn, norsk – f.eks. "Côtes du Rhône" (vin) eller "Dry
   * stout" (øl) eller "Syrlig eplemost" (alkoholfritt). ALDRI et produsent-
   * eller merkenavn – se system-prompten i generateDrinkPairing. */
  style: string;
  /** Samme felt på engelsk – en oversettelse av style, ikke en ny,
   * uavhengig vurdering (se generateDrinkPairing sin system-prompt). */
  styleEn: string;
  /** Valgfri kort detaljlinje, norsk – typisk relevante druer for vin.
   * Null når det ikke tilfører noe (vanlig for øl og alkoholfrie forslag). */
  detail: string | null;
  detailEn: string | null;
  /** Én kort setning, norsk: HVORFOR denne matcher akkurat denne retten. */
  note: string;
  noteEn: string;
}

export interface DrinkPairing {
  wine: DrinkPairingOption;
  beer: DrinkPairingOption;
  nonAlcoholic: DrinkPairingOption;
}

/** Ett språks utsnitt av en DrinkPairingOption (kun style/detail/note, ingen
 * *En-varianter) – formen komponentene faktisk viser, se
 * localizedDrinkPairingOption i lib/utils/format.ts. */
export interface LocalizedDrinkOption {
  style: string;
  detail: string | null;
  note: string;
}

export interface LocalizedDrinkPairing {
  wine: LocalizedDrinkOption;
  beer: LocalizedDrinkOption;
  nonAlcoholic: LocalizedDrinkOption;
}

interface RawDrinkPairingOption {
  style?: string;
  styleEn?: string;
  detail?: string | null;
  detailEn?: string | null;
  note?: string;
  noteEn?: string;
}

/** Klemmer/trimmer ett rått AI-svar for én drikkekategori til en gyldig
 * DrinkPairingOption – samme lengdegrenser (60/220 tegn) som den tidligere,
 * live varianten hadde, nå anvendt på begge språk. */
export function cleanDrinkPairingOption(raw: RawDrinkPairingOption | undefined): DrinkPairingOption {
  const detail = typeof raw?.detail === "string" ? raw.detail.trim().slice(0, 60) : "";
  const detailEn = typeof raw?.detailEn === "string" ? raw.detailEn.trim().slice(0, 60) : "";
  return {
    style: (raw?.style ?? "").trim().slice(0, 60),
    styleEn: (raw?.styleEn ?? "").trim().slice(0, 60),
    detail: detail || null,
    detailEn: detailEn || null,
    note: (raw?.note ?? "").trim().slice(0, 220),
    noteEn: (raw?.noteEn ?? "").trim().slice(0, 220),
  };
}
