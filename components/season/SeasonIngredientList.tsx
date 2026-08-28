"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Season } from "@/lib/types";
import type { SearchableRecipe } from "@/lib/utils/search";
import type { SeasonPageIngredient } from "@/lib/kitchen-intelligence/seasonal";
import { localizedIngredientName, originGroupLabel } from "@/lib/utils/season-format";
import { IngredientDetailBody } from "@/components/season/IngredientDetailBody";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * Sesongsidens overordnede råvareliste – ETT PROGRESSIVE-DISCLOSURE-NIVÅ
 * (spesifikasjonens punkt 1/19/38): kun grupperte, klikkbare råvarenavn og
 * et diskret "PÅ SITT BESTE NÅ"-merke. INGEN måneder, INGEN forklaring,
 * INGEN kilde, INGEN oppskrifter i selve raden – alt det ligger i det
 * andre nivået (IngredientDetailBody).
 *
 * OMBYGD 28.08.2026 (Henriks eksplisitte ønske) til et master-detail-
 * oppsett: gruppene ("Fra havet" osv) er nå SELV nedtrekkslister man kan
 * lukke/åpne (noen råvarelister ble for lange til å alltid vise i sin
 * helhet), og selve råvarelisten er flyttet til en smalere venstrekolonne
 * med detaljen for den valgte råvaren i en egen kolonne TIL HØYRE – i
 * stedet for at raden utvider seg nedover der man klikket (slik det var
 * FØR denne runden). Pilen i hver rad peker derfor mot høyre
 * (ChevronRightIcon, ikke ned) – den varsler nå "se detalj til høyre", ikke
 * "utvid nedover". Samme grid-cols-mønster som brukes andre steder i appen
 * for liste+detalj (se BrowseRecipesClient.tsx sin filter-sidebar), men UTEN
 * sticky (i motsetning til f.eks. RecipeInteractive.tsx sin klebrige
 * ingrediens-kolonne) – prøvd og eksplisitt avvist av Henrik: boksen skal
 * dukke opp i høyde med raden man klikker (se `detailOffset` under) og
 * deretter bli stående der i vanlig sideflyt, ikke henge fast et annet sted
 * på skjermen mens man scroller.
 *
 * Kolonne-oppsettet gjelder kun fra lg og oppover – under det er det
 * fortsatt ikke plass til to kolonner side om side. Der beholdes DERFOR
 * den opprinnelige inline-utvidelsen (samme grid-template-rows 0fr->1fr-
 * animasjon som før), skjult bak `lg:hidden` slik at den aldri vises
 * samtidig med høyrekolonnen. Begge deler styres av SAMME `selectedId`-
 * state – å klikke en rad velger råvaren uansett skjermbredde, det er kun
 * HVOR detaljen vises som er responsivt, ikke selve valg-logikken.
 *
 * `groups` kommer ferdig gruppert og sortert fra
 * groupIngredientsByOriginGroup() i lib/kitchen-intelligence/seasonal.ts –
 * kun grupper som faktisk har innhold er med, i riktig redaksjonell
 * rekkefølge (ORIGIN_GROUP_ORDER). `allSeasons` og `recipesByIngredientId`
 * er detalj-nivået sitt datagrunnlag (se filheaderen til
 * IngredientDetailBody.tsx) – regnet ut server-side i app/sesong/page.tsx
 * og app/sesong/[slug]/page.tsx, kun for råvarene som faktisk vises her.
 *
 * `isLiveSeason`: er sesongsiden som vises HER faktisk den vi er i akkurat
 * nå (kalleren sender inn `isCurrent`)? Se filheaderen til
 * ingredientStatusLabel() i lib/utils/season-format.ts for hvorfor dette
 * skillet finnes – uendret av denne ombyggingen.
 */

// Se `detailOffset`-kommentaren inni komponenten for hvorfor denne finnes.
const ANCHOR_ROWS_UP = 2;

export function SeasonIngredientList({
  groups,
  lang,
  allSeasons,
  recipesByIngredientId,
  isLiveSeason,
}: {
  groups: Array<{ group: string; items: SeasonPageIngredient[] }>;
  lang: Lang;
  allSeasons: Season[];
  recipesByIngredientId: Record<string, SearchableRecipe[]>;
  isLiveSeason: boolean;
}) {
  // Alle grupper LUKKET som utgangspunkt (Henriks eksplisitte ønske
  // 28.08.2026) – nettopp poenget med nedtrekkslistene er å ikke måtte
  // møte hele, lange råvarelisten med det samme.
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // `detailOffset` = hvor langt ned (i px, fra toppen av venstrekolonnen)
  // detaljboksen skal starte – den skal IKKE sitte fastlåst øverst (Henrik
  // var eksplisitt tydelig på dette). Boksens toppkant trekkes opp
  // `ANCHOR_ROWS_UP` radhøyder ift. raden man faktisk klikket (se `measure`
  // under), IKKE plassert nøyaktig ved raden – selve koblingen til pilen skal
  // kjennes igjen inni boksen (der tittelen står), ikke definere toppen av
  // den. Henriks eksempel: klikker man Rødkål, lander boksens toppkant
  // omtrent ved raden TO OVER (Grapefrukt).
  //
  // FORSØKT OG FORKASTET: et hardt tak på selve offset-tallet (Henriks
  // Kreps-eksempel, tidlig i en lang liste). Det så riktig ut nær toppen av
  // listen, men brøt fullstendig lenger ned (Henriks Rødkål-under-"Fra
  // jorda"-eksempel) – et globalt pikseltak klipper jo like hardt uansett
  // hvor langt ned i DOKUMENTET raden faktisk befinner seg, så boksen endte
  // opp langt over raden i stedet for ved den. `ANCHOR_ROWS_UP` løser det
  // samme problemet (kjennes ikke "for langt ned") RIKTIG, fordi det alltid
  // er relativt til raden man klikket, uansett hvor dypt i listen den er.
  //
  // Målt live mot ekte DOM-posisjoner (rowRefs/listRef) fremfor antatt
  // radhøyde, siden radene har ulik høyde (peak-merket tar plass) og
  // gruppene over kan være ulikt åpne/lukkede.
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [detailOffset, setDetailOffset] = useState(0);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    for (const { items } of groups) {
      const found = items.find((item) => item.ingredient.id === selectedId);
      if (found) return found;
    }
    return null;
  }, [groups, selectedId]);

  const selectedHomeSeason = selected ? allSeasons.find((s) => s.id === selected.ingredient.seasonId) : undefined;

  // Måler raden sin posisjon relativt til venstrekolonnen, trekker fra
  // `ANCHOR_ROWS_UP` radhøyder (så boksens toppkant lander et stykke OVER
  // selve raden, se kommentaren over), og bruker det som toppmargin på
  // detaljboksen – IKKE avgrenset til noe tak, se hvorfor i kommentaren
  // over. Måles på nytt når valget endrer seg ELLER når en gruppe
  // åpnes/lukkes (kan flytte radene under), pluss én gang til etter
  // gruppe-animasjonens 300ms er ferdig og ved vindusendring, slik at
  // posisjonen ikke blir stående feil.
  useEffect(() => {
    if (!selectedId) return;
    const containerEl = listRef.current;
    const rowEl = rowRefs.current.get(selectedId);
    if (!containerEl || !rowEl) return;

    function measure() {
      if (!containerEl || !rowEl) return;
      const containerRect = containerEl.getBoundingClientRect();
      const rowRect = rowEl.getBoundingClientRect();
      const rowTop = rowRect.top - containerRect.top;
      setDetailOffset(Math.max(0, rowTop - ANCHOR_ROWS_UP * rowRect.height));
    }

    measure();
    const timeout = window.setTimeout(measure, 320);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("resize", measure);
    };
  }, [selectedId, openGroups]);

  if (groups.length === 0) return null;

  function toggleGroup(group: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }

  function selectIngredient(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10">
      <div ref={listRef}>
        {groups.map(({ group, items }) => {
          const isGroupOpen = openGroups.has(group);

          return (
            <div key={group} className="border-b border-line/60 py-1 first:pt-0 last:border-b-0">
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                aria-expanded={isGroupOpen}
                className="flex w-full items-center justify-between gap-3 rounded-lg py-2 text-left transition-colors duration-150 hover:text-ink"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
                  {originGroupLabel(group as Parameters<typeof originGroupLabel>[0], lang)}
                </span>
                <ChevronDownIcon
                  className={`h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform duration-300 ${
                    isGroupOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  isGroupOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <ul className="divide-y divide-line/60 pb-2">
                    {items.map(({ ingredient, status }) => {
                      const isSelected = selectedId === ingredient.id;
                      const homeSeason = allSeasons.find((s) => s.id === ingredient.seasonId);

                      return (
                        <li key={ingredient.id}>
                          <button
                            ref={(el) => {
                              if (el) rowRefs.current.set(ingredient.id, el);
                              else rowRefs.current.delete(ingredient.id);
                            }}
                            type="button"
                            onClick={() => selectIngredient(ingredient.id)}
                            aria-expanded={isSelected}
                            className={`group -mx-2 flex w-full items-baseline justify-between gap-3 rounded-lg px-2 py-2.5 text-left transition-colors duration-150 ${
                              isSelected ? "bg-cream-dark/50" : "hover:bg-cream-dark/40"
                            }`}
                          >
                            <span
                              className={`font-serif text-lg transition-colors ${
                                isSelected ? "text-clay-dark" : "text-ink group-hover:text-clay"
                              }`}
                            >
                              {localizedIngredientName(ingredient, lang)}
                            </span>
                            <span className="flex shrink-0 items-baseline gap-2">
                              {isLiveSeason && status.kind === "peak" && (
                                <span className="text-[0.68rem] font-medium uppercase tracking-[0.1em] text-clay-dark">
                                  {t(lang, "season.peakNow")}
                                </span>
                              )}
                              <ChevronRightIcon
                                className={`h-3.5 w-3.5 self-center transition-colors ${
                                  isSelected ? "text-clay-dark" : "text-ink-faint"
                                }`}
                              />
                            </span>
                          </button>

                          {/* Kun < lg: samme inline-utvidelse som før ombyggingen, skjult
                              på lg+ hvor detaljen i stedet vises i høyrekolonnen under. */}
                          <div
                            className={`grid transition-[grid-template-rows] duration-300 ease-out lg:hidden ${
                              isSelected ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                            }`}
                          >
                            <div className="overflow-hidden">
                              {homeSeason && (
                                <div className="px-2 pb-6">
                                  <IngredientDetailBody
                                    ingredient={ingredient}
                                    homeSeason={homeSeason}
                                    recipes={recipesByIngredientId[ingredient.id] ?? []}
                                    lang={lang}
                                    isLive={isLiveSeason}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Kun lg+: valgt råvares detalj, til høyre for listen. VERKEN sticky
          ELLER fast øverst (begge prøvd og forkastet 28.08.2026, se
          `detailOffset`-kommentaren over) – boksen får i stedet en
          toppmargin et par radhøyder over den valgte raden (ANCHOR_ROWS_UP).
          Deretter blir den stående akkurat der i vanlig sideflyt (ingen
          sticky) mens man scroller videre.
          Stilen er bevisst holdt rolig/redaksjonell (Henriks ønske om noe
          "mer elegant og stilrent" 28.08.2026): en tynn gyllen kant i
          venstre marg (samme antikk-gull-aksent som resten av "CONVITE",
          se app/globals.css) erstatter en tidligere, mer "snakkeboble"-aktig
          pil-tupp – den antyder fortsatt en kobling til valget uten å bli
          en tegneserie-detalj. Romsligere polstring (p-8) matcher ellers
          det generøse, luftige uttrykket resten av siden har. */}
      <div className="hidden lg:block lg:self-start">
        {selected && selectedHomeSeason ? (
          <div
            style={{ marginTop: detailOffset }}
            className="rounded-card border border-line border-l-2 border-l-clay bg-paper p-8 shadow-card transition-[margin-top] duration-300 ease-out"
          >
            <h3 className="font-serif text-2xl text-ink">{localizedIngredientName(selected.ingredient, lang)}</h3>
            <IngredientDetailBody
              ingredient={selected.ingredient}
              homeSeason={selectedHomeSeason}
              recipes={recipesByIngredientId[selected.ingredient.id] ?? []}
              lang={lang}
              isLive={isLiveSeason}
            />
          </div>
        ) : (
          <p className="px-1 text-sm text-ink-faint">{t(lang, "season.selectIngredientPrompt")}</p>
        )}
      </div>
    </div>
  );
}
