/**
 * Sentral konfigurasjon for navn, branding, farger og metadata.
 *
 * Dette er DEN ENE filen du trenger å endre for å gi nettsiden et nytt navn,
 * ny logo-tekst eller nye farger. Fargeverdiene her er speilet i
 * app/globals.css (Tailwind @theme), siden Tailwind v4 leser fargetokens
 * fra CSS – hvis du endrer en farge her, oppdater samme verdi der.
 */

export const siteConfig = {
  /** Vises i header, footer, metadata-tittel og som fallback-logo. */
  name: "CONVITE",
  /**
   * Kort merkevare-slagord, vises i hero-seksjonen i kursiv rett under
   * "CONVITE"-ordmerket. Bevisst holdt på engelsk i BEGGE språkvarianter
   * (samme mønster som f.eks. "Just Do It") – dette er selve merkevaren,
   * ikke tekst som skal oversettes med resten av siden.
   */
  tagline: "Cook well. Eat better.",
  taglineEn: "Cook well. Eat better.",
  description:
    "En personlig digital kokebok med oppskrifter, fremgangsmåter og handlelister, samlet på ett sted.",
  descriptionEn:
    "A personal digital cookbook with recipes, instructions and shopping lists, all in one place.",
  /** Brukes til absolutte URL-er i Open Graph / JSON-LD / canonical. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /** Emoji/tekst-basert favicon-erstatning inntil egen logo er lastet opp. */
  logoInitial: "C",
  locale: "nb_NO",
  author: "CONVITE",
} as const;

/**
 * Vanskelighetsgrader brukt i skjema og filter. Rekkefølgen her styrer
 * sorteringsrekkefølgen i UI.
 */
export const DIFFICULTY_LEVELS = ["enkel", "middels", "avansert"] as const;
export type Difficulty = (typeof DIFFICULTY_LEVELS)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  enkel: "Enkel",
  middels: "Middels",
  avansert: "Avansert",
};

/** Standard porsjonsvalg vist i skaleringsvelgeren på oppskriftssiden. */
export const SERVING_OPTIONS = [1, 2, 3, 4, 6, 8, 10, 12] as const;

/**
 * Styrkegrad for sterk mat (1 = medium, 2 = sterk, 3 = veldig sterk) – satt
 * i "Sterk mat"-feltet i components/admin/RecipeForm.tsx, vist som en
 * fargetone-badge på oppskriftssiden (components/recipe/RecipeHero.tsx).
 * Erstattet 03.10.2026 et håndtegnet chili-ikon (se den lange runde-for-
 * runde-historikken i git-loggen for components/ui/icons.tsx, som aldri
 * klarte å treffe referansebildene godt nok) med ren tekst + farge –
 * Henrik, etter siste forsøk: "det ser helt feil ut, hvorfor må du tegne
 * det?", og deretter: "dropper symbol og bare tar sirkler" → "eller:
 * Sterkhet, også står det 'mild' 'medium' eller 'sterk'" → "Mild i grønn,
 * medium i oransj, og sterk i rød".
 *
 * OMDØPT 04.10.2026 (Henrik: "gjør om sterkhetsgradene til medium, sterk,
 * veldig sterk. farge - gul - oransj - rød") – skalaen starter altså ikke
 * lenger på "mild" (ufarlig/nøytral), men på "medium", så fargelogikken
 * flyttet ett trinn opp: gul for medium, oransj (mustard, uendret) for
 * sterk, rød (chili, uendret) for veldig sterk. Samme "jo sterkere jo mer
 * alvorlig farge"-logikk som et trafikklys, bare forskjøvet ett hakk.
 */
export const SPICE_LEVELS = [1, 2, 3] as const;
export type SpiceLevel = (typeof SPICE_LEVELS)[number];

export const SPICE_LEVEL_LABELS: Record<SpiceLevel, string> = {
  1: "Medium",
  2: "Sterk",
  3: "Veldig sterk",
};

/** Tailwind-klasser for fargetonen per styrkegrad, se filheaderen over.
 * Samme bg-lys/text-mørk-par-mønster som toneClasses i
 * components/ui/Badge.tsx, men med chili/lemon i stedet for et badge-
 * tone-navn siden Badge-komponenten ikke har noen rød eller gul tone (og
 * begge bevisst kun brukes til dette formålet, se kommentarene ved
 * --color-lemon/--color-chili i app/globals.css). Sterk bruker
 * text-mustard (IKKE text-clay-dark, som Badge.tsx sin "mustard"-tone
 * ellers låner) – clay-dark ER appens vanlige gull-aksentfarge andre
 * steder, og ville gjort "sterk" se gull ut i stedet for distinkt
 * oransje, verifisert visuelt side om side før dette ble valgt. */
export const SPICE_LEVEL_CLASSES: Record<SpiceLevel, string> = {
  1: "bg-lemon-light text-lemon",
  2: "bg-mustard-light text-mustard",
  3: "bg-chili/15 text-chili",
};
