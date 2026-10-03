"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import type { RecipeSummary } from "@/lib/types";
import { setPublished, deleteRecipe } from "@/lib/actions/recipes";
import { formatDateNorwegian } from "@/lib/utils/format";
import { Badge } from "@/components/ui/Badge";
import { ImageIcon, TrashIcon } from "@/components/ui/icons";

export function AdminRecipeRow({ recipe }: { recipe: RecipeSummary }) {
  const [isPublished, setIsPublished] = useState(recipe.isPublished);
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const router = useRouter();

  function handleTogglePublish() {
    const next = !isPublished;
    setIsPublished(next);
    startTransition(async () => {
      try {
        await setPublished(recipe.id, next);
        router.refresh();
      } catch {
        setIsPublished(!next);
      }
    });
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    startTransition(async () => {
      await deleteRecipe(recipe.id);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-line px-4 py-4 last:border-b-0 sm:px-5">
      {/* Selve FOTOET i denne boksen er fjernet (03.10.2026, samme
          Supabase-kvote-begrunnelse som de andre admin-listene denne dagen
          – se f.eks. FeaturedPicker.tsx/RolePicker.tsx sine filheadere –
          den forrige unoptimized <Image> lastet ned hele originalbildet
          for en 56px-visning på HVER rad i hele oppskriftslisten). Erstattet
          med et rent ikon (ingen nettverkskall i det hele tatt) som i
          tillegg FARGES etter om oppskriften mangler bilde – Henrik: "sett
          inn et placeholder bilde på oppskriftene som viser at oppskriftene
          har et bilde, sånn at jeg ikke glemmer å legge til det". Nøytral
          gråtone når heroImageUrl finnes, tydelig leire-farget "mangler
          bilde"-varsel når den ikke gjør det – lett å få øye på i en lang
          liste uten å måtte åpne hver enkelt oppskrift.
          "Trykk for å åpne den faktiske, publiserte oppskriftssiden"
          -funksjonen (ønsket av Henrik 26.08.2026, for å raskt sjekke
          hvordan nylige endringer faktisk ser ut) er beholdt som selve
          klikkmålet på denne boksen – samme fane (IKKE target="_blank" –
          testet og meldt tilbake at det ikke var ønsket), atskilt fra
          "Rediger"-lenken, som fortsatt går til admin-redigeringssiden. */}
      <Link
        href={`/oppskrifter/${recipe.slug}`}
        aria-label={`Se "${recipe.title}" på nettsiden${recipe.heroImageUrl ? "" : " (mangler bilde)"}`}
        title={recipe.heroImageUrl ? "Se på nettsiden" : "Mangler bilde – se på nettsiden"}
        className={clsx(
          "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-colors",
          recipe.heroImageUrl
            ? "bg-cream-dark text-ink-faint hover:text-ink"
            : "bg-clay-light text-clay-dark hover:bg-clay-light/70",
        )}
      >
        <ImageIcon className="h-5 w-5" />
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/admin/oppskrifter/${recipe.id}`}
          className="truncate font-medium text-ink hover:text-clay"
        >
          {recipe.title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
          {recipe.category && <span>{recipe.category.name}</span>}
          <span>· {formatDateNorwegian(recipe.createdAt)}</span>
          {recipe.isFeatured && <Badge tone="mustard">Utvalgt</Badge>}
        </div>
      </div>

      <button
        type="button"
        onClick={handleTogglePublish}
        disabled={isPending}
        aria-pressed={isPublished}
        className={clsx(
          "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
          isPublished
            ? "border-olive bg-olive-light text-olive-dark"
            : "border-line-strong bg-cream text-ink-faint",
        )}
      >
        {isPublished ? "Publisert" : "Utkast"}
      </button>

      <Link
        href={`/admin/oppskrifter/${recipe.id}`}
        className="shrink-0 rounded-full border border-line-strong px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-cream-dark"
      >
        Rediger
      </Link>

      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className={clsx(
          "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
          confirmingDelete
            ? "bg-clay-dark text-cream"
            : "text-ink-faint hover:bg-clay-light hover:text-clay-dark",
        )}
      >
        <TrashIcon className="h-3.5 w-3.5" />
        {confirmingDelete ? "Bekreft sletting" : "Slett"}
      </button>
    </div>
  );
}
