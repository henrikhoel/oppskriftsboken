import Link from "next/link";
import { siteConfig } from "@/lib/config";
import { ChevronUpIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

export function Footer({ lang }: { lang: Lang }) {
  return (
    <footer className="mt-20 border-t border-line bg-cream-dark/60 pb-24 md:pb-0">
      {/* "Til toppen"-pil – motstykket til "bla nedover"-pilen i heroen
          (app/page.tsx), samme enkle <a href="#..."> + globalt
          scroll-behavior: smooth (app/globals.css), ingen JS nødvendig.
          Lenker til id="top" på <body> (app/layout.tsx), så den fungerer
          fra bunnen av enhver side, ikke bare forsiden. */}
      <a
        href="#top"
        aria-label={t(lang, "footer.backToTop")}
        className="mx-auto mt-8 flex w-fit items-center justify-center rounded-full p-2 text-ink-faint transition-colors hover:text-ink"
      >
        <ChevronUpIcon className="h-5 w-5" />
      </a>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-serif text-xl text-ink">{siteConfig.name}</p>
            {/* Brukte tidligere home.eyebrow ("Din digitale kokebok"), som ble
             * tatt bort fra selve heroen til fordel for home.subtitleRest
             * ("Det beste skjer rundt bordet.") – footeren viste da fortsatt
             * den gamle frasen, inkonsekvent med resten av siden. Samme
             * frase som heroen nå, for ett konsistent avsluttende inntrykk. */}
            <p className="mt-2 max-w-sm text-sm italic text-ink-soft">{t(lang, "home.subtitleRest")}</p>
          </div>
          <nav aria-label={t(lang, "footer.ariaLabel")} className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Link href="/oppskrifter" className="text-ink-soft hover:text-ink">
              {t(lang, "footer.allRecipes")}
            </Link>
            <Link href="/favoritter" className="text-ink-soft hover:text-ink">
              {t(lang, "footer.favorites")}
            </Link>
            <Link href="/handleliste" className="text-ink-soft hover:text-ink">
              {t(lang, "footer.shoppingList")}
            </Link>
            <Link href="/admin/login" className="text-ink-soft hover:text-ink">
              {t(lang, "footer.admin")}
            </Link>
          </nav>
        </div>
        <p className="mt-10 text-xs text-ink-faint">
          © {new Date().getFullYear()} {siteConfig.name}. {t(lang, "footer.madeFor")}
        </p>
      </div>
    </footer>
  );
}
