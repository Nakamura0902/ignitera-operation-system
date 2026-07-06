import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// CEO-only routes
const CEO_ROUTES = [
  "/dashboard",
  "/ai-secretary",
  "/departments",
  "/reports",
  "/task-scores",
  "/task-market-monitor",
  "/payroll-report",
  "/approval-center",
  "/user-management",
  "/ceo-settings",
];

// Employee-only routes
const EMPLOYEE_ROUTES = [
  "/home",
  "/tasks",
  "/task-market",
  "/payroll-estimate",
  "/score-history",
];

function isCeoRoute(pathname: string) {
  return CEO_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

function isEmployeeRoute(pathname: string) {
  return EMPLOYEE_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

async function getUserRole(userId: string): Promise<string> {
  // Use service role to bypass RLS for role lookup
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await admin
    .from("users")
    .select("roles(name)")
    .eq("id", userId)
    .single();
  return (data?.roles as { name?: string } | null)?.name ?? "employee";
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isPublicPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/setup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname === "/favicon.ico";

  // Unauthenticated → login
  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated → redirect away from auth pages to role home
  if (user && isPublicPath && !pathname.startsWith("/_next") && !pathname.startsWith("/images") && pathname !== "/favicon.ico") {
    const role = await getUserRole(user.id);
    const home = role === "ceo" || role === "admin" ? "/dashboard" : "/home";
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Authenticated → RBAC enforcement
  if (user) {
    // Root redirect
    if (pathname === "/") {
      const role = await getUserRole(user.id);
      const home = role === "ceo" || role === "admin" ? "/dashboard" : "/home";
      return NextResponse.redirect(new URL(home, request.url));
    }

    // Protect CEO routes from non-CEO
    if (isCeoRoute(pathname)) {
      const role = await getUserRole(user.id);
      if (role !== "ceo" && role !== "admin") {
        return NextResponse.redirect(new URL("/home", request.url));
      }
    }

    // Protect employee routes from CEO (optional: CEO can view employee pages)
    // Currently no restriction — CEO can browse employee pages for monitoring
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|api).*)"],
};
