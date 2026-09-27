import { hasDsvdvSession } from "@/lib/dsvdv/session";
import { DsvdvLoginForm } from "@/components/dsvdv/DsvdvLoginForm";
import { JobbmatHub } from "@/components/dsvdv/JobbmatHub";

/**
 * /dsvdv – selve inngangen til det skjulte jobbmat-området. Bevisst ÉN
 * side/URL som viser to helt ulike ting avhengig av sesjon, i stedet for
 * å omdirigere til en egen /dsvdv/jobbmat etter innlogging: "Etter
 * innlogging kommer man til hovedsiden for området" leses her bokstavelig
 * – man ER allerede på hovedsiden (/dsvdv), den bytter bare innhold når
 * sesjonen blir gyldig (se DsvdvLoginForm.tsx sin `router.refresh()`).
 *
 * De fire filtrerte listene (mikro/airfryer/toastjern/null-innsats) er
 * EGNE undersider (app/dsvdv/mikro/page.tsx osv.) som hver gjør sin egen
 * `requireDsvdvSession()`-sjekk – IKKE denne siden, som nettopp må kunne
 * vise innloggingsskjemaet i stedet for å omdirigere bort fra seg selv.
 * Se lib/dsvdv/session.ts for hele resonnementet rundt selve
 * sesjonsmekanikken og hvorfor den er server-side og ikke bare skjult i
 * klienten.
 */
export default async function DsvdvPage() {
  const loggedIn = await hasDsvdvSession();

  return loggedIn ? <JobbmatHub /> : <DsvdvLoginForm />;
}
