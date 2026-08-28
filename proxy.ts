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

export const config = {
  matcher: [
    /*
     * Kjør på alle ruter unntatt statiske filer og bilder, for å unngå
     * unødvendig overhead på hver eneste asset-forespørsel.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)",
  ],
};
