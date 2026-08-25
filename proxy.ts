import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 gir nytt navn til dette filkonseptet: "proxy" i stedet for
// "middleware" (samme funksjon, bare omdøpt for å unngå forveksling med
// Express-middleware). Se lib/supabase/middleware.ts for selve logikken.
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
