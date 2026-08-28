"use server";

import { searchGuides as searchGuidesData } from "@/lib/data/guides";
import type { GuideSearchResult } from "@/lib/types";
import type { Lang } from "@/lib/i18n/lang";

/**
 * Offentlig (IKKE admin-gated) server action som slår opp guider – en tynn
 * wrapper rundt lib/data/guides.ts -> searchGuides. Klientkomponenter
 * (GuideSearchBar.tsx) kan ikke importere lib/data direkte (det er ikke
 * "use server", og noe av det leser Supabase-nøkler som ikke skal til
 * klienten), så de kaller denne server actionen i stedet – samme
 * "use server"-wrapper-mønster som resten av appens klient->server-kall.
 *
 * Ingen requireAdmin() her med vilje: søk i publiserte guider skal fungere
 * for alle besøkende, akkurat som selve guide-sidene er offentlige.
 */
export async function searchGuidesAction(query: string, lang: Lang = "no"): Promise<GuideSearchResult[]> {
  return searchGuidesData(query, lang);
}
