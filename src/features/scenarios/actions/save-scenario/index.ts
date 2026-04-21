"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server-client";

import { saveScenarioSchema } from "./schema";
import type { SaveScenarioInput, SaveScenarioResult } from "./types";

/**
 * Übergang DRAFT → SAVED via RPC `save_scenario`. Status-Check + Ownership liegen
 * in der RPC (Single Source of Truth).
 */
export async function saveScenarioAction(input: SaveScenarioInput): Promise<SaveScenarioResult> {
  const parsed = saveScenarioSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase ist nicht konfiguriert. Siehe .env.local.example." };
  }

  const { supabase } = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_scenario", { p_scenario_id: parsed.data.scenarioId });

  if (error) return { error: error.message };

  if (parsed.data.sessionId) {
    revalidatePath(`/sessions/${parsed.data.sessionId}`);
  }
  return { data: { scenarioId: parsed.data.scenarioId } };
}
