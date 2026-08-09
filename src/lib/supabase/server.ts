import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/config";

export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) return null;

  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always set cookies. Middleware refreshes them.
        }
      },
    },
  });
}
