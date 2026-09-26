"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { CheckIcon, ShareIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * (26.09.2026, Henrik: "jeg vil at man skal kunne dele lenken til
 * oppskriften via snarveien på telefonen, for nå har man ikke mulighet til
 * det. en liten knapp ved siden av hjertet på oppskriftsiden hadde vært
 * gull") – deler lenken til akkurat DENNE oppskriften.
 *
 * Bruker nettleserens innebygde delefunksjon (navigator.share, "Web Share
 * API") når den finnes – samme delemeny man får fra Safari/Chrome sin egen
 * del-knapp, og virker helt likt fra hjemskjerm-snarveien
 * (standalone-modus, se app/manifest.ts) som fra en vanlig fane. Støttes i
 * praksis av alle mobilnettlesere, men IKKE i de fleste vanlige
 * desktop-nettlesere – der faller knappen tilbake til å kopiere lenken til
 * utklippstavlen i stedet, med en kort "Lenke kopiert"-bekreftelse rett på
 * selve knappen (ingen egen toast/popup nødvendig for én enkelt setning).
 */
export function ShareButton({
  title,
  url,
  lang = "no",
}: {
  title: string;
  url: string;
  lang?: Lang;
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // Brukeren avbrøt selve del-dialogen (eller den feilet av andre
        // grunner) – helt normalt, samme oppførsel som nettleserens egen
        // del-knapp ville hatt. Ingenting å varsle om her.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // navigator.clipboard krever HTTPS/tillatelse – i det sjeldne
      // tilfellet det feiler, er det ikke mer å gjøre enn å la knappen
      // forbli som den er (brukeren kan fortsatt kopiere URL-en manuelt
      // fra adressefeltet).
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={copied ? t(lang, "recipeDetail.linkCopied") : t(lang, "recipeDetail.share")}
      className={clsx(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
        copied
          ? "border-clay bg-clay-light text-clay-dark"
          : "border-line-strong bg-paper text-ink-soft hover:bg-cream-dark",
      )}
    >
      {copied ? <CheckIcon className="h-4 w-4" /> : <ShareIcon className="h-4 w-4" />}
    </button>
  );
}
