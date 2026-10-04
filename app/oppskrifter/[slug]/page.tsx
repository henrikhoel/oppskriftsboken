import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipeBySlug, getAllSlugs } from "@/lib/data/recipes";
import { getCurrentUserFast } from "@/lib/auth";
import { siteConfig } from "@/lib/config";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { RecipeInteractive } from "@/components/recipe/RecipeInteractive";
import { buildRecipeJsonLd } from "@/lib/utils/seo";
import { localizedTitle, localizedDescription } from "@/lib/utils/format";
import { ChevronLeftIcon } from "@/components/ui/icons";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [recipe, lang] = await Promise.all([getRecipeBySlug(slug), getLang()]);
  if (!recipe) return { title: lang === "en" ? "Recipe not found" : "Oppskrift ikke funnet" };

  const url = `${siteConfig.url}/oppskrifter/${recipe.slug}`;
  const title = localizedTitle(recipe, lang);
  const description = localizedDescription(recipe, lang);

  // Egen openGraph/twitter her ERSTATTER (ikke fletter med) root layout.tsx
  // sin – siteName og et fallback-bilde må derfor settes eksplisitt her også,
  // ellers forsvinner de helt for akkurat oppskriftssider (oppdaget
  // 10.09.2026 via opengraph.xyz sin "Site name is missing"-advarsel).
  // Selve rettens eget bilde (recipe.heroImageUrl) er fortsatt førstevalget
  // når det finnes – en ekte matbilde er en bedre forhåndsvisning enn
  // app-logoen. /og-icon.png (samme gull-"C" som app-ikonet) er kun et
  // fallback for de få oppskriftene som ennå ikke har et hovedbilde, slik at
  // heller ikke DE ender opp uten noe bilde i det hele tatt.
  const images = recipe.heroImageUrl
    ? [{ url: recipe.heroImageUrl, width: 1200, height: 900, alt: title }]
    : [{ url: "/og-icon.png", width: 512, height: 512, alt: siteConfig.name }];

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      siteName: siteConfig.name,
      title,
      description,
      url,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((img) => img.url),
    },
  };
}

export default async function RecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const { fromMealId, fromWeeklyMenu } = await searchParams;
  const [recipe, user, lang] = await Promise.all([getRecipeBySlug(slug), getCurrentUserFast(), getLang()]);

  if (!recipe) notFound();

  // (29.09.2026) "Tilbake"-lenke ETT HAKK, rett dit du kom fra (Henrik:
  // "jeg savner noen 'tilbake' knapper på siden som tar deg tilbake ett
  // hakk, rett dit du kom fra. feks kan man trykke på hver rett i menyen,
  // om jeg gjør det så ønsker jeg en knapp som tar meg rett tilbake til
  // menyen uten at jeg kommer helt ut av det") – MealView.tsx legger nå ved
  // ?fromMealId=<mealId> på enhver lenke fra en meny til en oppskrift.
  // Finnes den, erstatter "Tilbake til menyen" (rett til DEN spesifikke
  // menyen) den generelle "Alle oppskrifter"-lenken øverst; uten
  // fromMealId (vanlig besøk via /oppskrifter) er oppførselen uendret.
  // MealSession lever kun i besøkendes egen nettleser (localStorage, se
  // filheaderen i MealView.tsx) – denne siden er fortsatt en server-
  // komponent og trenger ikke lese selve menyen, kun bygge riktig lenke.
  //
  // (28.09.2026) Samme mønster utvidet til ukesmenyen – Henrik: "når man
  // trykker på en av oppskriftene i ukesmenyen, så er det ikke en
  // tilbakeknapp tilbake til ukesmenyen [...] man må kunne gå tilbake til
  // ukesmenyen". WeeklyMenuView.tsx legger nå ved ?fromWeeklyMenu=1 på
  // enhver lenke fra en ukesmeny-dag til en oppskrift. Til forskjell fra
  // fromMealId trengs ingen id i selve param-verdien – det finnes kun ÉN
  // AKTIV ukesmeny om gangen (sessionStorage, se useActiveWeeklyMenu.ts),
  // ikke flere adresserbare menyer som /meny/<id>. fromMealId sjekkes
  // FØRST og vinner dersom (helt usannsynlig) begge skulle være satt
  // samtidig – vilkårlig, men konsekvent, prioritering.
  const cameFromMeal = typeof fromMealId === "string" && fromMealId.trim().length > 0;
  const cameFromWeeklyMenu = typeof fromWeeklyMenu === "string" && fromWeeklyMenu.trim().length > 0;
  const backHref = cameFromMeal ? `/meny/${fromMealId}` : cameFromWeeklyMenu ? "/ukesmeny" : "/oppskrifter";
  const backLabel = t(
    lang,
    cameFromMeal
      ? "recipeDetail.backToMealLink"
      : cameFromWeeklyMenu
        ? "recipeDetail.backToWeeklyMenuLink"
        : "recipeDetail.allRecipesLink",
  );

  // (04.10.2026) INNLOGGINGSGATEN FJERNET – Henrik, om den reviderte
  // betalingsmodellen: "men jeg mener at vi kan fikse at en uten bruker
  // får alt det som står under 'uten bruker'" (se "Betalingsmodell,
  // revidert" i prosjektnotatet). "Uten bruker"-raden i den tabellen
  // dekker nettopp oppskrifter/søk/ingredienser+fremgangsmåte/
  // porsjonsskalering – den tidligere "if (!user) return <RecipeTeaser/>"-
  // grenen (27.09.2026, se git-historikk) er derfor fjernet, og
  // RecipeInteractive rendres nå for ALLE, innlogget eller ei.
  // RecipeTeaser.tsx selv er bevisst latt stå urørt (orphaned, ikke
  // slettet) i tilfelle denne retningen reverseres igjen.
  //
  // RecipeInteractive har fått en ny `isLoggedIn`-prop (se filheaderen
  // der) som den bruker til å fortsatt gate AKKURAT de tingene som ikke
  // er en del av "uten bruker"-tabellraden: favoritter/handleliste
  // ("gratis bruker"), Cook Mode/"Gjør det til en kveld" (interim-gatet
  // bak innlogging inntil et ekte premium-flagg finnes, se
  // prosjektnotatet), og de AI-tunge ekstrafunksjonene (bytt ut
  // ingrediens, EN/US-oversettelse, kokeplan, "Spør om noe",
  // vin-/drikkeseksjonen) som ikke står nevnt i "uten bruker"-raden i
  // tabellen og derfor bevisst holdes bak innlogging av kostnadshensyn.
  const jsonLd = buildRecipeJsonLd(recipe, lang);

  return (
    // pb-24 (desktop) er DEFAULT – gir vanlig luft mellom siste innhold og
    // footeren på en helt ordinær side. Når `recipe.showMealBuilder` er
    // true ender siden derimot i MealBuilder.tsx sin fullbredde, mørke
    // premiumflate (se filheaderen der) – DENNE skal selv fungere som
    // sidens visuelle avslutning, ikke ha en ekstra, umotivert "svart
    // bolk" av ren sidebakgrunn (bg-cream) liggende etter seg før
    // footeren (Henrik, 30.09.2026: "fjern den svarte tomme delen under
    // seksjonen. den trengs ikke"). Nøyaktig samme mønster/begrunnelse (og
    // samme -mb-40/md:-mb-20-verdier) som app/page.tsx allerede bruker for
    // forsiden av akkurat samme grunn – se den fyldige kommentaren der: to
    // UAVHENGIGE kilder til luft foran footeren må kanselleres (Footer.tsx
    // sin egen mt-20 – alltid – og <main> sin egen pb-20 md:pb-0 i
    // app/layout.tsx, kun under md), pluss at DENNE siden i tillegg har
    // sin egen pb-24 over, som derfor droppes helt (pb-0) i dette
    // tilfellet. Gjelder KUN når MealBuilder faktisk er sidens siste
    // seksjon.
    //
    // JUSTERT (27.09.2026 – Henrik, om oppskrifter UTEN "gjør det til en
    // kveld": "det er for mye luft (tomt svart område) nederst, spesielt
    // på telefon") – disse sidene har alltid hatt en fast pb-24 (96px) her
    // OVENPÅ de to samme uavhengige kildene rett over, og på mobil er
    // <main> sin egen pb-20 (80px) fortsatt aktiv (kun kansellert md: og
    // oppover) – 96+80+80=256px dødt rom under mobilbrekkpunktet, mot kun
    // 96+80=176px på desktop der <main> sin pb-20 uansett er null. Byttet
    // fra fast `pb-24` til `pb-4 md:pb-24` (samme md-brekkpunkt som
    // <main> sin egen pb-20 bytter ved, for å unngå et "for mye begge
    // steder"-mellomsjikt akkurat rundt sm/md) – da blir totalsummen
    // 16+80+80=176px under md OG 96+0+80=176px fra md og oppover: samme
    // luftmengde foran footeren på alle skjermbredder, i stedet for
    // vesentlig mer på mobil.
    <article className={recipe.showMealBuilder ? "-mb-40 pb-0 md:-mb-20" : "pb-4 md:pb-24"}>
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Ingen full-bred, liggende heltskjerm-bildeblokk lenger (fjernet
          31.08.2026, designforbedring punkt 1/2) – selve oppskriftsbildet
          vises nå ubeskåret som del av den nye to-kolonners heroen inne i
          RecipeInteractive → RecipeHero, i samme sentrerte container som
          resten av siden. "Alle oppskrifter"-lenken flyttet hit, som en
          rolig tekstlenke over heroen i stedet for å flyte oppå et bilde.
          xl:max-w-[1280px] (var kun max-w-5xl/1024px) – finjustering
          31.08.2026: Ingredienser/Fremgangsmåte-raden (og seksjonene
          under) kjentes smale ut sammenlignet med heroen, som allerede
          bryter ut til akkurat denne bredden på store skjermer (se
          RecipeHero.tsx). Samme breddenivå her gir én sammenhengende,
          bred komposisjon i stedet for et smalt "spor" midt i en bred
          hero. Selve stegteksten i Fremgangsmåte er likevel kappet til en
          komfortabel lesebredde (max-w-prose i RecipeInteractive.tsx), så
          bare selve kolonnene/panelene – ikke brødteksten – blir bredere. */}
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8 xl:max-w-[1280px]">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          {backLabel}
        </Link>

        <div className="mt-6 sm:mt-8">
          <RecipeInteractive
            recipe={recipe}
            isAdmin={Boolean(user?.isAdmin)}
            // (04.10.2026) `user` kan nå være null – se filheaderen over for
            // hvorfor RecipeInteractive selv trenger å vite dette.
            isLoggedIn={Boolean(user)}
            lang={lang}
            hasCompletedCookModeTutorial={Boolean(user?.cookModeTutorialCompleted)}
          />
        </div>

        {recipe.source && (
          <p className="mt-10 text-xs text-ink-faint">
            {t(lang, "recipeDetail.source")}: {recipe.source}
          </p>
        )}
      </div>
    </article>
  );
}
