import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 gir nytt navn til dette filkonseptet: "proxy" i stedet for
// "middleware" (samme funksjon, bare omdøpt for å unngå forveksling med
// Express-middleware). Se lib/supabase/middleware.ts for selve logikken.
//
// VIKTIG (28.08.2026): IKKE bytt denne filen tilbake til middleware.ts.
// Det ble forsøkt en gang, og Vercel sin bygging feilet da eksplisitt med
// "The Edge Function 'middleware' is referencing unsupported modules" på
// nettopp importen av @/lib/supabase/middleware, fordi navnet
// "middleware" er reservert/spesialbehandlet av Vercels edge-bunter, og
// kolliderer med enhver importert modul som også har "middleware" i
// stien. proxy.ts har ikke dette problemet. Byggeloggen bekrefter i
// tillegg eksplisitt at "middleware"-konvensjonen er den utdaterte, og at
// "proxy" er den anbefalte, gjeldende konvensjonen i Next.js 16.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Matcher innsnevret til /admin 10.09.2026 (Henrik: "er det en grunn til at
// siden er bittelitt treig, tar 2 sek å gå fra en side til en annen?").
// updateSession() (lib/supabase/middleware.ts) kaller supabase.auth.getUser(),
// som ALLTID gjør et ekte nettverkskall til Supabase sin auth-server for å
// validere JWT-en på nytt (i motsetning til getSession(), som bare leser den
// lokale, allerede-betrodde JWT-en uten nettverkskall) – se Supabase sin
// egen dokumentasjon av forskjellen. Med den forrige matcheren
// ("alle ruter unntatt statiske filer") betalte HVER ENESTE sidevisning på
// HELE siden denne nettverksrundturen før noe som helst begynte å rendres –
// også for anonyme besøkende som aldri logger inn, og som bare vil lese en
// oppskrift. Selve poenget med middlewaren er likevel kun å beskytte
// /admin-rutene (se filheaderen i updateSession) – den trengs rett og slett
// ikke på offentlige sider. Nå kjører getUser()-kallet KUN når man faktisk
// besøker /admin, ikke på hver eneste navigasjon på siden.
export const config = {
  matcher: ["/admin/:path*"],
};
