import Link from "next/link";
import type { JobbmatRecipe } from "@/lib/dsvdv/types";
import { JOBBMAT_UTSTYR_LABEL } from "@/lib/dsvdv/types";

/**
 * Delt listevisning for de fire filtrerte jobbmat-inngangene (mikro/
 * airfryer/toastjern/null innsats) – hver av app/dsvdv/{mikro,airfryer,
 * toastjern,null-innsats}/page.tsx gjør sin egen `requireDsvdvSession()`
 * og sender så et allerede filtrert utvalg hit. Ingen egne detaljsider
 * ennå (kommer når selve oppskriftsinnholdet fylles inn, se oppdraget
 * dette ble bygget fra) – all info vises derfor direkte i listeraden.
 *
 * Samme hårfine `divide-y divide-ink/10`-liste-mønster som JobbmatHub.tsx/
 * MealBuilder.tsx sin rettliste – ingen kort/bokser/border rundt hver
 * oppskrift, i tråd med "ikke et dashboard".
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
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <Link href="/dsvdv" className="text-xs font-medium text-ink-faint transition-colors hover:text-clay-dark">
        ← Jobbmat
      </Link>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-clay">{eyebrow}</p>
        <h1 className="mt-3 text-balance font-serif text-3xl leading-tight text-ink sm:text-4xl">{heading}</h1>
        <p className="mt-2 text-sm text-ink-soft">{description}</p>
      </div>

      {recipes.length === 0 ? (
        <p className="mt-10 text-sm italic text-ink-faint">Ingen oppskrifter lagt inn her ennå.</p>
      ) : (
        <div className="mt-10 divide-y divide-ink/10 border-t border-ink/10">
          {recipes.map((recipe) => (
            <article key={recipe.slug} className="py-8">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-serif text-xl text-ink">{recipe.navn}</h2>
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-ink-faint">
                  {recipe.totalMinutter} min
                </p>
              </div>
              <p className="mt-1.5 text-sm text-ink-soft">{recipe.kortBeskrivelse}</p>

              {recipe.utstyr.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {recipe.utstyr.map((u) => (
                    <span
                      key={u}
                      className="rounded-full border border-clay/25 px-2.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-clay"
                    >
                      {JOBBMAT_UTSTYR_LABEL[u]}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">
                    Ingredienser
                  </p>
                  <ul className="mt-1.5 space-y-0.5 text-sm text-ink-soft">
                    {recipe.ingredienser.map((i, idx) => (
                      <li key={idx}>{i}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">
                    Fremgangsmåte
                  </p>
                  <ol className="mt-1.5 space-y-0.5 text-sm text-ink-soft">
                    {recipe.fremgangsmate.map((step, idx) => (
                      <li key={idx}>
                        {idx + 1}. {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {(recipe.forberedHjemme?.length || recipe.taMed.length > 0) && (
                <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 border-t border-ink/10 pt-4 sm:grid-cols-2">
                  {recipe.forberedHjemme && recipe.forberedHjemme.length > 0 && (
                    <div>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">
                        Forbered hjemme
                      </p>
                      <ul className="mt-1.5 space-y-0.5 text-sm text-ink-soft">
                        {recipe.forberedHjemme.map((f, idx) => (
                          <li key={idx}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {recipe.taMed.length > 0 && (
                    <div>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">
                        Ta med
                      </p>
                      <ul className="mt-1.5 space-y-0.5 text-sm text-ink-soft">
                        {recipe.taMed.map((m, idx) => (
                          <li key={idx}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
