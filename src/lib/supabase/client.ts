"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/config";

export function createSupabaseBrowserClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
