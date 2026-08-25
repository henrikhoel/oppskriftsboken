"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { BookIcon, CameraIcon, HeartIcon, HomeIcon, ShoppingBagIcon } from "@/components/ui/icons";
import { ShoppingListBadgeCount } from "@/components/shopping/ShoppingListBadgeCount";
import { t, type Lang } from "@/lib/i18n";

const NAV_ITEMS = [
  { href: "/", labelKey: "nav.home", icon: HomeIcon },
  { href: "/oppskrifter", labelKey: "nav.recipes", icon: BookIcon },
  { href: "/hva-kan-jeg-lage", labelKey: "nav.pantry", icon: CameraIcon },
  { href: "/handleliste", labelKey: "nav.shoppingList", icon: ShoppingBagIcon, badge: true },
  { href: "/favoritter", labelKey: "nav.favorites", icon: HeartIcon },
] as const;

/**
 * Fast bunnmeny for mobil – dette er den viktigste navigasjonen når man
 * faktisk lager mat med telefonen i hånden. Skjules på større skjermer der
 * Header sin vanlige nav (inkl. språkbryteren) er synlig i stedet.
 */
export function BottomNav({ lang }: { lang: Lang }) {
  const pathname = usePathname();

  return (
    <nav
      id="bottom-nav"
      aria-label={t(lang, "nav.mainNavMobile")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon, badge }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-clay" : "text-ink-faint hover:text-ink-soft",
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {badge && <ShoppingListBadgeCount />}
                </span>
                {t(lang, labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
