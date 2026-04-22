"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server-client";

import { deleteUniverseProfileSchema } from "./schema";
import type {
  DeleteUniverseProfileInput,
  DeleteUniverseProfileResult,
} from "./types";

/**
 * Löscht ein UniverseProfile via RPC `delete_universe_profile` (prüft
 * user_id = auth.uid(), wirft 42501 bei fremd/unbekannt). `sessions`-Einträge
 * mit verweisendem `universe_profile_id` werden per FK ON DELETE SET NULL
 * automatisch entkoppelt — die Session überlebt.
 */
export async function deleteUniverseProfileAction(
  input: DeleteUniverseProfileInput,
): Promise<DeleteUniverseProfileResult> {
  const parsed = deleteUniverseProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase ist nicht konfiguriert. Siehe .env.local.example." };
  }

  const { supabase } = await createSupabaseServerClient();
  const { error } = await supabase.rpc("delete_universe_profile", {
    p_id: parsed.data.universeProfileId,
  });

  if (error) return { error: error.message };

  revalidatePath("/universe");
  return { data: { success: true } };
}
