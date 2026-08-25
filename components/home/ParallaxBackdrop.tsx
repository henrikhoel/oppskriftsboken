"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

/**
 * Svært subtil scroll-parallax på bakgrunnsbildet i AtmosphereSection –
 * kun en liten vertikal forskyvning (maks ~18px) drevet av
 * requestAnimationFrame, ikke noe "flashy". Kobler seg helt av dersom
 * brukeren har skrudd på prefers-reduced-motion, og bruker passive
 * scroll-lytting + rAF-throttling for å holde det performant.
 *
 * objectPosition er en prop (ikke hardkodet) nettopp fordi seksjonen er
 * lav og bred (h-[55vh] i AtmosphereSection) mens motivet i bildet ofte
 * ikke er det – uten justering klipper en enkel senter-beskjæring gjerne
 * bort akkurat det som gjør bildet gjenkjennelig. Standardverdien er
 * "center" (samme som før); AtmosphereSection.tsx setter i dag en verdi
 * tunet for det nåværende bildet (kakestabelen) – juster den der neste
 * gang bildet byttes ut, i stedet for å hardkode det inn her.
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
