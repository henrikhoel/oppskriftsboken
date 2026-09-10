import { getLang } from "@/lib/i18n/lang";
import { AppDownloadBannerClient } from "@/components/layout/AppDownloadBannerClient";

/**
 * Tynn SERVER-wrapper – henter kun `lang` (cookie-basert, se
 * lib/i18n/lang.ts sin filheader for hvorfor det må skje her og ikke i en
 * "use client"-fil), selve banneret er nå AppDownloadBannerClient.tsx, siden
 * det trenger ekte nettleser-signaler (se den filens filheader).
 */
export async function AppDownloadBanner() {
  const lang = await getLang();
  return <AppDownloadBannerClient lang={lang} />;
}
