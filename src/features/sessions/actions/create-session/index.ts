"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server-client";

import { createSessionSchema } from "./schema";
import type { CreateSessionInput, CreateSessionResult } from "./types";

/**
 * Erstellt eine neue Session via RPC. Keine eigenen Queries — `create_session`
 * (Migration 20260421120400) setzt user_id aus `auth.uid()` und validiert den Namen.
 */
export async function createSessionAction(
  input: CreateSessionInput,
): Promise<CreateSessionResult> {
  const parsed = createSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase ist nicht konfiguriert. Siehe .env.local.example." };
  }

  const { supabase } = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_session", {
    p_name: parsed.data.name,
    p_universe_profile_id: parsed.data.universeProfileId,
  });

  if (error) return { error: error.message };

  revalidatePath("/sessions");
  return { data: { sessionId: data as string } };
}
