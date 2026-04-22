"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server-client";
import type { Json } from "@/types/supabase";

import { createUniverseProfileSchema } from "./schema";
import type { CreateUniverseProfileInput, CreateUniverseProfileResult } from "./types";

/**
 * Legt ein neues UniverseProfile an. `create_universe_profile` (Migration
 * 20260422120100) setzt user_id aus auth.uid() und leitet bond_count aus der
 * JSON-Länge ab.
 */
export async function createUniverseProfileAction(
  input: CreateUniverseProfileInput,
): Promise<CreateUniverseProfileResult> {
  const parsed = createUniverseProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase ist nicht konfiguriert. Siehe .env.local.example." };
  }

  const { supabase } = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_universe_profile", {
    p_name: parsed.data.name,
    p_bonds: (parsed.data.bonds ?? []) as Json,
    p_source_file: parsed.data.sourceFile ?? undefined,
  });

  if (error) return { error: error.message };

  revalidatePath("/universe");
  return { data: { universeProfileId: data as string } };
}
