"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server-client";

import type { ScenarioListItem } from "../../types/scenario";
import { getScenariosSchema } from "./schema";
import type { GetScenariosInput, GetScenariosResult } from "./types";

export async function getScenariosAction(input: GetScenariosInput): Promise<GetScenariosResult> {
  const parsed = getScenariosSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase ist nicht konfiguriert. Siehe .env.local.example." };
  }

  const { supabase } = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_scenarios", {
    p_session_id: parsed.data.sessionId,
  });

  if (error) return { error: error.message };
  return { data: (data ?? []) as ScenarioListItem[] };
}
