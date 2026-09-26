/**
 * Signering av fellespassord-cookien (26.09.2026, Henrik: "med tanke på
 * copyright og at dette per dags dato er en kokebok for folk jeg kjenner,
 * bør den egentlig være låst med brukernavn og passord?" – landet på ETT
 * delt passord for hele nettstedet i stedet for egne kontoer per person,
 * se filheaderen i proxy.ts og lib/actions/site-access.ts for hele bildet).
 *
 * Bruker Web Crypto-APIet (`crypto.subtle`, global, samme API som i
 * nettlesere) i stedet for Nodes innebygde `crypto`-modul, siden proxy.ts
 * kjører på Vercels Edge-runtime der Node sin `crypto`-modul IKKE er
 * tilgjengelig. Node 20+ (se package.json "engines") har `crypto.subtle`
 * globalt tilgjengelig akkurat som Edge-runtimen, så ÉN implementasjon her
 * fungerer identisk fra BÅDE proxy.ts (edge) og Server Actions (Node) –
 * ingen risiko for at de to kommer ut av synk med hverandre.
 *
 * Selve passordet ligger ALDRI i denne cookien, kun et fast, signert
 * "adgang innvilget"-merke – se verifySitePassword i
 * lib/actions/site-access.ts for selve passord-sjekken (som skjer via en
 * SECURITY DEFINER-funksjon i databasen, ikke her).
 */

export const SITE_ACCESS_COOKIE = "site_access";

const GRANTED_MESSAGE = "convite-site-access-granted-v1";

function getSecret(): string {
  const secret = process.env.SITE_ACCESS_SECRET;
  if (!secret) {
    throw new Error(
      "SITE_ACCESS_SECRET mangler – sett en lang, tilfeldig verdi i miljøvariablene (kun brukt til å signere " +
        "cookien, IKKE selve fellespassordet – det ligger i databasen, se lib/actions/site-access.ts).",
    );
  }
  return secret;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Verdien som settes i cookien ved vellykket passord-innlogging (se
 * verifySitePassword i lib/actions/site-access.ts). */
export async function createSiteAccessToken(): Promise<string> {
  return hmacHex(getSecret(), GRANTED_MESSAGE);
}

/** Sjekker en cookie-verdi mot forventet signatur. Konstant-tid-sammenligning
 * (selv om denne tokenen er fast/lik for absolutt alle som har logget inn,
 * ikke hemmelig per besøkende, er det ingen grunn til å likevel ikke gjøre
 * selve sammenligningen trygg). */
export async function isValidSiteAccessToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const expected = await createSiteAccessToken();
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
