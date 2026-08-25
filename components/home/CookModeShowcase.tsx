import { Button } from "@/components/ui/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * Lys seksjon som bevisst bryter med den ellers mørke siden – rytme, ikke
 * bare en "feature card". Telefon-mockupen speiler ekte CookMode-UI
 * (components/recipe/CookMode.tsx) – samme mørke bg-cream/text-ink-farger,
 * samme progressbar/steg-tekst/knapper – i stedet for et løsrevet
 * påfunnet design. Innholdet i mockupen er statisk illustrasjonstekst
 * (home.cookMode.mock*), ikke live data – ekte Cook Mode åpnes fra en
 * faktisk oppskrift, se lenken under.
 */
export function CookModeShowcase({ lang, recipeSlug }: { lang: Lang; recipeSlug: string | null }) {
  return (
    <section className="bg-ink py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div className="order-2 lg:order-1">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-clay">
            {t(lang, "home.cookMode.eyebrow")}
          </p>
          <h2 className="mt-3 text-balance font-serif text-3xl leading-tight text-cream sm:text-4xl">
            {t(lang, "home.cookMode.title")}
          </h2>
          <p className="mt-3 max-w-md text-pretty text-base text-cream/70">
            {t(lang, "home.cookMode.subtitle")}
          </p>
          <p className="mt-5 max-w-md text-pretty text-sm text-cream/55">{t(lang, "home.cookMode.note")}</p>
          {recipeSlug && (
            <Button href={`/oppskrifter/${recipeSlug}`} variant="secondary" size="md" className="mt-7">
              {t(lang, "home.cookMode.cta")}
            </Button>
          )}
        </div>

        <div className="order-1 flex justify-center lg:order-2">
          {/* Telefon-ramme rundt en statisk, nedskalert kopi av CookMode-skjermen. */}
          <div className="w-full max-w-[300px] rounded-[2.75rem] border-[10px] border-cream bg-cream p-1.5 shadow-card-hover">
            <div className="flex aspect-[9/18.5] flex-col overflow-hidden rounded-[2rem] bg-cream text-ink">
              <div className="flex items-center gap-2.5 border-b border-ink/10 px-4 pb-3 pt-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-sm">{t(lang, "home.cookMode.mockDish")}</p>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink/15">
                    <div className="h-full w-1/2 rounded-full bg-clay" />
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-between px-4 py-5">
                <div>
                  <p className="text-[0.65rem] font-medium uppercase tracking-wider text-clay">
                    {t(lang, "home.cookMode.mockStepLabel")}
                  </p>
                  <p className="mt-4 text-balance font-serif text-lg leading-snug">
                    {t(lang, "home.cookMode.mockStepText")}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 rounded-full border border-ink/20 px-3 py-2 text-[0.7rem] text-ink/85">
                    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[0.25rem] border border-ink/40" />
                    {t(lang, "home.cookMode.mockMarkDone")}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 items-center justify-center rounded-full border border-ink/20 py-2.5 text-ink/50">
                      <ChevronLeftIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-[2] items-center justify-center gap-1.5 rounded-full bg-clay py-2.5 text-xs font-medium text-cream">
                      {t(lang, "cookMode.next")}
                      <ChevronRightIcon className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
