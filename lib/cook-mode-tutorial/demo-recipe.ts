import type { IngredientGroup, RecipeStep } from "@/lib/types";
import type { Lang } from "@/lib/i18n";

/**
 * (28.09.2026) Liten, hardkodet demo-"oppskrift" til Cook Mode-tutorialen
 * (se components/cook-mode-tutorial/CookModeTutorial.tsx og Henriks ønske:
 * "Utforsk Cook Mode" på forsiden landet før på en TILFELDIG, ekte
 * oppskrift, som kunne virke forvirrende – nå kommer man i stedet inn i en
 * guidet gjennomgang av selve Cook Mode-grensesnittet, med denne
 * oppdiktede retten som "prøvekanin").
 *
 * Bevisst EN egen, liten fil her i stedet for en rad i `recipes`-tabellen
 * i Supabase (slik ekte oppskrifter lagres) – denne "oppskriften" skal
 * ALDRI dukke opp i søk/kategorier/admin osv., og siden Claude ikke har
 * lov til å kjøre migrasjoner mot produksjonsdatabasen uansett, er en
 * ren TypeScript-kilde her den enkleste, tryggeste og mest åpenbart
 * isolerte løsningen (samme strategi som DSVDVs egen
 * lib/dsvdv/jobbmat-data.ts, av lignende grunner).
 *
 * Steg 3 sin tekst ("... i 3-4 minutter ...") er BEVISST valgt for å
 * trigge parseStepDurationMs (lib/kitchen-intelligence/timers.ts) sin
 * varighets-gjenkjenning, slik at "Sett timer"-knappen faktisk vises når
 * tutorialen peker på den – ikke bare en påstått funksjon uten noe å vise
 * frem. Retten/steget matcher for øvrig ordrett den statiske
 * telefon-mockupen i components/home/CookModeShowcase.tsx (samme
 * "Kremet trøffelpasta"/steg-tekst), slik at forhåndsvisningen på
 * forsiden og den ekte tutorialen henger sammen i stedet for å vise to
 * forskjellige oppdiktede retter.
 */
const CONTENT: Record<
  Lang,
  {
    title: string;
    ingredients: { amount: string; unit: string | null; name: string; note?: string }[];
    steps: string[];
  }
> = {
  no: {
    title: "Kremet trøffelpasta",
    ingredients: [
      { amount: "300", unit: "g", name: "rigatoni" },
      { amount: "2", unit: "ss", name: "smør" },
      { amount: "2", unit: "fedd", name: "hvitløk", note: "finhakket" },
      { amount: "2", unit: "dl", name: "fløte" },
      { amount: "1", unit: "ss", name: "trøffelolje" },
      { amount: "50", unit: "g", name: "parmesan", note: "finrevet" },
    ],
    steps: [
      "Kok pastaen i godt saltet vann til den er akkurat al dente.",
      "Smelt smøret i en panne og fres hvitløken forsiktig i ca. 1 minutt, uten at den tar farge.",
      "Ha i fløten og la sausen småkoke i 3-4 minutter til den tykner.",
      "Vend inn pastaen, parmesan og trøffelolje. Server med en gang, gjerne med litt ekstra parmesan på toppen.",
    ],
  },
  en: {
    title: "Creamy truffle pasta",
    ingredients: [
      { amount: "300", unit: "g", name: "rigatoni" },
      { amount: "2", unit: "tbsp", name: "butter" },
      { amount: "2", unit: "cloves", name: "garlic", note: "finely chopped" },
      { amount: "2", unit: "dl", name: "cream" },
      { amount: "1", unit: "tbsp", name: "truffle oil" },
      { amount: "50", unit: "g", name: "parmesan", note: "finely grated" },
    ],
    steps: [
      "Cook the pasta in well-salted water until just al dente.",
      "Melt the butter in a pan and gently sauté the garlic for about 1 minute, without letting it brown.",
      "Add the cream and let the sauce simmer for 3-4 minutes until it thickens.",
      "Fold in the pasta, parmesan and truffle oil. Serve right away, with a little extra parmesan on top.",
    ],
  },
};

/** Stabil, tydelig gjenkjennelig id – aldri forvekslet med en ekte
 * oppskrifts-UUID. lib/kitchen-intelligence/ai-cache.ts sine
 * get/setCachedAiSuggestion-kall (brukt av CookMode.tsx for
 * tidtaker-merkelapper) svelger stille en evt. feil hvis denne id-en ikke
 * finnes i `recipes`-tabellen (se filheaderen der) – tutorialen fungerer
 * uansett, den blir bare ikke cachet mellom besøk. */
export const COOK_MODE_TUTORIAL_RECIPE_ID = "cook-mode-tutorial-demo";

export function getCookModeTutorialRecipe(lang: Lang): {
  id: string;
  title: string;
  ingredientGroups: IngredientGroup[];
  steps: RecipeStep[];
} {
  const content = CONTENT[lang] ?? CONTENT.no;

  return {
    id: COOK_MODE_TUTORIAL_RECIPE_ID,
    title: content.title,
    ingredientGroups: [
      {
        id: "tutorial-group-1",
        title: null,
        sortOrder: 0,
        items: content.ingredients.map((item, index) => ({
          id: `tutorial-item-${index}`,
          amount: item.amount,
          unit: item.unit,
          name: item.name,
          note: item.note ?? null,
          sortOrder: index,
        })),
      },
    ],
    steps: content.steps.map((text, index) => ({
      id: `tutorial-step-${index}`,
      groupTitle: null,
      stepNumber: index + 1,
      text,
      sortOrder: index,
    })),
  };
}
