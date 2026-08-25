"use client";

/**
 * Søkefeltet i toppmenyen. Skjules på forsiden – der ligger det allerede et
 * stort søkefelt i hero-seksjonen, så et ekstra ett i header blir
 * overflødig. Vises som vanlig på alle andre sider.
 */
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { SearchBar } from "@/components/search/SearchBar";
import type { Lang } from "@/lib/i18n";

export function HeaderSearchSlot({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <div className="hidden flex-1 md:block">
      <Suspense fallback={<div className="h-11 rounded-full bg-cream-dark" />}>
        <SearchBar lang={lang} />
      </Suspense>
    </div>
  );
}
