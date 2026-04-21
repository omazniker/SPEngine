"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server-client";

import type { ScenarioDetail } from "../../types/scenario";
import { getScenarioSchema } from "./schema";
import type { GetScenarioInput, GetScenarioResult } from "./types";

export async function getScenarioAction(input: GetScenarioInput): Promise<GetScenarioResult> {
  const parsed = getScenarioSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase ist nicht konfiguriert. Siehe .env.local.example." };
  }

  const { supabase } = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_scenario", {
    p_scenario_id: parsed.data.scenarioId,
  });
  if (error) return { error: error.message };
  return { data: (data as ScenarioDetail | null) ?? null };
}
