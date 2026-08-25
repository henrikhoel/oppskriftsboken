import { Button } from "@/components/ui/Button";
import { BookIcon } from "@/components/ui/icons";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";

export default async function RecipeNotFound() {
  const lang = await getLang();

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-cream-dark text-ink-faint">
        <BookIcon className="h-8 w-8" />
      </div>
      <h1 className="font-serif text-3xl text-ink">{t(lang, "recipeNotFound.title")}</h1>
      <p className="mt-3 text-ink-soft">{t(lang, "recipeNotFound.description")}</p>
      <div className="mt-8">
        <Button href="/oppskrifter">{t(lang, "notFound.browse")}</Button>
      </div>
    </div>
  );
}
