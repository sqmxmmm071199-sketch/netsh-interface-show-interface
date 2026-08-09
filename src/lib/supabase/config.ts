function normalizeEnvValue(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  const unquoted = trimmed.replace(/^['"]|['"]$/g, "").trim();

  if (
    !unquoted ||
    unquoted === "undefined" ||
    unquoted === "null" ||
    unquoted.includes("your-") ||
    unquoted.includes("<")
  ) {
    return "";
  }

  return unquoted;
}

function isTruthyEnv(value: string | undefined) {
  return ["1", "true", "yes", "on"].includes(
    normalizeEnvValue(value).toLowerCase(),
  );
}

export function isSupabaseConfigured() {
  return Boolean(
    normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

export function shouldUseDevAuthFallback() {
  return (
    isTruthyEnv(process.env.ENABLE_DEV_AUTH_FALLBACK) ||
    (!isSupabaseConfigured() && process.env.NODE_ENV !== "production")
  );
}

export function getSupabaseEnv() {
  const supabaseUrl = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = normalizeEnvValue(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase Auth is not configured.");
  }

  return { supabaseUrl, supabaseAnonKey };
}
