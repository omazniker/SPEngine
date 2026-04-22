"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server-client";

import type { UniverseProfileDetail } from "../../types/universe-profile";
import { getUniverseProfileSchema } from "./schema";
import type { GetUniverseProfileInput, GetUniverseProfileResult } from "./types";

/**
 * Lädt ein UniverseProfile inkl. bonds-Payload via `get_universe_profile(id)`.
 * Liefert null, wenn das Profil nicht existiert oder dem Caller nicht gehört
 * (RLS filtert in `get_universe_profile_core` per `user_id = auth.uid()`).
 */
export async function getUniverseProfileAction(
  input: GetUniverseProfileInput,
): Promise<GetUniverseProfileResult> {
  const parsed = getUniverseProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase ist nicht konfiguriert. Siehe .env.local.example." };
  }

  const { supabase } = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_universe_profile", {
    p_id: parsed.data.universeProfileId,
  });

  if (error) return { error: error.message };
  return { data: (data as UniverseProfileDetail | null) ?? null };
}
