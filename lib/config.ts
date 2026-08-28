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
    "En personlig digital kokebok med oppskrifter, fremgangsmåter og handlelister – samlet på ett sted.",
  descriptionEn:
    "A personal digital cookbook with recipes, instructions and shopping lists – all in one place.",
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
