import type { NextConfig } from "next";

// Allow the app to read the Supabase project URL at build time so the
// image optimizer can be told which remote host is allowed to serve
// recipe photos. Falls back gracefully when Supabase isn't configured yet
// (local/demo mode), so `next build` never fails because of missing env vars.
function supabaseImageHostname(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const supabaseHost = supabaseImageHostname();

const nextConfig: NextConfig = {
  // Server Actions har som standard en grense på 1 MB per forespørsel – for
  // lite til "Last opp skjermbilde(r) av bildeteksten" (RecipeForm.tsx ->
  // extractCaptionTextFromImages), der FLERE skjermbilder (base64-kodet,
  // som legger på ~33 % i størrelse) kan sendes inn i samme kall for en lang
  // Instagram/TikTok-bildetekst som ikke fikk plass i ett skjermbilde. Uten
  // dette feiler opplastingen med "Body exceeded 1 MB limit" så snart admin
  // velger mer enn ett-to skjermbilder (26.08.2026). 10 MB gir god margin for
  // flere skjermbilder samtidig, uten å åpne unødvendig mye – bildene
  // resizes/komprimeres allerede klient-side til maks 1280px JPEG
  // (lib/utils/image.ts) før de sendes, så selv mange skjermbilder holder
  // seg godt under dette i praksis.
  //
  // HEVET til 12 MB (29.09.2026, Henrik: "sett maks grense for opplastning
  // av bilde på hver rett til 10 mb og ikke 8") – uploadRecipeImage
  // (lib/actions/upload.ts) sitt eget 10 MB-filtak deler denne samme
  // Server Action-grensen (selve hovedbildet sendes som FormData, samme
  // vei som skjermbildene over). 12 MB gir nødvendig margin OVER den nye
  // 10 MB-filgrensen til multipart-overheaden rundt selve filen (grenser,
  // feltnavn osv.) – uten margin ville en fil helt oppunder 10 MB kunne bli
  // avvist av selve Server Action-grensen FØR den i det hele tatt når
  // uploadRecipeImage sin egen, mer beskrivende feilmelding.
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  // Next.js 15.3+ blokkerer som standard forespørsler til dev-serveren fra
  // andre "origins" enn localhost (en sikkerhetsendring) – uten dette listet
  // opp her avviser dev-serveren stille alt av Server Actions/RSC-kall fra
  // telefonen når man tester via Mac-ens LAN-IP (f.eks. under Cook Mode,
  // Mat & vin-seksjonen, porsjons-/enhetsvelgeren osv.), selv om selve siden
  // lastes helt fint. Kun relevant i dev-modus (npm run dev) – ingen effekt
  // på en produksjonsbygg. Legg til flere IP-er her etter behov (f.eks. hvis
  // routeren gir en ny adresse, eller andre enheter skal teste siden).
  allowedDevOrigins: ["192.168.10.185"],
  images: {
    // (28.09.2026) Vercel-epost: "Approaching your limits" – gratiskvoten på
    // 5 000 bilde-transformasjoner/måned (Image Optimization) var brukt opp.
    // Uten `minimumCacheTTL` bruker Next.js standardverdien på kun 3600
    // sekunder (1 time) for EKSTERNE bilder (remote – det er det alle
    // oppskriftsbildene er, de kommer fra Supabase Storage/Unsplash/import-
    // lenker over, ikke /public). Det betyr at et populært oppskriftsbilde
    // må transformeres PÅ NYTT hver eneste time det fortsatt er trafikk på
    // det – uavhengig av om det er 5 eller 5000 besøkende i den timen – så
    // med ekte, jevn trafikk ville 5 000/måned blitt spist opp fort selv med
    // relativt få unike bilder på siden.
    //
    // Oppskriftsbilder endres praktisk talt aldri etter at de er lastet opp
    // (og selv om et bilde skulle bli byttet ut, se image-optimization-
    // dokumentasjonen: cachen for eksterne bilder invalideres uansett ikke
    // automatisk av det – den holder helt til TTL-en løper ut eller man
    // manuelt "purger" den), så en lang levetid her er trygt. 2 678 400
    // sekunder = 31 dager, samme maks-levetid Vercel selv gir bilder fra
    // /public-mappen automatisk – gir dermed lokale og eksterne bilder
    // samme cache-oppførsel. Resultatet: hvert bilde/bredde/format-
    // kombinasjon transformeres stort sett bare ÉN gang i måneden i stedet
    // for opptil 24 ganger per dag, uansett hvor mye trafikk siden får.
    minimumCacheTTL: 2678400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
            },
          ]
        : []),
      // "Importer fra lenke" (se lib/actions/recipe-import.ts) henter et
      // hovedbilde direkte fra kildesidens egen URL – domenet er ikke kjent
      // på forhånd, siden hele poenget er å kunne importere fra HVILKEN SOM
      // HELST oppskriftsside (matprat.no i dag, en annen side i morgen).
      // Uten en jokertegn-oppføring her avviser next/image ethvert bilde fra
      // et domene som ikke ER images.unsplash.com/Supabase over, med en
      // krasj i ImageUploadField (se feilmelding 25.08.2026 – "hostname …
      // is not configured"). Trygt nok i praksis: kun https, og selve
      // import-funksjonen som henter siden er allerede admin-only
      // (requireAdmin()) – ingen besøkende kan trigge dette.
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
