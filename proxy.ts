import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 gir nytt navn til dette filkonseptet: "proxy" i stedet for
// "middleware" (samme funksjon, bare omdøpt for å unngå forveksling med
// Express-middleware). Se lib/supabase/middleware.ts for Supabase-delen.
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
//
// (27.09.2026) Fellespassordet for hele det offentlige nettstedet (som
// denne filen en periode gatet ALLE sider bak, se git-historikken rundt
// 26.09.2026) er FJERNET igjen – Henrik: "jeg ønsker at du fjerner alt som
// hadde med passordet å gjøre", etter gjentatte bugs der en gyldig
// innlogging enten ikke satt seg ved klikk/refresh, eller falt ut igjen
// kort tid etterpå (mest sannsynlig fordi SITE_ACCESS_SECRET ikke alltid
// var konsekvent tilgjengelig samtidig i alle Vercels edge-regioner).
// Denne filen er derfor tilbake til kun å håndtere /admin-innlogging,
// akkurat som før 26.09.2026-utvidelsen.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    return updateSession(request);
  }

  return NextResponse.next();
}

// Innsnevret til /admin 10.09.2026 (Henrik: "er det en grunn til at siden
// er bittelitt treig, tar 2 sek å gå fra en side til en annen?").
// updateSession() (lib/supabase/middleware.ts) kaller supabase.auth.getUser(),
// som ALLTID gjør et ekte nettverkskall til Supabase sin auth-server for å
// validere JWT-en på nytt (i motsetning til getSession(), som bare leser den
// lokale, allerede-betrodde JWT-en uten nettverkskall) – se Supabase sin
// egen dokumentasjon av forskjellen. Med en bredere matcher betaler HVER
// ENESTE sidevisning på HELE siden denne nettverksrundturen før noe som
// helst begynner å rendres. Matcheren ble kortvarig utvidet 26.09.2026 for
// fellespassordet – nå som det er fjernet igjen (27.09.2026), er den
// tilbake til kun /admin.
export const config = {
  matcher: ["/admin/:path*"],
};
