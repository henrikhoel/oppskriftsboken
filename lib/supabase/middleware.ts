import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

/**
 * Fornyer Supabase auth-sesjonen på hver forespørsel og beskytter
 * /admin-ruter på serversiden (ikke bare i UI). Kalles fra root
 * middleware.ts.
 *
 * Viktig: dette gjør IKKE full autorisasjonssjekk (er brukeren admin?) –
 * det gjøres i app/admin/layout.tsx, som spør databasen om
 * `profiles.is_admin`. Middleware sjekker kun at det finnes en innlogget
 * bruker i det hele tatt, som en rask første barriere.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Uten Supabase-konfig kjører vi i demo-modus: /admin er da uansett
  // utilgjengelig (se app/admin/layout.tsx), så vi slipper alle
  // forespørsler gjennom uendret her.
  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute =
    request.nextUrl.pathname.startsWith("/admin") &&
    request.nextUrl.pathname !== "/admin/login";

  if (isAdminRoute && !user) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
