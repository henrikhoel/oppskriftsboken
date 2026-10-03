"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import { shuffleRecipeDisplayOrder } from "@/lib/actions/recipes";

/**
 * "Miks rekkefølgen" (03.10.2026) – admin-knapp på /oppskrifter
 * (rendret fra BrowseRecipesClient.tsx, kun når isAdmin). Henrik: "jeg
 * opprettet dem i bølger på 10, så det er veldig mye i samme kategori
 * etter hverandre nå i stedet for en god miks". Trykk → ny tilfeldig
 * rekkefølge for ALLE oppskrifter, se shuffleRecipeDisplayOrder sin
 * filheader i lib/actions/recipes.ts for hele bakgrunnen (inkl. hvorfor
 * admin-dashbordets egne lister IKKE påvirkes).
 *
 * Ingen bekreftelsesdialog – rekkefølgen er triviell å endre tilbake ved
 * å bare trykke igjen (eller la være), helt ulikt en slett/publiser-
 * handling. Samme "trykk → kort 'Miksa!'-bekreftelse på selve
 * knappen"-mønster som CopyTitlesButton.tsx, men med en ekte
 * server-handling + router.refresh() bak (som FeaturedPicker.tsx sine
 * håndteringsfunksjoner) i stedet for en ren klient-side
 * utklippstavle-kopi.
 */
export function ShuffleOrderButton() {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await shuffleRecipeDisplayOrder();
        router.refresh();
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      } catch {
        setError("Kunne ikke mikse rekkefølgen. Prøv igjen.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
        {done ? <CheckIcon className="h-4 w-4" /> : null}
        {isPending ? "Mikser …" : done ? "Miksa!" : "Miks rekkefølgen"}
      </Button>
      {error && <p className="text-xs text-clay-dark">{error}</p>}
    </div>
  );
}
