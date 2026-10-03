"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import type { RecipeSummary } from "@/lib/types";
import { setPublished, setRecipeHeroImage, deleteRecipe } from "@/lib/actions/recipes";
import { uploadRecipeImage } from "@/lib/actions/upload";
import { formatDateNorwegian } from "@/lib/utils/format";
import { Badge } from "@/components/ui/Badge";
import { ImageIcon, TrashIcon } from "@/components/ui/icons";

export function AdminRecipeRow({ recipe }: { recipe: RecipeSummary }) {
  const [isPublished, setIsPublished] = useState(recipe.isPublished);
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const router = useRouter();

  // Lokal speiling av heroImageUrl (samme mønster som isPublished over) –
  // slik at boksen bytter fra "mangler bilde" til vanlig miniatyr-boks med
  // ÉN gang etter en vellykket opplasting, uten å vente på at
  // router.refresh() henter oppskriftslisten på nytt fra serveren.
  const [heroImageUrl, setHeroImageUrl] = useState(recipe.heroImageUrl);
  const [isUploadingImage, startImageUpload] = useTransition();
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleImageFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImageUploadError(null);
    const formData = new FormData();
    formData.set("file", file);

    startImageUpload(async () => {
      const uploadResult = await uploadRecipeImage(formData);
      if (!uploadResult.success || !uploadResult.url) {
        setImageUploadError(uploadResult.error ?? "Opplasting feilet");
        return;
      }
      try {
        await setRecipeHeroImage(recipe.id, uploadResult.url, "");
        setHeroImageUrl(uploadResult.url);
        router.refresh();
      } catch {
        setImageUploadError("Bildet ble lastet opp, men kunne ikke lagres på oppskriften");
      }
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
          tillegg markerer om oppskriften mangler bilde – Henrik: "sett
          inn et placeholder bilde på oppskriftene som viser at oppskriftene
          har et bilde, sånn at jeg ikke glemmer å legge til det".
          FØRSTE versjon (samme dag) farget "mangler bilde" med
          bg-clay-light/text-clay-dark – men det er NØYAKTIG samme
          fargekombinasjon som Badge tone="clay" bruker for positive/
          fremhevede ting (og "Utvalgt"-badgen under bruker den nærstående
          mustard-tonen), så gull leste som "fremhevet/bra" i stedet for
          "varsel" (Henrik: "de med gult ikon her er jo de uten bilde, det
          ser jo motsatt ut"). Appens palett har ingen egen rød/
          "danger"-farge å ty til i stedet, så løsningen her er å ikke bruke
          farge for å signalisere "mangler" i det hele tatt – i stedet en
          stiplet kant (en vanlig, fargeuavhengig "tom plassholder"-
          konvensjon), nøytral i ro, med et svakt gull-hint KUN på hover som
          en invitasjon til å trykke og fikse det. Boksen med ekte bilde
          forblir en vanlig, utfylt, nøytral boks ("allerede i orden").
          KLIKKMÅLET er også ulikt per tilstand, og ble justert TO ganger
          samme dag: først en lenke til den offentlige oppskriftssiden for
          begge tilstander (original), så en lenke til admin-
          redigeringssiden sitt hovedbilde-felt for "mangler bilde"
          (forkastet – Henrik: "jeg mente mer rett hit, fordi tittelen tar
          meg uansett til redigeringssiden"), og til slutt DENNE varianten:
          "mangler bilde"-boksen laster opp bildet DIREKTE fra selve raden
          (åpner filvelgeren med en skjult <input type="file">, laster opp
          via uploadRecipeImage() i lib/actions/upload.ts, og lagrer det på
          oppskriften via setRecipeHeroImage() i lib/actions/recipes.ts) –
          ingen navigering i det hele tatt. Boksen med ekte bilde er
          uendret og går fortsatt til den offentlige siden (ønsket
          26.08.2026 for å sjekke hvordan endringer ser ut). */}
      {heroImageUrl ? (
        <Link
          href={`/oppskrifter/${recipe.slug}`}
          aria-label={`Se "${recipe.title}" på nettsiden`}
          title="Se på nettsiden"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-cream-dark text-ink-faint transition-colors hover:text-ink"
        >
          <ImageIcon className="h-5 w-5" />
        </Link>
      ) : (
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage}
            aria-label={`Last opp bilde for "${recipe.title}"`}
            title={imageUploadError ?? "Mangler bilde – trykk for å laste opp"}
            className={clsx(
              "flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed transition-colors disabled:opacity-50",
              imageUploadError
                ? "border-clay text-clay-dark"
                : "border-line-strong text-ink-faint hover:border-clay hover:text-clay",
            )}
          >
            <ImageIcon className="h-5 w-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            onChange={handleImageFileChange}
          />
        </div>
      )}

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
