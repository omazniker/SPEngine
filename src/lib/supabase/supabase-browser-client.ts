import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/supabase";

/**
 * Supabase-Client für Client Components. Nutzt die öffentlichen ENV-Variablen
 * (NEXT_PUBLIC_*) — wird im Browser ausgeführt.
 *
 * Default = Server Components (siehe AGENTS.md). Client-Client nur verwenden für
 * Realtime-Subscriptions, Optimistic Updates oder Interaktionen die nicht über
 * Server Actions laufen können.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
