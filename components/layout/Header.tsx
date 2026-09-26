import Link from "next/link";
import { cookies } from "next/headers";
import { siteConfig } from "@/lib/config";
import { getCurrentUserFast } from "@/lib/auth";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { SITE_ACCESS_COOKIE, isValidSiteAccessToken } from "@/lib/site-access/token";
import { HeaderSearchSlot } from "@/components/layout/HeaderSearchSlot";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ShoppingListBadgeCount } from "@/components/shopping/ShoppingListBadgeCount";
import {
  BookIcon,
  BowlIcon,
  CameraIcon,
  HeartIcon,
  HelpCircleIcon,
  LeafIcon,
  LogOutIcon,
  SearchIcon,
  ShoppingBagIcon,
} from "@/components/ui/icons";

/* Admin-lenken i toppmenyen er fjernet etter ønske – den finnes fortsatt
   nederst i footeren (footer.admin → /admin/login), så innloggede admins
   kommer fortsatt til admin-flyten derfra, uten at "Admin" ligger synlig
   øverst på hver side.

   26.08.2026 – ønsket av Henrik: en liten "+" like ved siden av, KUN synlig
   for ham selv når han er logget inn som admin, som en snarvei til "Ny
   oppskrift" (gjør det enklere å legge inn oppskrifter fortløpende). Samme
   admin-gatet mønster som isAdmin ellers i appen (se f.eks.
   app/oppskrifter/[slug]/page.tsx) – Header er allerede en async
   server-komponent, så brukeren sjekkes her på serveren (se
   getCurrentUserFast under) og "+" finnes rett og slett ikke i HTML-en som
   sendes til andre besøkende (ikke bare skjult med CSS). */
export async function Header() {
  const lang = await getLang();
  // getCurrentUserFast (ikke getCurrentUser) – Header rendres på HVER eneste
  // side (via app/layout.tsx), og "+"-snarveien under er rent kosmetisk.
  // Se filheaderen til getCurrentUserFast i lib/auth.ts.
  const user = await getCurrentUserFast();
  const isAdmin = Boolean(user?.isAdmin);
  // (26.09.2026) Styrer "Logg ut"-knappen under – skal KUN vises når man
  // faktisk er logget inn med fellespassordet (Henrik: "den syns når man
  // er på innloggingssiden også, det gir ikke mening, den må komme frem
  // når man er logget inn"). Samme sjekk som proxy.ts/RecipeTeaser-veien
  // gjør, bare her for selve visningen av knappen.
  const cookieStore = await cookies();
  const hasSiteAccess = await isValidSiteAccessToken(cookieStore.get(SITE_ACCESS_COOKIE)?.value);

  return (
    // backdrop-blur er bevisst skrudd av på mobil (backdrop-blur-none) og kun
    // slått på fra sm og opp – en sticky header med backdrop-filter er en
    // kjent, tung post for iOS Safaris kompositering på hver scroll-frame,
    // og med bg-cream/95 (nesten ugjennomsiktig bakgrunn) er den visuelle
    // forskjellen uten blur knapt merkbar. Bidrar isolert til jevnere
    // scrolling på iPhone, uavhengig av om det er dev- eller prod-build.
    <header
      id="site-header"
      className="sticky top-0 z-30 border-b border-line bg-cream/95 backdrop-blur-none sm:backdrop-blur"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 font-serif text-xl tracking-tight text-ink"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-clay text-cream">
            {siteConfig.logoInitial}
          </span>
          <span className="hidden tracking-wide sm:inline">{siteConfig.name}</span>
        </Link>

        <HeaderSearchSlot lang={lang} />

        {/* (26.09.2026, Henrik: "jeg kommer fortsatt til innloggingsiden når
            jeg trykker på 'oppskrifter' ... etter å ha logget inn") –
            prefetch={false} på ALLE lenkene i denne menyen. Header vises på
            HVER side, også /adgang (selve innloggingssiden) – uten dette
            forsøker Next.js å hente disse sidene i bakgrunnen i det
            øyeblikket de kommer inn i synsfeltet, altså også mens man
            fortsatt ser på /adgang og ikke har logget inn ennå. Den
            uinnloggede bakgrunnshentingen fanges da opp av proxy.ts sin
            fellespassord-sjekk og gir "krever innlogging" som svar – og
            uten prefetch={false} kan svaret bli liggende igjen i Next sin
            egen klientbufring, uavhengig av om man senere faktisk logger
            inn. Et vanlig klikk fungerer akkurat likt uten prefetch, bare
            uten forhåndsoppvarmingen – ingen synlig ulempe her. */}
        <nav aria-label={t(lang, "nav.mainNav")} className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/oppskrifter"
            prefetch={false}
            className="hidden items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink md:flex"
          >
            <BookIcon className="h-4 w-4" />
            {t(lang, "nav.recipes")}
          </Link>
          <Link
            href="/hva-kan-jeg-lage"
            prefetch={false}
            className="hidden items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink md:flex"
          >
            <CameraIcon className="h-4 w-4" />
            {t(lang, "nav.pantry")}
          </Link>
          <Link
            href="/hvordan-gjor-jeg-det"
            prefetch={false}
            className="hidden items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink md:flex"
          >
            <HelpCircleIcon className="h-4 w-4" />
            {t(lang, "nav.guidesShort")}
          </Link>
          <Link
            href="/favoritter"
            prefetch={false}
            className="hidden items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink md:flex"
          >
            <HeartIcon className="h-4 w-4" />
            {t(lang, "nav.favorites")}
          </Link>
          {/* Kun fra lg og opp (ikke md, som de fire lenkene over) – seks
              tekstlenker samtidig ble for trangt på nettbrett-bredde, se
              filheaderen. Begge sidene er uansett nådd via forsideteaserne
              (WhatToEatTeaser/SeasonTeaser) på alle skjermstørrelser. */}
          <Link
            href="/hva-skal-vi-spise"
            prefetch={false}
            className="hidden items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink lg:flex"
          >
            <BowlIcon className="h-4 w-4" />
            {t(lang, "nav.whatToEat")}
          </Link>
          <Link
            href="/sesong"
            prefetch={false}
            className="hidden items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink lg:flex"
          >
            <LeafIcon className="h-4 w-4" />
            {t(lang, "nav.season")}
          </Link>
          <Link
            href="/oppskrifter"
            aria-label={t(lang, "nav.search")}
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink md:hidden"
          >
            <SearchIcon className="h-5 w-5" />
          </Link>
          <Link
            href="/handleliste"
            aria-label={t(lang, "nav.shoppingList")}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink"
          >
            <ShoppingBagIcon className="h-5 w-5" />
            <ShoppingListBadgeCount />
          </Link>
          {isAdmin && (
            <Link
              href="/admin/oppskrifter/ny"
              aria-label={t(lang, "nav.newRecipe")}
              className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-medium leading-none text-clay transition-colors hover:bg-cream-dark hover:text-clay-dark"
            >
              +
            </Link>
          )}
          <LanguageSwitcher lang={lang} className="ml-1" />
          {/* (26.09.2026, Henrik: "legg til en 'logg ut'-knapp på siden.
              feks øverst ved siden av NO/EN ellerno?", deretter: "den
              syns når man er på innloggingssiden også... den må komme
              frem når man er logget inn. og jeg vil at den skal være til
              høyre for NO/EN") – logger ut av FELLESPASSORDET for hele
              nettstedet (se proxy.ts), ikke en personlig konto. Synlig for
              alle som ER logget inn (hasSiteAccess over), ikke gated på
              isAdmin som "+"-snarveien lenger opp. Ren lenke til en
              GET-rute (app/logg-ut/route.ts) som sletter cookien og sender
              tilbake til forsiden – ingen egen "use client"-komponent
              trengs. */}
          {hasSiteAccess && (
            <Link
              href="/logg-ut"
              aria-label={t(lang, "nav.logOut")}
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink"
            >
              <LogOutIcon className="h-5 w-5" />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
