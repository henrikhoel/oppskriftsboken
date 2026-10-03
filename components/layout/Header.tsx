import Link from "next/link";
import { siteConfig } from "@/lib/config";
import { getCurrentUserFast } from "@/lib/auth";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { HeaderSearchSlot } from "@/components/layout/HeaderSearchSlot";
import { AppDownloadIconButton } from "@/components/layout/AppDownloadIconButton";
import { ShoppingListBadgeCount } from "@/components/shopping/ShoppingListBadgeCount";
import { AccountLogOutButton } from "@/components/auth/AccountLogOutButton";
import {
  BookIcon,
  CalendarIcon,
  CameraIcon,
  HeartIcon,
  LeafIcon,
  SearchIcon,
  ShoppingBagIcon,
  UserIcon,
  UsersIcon,
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
   sendes til andre besøkende (ikke bare skjult med CSS).

   (27.09.2026) Fellespassord-innlogging (hasSiteAccess/"Logg ut") er
   fjernet igjen – se filheaderen i proxy.ts for hele bildet.

   (27.09.2026) Ny "Logg inn"/konto-inngang for VANLIGE besøkende (ikke
   admin) – se lib/actions/account.ts. Favoritter, handleliste,
   "I kjøleskapet" og "Bygg din egen meny" er i ferd med å bli
   kontoeksklusive (se prosjektnotatet "Plan: brukerkonto"), så dette må nå
   være en tydelig, alltid synlig inngang – ikke bare en liten ekstra-
   detalj. `user` (allerede hentet under for isAdmin) avgjør om det vises
   et innloggings- eller utloggings-ikon; ingen egen "min konto"-side ennå
   (kommer senere), kun av/på.

   (28.09.2026) NO/EN-bryteren (LanguageSwitcher) bodde tidligere som siste
   element i denne navigasjonsraden. Flyttet til Footer.tsx – hovednav-raden
   (logo + søk + alle lenkene + handleliste/+/logg ut) ble for bred for
   vanlige skrivebordsbredder (1024–1500px), og NO/EN, som siste element,
   ble skjøvet helt utenfor synlig område i stedet for å brytes til ny linje
   (Henrik: "NO/EN ligger utenfor" / "du kan godt legge NO/EN nede på siden
   i stedet for"). Se Footer.tsx sin egen kommentar for hele forklaringen.

   (03.10.2026) "Guider" er flyttet ut herfra og ligger nå kun i
   Footer.tsx, til fordel for den nye "Helg & gjester"-lenken (se
   app/helg-og-gjester/page.tsx) – et bevisst 1:1-bytte, ikke en ren
   utvidelse: antall md:flex-tekstlenker i denne raden er UENDRET (fortsatt
   fem: Oppskrifter/Ukesmeny/Helg & gjester/I kjøleskapet/Favoritter, pluss
   den lg-only "I sesong"), så bredde-/overflow-balansen fra
   NO/EN-flyttingen over er ikke rørt. */
export async function Header() {
  const lang = await getLang();
  // getCurrentUserFast (ikke getCurrentUser) – Header rendres på HVER eneste
  // side (via app/layout.tsx), og "+"-snarveien under er rent kosmetisk.
  // Se filheaderen til getCurrentUserFast i lib/auth.ts.
  const user = await getCurrentUserFast();
  const isAdmin = Boolean(user?.isAdmin);

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
        <div className="flex shrink-0 items-center gap-1.5">
          <Link href="/" className="flex items-center gap-2.5 font-serif text-xl tracking-tight text-ink">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-clay text-cream">
              {siteConfig.logoInitial}
            </span>
            <span className="hidden tracking-wide sm:inline">{siteConfig.name}</span>
          </Link>
          {/* "Legg til på hjemskjerm", nå kun et lite ikon her i stedet for
              en egen bannerlinje over hele headeren – se filheaderen i
              AppDownloadIconButton.tsx (Henrik, 26.09.2026: "tar for mye
              plass på nettleser versjonen ... da vil også bildet av
              burgeren få mer plass"). Egen sibling ved siden av Link-en over
              (ikke inni den) – en knapp kan ikke ligge nestet inni en lenke. */}
          <AppDownloadIconButton lang={lang} />
        </div>

        <HeaderSearchSlot lang={lang} />

        {/* (27.09.2026) Henrik: "'I kjøleskapet' og 'i sesong' får ikke
            plass når søkefeltet er på samme linjen, og I'en havner litt
            rart over" – klassisk flexbox-fallgruve: disse tekst-lenkene
            hadde ingen `whitespace-nowrap`, og som flex-søsken av
            HeaderSearchSlot sin `flex-1`-boks (som konkurrerer om samme
            rad) kunne de krympes smalere enn tekstens egen bredde og
            brytes akkurat ved mellomrommet – "I" endte da alene på egen
            linje over "kjøleskapet"/"sesong". `whitespace-nowrap` lagt til
            på alle disse (samme fem lenkene) – nå er det søkefeltet
            (allerede `flex-1`/`min-w-0` via SearchBar) som krymper når
            plassen blir trang, ikke navigasjonsteksten som brekker. */}
        <nav aria-label={t(lang, "nav.mainNav")} className="ml-auto flex items-center gap-1 sm:gap-2">
          {/* Rekkefølge (03.10.2026, Henrik): Oppskrifter → Ukesmeny →
              Helg & gjester → I kjøleskapet → I sesong → Favoritter.
              "Guider" (tidligere her, mellom I kjøleskapet og I sesong) er
              flyttet til Footer.tsx for å gjøre plass, se kommentaren over.
              "I sesong" er fortsatt lg-only (se egen kommentar ved den
              lenken under) – de fire først-viste md:flex-lenkene over den
              er dermed Oppskrifter, Ukesmeny, Helg & gjester og
              I kjøleskapet. */}
          <Link
            href="/oppskrifter"
            className="hidden items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink md:flex"
          >
            <BookIcon className="h-4 w-4" />
            {t(lang, "nav.recipes")}
          </Link>
          <Link
            href="/ukesmeny"
            className="hidden items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink md:flex"
          >
            <CalendarIcon className="h-4 w-4" />
            {t(lang, "nav.weeklyMenu")}
          </Link>
          {/* "Helg & gjester" (03.10.2026) – ny kuratert inspirasjonsside,
              se app/helg-og-gjester/page.tsx. Bevisst IKKE en automatisk
              generator som Ukesmeny – egen ikon (UsersIcon, "gjester")
              fremfor CalendarIcon (som allerede er Ukesmeny sitt) for å
              ikke lese som "enda en kalenderfunksjon". */}
          <Link
            href="/helg-og-gjester"
            className="hidden items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink md:flex"
          >
            <UsersIcon className="h-4 w-4" />
            {t(lang, "nav.weekendGuests")}
          </Link>
          <Link
            href="/hva-kan-jeg-lage"
            className="hidden items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink md:flex"
          >
            <CameraIcon className="h-4 w-4" />
            {t(lang, "nav.pantry")}
          </Link>
          {/* Kun fra lg og opp (ikke md, som de lenkene over) – "Hva
              skal vi spise?"-lenken som sto her ved siden av er fjernet
              26.09.2026 (hele funksjonen fjernet, se
              lib/actions/what-to-eat.ts sin git-historikk), så dette er nå
              den eneste lg-only-lenken igjen. Nådd via forsideteaseren
              (SeasonTeaser) på alle skjermstørrelser i tillegg. */}
          <Link
            href="/sesong"
            className="hidden items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink lg:flex"
          >
            <LeafIcon className="h-4 w-4" />
            {t(lang, "nav.season")}
          </Link>
          <Link
            href="/favoritter"
            className="hidden items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink md:flex"
          >
            <HeartIcon className="h-4 w-4" />
            {t(lang, "nav.favorites")}
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
          {/* Hjerte-ikon KUN på mobil (md:hidden) – Favoritter fjernet fra
              BottomNav 26.09.2026 (Henrik: "Favoritter kan flyttes fra linja
              nede til å kun være et hjerte øverst ved siden av handlelista og
              søksymbolet"). Fra md og opp finnes "Favoritter" allerede som
              tekstlenke lenger opp i denne navigasjonen (md:flex), så denne
              skjules der for å unngå duplikat. */}
          <Link
            href="/favoritter"
            aria-label={t(lang, "nav.favorites")}
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink md:hidden"
          >
            <HeartIcon className="h-5 w-5" />
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
          {user ? (
            <AccountLogOutButton
              lang={lang}
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink"
            />
          ) : (
            <Link
              href="/logg-inn"
              aria-label={t(lang, "nav.login")}
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink"
            >
              <UserIcon className="h-5 w-5" />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
