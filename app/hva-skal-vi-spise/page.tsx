import type { Metadata } from "next";
import { WhatToEatView } from "@/components/whattoeat/WhatToEatView";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: t(lang, "whatToEat.title"),
    description: t(lang, "whatToEat.metaDescription"),
  };
}

/**
 * "Hva skal vi spise?" – se filheaderen til
 * components/whattoeat/WhatToEatView.tsx for selve gjennomføringen. Samme
 * tynne server-wrapper-mønster som app/hva-kan-jeg-lage/page.tsx.
 */
export default async function WhatToEatPage() {
  const lang = await getLang();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-serif text-3xl text-ink sm:text-4xl">{t(lang, "whatToEat.title")}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t(lang, "whatToEat.intro")}</p>
      <div className="mt-8">
        <WhatToEatView lang={lang} />
      </div>
    </div>
  );
}
