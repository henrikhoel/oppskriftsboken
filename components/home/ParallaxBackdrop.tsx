"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

/**
 * Svært subtil scroll-parallax på et fullbredde bakgrunnsbilde – kun en
 * liten vertikal forskyvning (maks ~18px) drevet av requestAnimationFrame,
 * ikke noe "flashy". Kobler seg helt av dersom brukeren har skrudd på
 * prefers-reduced-motion, og bruker passive scroll-lytting + rAF-throttling
 * for å holde det performant.
 *
 * objectPosition er en prop (ikke hardkodet) nettopp fordi seksjonen som
 * bruker den ofte er lav og bred mens motivet i bildet ikke er det – uten
 * justering klipper en enkel senter-beskjæring gjerne bort akkurat det som
 * gjør bildet gjenkjennelig. Standardverdien er "center".
 *
 * OPPRINNELIG bygget for components/home/AtmosphereSection.tsx (h-[55vh],
 * kakestabelbildet) – den seksjonen ble fjernet 27.09.2026 (Henrik: "fjern
 * hele 'tenn stearlinlysene. nyt' delen fra siden"), så denne komponenten
 * er akkurat nå IKKE i faktisk bruk noe sted. Beholdt likevel urørt, samme
 * begrunnelse som public/images/mood-section.jpg i MoodModeSection.tsx sin
 * filheader: en ferdig, fungerende byggekloss i reserve om et fremtidig
 * bakgrunnsbilde skal ha den samme subtile parallaksen igjen.
 */
export function ParallaxBackdrop({
  src,
  alt,
  objectPosition = "center",
}: {
  src: string;
  alt: string;
  objectPosition?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const el = ref.current;
    if (!el) return;

    let ticking = false;
    function onScroll() {
      if (ticking || !el) return;
      ticking = true;
      requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const viewportH = window.innerHeight || 1;
        const progress = (rect.top + rect.height / 2 - viewportH / 2) / viewportH;
        const clamped = Math.max(-1, Math.min(1, progress));
        el.style.transform = `translateY(${clamped * -18}px) scale(1.08)`;
        ticking = false;
      });
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={ref} className="absolute inset-0 scale-[1.08] will-change-transform">
      <Image src={src} alt={alt} fill sizes="100vw" className="object-cover" style={{ objectPosition }} />
    </div>
  );
}
