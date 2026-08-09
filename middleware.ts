import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function redirectToPath(path: string, status = 307) {
  return new Response(null, {
    status,
    headers: {
      Location: path,
    },
  });
}

const protectedRoutes = [
  "/assets",
  "/brand-profile",
  "/calendar",
  "/content-studio",
  "/dashboard",
  "/insights",
  "/reply-assistant",
  "/settings",
  "/workspaces",
];

const authRoutes = ["/login", "/register"];

function matchesRoute(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function middleware(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  const response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  if (!user && matchesRoute(pathname, protectedRoutes)) {
    return redirectToPath(`/login?redirectTo=${encodeURIComponent(pathname)}`);
  }

  if (user && matchesRoute(pathname, authRoutes)) {
    return redirectToPath("/dashboard");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|mock-uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
