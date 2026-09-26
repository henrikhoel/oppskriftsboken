import type { MetadataRoute } from "next";

// (26.09.2026) Nettstedet er nå bak et fellespassord (se filheaderen i
// proxy.ts) – ingen søkemotor kommer forbi det uansett, så vi sier det
// samme rett ut her i stedet for å late som siden fortsatt er åpen for
// indeksering. Sitemap-referansen er fjernet av samme grunn (en sitemap
// bak et passord er uansett ubrukelig for en robot).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: "/",
      },
    ],
  };
}
