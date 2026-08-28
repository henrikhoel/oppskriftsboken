import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 introduserte et nytt filnavn for dette konseptet ("proxy.ts" i
 * stedet for "middleware.ts"), men vi går tilbake til det etablerte
 * "middleware.ts"-navnet her (28.08.2026): den nyeste Vercel CLI-versjonen
 * som faktisk kjørte byggene våre (59.3.0) ga en tom "ƒ Proxy (Middleware)"
 * i byggeloggen og en generisk 404: NOT_FOUND fra Vercels edge-nettverk på
 * ALLE ruter, inkludert "/", selv om selve Next.js-bygget rapporterte at
 * ruten fantes. "middleware.ts" er den lenge etablerte, universelt støttede
 * konvensjonen, og fungerer identisk (se lib/supabase/middleware.ts for
 * selve logikken).
 */
export async function middleware(request: NextRequest) {
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
