"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { AlertIcon } from "@/components/ui/icons";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Uventet feil:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-clay-light text-clay-dark">
        <AlertIcon className="h-8 w-8" />
      </div>
      <h1 className="font-serif text-3xl text-ink">Noe gikk galt</h1>
      <p className="mt-3 text-ink-soft">
        Det oppstod en uventet feil. Prøv gjerne igjen – dersom problemet vedvarer kan det være at
        Supabase midlertidig ikke svarer.
      </p>
      <div className="mt-8">
        <Button onClick={reset}>Prøv igjen</Button>
      </div>
    </div>
  );
}
