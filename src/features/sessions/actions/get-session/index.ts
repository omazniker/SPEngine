"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server-client";

import type { SessionDetail } from "../../types/session";
import { getSessionSchema } from "./schema";
import type { GetSessionInput, GetSessionResult } from "./types";

/**
 * Lädt eine Session + optional deren Szenarien via komponiertem RPC `get_session`.
 */
export async function getSessionAction(input: GetSessionInput): Promise<GetSessionResult> {
  const parsed = getSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase ist nicht konfiguriert. Siehe .env.local.example." };
  }

  const { supabase } = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_session", {
    p_session_id: parsed.data.sessionId,
    p_include_scenarios: parsed.data.includeScenarios,
  });

  if (error) return { error: error.message };
  return { data: (data as SessionDetail | null) ?? null };
}
