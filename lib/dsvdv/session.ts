import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Sesjonshåndtering for DSVDV – det skjulte, passordbeskyttede "jobbmat"-
 * området (se components/dsvdv/ og app/dsvdv/). Kun ÉTT felles passord
 * (ingen individuelle kontoer), lest fra miljøvariabelen DSVDV_PASSWORD
 * (satt i .env.local lokalt og i Vercel sine prosjektinnstillinger – ALDRI
 * hardkodet her, se .env.example for dokumentasjonen).
 *
 * BEVISST IKKE via proxy.ts/Edge Runtime (27.09.2026) – det tidligere
 * fellespassordet for HELE nettstedet (se git-historikken og filheaderen i
 * proxy.ts) hadde nettopp et slikt Edge-basert oppsett og ble fjernet på
 * grunn av gjentatte bugs der en gyldig innlogging enten ikke satt seg,
 * eller falt ut igjen kort tid etterpå – mistenkt årsak var at
 * miljøvariabelen ikke alltid var konsekvent tilgjengelig samtidig i alle
 * Vercels edge-regioner. DSVDV sin sesjon settes i stedet fra en vanlig
 * Server Action (lib/actions/dsvdv.ts, kjører i Node.js-runtimen, samme
 * lambda som resten av appen) og leses tilbake i vanlige Server Components
 * (denne filens `requireDsvdvSession`) – ingen Edge-region involvert i det
 * hele tatt, så den konkrete feilklassen kan strukturelt ikke oppstå her.
 *
 * Selve cookien inneholder ALDRI passordet – kun et tidsstemplet, HMAC-
 * signert "billett" (utløpsdato + signatur), signert med DSVDV_PASSWORD
 * som nøkkel. Serveren kan verifisere signaturen uten noen database –
 * riktig avveining for en liten, intern easter egg-del uten egne
 * brukerkontoer. Roteres DSVDV_PASSWORD, blir automatisk alle eksisterende
 * sesjoner ugyldige (signaturen stemmer ikke lenger) – en fin bieffekt,
 * ikke noe man må huske å håndtere separat.
 */

const COOKIE_NAME = "dsvdv_session";
// 30 dager – "slik at brukeren ikke trenger å logge inn på nytt ved hver
// navigasjon" (og, siden dette bare er en liten intern lekesak for
// kolleger, heller ikke ved hvert besøk).
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getPassword(): string {
  const password = process.env.DSVDV_PASSWORD;
  if (!password) {
    throw new Error(
      "DSVDV_PASSWORD er ikke satt. Legg den til i .env.local (lokalt) og i Vercel sine prosjektinnstillinger (produksjon).",
    );
  }
  return password;
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function isValidSessionValue(value: string | undefined, password: string): boolean {
  if (!value) return false;
  const separatorIndex = value.lastIndexOf(".");
  if (separatorIndex === -1) return false;
  const payload = value.slice(0, separatorIndex);
  const signature = value.slice(separatorIndex + 1);

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = sign(payload, password);
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Sammenligner et innlogging-forsøk mot DSVDV_PASSWORD. Hasher begge sider
 * med SHA-256 først (gir alltid like lange buffere uansett hvor langt/kort
 * det innskrevne passordet er) og bruker `timingSafeEqual` – vanlig,
 * billig forsvar mot timing-angrep, proporsjonalt med hvor følsomt dette
 * konkret er (et internt, delt passord, ikke en brukers egen konto).
 */
export function verifyDsvdvPassword(attempt: string): boolean {
  const password = getPassword();
  const attemptHash = crypto.createHash("sha256").update(attempt).digest();
  const passwordHash = crypto.createHash("sha256").update(password).digest();
  return crypto.timingSafeEqual(attemptHash, passwordHash);
}

/**
 * Setter selve sesjonscookien. Må kalles fra en Server Action eller Route
 * Handler (der `cookies().set(...)` faktisk er lov) – IKKE fra en vanlig
 * Server Component-rendring. Se lib/actions/dsvdv.ts (loginToDsvdv), som er
 * eneste kallested.
 */
export async function setDsvdvSessionCookie(): Promise<void> {
  const password = getPassword();
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = String(expiresAt);
  const value = `${payload}.${sign(payload, password)}`;

  const store = await cookies();
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/dsvdv",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Ren lesing – trygg å kalle fra hvor som helst server-side, inkl. vanlige Server Components. */
export async function hasDsvdvSession(): Promise<boolean> {
  // process.env.DSVDV_PASSWORD kan mangle i et miljø der ingen har satt den
  // opp ennå (f.eks. lokalt før Henrik har lagt den til .env.local) – da
  // skal siden vise "ikke konfigurert" via loginToDsvdv, ikke kaste her og
  // knekke selve sidevisningen.
  if (!process.env.DSVDV_PASSWORD) return false;
  const store = await cookies();
  return isValidSessionValue(store.get(COOKIE_NAME)?.value, process.env.DSVDV_PASSWORD);
}

/**
 * Vaktfunksjon kalt aller først i hver beskyttede DSVDV-side (mikro/
 * airfryer/toastjern/null-innsats-listene) – IKKE i selve app/dsvdv/page.tsx
 * (den viser bevisst innloggingsskjema ELLER Jobbmat-hub på samme URL i
 * stedet for å omdirigere, se filheaderen der). Omdirigerer til /dsvdv
 * (innloggingen) dersom sesjonen mangler eller er utløpt – dette er selve
 * server-side-beskyttelsen: innholdet under rendres aldri i det hele tatt
 * uten en gyldig sesjon, det er ikke bare skjult i klienten.
 */
export async function requireDsvdvSession(): Promise<void> {
  const ok = await hasDsvdvSession();
  if (!ok) redirect("/dsvdv");
}
