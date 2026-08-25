import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { AlertIcon } from "@/components/ui/icons";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";

export async function DemoModeBanner() {
  if (isSupabaseConfigured) return null;
  const lang = await getLang();

  return (
    <div className="bg-clay text-cream">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-xs sm:px-6 lg:px-8">
        <AlertIcon className="h-3.5 w-3.5 shrink-0" />
        <p>{t(lang, "demo.banner")}</p>
      </div>
    </div>
  );
}
