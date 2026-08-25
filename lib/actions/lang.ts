"use server";

import { cookies } from "next/headers";
import { LANG_COOKIE, type Lang } from "@/lib/i18n/lang";

/** Setter språkvalget (kalles fra LanguageSwitcher). Siden dette er en
 * Server Action kan den sette cookien – det kan ikke en vanlig Server
 * Component-rendering. Klienten kaller deretter router.refresh() for å
 * rendre siden på nytt med det nye språket. */
export async function setLangAction(lang: Lang): Promise<void> {
  const store = await cookies();
  store.set(LANG_COOKIE, lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
