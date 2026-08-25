"use client";

import { useEffect, useState } from "react";

/**
 * MIDLERTIDIG feilsøkingskomponent – ikke ment å bli værende i appen.
 *
 * Fanger opp enhver ukastet JS-feil (window.onerror) eller ukastet Promise-
 * avvisning (unhandledrejection) og viser den synlig øverst på siden, i
 * stedet for at den bare forsvinner stille i konsollen. Formålet er å finne
 * en feil som får store deler av siden til å slutte å svare på trykk på et
 * spesifikt device (mobil) uten at vi har tilgang til å se konsollen der.
 *
 * Fjern denne komponenten (og importen i app/layout.tsx) igjen så snart
 * feilen er funnet og fikset.
 */
export function ErrorOverlay() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    function handleError(event: ErrorEvent) {
      setMessage(
        `${event.message}\n${event.filename ?? ""}:${event.lineno ?? ""}:${event.colno ?? ""}\n${
          event.error?.stack ?? ""
        }`,
      );
    }
    function handleRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const text =
        reason instanceof Error ? `${reason.message}\n${reason.stack ?? ""}` : String(reason);
      setMessage(`Unhandled promise rejection:\n${text}`);
    }
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  if (!message) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[9999] max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words bg-red-600 p-4 font-mono text-xs text-white shadow-lg">
      <p className="mb-2 font-bold">⚠️ JS-feil fanget (midlertidig feilsøkingsvisning):</p>
      {message}
    </div>
  );
}
