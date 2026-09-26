"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CopyIcon, CheckIcon } from "@/components/ui/icons";

/**
 * "Alle oppskrifter" (admin, 26.09.2026, ønsket av Henrik: "kan du legge
 * til en liten funksjon for meg som admin, inne på 'alle oppskrifter' hvor
 * jeg enkelt kan hente ut alle oppskriftene i en liste nedover, kun
 * overskrift, som jeg kan kopiere") – kopierer alle oppskriftstitlene til
 * utklippstavlen, én per linje, i samme rekkefølge som listen under vises
 * (nyeste først, se getAllRecipesForAdmin). Ingen egen visningsdialog med
 * selve listen (Henrik ba spesifikt om noe han kan LIME INN et sted, ikke
 * lese på skjermen) – kun en kort "Kopiert!"-bekreftelse på selve knappen,
 * samme mønster som ShareButton.tsx på oppskriftssiden.
 */
export function CopyTitlesButton({ titles }: { titles: string[] }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(titles.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // navigator.clipboard krever HTTPS/tillatelse – i det sjeldne
      // tilfellet det feiler, er det ikke mer å gjøre enn å la knappen
      // forbli som den er.
    }
  }

  return (
    <Button type="button" variant="outline" size="md" onClick={handleClick}>
      {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
      {copied ? "Kopiert!" : "Kopier titler"}
    </Button>
  );
}
