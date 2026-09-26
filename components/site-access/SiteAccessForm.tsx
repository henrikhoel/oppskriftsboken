import { siteConfig } from "@/lib/config";
import { Button } from "@/components/ui/Button";

/**
 * Selve passordfeltet på /adgang (se app/adgang/page.tsx og proxy.ts).
 * autoComplete="current-password" på et VANLIG <input type="password">
 * inne i et ekte <form> (26.09.2026, Henrik: "ett enkelt passord er smart!
 * og at den tillater face id hadde også vært bra") – dette er bevisst IKKE
 * en egen WebAuthn/passkey-implementasjon. Safari/Chrome tilbyr selv å
 * lagre passordet i enhetens nøkkelring første gang, og spør deretter om
 * Face ID/Touch ID for å fylle det ut automatisk neste besøk – ren
 * nettleser-funksjonalitet, ingen ekstra kode her utover disse to
 * attributtene og et ordentlig <form>.
 *
 * (26.09.2026, Henrik: "jeg får ikke opp muligheten til å lagre passordet
 * eller face id på telefon") – DERFOR er dette bevisst IKKE lenger en
 * "use client"-komponent med en React Server Action (useActionState). Så
 * lenge JavaScript er lastet, sender React en Server Action som et
 * fetch()-kall i bakgrunnen, og et slikt usynlig kall blir ALDRI fanget opp
 * av Safari/Chrome sin "vil du lagre passordet?"-boks – uansett hvor riktig
 * autoComplete er satt opp. Et vanlig <form method="post"> som POST-er
 * direkte til en Route Handler (app/api/adgang/route.ts) og fører til en
 * ekte ny side, er derimot nøyaktig mønsteret nettleserne ser etter. Se
 * filheaderen der for hele forklaringen.
 *
 * (26.09.2026, Henrik: "og jeg får fortsatt ikke muligheten til å lagre
 * passordet på telefon") – enda en brikke manglet: de aller fleste
 * nettlesere (spesielt Safari/iOS) krever et FELT DE OPPFATTER SOM
 * BRUKERNAVN rett før passordfeltet for i det hele tatt å tolke skjemaet
 * som en innlogging verdt å tilby å lagre – et skjema med KUN et
 * passordfelt (som dette, siden det ikke finnes noen personlig konto her)
 * blir ofte ikke gjenkjent i det hele tatt, uansett hvor riktig
 * autoComplete på selve passordfeltet er. Løsningen er det skjulte feltet
 * under: et helt fast "brukernavn" (nettstedets eget navn, samme for alle
 * besøkende) som ALDRI vises eller kan endres av besøkende, men som likevel
 * er tilstede i selve DOM-en (kun visuelt skjult via samme "sr-only"-triks
 * som "Hopp til innhold"-lenken i app/layout.tsx bruker – IKKE
 * type="hidden" eller display:none, som nettlesere bevisst ignorerer i
 * denne sammenhengen) – nøyaktig mønsteret Safari/Chrome leter etter.
 */
export function SiteAccessForm({ next, error }: { next: string; error?: boolean }) {
  return (
    <form action="/api/adgang" method="post" className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <input
        type="text"
        name="username"
        autoComplete="username"
        defaultValue={siteConfig.name}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
      <div>
        <label htmlFor="site-password" className="mb-1.5 block text-sm font-medium text-ink">
          Passord
        </label>
        <input
          id="site-password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className="w-full rounded-xl border border-line-strong bg-paper px-4 py-2.5 text-ink focus:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-clay-light px-4 py-2.5 text-sm text-clay-dark">
          Feil passord.
        </p>
      )}

      <Button type="submit" fullWidth>
        Fortsett
      </Button>
    </form>
  );
}
