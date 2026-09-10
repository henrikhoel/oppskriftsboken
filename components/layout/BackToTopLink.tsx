"use client";

import type { MouseEvent } from "react";
import { ChevronUpIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * "Til toppen"-pilen i footeren – tidligere en helt vanlig
 * <a href="#top"> som lente seg på globalt `scroll-behavior: smooth`
 * (app/globals.css). Den globale regelen er fjernet (10.09.2026 –
 * animerte OGSÅ Next.js sin sideskift-hopp-til-toppen, se filheaderen i
 * globals.css), så denne lenken gjør nå den samme jevne rullingen selv,
 * med JS – eneste reelle endring for BRUKEREN er at sideskifter ikke
 * lenger ruller synlig.
 *
 * Fortsatt en ekte <a href="#top">: fungerer identisk (instant hopp) uten
 * JS, midterste-klikk/høyreklikk-åpne-i-ny-fane fungerer som normalt –
 * onClick gjør kun preventDefault + en jevn variant i stedet for browserens
 * egen instant-hopp, når JS faktisk er tilgjengelig.
 */
export function BackToTopLink({ lang }: { lang: Lang }) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    document.getElementById("top")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <a
      href="#top"
      onClick={handleClick}
      aria-label={t(lang, "footer.backToTop")}
      className="mx-auto mt-8 flex w-fit items-center justify-center rounded-full p-2 text-ink-faint transition-colors hover:text-ink"
    >
      <ChevronUpIcon className="h-5 w-5" />
    </a>
  );
}
