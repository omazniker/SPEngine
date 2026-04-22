import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedAdmin: SupabaseClient | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} muss für E2E-Tests gesetzt sein (siehe .env.local.example).`,
    );
  }
  return value;
}

/**
 * Admin-Client mit Service-Role-Key — umgeht RLS.
 * Nutzung NUR in E2E-Tests für Setup/Verify, nie für Aktionen die über die UI getestet werden.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin;
  cachedAdmin = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  return cachedAdmin;
}

/**
 * Erzeugt einen Anon-Key-Supabase-Client, der via signInWithPassword als der
 * angegebene Testuser eingeloggt ist. Anders als `getSupabaseAdmin` durchläuft
 * dieser Client RLS — genau das Verhalten, das wir für Isolationstests brauchen.
 *
 * Jeder Aufruf liefert einen frischen Client (keine Session-Persistenz), damit
 * zwei gleichzeitig aktive User-Clients sich nicht gegenseitig ausloggen.
 */
export async function createAuthenticatedClient(
  email: string,
  password: string,
): Promise<SupabaseClient> {
  const client = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`signInWithPassword für ${email} fehlgeschlagen: ${error.message}`);
  }
  return client;
}
