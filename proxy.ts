import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { SITE_ACCESS_COOKIE, isValidSiteAccessToken } from "@/lib/site-access/token";

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
// (26.09.2026) Utvidet med fellespassordet for hele det offentlige
// nettstedet (Henrik: "med tanke på copyright og at dette per dags dato er
// en kokebok for folk jeg kjenner, bør den egentlig være låst med
// brukernavn og passord?" -> landet på ETT delt passord, se
// lib/site-access/token.ts og lib/actions/site-access.ts). To HELT separate
// sjekker nå, med bevisst ulik matcher-strategi for hver:
//
//   1. /admin/* – Supabase-innlogging (updateSession under), UENDRET fra
//      10.09.2026-innsnevringen. /admin skal ALDRI kreve fellespassordet
//      først – Henrik skal kunne gå rett til /admin/login via
//      "admin"-lenken nederst på siden (Footer.tsx) uten omveien om
//      fellespassordet. updateSession() gjør et EKTE nettverkskall til
//      Supabase (auth.getUser()) – det er nettopp DERFOR den fortsatt kun
//      kjører på /admin-ruter, se den opprinnelige kommentaren i
//      config-matcheren under.
//
//   2. Alt annet (det offentlige nettstedet) – fellespassord-sjekken
//      (checkSiteAccess under). Denne gjør IKKE noe nettverkskall i det
//      hele tatt – kun en lokal HMAC-verifisering av en allerede utstedt
//      cookie (se isValidSiteAccessToken) – og kan derfor trygt kjøre på
//      HVER offentlig sidevisning uten å gjeninnføre treigheten
//      10.09.2026-fiksen fjernet. Matcheren er derfor utvidet til å dekke
//      hele nettstedet (minus statiske filer), ikke lenger bare /admin.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    return updateSession(request);
  }

  const gateResponse = await checkSiteAccess(request);
  if (gateResponse) return gateResponse;

  return NextResponse.next();
}

// Selve passordsiden (og Server Action-en bak "Fortsett"-knappen der, som
// POST-er til SAMME sti) må være unntatt gaten – ellers en uendelig
// omdirigerings-løkke.
const SITE_ACCESS_PUBLIC_PATH = "/adgang";

// (26.09.2026) Enkeltoppskrifter (IKKE selve /oppskrifter-oversikten) er
// unntatt omdirigeringen – Henrik: "man får opp toppen av oppskriften, med
// navn og bilde osv, men så er det fadet til svart nedover, og for å se
// resten (fremgangsmåte, ingredienser) så må man logge inn". Uten dette
// unntaket ville en delt oppskrift-lenke bare vist "Adgang"-passordsiden i
// en lenkeforhåndsvisning (Messenger/iMessage/Slack osv.), siden proxy()
// omdirigerer FØR selve siden (og dermed generateMetadata sin Open
// Graph-tittel/bilde) i det hele tatt rekker å rendres. Selve siden
// (app/oppskrifter/[slug]/page.tsx) avgjør heretter SELV om en besøkende
// uten fellespassordet får se hele oppskriften eller kun en "teaser" (se
// RecipeTeaser.tsx) – ingrediens-/fremgangsmåte-INNHOLDET havner uansett
// aldri i HTML-en for en ikke-innlogget besøkende, se filheaderen i
// RecipeTeaser.tsx for hvorfor det er trygt nok til å slippe forbi her.
const RECIPE_DETAIL_PATH = /^\/oppskrifter\/[^/]+\/?$/;

async function checkSiteAccess(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  if (pathname === SITE_ACCESS_PUBLIC_PATH) return null;
  if (RECIPE_DETAIL_PATH.test(pathname)) return null;

  const token = request.cookies.get(SITE_ACCESS_COOKIE)?.value;
  if (await isValidSiteAccessToken(token)) return null;

  const url = new URL(SITE_ACCESS_PUBLIC_PATH, request.url);
  url.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

// Matcher innsnevret til /admin 10.09.2026 (Henrik: "er det en grunn til at
// siden er bittelitt treig, tar 2 sek å gå fra en side til en annen?").
// updateSession() (lib/supabase/middleware.ts) kaller supabase.auth.getUser(),
// som ALLTID gjør et ekte nettverkskall til Supabase sin auth-server for å
// validere JWT-en på nytt (i motsetning til getSession(), som bare leser den
// lokale, allerede-betrodde JWT-en uten nettverkskall) – se Supabase sin
// egen dokumentasjon av forskjellen. Med den forrige (bredere) matcheren
// betalte HVER ENESTE sidevisning på HELE siden denne nettverksrundturen
// før noe som helst begynte å rendres – også for anonyme besøkende som
// aldri logger inn, og som bare vil lese en oppskrift.
//
// (26.09.2026) Matcheren er nå bredere IGJEN – men det bryter IKKE med
// resonnementet over, fordi selve proxy()-funksjonen fortsatt kun kaller
// updateSession() (den kostbare Supabase-sjekken) for /admin-ruter, se
// over. Fellespassord-sjekken som nå kjører på resten av rutene er ren
// lokal HMAC-verifisering (ingen nettverkskall), og koster derfor i
// praksis ingenting – standardmatcheren under (Next sitt eget anbefalte
// eksempeloppsett) ekskluderer kun Next-interne filer og vanlige statiske
// bildeformater, som uansett aldri trengte noen sjekk.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)"],
};
