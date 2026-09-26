import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { SITE_ACCESS_COOKIE, createSiteAccessToken } from "@/lib/site-access/token";

/**
 * (26.09.2026, Henrik: "jeg får ikke opp muligheten til å lagre passordet
 * eller face id på telefon") – selve mottakeren for /adgang-skjemaet (se
 * components/site-access/SiteAccessForm.tsx og app/adgang/page.tsx).
 *
 * Dette skjemaet lå tidligere bak en React Server Action
 * (verifySitePassword i lib/actions/site-access.ts). Problemet: så lenge
 * JavaScript er lastet (nesten alltid), sender React en Server Action som
 * et fetch()-kall i bakgrunnen i stedet for en ordentlig
 * skjema-innsending/sidenavigasjon. Safari og Chrome sin "vil du lagre
 * passordet?"-boks (og dermed også Face ID/Touch ID-autofyll neste besøk)
 * er i praksis KNYTTET til en ekte <form method="post">-innsending som
 * fører til en ny side – et usynlig fetch-kall blir aldri fanget opp av
 * nettleserens innebygde passordbehandler, uansett hvor riktig
 * autoComplete-attributtet på selve feltet er satt opp.
 *
 * Løsningen er denne ordentlige Route Handler-en: SiteAccessForm.tsx er nå
 * et rent skjema UTEN "use client"/Server Action, som POST-er hit direkte
 * (fungerer helt uten JavaScript også), og denne ruten svarer med en ekte
 * 303-omdirigering – nøyaktig det mønsteret nettleserne ser etter for å
 * tilby å lagre passordet.
 */
export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "/");
  // Kun relative stier innenfor egen side (aldri en ekstern URL som skulle
  // ha sneket seg inn i next-feltet, som ellers kunne blitt en åpen
  // redirect).
  const nextPath = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  const failureUrl = new URL("/adgang", request.url);
  failureUrl.searchParams.set("next", nextPath);
  failureUrl.searchParams.set("feil", "1");

  if (!isSupabaseConfigured || !password) {
    return NextResponse.redirect(failureUrl, 303);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_site_password", { candidate: password });

  if (error || data !== true) {
    return NextResponse.redirect(failureUrl, 303);
  }

  // 303 (ikke standard 307/308) – forteller nettleseren å gjøre en ny GET
  // mot målsiden i stedet for å gjenta POST-en, som er riktig oppførsel
  // etter en skjema-innsending.
  const response = NextResponse.redirect(new URL(nextPath, request.url), 303);
  response.cookies.set(SITE_ACCESS_COOKIE, await createSiteAccessToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Ett år – "husk meg"-varighet var eksplisitt ønsket (Henrik, 26.09.2026:
    // "ett enkelt passord er smart"), pluss at nettleserens egen lagrede
    // passord+Face ID/Touch ID-autofyll uansett gjør en eventuell ny
    // innlogging rask selv om denne cookien skulle utløpe eller bli slettet.
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
