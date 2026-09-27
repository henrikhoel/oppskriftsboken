import Link from "next/link";

/**
 * Hovedsiden for DSVDV, vist i app/dsvdv/page.tsx når besøkende har en
 * gyldig sesjon (se lib/dsvdv/session.ts). Bevisst norsk-only, se
 * filheaderen i DsvdvLoginForm.tsx for hvorfor.
 *
 * "Ikke lag dette som et dashboard med masse cards og filterbokser. Følg
 * CONVITEs nye editorial designspråk med typografi, luft, bilder og
 * tydelige seksjoner." – de fire inngangene under er derfor en enkel,
 * stablet tekstliste med hårfine skillelinjer (samme `divide-y
 * divide-ink/10`-mønster som f.eks. rettelisten i MealBuilder.tsx bruker),
 * IKKE avgrensede kort/bokser med border/shadow rundt hver.
 *
 * Litt mer avslappet/lekent enn resten av siden (ønsket eksplisitt) – løst
 * gjennom selve TEKSTEN (kortfattet, muntlig undertekst på hver inngang)
 * fremfor et avvikende fargespråk; samme cream/ink/clay-paletten som
 * resten av CONVITE for at det fortsatt tydelig skal kjennes igjen.
 */

const ENTRIES = [
  { href: "/dsvdv/mikro", label: "Mikro", description: "Rett i mikroen, ferdig på minutter." },
  { href: "/dsvdv/airfryer", label: "Airfryer", description: "Sprøtt og varmt, uten stekepanne." },
  { href: "/dsvdv/toastjern", label: "Toastjern", description: "Press, varme, ferdig." },
  { href: "/dsvdv/null-innsats", label: "Null innsats", description: "Ingen tilberedning i det hele tatt." },
] as const;

export function JobbmatHub() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:py-20">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-clay">DSVDV</p>
        <h1 className="mt-4 text-balance font-serif text-4xl leading-tight text-ink sm:text-5xl">Jobbmat.</h1>
        <p className="mt-3 text-base italic text-ink-soft">Mat som faktisk lar seg lage på jobb.</p>
      </div>

      <div className="mt-14 divide-y divide-ink/10 border-t border-ink/10 sm:mt-16">
        {ENTRIES.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="group flex items-baseline justify-between gap-4 py-6 transition-colors hover:text-clay-dark sm:py-7"
          >
            <span className="font-serif text-2xl uppercase tracking-wide text-ink transition-colors group-hover:text-clay-dark sm:text-3xl">
              {entry.label}
            </span>
            <span className="hidden text-right text-sm text-ink-soft sm:block">{entry.description}</span>
          </Link>
        ))}
      </div>
      {/* Beskrivelsen skjules på mobil (hidden sm:block) i stedet for å
          stables under etiketten – holder radene på én linje/samme rytme
          som resten av oppsettet; selve navnet er informativt nok alene på
          en smal skjerm. */}
    </div>
  );
}
