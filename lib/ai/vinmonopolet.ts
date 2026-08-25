/**
 * Tynn wrapper rundt Vinmonopolets offisielle Products-API (Open-tilgang,
 * "Get details-normal"-operasjonen) via fetch.
 *
 * VIKTIG, manuelt bekreftet (både Open- og Restricted-abonnement testet i
 * portalen 23.08.2026): dette APIet gir KUN en minimal produktindeks –
 * produkt-ID og kortnavn, søkbart på navn via `productShortNameContains`.
 * INGEN pris, kategori, bilde eller andre felt er tilgjengelig, verken i
 * Open eller Restricted. Det er tydeligvis laget for leverandører som skal
 * synke egne masterdata/salgstall, ikke for et forbrukervendt produktsøk.
 * Se lib/actions/vinmonopolet.ts for hvordan vi likevel bruker dette til
 * å finne et EKTE produkt (AI-en anslår bare prisklasse, verifiserer den
 * ikke – se disclaimeren i UI-et).
 *
 * Krever VINMONOPOLET_API_KEY i .env.local. Kalles ALDRI fra klientkode
 * (kun fra "use server"-actions).
 */

const VINMONOPOLET_PRODUCTS_URL = "https://apis.vinmonopolet.no/products/v0/details-normal";

export interface VinmonopoletProduct {
  productId: string;
  productShortName: string;
  /** ISO-dato (YYYY-MM-DD) for når produktet sist ble endret i Vinmonopolets
   * masterdata, eller null hvis ikke oppgitt. Brukt som et grovt signal på
   * om produktet trolig fortsatt er i sortimentet – APIet har dessverre
   * ingen egen "aktiv/utgått"-status vi kan filtrere direkte på (bekreftet
   * manuelt), så dette er beste tilgjengelige proxy. */
  lastChangedDate: string | null;
}

interface RawVinmonopoletProduct {
  basic?: { productId?: string; productShortName?: string };
  lastChanged?: { date?: string };
}

/** Søker i Vinmonopolets EKTE sortiment etter produkter der kortnavnet
 * inneholder `query` (typisk en drue eller vinstil, f.eks. "Malbec").
 * Returnerer produkt-ID + kortnavn + sist-endret-dato – det er alt APIet
 * tilbyr (ingen pris/kategori/status). Sortert med nylig endrede produkter
 * FØRST, siden det er det nærmeste vi kommer et signal på at produktet
 * fortsatt er i aktivt salg (se merknad på lastChangedDate). */
export async function searchVinmonopoletProducts(
  query: string,
  maxResults = 25,
): Promise<VinmonopoletProduct[]> {
  const apiKey = process.env.VINMONOPOLET_API_KEY;
  if (!apiKey) {
    throw new Error(
      "VINMONOPOLET_API_KEY mangler i .env.local. Konkrete Vinmonopolet-forslag krever en egen API-nøkkel.",
    );
  }

  // Vinmonopolets API godtar ikke mellomrom i parameterverdier (returnerer
  // 422 "No spaces allowed in parameters..."), og ber eksplisitt om
  // underscore i stedet – dette er IKKE løst av vanlig URL-encoding
  // (%20/+), siden det er selve parameterverdien de validerer strengt på,
  // ikke URL-transportformatet. Rammet flerords søkeord som "Sauvignon
  // Blanc" eller "Chianti Classico". Vi trimmer og bytter ut mellomrom med
  // "_" før vi sender det videre.
  const url = new URL(VINMONOPOLET_PRODUCTS_URL);
  url.searchParams.set("productShortNameContains", query.trim().replace(/\s+/g, "_"));
  url.searchParams.set("maxResults", String(maxResults));

  const res = await fetch(url.toString(), {
    headers: { "Ocp-Apim-Subscription-Key": apiKey },
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`Vinmonopolet-søket feilet (${res.status}): ${bodyText.slice(0, 300)}`);
  }

  const data = (await res.json()) as RawVinmonopoletProduct[];
  const products = data
    .map((row) => ({ basic: row.basic, lastChangedDate: row.lastChanged?.date ?? null }))
    .filter(
      (row): row is { basic: { productId: string; productShortName: string }; lastChangedDate: string | null } =>
        Boolean(row.basic?.productId && row.basic?.productShortName),
    )
    .map((row) => ({
      productId: row.basic.productId,
      productShortName: row.basic.productShortName,
      lastChangedDate: row.lastChangedDate,
    }));

  return products.sort((a, b) => {
    if (!a.lastChangedDate && !b.lastChangedDate) return 0;
    if (!a.lastChangedDate) return 1;
    if (!b.lastChangedDate) return -1;
    return b.lastChangedDate.localeCompare(a.lastChangedDate);
  });
}

/** Bygger en ekte lenke til produktsiden hos Vinmonopolet ut fra kun
 * produkt-ID-en. Manuelt bekreftet at nettsiden ruter på selve ID-en
 * uavhengig av "pynte-teksten" foran (f.eks. produsent/region/årgang) –
 * vi trenger derfor ikke den teksten, som vi uansett ikke får fra APIet. */
export function vinmonopoletProductUrl(productId: string): string {
  return `https://www.vinmonopolet.no/vin/p/${encodeURIComponent(productId)}`;
}

/** Bygger en ekte lenke til flaskebildet hos Vinmonopolet ut fra kun
 * produkt-ID-en. Mønsteret (bilder.vinmonopolet.no/cache/{størrelse}/
 * {productId}-1.jpg) er manuelt bekreftet ved å hente en ekte produktside
 * og lese av bildet i dens og:image-metatag – altså akkurat det Vinmono-
 * polet selv oppgir som det offentlig delbare produktbildet (samme bilde
 * enhver lenkeforhåndsvisning – f.eks. i Slack eller Facebook – ville vist),
 * ikke noe vi har hentet ut ved å skrape siden for øvrig. Ikke alle
 * produkter er garantert å ha bilde her (spesielt eldre/utgåtte produkter),
 * så UI-et må tåle at bildet feiler å laste (onError-håndtering). */
export function vinmonopoletProductImageUrl(productId: string, size = 400): string {
  return `https://bilder.vinmonopolet.no/cache/${size}x${size}-0/${encodeURIComponent(productId)}-1.jpg`;
}

/**
 * Henter EKTE, gjeldende pris (kr) for ett produkt ved å lese av selve
 * produktsiden hos Vinmonopolet – IKKE fra API-et (som ikke har prisdata i
 * det hele tatt, se toppen av filen). Dette går bevisst lenger enn det
 * statiske flaskebildet vi henter andre steder: her gjør vi et ferskt
 * HTTP-oppslag mot en vanlig forbrukerside for hvert produkt vi vurderer,
 * noe robots.txt til Vinmonopolet signaliserer at de ikke ønsker mye av
 * fra automatiserte klienter (10 sek. ventetid / kun nattlig crawling for
 * boter). Henrik har eksplisitt bedt om og godkjent dette etter at to
 * forsøk på AI-gjettet pris viste seg å bomme kraftig (opptil 10x feil).
 * For å holde belastningen lav henter vi kun ett produkt om gangen ved
 * behov (aldri hele sortimentet), begrenset til noen få kandidater per
 * brukerforespørsel (se MAX_PRICE_CHECKS i lib/actions/vinmonopolet.ts).
 *
 * Prisen står ikke i noen egen JSON-LD/pris-metatag (bekreftet manuelt),
 * men i ren tekst i <meta name="description">, f.eks. "Kr 209,90, 75 cl".
 * Vi parser det mønsteret. Returnerer null hvis siden ikke svarer OK
 * (som også er vårt beste signal på at produktet er utgått/fjernet – se
 * bruken i lib/actions/vinmonopolet.ts) eller hvis prisen ikke gjenkjennes.
 */
export async function fetchVinmonopoletProductPriceNok(productId: string): Promise<number | null> {
  try {
    const res = await fetch(vinmonopoletProductUrl(productId), {
      headers: { "User-Agent": "oppskriftsboken.no (vinforslag – henter pris for ett produkt om gangen)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const descriptionMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
    const haystack = descriptionMatch?.[1] ?? html;

    // Matcher f.eks. "Kr 209,90" eller "Kr 1.299,00" (norsk tusenskille/desimal).
    const priceMatch = haystack.match(/Kr\s*(\d{1,3}(?:[.\s]\d{3})*)(?:,(\d{2}))?/i);
    if (!priceMatch) return null;

    const wholePart = priceMatch[1].replace(/[.\s]/g, "");
    const decimalPart = priceMatch[2] ?? "00";
    const price = Number.parseFloat(`${wholePart}.${decimalPart}`);
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch {
    return null;
  }
}
