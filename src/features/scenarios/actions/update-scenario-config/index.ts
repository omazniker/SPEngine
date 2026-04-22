"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server-client";
import type { Json } from "@/types/supabase";

import { updateScenarioConfigSchema } from "./schema";
import type {
  UpdateScenarioConfigInput,
  UpdateScenarioConfigResult,
} from "./types";

/**
 * Speichert die Config eines DRAFT-Scenarios. SAVED-Scenarios sind immutable —
 * der RPC wirft 42501 wenn das Scenario nicht DRAFT ist oder dem Caller nicht
 * gehört.
 */
export async function updateScenarioConfigAction(
  input: UpdateScenarioConfigInput,
): Promise<UpdateScenarioConfigResult> {
  const parsed = updateScenarioConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase ist nicht konfiguriert. Siehe .env.local.example." };
  }

  const { supabase } = await createSupabaseServerClient();
  const { error } = await supabase.rpc("update_scenario_config", {
    p_scenario_id: parsed.data.scenarioId,
    p_config: parsed.data.config as Json,
  });

  if (error) return { error: error.message };

  // Scenario-Detail-Route ist dynamisch; revalidate auch die Session-Detail,
  // falls dort Scenario-Infos gecached sind.
  revalidatePath(`/sessions`);
  return { data: { success: true } };
}
