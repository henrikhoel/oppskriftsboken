import { NextResponse } from "next/server";
import { SITE_ACCESS_COOKIE } from "@/lib/site-access/token";

/**
 * (26.09.2026, Henrik: "jeg får jo ikke sett hvordan det ser ut for det er
 * ikke en 'logg ut'-knapp") – rydder site_access-cookien (fellespassordet,
 * se proxy.ts), slik at man selv kan se nøyaktig det en fersk besøkende ser
 * (f.eks. RecipeTeaser.tsx på en oppskriftsside). Ingen egen knapp noe sted
 * i UI-et med vilje – vennene dine har aldri "logget inn" med en personlig
 * konto, bare tastet inn ett delt passord én gang, så en synlig
 * "logg ut"-knapp i footeren ville mest sannsynlig bare forvirre dem. Besøk
 * denne siden direkte (f.eks. https://convite.no/logg-ut) når DU vil teste
 * hvordan noe ser ut uten passordet – logg inn igjen på vanlig måte fra
 * /adgang etterpå.
 */
export async function GET(request: Request) {
  // Cookien slettes direkte på selve redirect-responsen (i stedet for via
  // next/headers sin cookies().delete()) – den eneste måten som er
  // garantert å faktisk virke fra en Route Handler.
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(SITE_ACCESS_COOKIE);
  return response;
}
