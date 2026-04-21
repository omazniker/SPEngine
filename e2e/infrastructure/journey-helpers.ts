import { getSupabaseAdmin } from "../utils/db-helpers";

/**
 * Setzt `email_verified` direkt in der DB, damit Tests keinen echten Mail-Server brauchen.
 *
 * Erwartet eine Spalte `email_verified` auf `profiles` — sobald das Schema steht,
 * ggf. auf `auth.users.email_confirmed_at` ausweichen (benötigt Admin-API).
 */
export async function markEmailVerified(email: string): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.from("profiles").update({ email_verified: true }).eq("email", email);
  if (error) {
    throw new Error(`markEmailVerified fehlgeschlagen für ${email}: ${error.message}`);
  }
}

/**
 * Löscht einen Auth-User komplett (Cascade auf Profile/Orgs je nach Schema).
 * Nutzung: Cleanup in lokalen Test-Teardowns, niemals in CI gegen Shared-DB.
 */
export async function deleteAuthUser(email: string): Promise<void> {
  const db = getSupabaseAdmin();
  const { data: users, error: listError } = await db.auth.admin.listUsers();
  if (listError) throw new Error(`listUsers fehlgeschlagen: ${listError.message}`);

  const user = users.users.find((u) => u.email === email);
  if (!user) return;

  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) throw new Error(`deleteUser fehlgeschlagen für ${email}: ${error.message}`);
}
