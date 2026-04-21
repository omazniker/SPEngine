"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server-client";

import { deleteSessionSchema } from "./schema";
import type { DeleteSessionInput, DeleteSessionResult } from "./types";

export async function deleteSessionAction(
  input: DeleteSessionInput,
): Promise<DeleteSessionResult> {
  const parsed = deleteSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase ist nicht konfiguriert. Siehe .env.local.example." };
  }

  const { supabase } = await createSupabaseServerClient();
  const { error } = await supabase.rpc("delete_session", {
    p_session_id: parsed.data.sessionId,
  });
  if (error) return { error: error.message };

  revalidatePath("/sessions");
  return { data: { sessionId: parsed.data.sessionId } };
}
