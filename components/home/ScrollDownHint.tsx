"use client";

import type { MouseEvent } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * "Bla nedover"-pilen nederst i hero-seksjonen (app/page.tsx) – motstykket
 * til BackToTopLink.tsx i footeren, samme grunn til å være en egen liten
 * "use client"-fil: gjør sin egen smooth-scroll i JS i stedet for å lene
 * seg på det globale scroll-behavior: smooth som ble fjernet 10.09.2026
 * (se filheaderen i globals.css/BackToTopLink.tsx).
 *
 * Fortsatt en ekte <a href="#etter-hero">: fungerer identisk (instant hopp)
 * uten JS – onClick gjør kun preventDefault + en jevn variant når JS
 * faktisk er tilgjengelig.
 */
export function ScrollDownHint({ lang }: { lang: Lang }) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    document.getElementById("etter-hero")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <a
      href="#etter-hero"
      onClick={handleClick}
      aria-label={t(lang, "home.scrollDown")}
      className="absolute inset-x-0 bottom-6 z-10 mx-auto flex w-fit animate-bounce items-center justify-center rounded-full p-2 text-ink/60 transition-colors hover:text-ink motion-reduce:animate-none sm:bottom-9"
    >
      <ChevronDownIcon className="h-6 w-6" />
    </a>
  );
}
