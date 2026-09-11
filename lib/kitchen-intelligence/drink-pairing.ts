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
 *
 * DrinkPairing.pinnedWine (lagt til 11.09.2026, se PinnedVinmonopoletProduct
 * under) er et HELT SEPARAT, valgfritt tillegg: et admin-kuratert, KONKRET
 * Vinmonopolet-produkt for vin-forslaget, satt enten via et AI-drevet søk
 * (samme motor som den live "Finn en konkret vin"-knappen alltid har brukt,
 * se lib/actions/vinmonopolet.ts) eller ved å lime inn en ekte produktlenke
 * direkte. Uavhengig av den tospråklige stil/detalj/begrunnelse-teksten
 * over – man kan ha den ene uten den andre.
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

/**
 * Et admin-KURATERT, konkret Vinmonopolet-produkt for VIN-forslaget over –
 * lagt til 11.09.2026 (Henrik: "kunne gå inn på vinmonopolet, hente linken
 * til en vin, og lime den inn på siden sånn at den dukker opp som forslag
 * når folk trykker på den"). Når dette er satt, viser "Finn en konkret vin
 * på Vinmonopolet"-knappen på oppskriftssiden DIREKTE dette produktet i
 * stedet for å gjøre et live AI-drevet søk (se DrinkPairingSection.tsx) –
 * fortsatt med en fersk pris-sjekk (resolveVinmonopoletProductById i
 * lib/actions/vinmonopolet.ts), siden prisen kan bli utdatert selv om selve
 * produktvalget er admin sitt faste valg.
 *
 * Satt/fjernet via savePinnedWineProduct i lib/actions/recipes.ts (EGEN,
 * målrettet lagring – IKKE del av saveDrinkPairing/generateDrinkPairing sin
 * tekstlagring, se kommentaren der for hvorfor: å regenerere/redigere
 * vin/øl/alkoholfritt-TEKSTEN skal aldri utilsiktet slette dette pinnede
 * produktvalget, og omvendt).
 */
export interface PinnedVinmonopoletProduct {
  productId: string;
  productName: string;
  url: string;
  imageUrl: string;
  /** Prisen slik den var da admin sist hentet/bekreftet produktet – IKKE
   * nødvendigvis fasit akkurat nå, se filheaderen over. */
  priceNok: number | null;
  /** Valgfri, admin-skrevet begrunnelse (samme rolle som DrinkPairingOption
   * sin "note", men for dette ene konkrete produktet) – tom streng er
   * gyldig, DrinkPairingSection.tsx faller da tilbake til en generisk tekst. */
  reasoning: string;
}

interface RawPinnedVinmonopoletProduct {
  productId?: string;
  productName?: string;
  url?: string;
  imageUrl?: string;
  priceNok?: number | null;
  reasoning?: string;
}

/** Samme "klem/trim et rått AI- eller admin-skrevet svar"-prinsipp som
 * cleanDrinkPairingOption under, for et pinnet produkt. Returnerer null
 * (i stedet for et "tomt" objekt) når produktId/produktnavn/lenke mangler –
 * et pinnet produkt uten disse er meningsløst å lagre/vise, ULIKT en
 * DrinkPairingOption (som gyldig kan være "tom" inntil generert/skrevet). */
export function cleanPinnedVinmonopoletProduct(
  raw: RawPinnedVinmonopoletProduct | null | undefined,
): PinnedVinmonopoletProduct | null {
  const productId = (raw?.productId ?? "").trim();
  const productName = (raw?.productName ?? "").trim().slice(0, 160);
  const url = (raw?.url ?? "").trim();
  if (!productId || !productName || !url) return null;
  return {
    productId,
    productName,
    url,
    imageUrl: (raw?.imageUrl ?? "").trim(),
    priceNok: typeof raw?.priceNok === "number" && Number.isFinite(raw.priceNok) ? raw.priceNok : null,
    reasoning: (raw?.reasoning ?? "").trim().slice(0, 300),
  };
}

export interface DrinkPairing {
  wine: DrinkPairingOption;
  beer: DrinkPairingOption;
  nonAlcoholic: DrinkPairingOption;
  /** Valgfritt, se PinnedVinmonopoletProduct sin filheader over. Null/
   * undefined = ikke satt, "Finn en konkret vin"-knappen gjør da fortsatt et
   * live AI-drevet søk som før. */
  pinnedWine?: PinnedVinmonopoletProduct | null;
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

/** Bygger fritekst-strengen getVinmonopoletWineSuggestion (og AI-søket bak
 * "Finn et konkret forslag automatisk" i admin) forventer ut fra ETT
 * språks vin-felt – delt mellom components/recipe/DrinkPairingSection.tsx
 * (der option er en allerede-lokalisert LocalizedDrinkOption) og
 * components/admin/RecipeForm.tsx (der option bygges direkte fra det
 * norske DrinkOptionFormState-utsnittet admin redigerer, siden det konkrete
 * vin-søket i admin alltid kjøres på norsk – se filheaderen til
 * DrinkOptionFieldGroup der). */
export function drinkOptionSearchText(option: { style: string; detail: string | null; note: string }): string {
  const styleAndDetail = option.detail ? `${option.style} (${option.detail})` : option.style;
  return option.note ? `${styleAndDetail}. ${option.note}` : styleAndDetail;
}
