import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafeRedirectPath, redirectToPath } from "@/lib/redirect-response";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = getSafeRedirectPath(requestUrl.searchParams.get("redirectTo"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase?.auth.exchangeCodeForSession(code);
  }

  return redirectToPath(redirectTo);
}
