"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server-client";

import { toggleUniverseProfileDefaultSchema } from "./schema";
import type {
  ToggleUniverseProfileDefaultInput,
  ToggleUniverseProfileDefaultResult,
} from "./types";

/**
 * Toggle-Default für ein UniverseProfile. Ist das Profil bereits Default →
 * unset. Sonst: alle anderen Defaults des Users abräumen und dieses setzen.
 * RPC erledigt beides atomar in einer Transaktion.
 */
export async function toggleUniverseProfileDefaultAction(
  input: ToggleUniverseProfileDefaultInput,
): Promise<ToggleUniverseProfileDefaultResult> {
  const parsed = toggleUniverseProfileDefaultSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase ist nicht konfiguriert. Siehe .env.local.example." };
  }

  const { supabase } = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("toggle_universe_profile_default", {
    p_id: parsed.data.universeProfileId,
  });

  if (error) return { error: error.message };

  revalidatePath("/universe");
  revalidatePath("/sessions");
  return { data: { isDefault: data as boolean } };
}
