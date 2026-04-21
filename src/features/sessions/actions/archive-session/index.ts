"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server-client";

import { archiveSessionSchema } from "./schema";
import type { ArchiveSessionInput, ArchiveSessionResult } from "./types";

export async function archiveSessionAction(
  input: ArchiveSessionInput,
): Promise<ArchiveSessionResult> {
  const parsed = archiveSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase ist nicht konfiguriert. Siehe .env.local.example." };
  }

  const { supabase } = await createSupabaseServerClient();
  const { error } = await supabase.rpc("archive_session", {
    p_session_id: parsed.data.sessionId,
  });
  if (error) return { error: error.message };

  revalidatePath("/sessions");
  revalidatePath(`/sessions/${parsed.data.sessionId}`);
  return { data: { sessionId: parsed.data.sessionId } };
}
