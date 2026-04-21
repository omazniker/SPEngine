import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/types/supabase";

/**
 * Supabase-Client für Server Components und Server Actions.
 *
 * Wichtig: Session-Refresh läuft im Proxy (`src/proxy.ts`) — hier nur lesen/schreiben
 * der Cookies über Next-Headers. Das `try/catch` beim Setzen ist beabsichtigt:
 * Aufrufe aus Server Components können keine Cookies setzen, nur Actions/Route
 * Handler können das.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Aufruf aus Server Component — Session wird stattdessen vom Proxy refreshed.
          }
        },
      },
    },
  );

  return { supabase };
}
