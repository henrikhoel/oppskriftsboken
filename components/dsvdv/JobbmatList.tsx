import Image from "next/image";
import Link from "next/link";
import type { JobbmatRecipe } from "@/lib/dsvdv/types";

/**
 * Delt listevisning for de fire filtrerte jobbmat-inngangene (mikro/
 * airfryer/toastjern/null innsats) – hver av app/dsvdv/{mikro,airfryer,
 * toastjern,null-innsats}/page.tsx gjør sin egen `requireDsvdvSession()`
 * og sender så et allerede filtrert utvalg hit.
 *
 * (27.09.2026) Henrik: "inne på hver av kategoriene, så må nesten hver
 * oppskrift ligge på samme måte som inne på selve siden når det er listet
 * opp under 'alle oppskrifter', med kun bilde og navn liksom" – erstattet
 * den forrige, fullt utfylte listevisningen (ingredienser/fremgangsmåte/
 * utstyr/ta med osv. for hver rad) med samme kort-i-rutenett-språk som
 * components/recipe/RecipeGrid.tsx/RecipeCard.tsx bruker på /oppskrifter:
 * aspect-[4/3]-bilde (samme "bilde kommer"-tomtilstand når heroImageUrl/
 * bildeUrl mangler) + navn under, ingenting mer. Selve datamodellen
 * (lib/dsvdv/types.ts) beholder likevel alle de andre feltene – de er der
 * og klare for en fremtidig detaljside, bare ikke vist her ennå.
 *
 * IKKE en <Link> per kort ennå (i motsetning til RecipeCard.tsx) – det
 * finnes ingen egen jobbmat-detaljside å lenke til før selve
 * oppskriftsinnholdet designes/fylles inn i en senere runde. Legges til
 * naturlig den dagen en /dsvdv/[kategori]/[slug]-side finnes.
 */
export function JobbmatList({
  eyebrow,
  heading,
  description,
  recipes,
}: {
  eyebrow: string;
  heading: string;
  description: string;
  recipes: JobbmatRecipe[];
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <Link href="/dsvdv" className="text-xs font-medium text-ink-faint transition-colors hover:text-clay-dark">
        ← Jobbmat
      </Link>

      <div className="mt-6 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-clay">{eyebrow}</p>
        <h1 className="mt-3 text-balance font-serif text-3xl leading-tight text-ink sm:text-4xl">{heading}</h1>
        <p className="mt-2 text-sm text-ink-soft">{description}</p>
      </div>

      {recipes.length === 0 ? (
        <p className="mt-10 text-sm italic text-ink-faint">Ingen oppskrifter lagt inn her ennå.</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recipes.map((recipe) => (
            <div key={recipe.slug} className="flex flex-col overflow-hidden rounded-card bg-paper shadow-card">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream-dark">
                {recipe.bildeUrl ? (
                  <Image
                    src={recipe.bildeUrl}
                    alt={recipe.navn}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 40vw, 90vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-ink-faint">
                    <span className="font-serif text-lg">Bilde kommer</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h2 className="font-serif text-lg leading-snug text-ink">{recipe.navn}</h2>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
