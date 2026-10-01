"use client";

/**
 * AUTOMATISK UKESMENY – EDITORIELT REDESIGN (30.09.2026). Henrik: "Redesign
 * /ukesmeny slik at siden føles langt mer som CONVITE: premium, editorial,
 * rolig og stilren [...] Ukesmenyen skal IKKE genereres automatisk når
 * brukeren åpner siden." Fullstendig omskriving av v1/v1.1
 * (WeeklyMenuView.tsx), samme underliggende funksjonalitet:
 *
 * - Siden åpner alltid TOM (ingen forhåndsvalgt stil, ingen generert uke,
 *   ingen placeholder-kort) – "Lag ukesmenyen"-knappen er deaktivert til en
 *   stil er valgt, og genererer FØRST uken når man trykker på den.
 * - "Bytt ut" per dag og "Lag en ny uke" (regenerer innenfor valgt stil)
 *   er uendret i sin logikk, kun i visuelt uttrykk.
 * - Dagskortene er IKKE lenger RecipeCard (som viser kategori-badges,
 *   stjerner, favoritt-hjerte, beskrivelse) – Henrik: "Denne siden trenger
 *   først og fremst å kommunisere: DAG → RETT → TID." Egen, minimal
 *   markering bygget direkte her i stedet: dag-label → bilde → oppskrift
 *   (serif) → tid → bytt ut, ingen kort-boks/border/skygge rundt.
 *
 * AKTIV UKE, MED ETT-SKUDDS "TILBAKE"-STØTTE (28.09.2026, se filheaderen
 * i lib/hooks/useActiveWeeklyMenu.ts for hele resonnementet + en runde 2
 * med feilretting) – Henrik: "når jeg trykker på en av oppskriftene i
 * ukesmenyen, så er det ikke en tilbakeknapp tilbake til ukesmenyen [...]
 * man må kunne gå tilbake til ukesmenyen". Selve uken lever FORTSATT i
 * vanlig React-state (nullstilles ved enhver ny sidevisning, akkurat som i
 * det opprinnelige 30.09.2026-redesignet) – MEN rett før man navigerer
 * bort via en oppskrift-lenke (onClick under) skrives et
 * "returøyeblikksbilde" til sessionStorage, som denne siden leser OG
 * SLETTER med det samme ved neste mount. Første forsøk (samme dag) holdt
 * uken løpende synket mot sessionStorage i stedet – Henrik oppdaget at det
 * gjeninnførte akkurat den "gjenåpner forrige uke automatisk"-følelsen han
 * opprinnelig ba om å fjerne, bare nå trigget av ALL navigering innenfor
 * samme fane (også forsiden og inn igjen), ikke bare oppskrift-og-tilbake.
 * Ett-skudds-konsumering løser dette presist: uken er der KUN rett etter
 * en tilbake-reise, ikke ved noen annen senere sidevisning.
 *
 * "LAGRE UKESMENY" + "SE LAGREDE UKESMENYER" (28.09.2026, Henrik: "jeg
 * mener også å ha en 'lagre ukesmeny' og 'se lagrede ukesmenyer'") –
 * speiler "Dine menyer"-mønsteret fra den manuelle/AI-baserte
 * menybyggeren (se lib/hooks/useSavedWeeklyMenus.ts sin filheader):
 * EKSPLISITT lagring (en egen "Lagre ukesmenyen"-knapp, ikke automatisk),
 * ekte localStorage (til forskjell fra den AKTIVE uken over), og en egen
 * oversiktsside (/ukesmeny/lagrede, se SavedWeeklyMenusList.tsx).
 */
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";
import { useShoppingList } from "@/lib/hooks/useShoppingList";
import { useActiveWeeklyMenu, stashActiveWeeklyMenu } from "@/lib/hooks/useActiveWeeklyMenu";
import { useSavedWeeklyMenus } from "@/lib/hooks/useSavedWeeklyMenus";
import { getMealShoppingIngredients } from "@/lib/actions/meal-shopping-list";
import { formatMinutes, localizedTitle } from "@/lib/utils/format";
import { ShoppingBagIcon, ClockIcon, LeafIcon, UsersIcon, SparklesIcon, BookIcon, CheckIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import type { SearchableRecipe } from "@/lib/utils/search";
import {
  WEEKLY_MENU_STYLE_DEFINITIONS,
  VARIED_CHOICE,
  type WeeklyMenuChoice,
} from "@/lib/kitchen-intelligence/weekly-menu-styles";
import { t, type Lang, type DictKey } from "@/lib/i18n";

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;
const MIN_RECIPES = DAY_KEYS.length;

const STYLE_CHOICES: { id: WeeklyMenuChoice; labelKey: DictKey }[] = [
  { id: VARIED_CHOICE, labelKey: "weeklyMenu.style.variert" },
  ...WEEKLY_MENU_STYLE_DEFINITIONS,
];

// Samme ikonsett som components/admin/WeeklyMenuAdminPicker.tsx – "variert"
// har bevisst ingen ikon (den er ikke en admin-satt kategori). Henrik:
// "Behold gjerne små, diskrete ikoner på kategoriene" – uendret fra
// v1.1, kun selve pille-stylingen er dempet i redesignet under.
const STYLE_ICONS: Partial<Record<WeeklyMenuChoice, typeof ClockIcon>> = {
  sunt_enkelt: LeafIcon,
  rask: ClockIcon,
  familievennlig: UsersIcon,
  litt_ekstra: SparklesIcon,
};

// "Kun vegetar" (01.10.2026, Henrik: "på ukesmeny bør man egentlig ha en
// knapp 'Kun vegetar'") – delt ut i en egen funksjon fremfor å duplisere
// stil-filtreringen inline to steder (pool-useMemo og handlePickStyle under),
// slik moods/courses-filtrering andre steder på siten allerede gjør det.
// Filtrerer på isVegetarian (admin-satt bryter, migrasjon 0027, se
// WeeklyMenuAdminPicker.tsx) OVENPÅ stil-filtreringen, ikke i stedet for den
// – "Kun vegetar" er ment å kunne kombineres med enhver stil, inkludert
// "Variert".
function computePool(
  recipes: SearchableRecipe[],
  style: WeeklyMenuChoice | null,
  vegetarianOnly: boolean,
): SearchableRecipe[] {
  if (style === null) return [];
  const styleFiltered =
    style === VARIED_CHOICE ? recipes : recipes.filter((r) => (r.weeklyMenuStyles ?? []).includes(style));
  return vegetarianOnly ? styleFiltered.filter((r) => r.isVegetarian) : styleFiltered;
}

function pickRandomWeek(pool: SearchableRecipe[], excludeIds: string[] = []): string[] {
  const candidates = pool.filter((r) => !excludeIds.includes(r.id));
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, MIN_RECIPES).map((r) => r.id);
}

export function WeeklyMenuView({ recipes, lang }: { recipes: SearchableRecipe[]; lang: Lang }) {
  // Kalt "activeWeek" (ikke "active") for å unngå navnekollisjon med den
  // lokale `active`-variabelen inne i STYLE_CHOICES-map-en lenger ned
  // (er choice.id den VALGTE stilen) – to helt ulike ting som tilfeldigvis
  // begge naturlig heter "active".
  const [activeWeek, setActiveWeek] = useActiveWeeklyMenu();
  const { style, recipeIds, vegetarianOnly } = activeWeek;
  const { addFromRecipe } = useShoppingList();
  const { saveMenu } = useSavedWeeklyMenus();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  // Egen, LOKAL "lagret"-indikator (ikke utledet av useSavedWeeklyMenus,
  // til forskjell fra MealView.tsx sin `saved`, som slår opp mealId i et
  // register) – en lagret ukesmeny får sin egen, NYE id ved hver lagring
  // (se saveMenu i useSavedWeeklyMenus.ts), det finnes ingen stabil id for
  // "denne aktive uken" å slå opp mot. Nullstilles i alle handlinger som
  // endrer selve uken (samme mønster som `added` over), slik at
  // "Lagret ✓"-meldingen ikke blir stående og lyve om en uke som faktisk
  // er endret siden sist lagring.
  const [savedJustNow, setSavedJustNow] = useState(false);

  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  const pool = useMemo(() => computePool(recipes, style, vegetarianOnly), [recipes, style, vegetarianOnly]);

  const hasEnoughRecipes = style !== null && pool.length >= MIN_RECIPES;
  const generated = recipeIds.length > 0;

  function handlePickStyle(next: WeeklyMenuChoice) {
    if (next === style) return;
    setAdded(false);
    setSavedJustNow(false);
    const nextPool = computePool(recipes, next, vegetarianOnly);
    // Kun regenerer AUTOMATISK ved stil-bytte hvis besøkende allerede har
    // generert en uke denne økten (da forventer man at "bytt type" faktisk
    // bytter ut det man ser). Har man IKKE trykket "Lag ukesmenyen" ennå,
    // skal det fortsatt kreve et eksplisitt trykk – se filheaderen.
    const nextRecipeIds = generated ? (nextPool.length >= MIN_RECIPES ? pickRandomWeek(nextPool) : []) : recipeIds;
    setActiveWeek({ style: next, recipeIds: nextRecipeIds, vegetarianOnly });
  }

  // "Kun vegetar" (01.10.2026) – samme "regenerer kun hvis man allerede har
  // generert en uke"-logikk som handlePickStyle over, se kommentaren der.
  function handleToggleVegetarianOnly() {
    const next = !vegetarianOnly;
    setAdded(false);
    setSavedJustNow(false);
    const nextPool = computePool(recipes, style, next);
    const nextRecipeIds = generated ? (nextPool.length >= MIN_RECIPES ? pickRandomWeek(nextPool) : []) : recipeIds;
    setActiveWeek({ style, recipeIds: nextRecipeIds, vegetarianOnly: next });
  }

  function handleGenerate() {
    if (!hasEnoughRecipes) return;
    setAdded(false);
    setSavedJustNow(false);
    setActiveWeek({ style, recipeIds: pickRandomWeek(pool), vegetarianOnly });
  }

  function handleRegenerate() {
    if (!hasEnoughRecipes) return;
    setAdded(false);
    setSavedJustNow(false);
    setActiveWeek({ style, recipeIds: pickRandomWeek(pool), vegetarianOnly });
  }

  function handleSwapDay(index: number) {
    const candidates = pool.filter((r) => !recipeIds.includes(r.id));
    if (candidates.length === 0) return;
    const replacement = candidates[Math.floor(Math.random() * candidates.length)];
    const nextIds = [...recipeIds];
    nextIds[index] = replacement.id;
    setAdded(false);
    setSavedJustNow(false);
    setActiveWeek({ style, recipeIds: nextIds, vegetarianOnly });
  }

  function handleSaveMenu() {
    if (!style || recipeIds.length === 0) return;
    saveMenu(style, recipeIds);
    setSavedJustNow(true);
  }

  async function handleAddToShoppingList() {
    setLoading(true);
    setError(null);
    try {
      const data = await getMealShoppingIngredients(recipeIds);
      const dataById = new Map(data.map((d) => [d.recipeId, d]));
      for (const id of recipeIds) {
        const recipeData = dataById.get(id);
        if (!recipeData || recipeData.baseServings <= 0) continue;
        addFromRecipe(recipeData.ingredientGroups, recipeData.title, 1, {
          recipeId: recipeData.recipeId,
          slug: recipeData.slug,
          servings: recipeData.baseServings,
        });
      }
      setAdded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "mealShopping.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-ink-faint">{t(lang, "weeklyMenu.styleHeading")}</p>
      {/* "Se lagrede ukesmenyer" (28.09.2026) – FEILRETTET rett etter
          første forsøk: lå opprinnelig helt til høyre i en justify-between-
          rad ved siden av selve stil-overskriften, som i praksis satte den
          rett oppå råvare-komposisjonen øverst til høyre i bakgrunnsbildet
          (public/images/weekly-menu.jpg) – nesten uleselig lys, tynn tekst
          mot et travelt fotografi der (Henrik, med skjermbilde: "hvor er
          'lagrede ukesmenyer'?" – fant den rett og slett ikke). Flyttet ned
          til å stå i SAMME rad som stil-pillene under i stedet (venstre-
          justert, ikke justify-between) – akkurat den sonen av bildet er
          bevisst mørk/tom (se objectPosition-justeringen i
          app/ukesmeny/page.tsx, 28.09.2026, "FLYTT BILDET LENGER TIL
          HØYRE"), som allerede er bekreftet leselig av knappene/pillene som
          står der. Vises uansett (ikke bare når en uke er generert), siden
          en besøkende skal kunne hoppe rett til lagrede uker uten å måtte
          velge stil/generere først. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap gap-2">
          {STYLE_CHOICES.map((choice) => {
            const Icon = STYLE_ICONS[choice.id];
            const active = choice.id === style;
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => handlePickStyle(choice.id)}
                aria-pressed={active}
                className={clsx(
                  "flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-clay/50 bg-clay/10 text-clay-dark"
                    : "border-line text-ink-soft hover:border-line-strong hover:text-ink",
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {t(lang, choice.labelKey)}
              </button>
            );
          })}
        </div>

        {/* "Kun vegetar" (01.10.2026, Henrik: "på ukesmeny bør man egentlig
            ha en knapp 'Kun vegetar'") – egen olivenfarget pille, bevisst
            adskilt fra de klay-fargede stil-pillene over (den kombineres MED
            en stil, erstatter ikke en) – se computePool() over. Filtrerer på
            isVegetarian (admin-satt bryter, migrasjon 0027). */}
        <button
          type="button"
          onClick={handleToggleVegetarianOnly}
          aria-pressed={vegetarianOnly}
          className={clsx(
            "flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            vegetarianOnly
              ? "border-olive bg-olive-light text-olive-dark"
              : "border-line text-ink-soft hover:border-line-strong hover:text-ink",
          )}
        >
          <LeafIcon className="h-3.5 w-3.5" />
          {t(lang, "weeklyMenu.vegetarianOnly")}
        </button>

        <Link
          href="/ukesmeny/lagrede"
          className="text-xs font-medium text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
        >
          {t(lang, "weeklyMenu.savedMenusLink")}
        </Link>
      </div>

      {/* TOM STARTTILSTAND – ingen retter, ingen tomme kort. Kun knappen
          (deaktivert til en stil er valgt), eller en melding hvis den
          valgte stilen rett og slett ikke har nok merkede oppskrifter ennå
          (se /admin/ukesmeny). Negativ plass i stedet for placeholders. */}
      {!generated && (
        <div className="mt-8">
          {style !== null && !hasEnoughRecipes ? (
            <p className="max-w-md text-sm text-ink-soft">{t(lang, "weeklyMenu.notEnoughRecipes", { count: MIN_RECIPES })}</p>
          ) : (
            <Button variant="primary" disabled={!style} onClick={handleGenerate}>
              {t(lang, "weeklyMenu.generate")} →
            </Button>
          )}
        </div>
      )}

      {generated && (
        <>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            {!added ? (
              <Button variant="primary" onClick={handleAddToShoppingList} disabled={loading}>
                <ShoppingBagIcon className="h-4 w-4" />
                {loading ? t(lang, "weeklyMenu.addLoading") : `${t(lang, "weeklyMenu.addButton")} →`}
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-olive-dark">{t(lang, "weeklyMenu.addDone")}</span>
                <Link href="/handleliste" className="font-medium text-clay hover:text-clay-dark">
                  {t(lang, "weeklyMenu.viewList")} →
                </Link>
              </div>
            )}

            {/* "Lagre ukesmenyen" (28.09.2026) – sekundær handling ved
                siden av "Legg uka i handlelisten", samme
                ikon+farge-mønster som MealView.tsx sin "Lagre menyen"
                (BookIcon, text-clay, ingen understrek – fargen ER
                signalet). `savedJustNow` nullstilles av ENHVER endring av
                selve uken over (bytt dag/stil, ny uke), se merknaden ved
                state-deklarasjonen. */}
            {!savedJustNow ? (
              <button
                type="button"
                onClick={handleSaveMenu}
                className="flex items-center gap-1.5 text-sm font-medium text-clay transition-colors hover:text-clay-dark"
              >
                <BookIcon className="h-4 w-4" />
                {t(lang, "weeklyMenu.save")}
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-clay">
                <CheckIcon className="h-4 w-4" />
                {t(lang, "weeklyMenu.savedLabel")}
              </div>
            )}

            <button
              type="button"
              onClick={handleRegenerate}
              className="text-sm font-medium text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
            >
              {t(lang, "weeklyMenu.regenerate")}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-clay-dark">{error}</p>}

          <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-5 lg:gap-6">
            {recipeIds.map((id, index) => {
              const recipe = byId.get(id);
              if (!recipe) return null;
              const dayKey = DAY_KEYS[index];
              const dayLabel = t(lang, `weeklyMenu.${dayKey}`);
              const canSwap = pool.some((r) => !recipeIds.includes(r.id));
              return (
                <div key={`${dayKey}-${id}`} className={clsx(index > 0 && "lg:border-l lg:border-line lg:pl-6")}>
                  <p className="text-xs uppercase tracking-wide text-ink-faint">{dayLabel}</p>

                  {/* isLoggedIn/hjerte er bevisst droppet her – se
                      filheaderen: dette skal kommunisere dag → rett → tid,
                      ikke gjenta hele oppskriftskort-UI-et.
                      ?fromWeeklyMenu=1 (28.09.2026) – samme mønster som
                      MealView.tsx sin ?fromMealId=<id> (se filheaderen i
                      app/oppskrifter/[slug]/page.tsx): lar oppskriftssiden
                      vise en "Tilbake til ukesmenyen"-lenke i stedet for
                      den generelle "Alle oppskrifter". Ukesmenyen trenger
                      ingen id i selve param-verdien (kun én AKTIV uke om
                      gangen, se useActiveWeeklyMenu.ts), derfor holder et
                      enkelt flagg.
                      onClick={stashActiveWeeklyMenu(...)} (28.09.2026,
                      runde 2 – se filheaderen øverst i denne filen og i
                      useActiveWeeklyMenu.ts) – skriver ETT-SKUDDS
                      returøyeblikksbildet RETT FØR selve navigeringen til
                      oppskriften skjer, i stedet for å holde uken løpende
                      synket mot sessionStorage (det ga en uheldig
                      bieffekt: uken ble husket ved ALL navigering i samme
                      fane, ikke bare denne ene tilbake-reisen). */}
                  <Link
                    href={`/oppskrifter/${recipe.slug}?fromWeeklyMenu=1`}
                    onClick={() => stashActiveWeeklyMenu(activeWeek)}
                    className="group mt-3 block"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream-dark">
                      {recipe.heroImageUrl && (
                        <Image
                          src={recipe.heroImageUrl}
                          alt={recipe.heroImageAlt || localizedTitle(recipe, lang)}
                          fill
                          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 45vw, 90vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      )}
                    </div>
                    <p className="mt-4 font-serif text-sm text-ink transition-colors group-hover:text-clay-dark sm:text-base">
                      {localizedTitle(recipe, lang)}
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">{formatMinutes(recipe.totalTimeMinutes, lang)}</p>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleSwapDay(index)}
                    disabled={!canSwap}
                    aria-label={t(lang, "weeklyMenu.swapAria", { day: dayLabel })}
                    className="mt-2 text-xs text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t(lang, "weeklyMenu.swap")}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
