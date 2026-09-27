import type { JobbmatRecipe } from "@/lib/dsvdv/types";

/**
 * Placeholder-/testdata for jobbmat – nok til å bygge og teste designet på
 * Jobbmat-siden og de fire filtrerte listene (mikro/airfryer/toastjern/
 * null innsats), IKKE et forsøk på et ferdig, fylt utvalg. Selve
 * oppskriftsinnholdet designes og fylles videre i en senere runde (se
 * oppdraget dette ble bygget fra). Se filheaderen i lib/dsvdv/types.ts for
 * hvorfor dette er en enkel, lokal liste og ikke en Supabase-tabell.
 */
export const JOBBMAT_RECIPES: JobbmatRecipe[] = [
  {
    slug: "havregrot-pa-jobben",
    navn: "Havregrøt på jobben",
    kortBeskrivelse: "Rask, varm grøt rett i mikroen – ferdig før kaffen er trukket.",
    totalMinutter: 4,
    utstyr: ["mikro"],
    forberedHjemme: ["Mål opp havregryn og en klype salt i en boks hjemme, klar til å ta med."],
    taMed: ["Havregryn-boksen", "Melk eller vann", "Eventuelt honning/bær/kanel"],
    ingredienser: ["1 dl havregryn", "2,5 dl melk eller vann", "En klype salt", "Valgfri topping"],
    fremgangsmate: [
      "Bland havregryn, væske og salt i en mikrobolle.",
      "Kjør 2–3 minutter på full effekt, rør underveis.",
      "La stå ett minutt, topp med det du har med.",
    ],
  },
  {
    slug: "sprostekt-halloumi-airfryer",
    navn: "Sprøstekt halloumi i airfryer",
    kortBeskrivelse: "Gyllen og sprø utenpå, myk inni – ingen stekepanne eller olje-lukt på kjøkkenet.",
    totalMinutter: 10,
    utstyr: ["airfryer"],
    taMed: ["1 pk. halloumi", "Litt honning eller chilisaus (valgfritt)"],
    ingredienser: ["1 pakke halloumi, skåret i skiver", "Litt olivenolje", "Honning eller chilisaus til servering"],
    fremgangsmate: [
      "Pensle halloumi-skivene tynt med olje.",
      "Airfryer på 200°C i 8–10 minutter, snu halvveis.",
      "Server rett fra kurven med honning eller chilisaus.",
    ],
  },
  {
    slug: "skinke-og-ost-toast",
    navn: "Klassisk skinke- og ost-toast",
    kortBeskrivelse: "Den evige klassikeren – varm, mettende og umulig å gjøre feil.",
    totalMinutter: 6,
    utstyr: ["toastjern"],
    taMed: ["2 brødskiver", "Skinke", "Ost", "Smør"],
    ingredienser: ["2 skiver brød", "2–3 skiver skinke", "Ost etter smak", "Litt smør"],
    fremgangsmate: [
      "Smør utsiden av begge brødskivene.",
      "Fyll med skinke og ost mellom de usmurte sidene.",
      "Press i toastjernet 3–4 minutter til gyllen og sprø.",
    ],
  },
  {
    slug: "gresk-yoghurt-med-granola",
    navn: "Gresk yoghurt med granola",
    kortBeskrivelse: "Null oppvarming, null oppvask – bare hell over og spis.",
    totalMinutter: 2,
    utstyr: [],
    nullInnsats: true,
    taMed: ["Gresk yoghurt", "Granola", "Eventuelt bær"],
    ingredienser: ["2 dl gresk yoghurt", "Håndfull granola", "Valgfrie bær"],
    fremgangsmate: ["Ha yoghurt i en bolle eller boks.", "Topp med granola og eventuelt bær rett før du spiser."],
  },
];
