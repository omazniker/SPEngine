"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server-client";

const loginSchema = z.object({
  email: z.string().email("Ungültige E-Mail"),
  password: z.string().min(6, "Mindestens 6 Zeichen"),
});

export type LoginResult = { data: { userId: string }; error?: never } | { error: string };

/**
 * Server Action: meldet einen Nutzer per E-Mail + Passwort an.
 * Redirect IMMER nach try/catch und als letzte Anweisung (siehe AGENTS.md §"Server Actions").
 */
export async function loginAction(input: { email: string; password: string }): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }

  const { supabase } = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { error: error.message };
  if (!data.user) return { error: "Login fehlgeschlagen — kein User zurückgegeben" };

  revalidatePath("/", "layout");
  return { data: { userId: data.user.id } };
}

export async function logoutAction(): Promise<void> {
  const { supabase } = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
