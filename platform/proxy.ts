import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes requiring a signed-in user (AUTH-008). Everything else is public.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/account",
  "/admin",
  "/onboarding",
  "/career-discovery",
  "/roadmap",
  "/simulations",
  "/interviews",
];

// Signed-in users have no reason to revisit these.
const AUTH_ROUTES = ["/signin", "/signup", "/reset-password"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return response;
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Validates the token with the auth server and refreshes it when needed.
  // getClaims verifies the session JWT against Supabase's cached signing
  // keys. Unlike getUser(), it does not put the regional Auth server in the
  // hot path for every request when asymmetric signing keys are enabled.
  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = !error && Boolean(data?.claims.sub);

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !isAuthenticated) {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (isAuthenticated && AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  // Keep Proxy off public pages and health/static requests. Next.js Proxy is
  // not intended for slow data fetching; only routes that need an optimistic
  // auth redirect should pay the session-verification cost.
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/account/:path*",
    "/admin/:path*",
    "/onboarding/:path*",
    "/career-discovery/:path*",
    "/roadmap/:path*",
    "/simulations/:path*",
    "/interviews/:path*",
    "/signin",
    "/signup",
    "/reset-password",
  ],
};
