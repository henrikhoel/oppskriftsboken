import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";
import { SiteAccessForm } from "@/components/site-access/SiteAccessForm";

// noindex/nofollow – denne siden skal aldri selv dukke opp i søkeresultater
// (hele poenget er tvert imot å holde resten av nettstedet unna søk uten
// riktig passord, se filheaderen i proxy.ts).
export const metadata: Metadata = {
  title: "Adgang",
  robots: { index: false, follow: false },
};

/**
 * Fellespassord-siden (26.09.2026) – proxy.ts sender hit alle besøkende som
 * ikke allerede har en gyldig site_access-cookie, for ALLE offentlige sider
 * (men aldri for /admin, se filheaderen der – admin har sin egen, separate
 * innlogging). `next` er stien de egentlig prøvde å nå, satt av proxy.ts,
 * slik at de havner rett tilbake der etter riktig passord.
 *
 * `feil=1` settes av app/api/adgang/route.ts (se filheaderen der for
 * hvorfor selve innsendingen er en ordentlig Route Handler og ikke en
 * React Server Action) når passordet var galt.
 */
export default async function SiteAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; feil?: string }>;
}) {
  const { next, feil } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-clay font-serif text-lg text-cream">
          {siteConfig.logoInitial}
        </span>
        <h1 className="font-serif text-2xl text-ink">{siteConfig.name}</h1>
        <p className="mt-1.5 text-sm text-ink-soft">Skriv inn passordet for å komme inn.</p>
      </div>
      <div className="rounded-card border border-line bg-paper p-6 shadow-card sm:p-8">
        <SiteAccessForm next={next && next.startsWith("/") ? next : "/"} error={feil === "1"} />
      </div>
    </div>
  );
}
