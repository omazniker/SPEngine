"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server-client";
import type { Json } from "@/types/supabase";

import { createScenarioSchema } from "./schema";
import type { CreateScenarioInput, CreateScenarioResult } from "./types";

export async function createScenarioAction(
  input: CreateScenarioInput,
): Promise<CreateScenarioResult> {
  const parsed = createScenarioSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase ist nicht konfiguriert. Siehe .env.local.example." };
  }

  const { supabase } = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_scenario", {
    p_session_id: parsed.data.sessionId,
    p_name: parsed.data.name,
    p_config: (parsed.data.config ?? {}) as Json,
  });

  if (error) return { error: error.message };

  revalidatePath(`/sessions/${parsed.data.sessionId}`);
  return { data: { scenarioId: data as string } };
}
