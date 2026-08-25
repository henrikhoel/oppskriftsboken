"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { XIcon } from "@/components/ui/icons";

/**
 * Delt bunn-ark-primitiv (mobil-først, jf. spec §14/§15 "progressiv
 * disclosure" – ingen dashboard/modal-tunge paneler, alt bak et lett,
 * kjent draw-opp-mønster). Følger nøyaktig samme visuelle oppskrift som
 * ingrediens-arket i CookMode.tsx hadde fra før (samme
 * bakgrunn/avrunding/håndtak-strek), flyttet hit som en gjenbrukbar
 * komponent i stedet for å gjenta det hver gang en ny funksjon trenger et
 * bunn-ark – "Løft retten"-forslag, ingrediens-erstatninger, meny-bygger
 * osv. bruker denne fremover i stedet for å finne opp sin egen.
 *
 * Bevisst enkel: ingen swipe-to-dismiss/animasjonsbibliotek, kun CSS-
 * transisjon + klikk-utenfor/Escape/X for å lukke – samme nivå av
 * enkelhet som resten av UI-et i appen.
 */
export function Drawer({
  open,
  onClose,
  title,
  closeLabel = "Lukk",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Tilgjengelighets-tekst for lukk-knappen – send inn en oversatt streng
   * (t(lang, "...")) fra kalleren; "Lukk" er kun en engelsk-fri fallback. */
  closeLabel?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-40 flex flex-col justify-end bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[80vh] overflow-y-auto rounded-t-3xl bg-paper px-5 pb-8 pt-5 text-ink shadow-card sm:px-8">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line-strong" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-serif text-xl">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-cream-dark"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
