import Link from "next/link";
import { siteConfig } from "@/lib/config";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { HeaderSearchSlot } from "@/components/layout/HeaderSearchSlot";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ShoppingListBadgeCount } from "@/components/shopping/ShoppingListBadgeCount";
import { BookIcon, CameraIcon, HeartIcon, SearchIcon, ShoppingBagIcon } from "@/components/ui/icons";

/* Admin-lenken i toppmenyen er fjernet etter ønske – den finnes fortsatt
   nederst i footeren (footer.admin → /admin/login), så innloggede admins
   kommer fortsatt til admin-flyten derfra, uten at "Admin" ligger synlig
   øverst på hver side. */
export async function Header() {
  const lang = await getLang();

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

        <nav aria-label={t(lang, "nav.mainNav")} className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/oppskrifter"
            className="hidden items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink md:flex"
          >
            <BookIcon className="h-4 w-4" />
            {t(lang, "nav.recipes")}
          </Link>
          <Link
            href="/hva-kan-jeg-lage"
            className="hidden items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink md:flex"
          >
            <CameraIcon className="h-4 w-4" />
            {t(lang, "nav.pantry")}
          </Link>
          <Link
            href="/favoritter"
            className="hidden items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink md:flex"
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
          <LanguageSwitcher lang={lang} className="ml-1" />
        </nav>
      </div>
    </header>
  );
}
