import type { Metadata } from "next";
import { SitePasswordForm } from "@/components/admin/SitePasswordForm";

export const metadata: Metadata = { title: "Innstillinger" };

/**
 * (26.09.2026) Foreløpig kun bytte av fellespassordet for hele det
 * offentlige nettstedet – se lib/actions/site-access.ts. Egen side (ikke
 * en boks et sted på oppskrifter-oversikten) siden dette er
 * nettsted-innstillinger, ikke noe knyttet til én bestemt oppskrift.
 */
export default function AdminSettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-ink sm:text-3xl">Innstillinger</h1>
        <p className="mt-1 text-sm text-ink-soft">Bytt det felles passordet alle besøkende bruker for å komme inn på nettstedet.</p>
      </div>
      <div className="max-w-md rounded-card border border-line bg-paper p-6 sm:p-8">
        <SitePasswordForm />
      </div>
    </div>
  );
}
