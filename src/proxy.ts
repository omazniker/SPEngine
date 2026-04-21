import { type NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/types/supabase";

/**
 * Next.js 16 Proxy (früher Middleware). Refresht die Supabase-Session bei jedem
 * Request. Siehe `node_modules/next/dist/docs/01-app/.../proxy.md`.
 *
 * WICHTIG: Zwischen `createServerClient` und `supabase.auth.getUser()` KEINEN
 * Code ausführen — sonst läuft die Session aus und Nutzer werden ausgeloggt.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Ohne konfigurierte ENV-Variablen (z.B. Smoke-Test ohne Supabase) überspringen.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
