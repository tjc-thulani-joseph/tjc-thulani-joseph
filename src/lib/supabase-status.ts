export type SupabaseConfigurationState = "configured" | "not_configured";

import { supabase } from "@/lib/supabase";

/**
 * Local connection state only. This does not verify reachability,
 * authorization, or database health.
 */
export function getSupabaseConfigurationState(): SupabaseConfigurationState {
  return supabase ? "configured" : "not_configured";
}

export function getSupabaseConnectionLabel(): string {
  return supabase ? "Configured" : "Not configured";
}
