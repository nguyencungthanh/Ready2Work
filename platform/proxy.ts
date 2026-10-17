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
  "/report",
  "/business",
  "/mentor",
];

// Signed-in users have no reason to revisit these.
const AUTH_ROUTES = ["/signin", "/signup", "/reset-password"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const authResponseHeaders = new Headers();
  function redirectWithCookies(destination: URL) {
    const redirect = NextResponse.redirect(destination);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    authResponseHeaders.forEach((value, key) => redirect.headers.set(key, value));
    return redirect;
  }

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
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        const previousCookies = response.cookies.getAll();
        response = NextResponse.next({ request });
        for (const cookie of previousCookies) response.cookies.set(cookie);
        // Supabase SSR supplies these when cookies change so shared caches
        // cannot retain a response carrying one user's refreshed session.
        Object.entries(headers).forEach(([key, value]) => authResponseHeaders.set(key, value));
        authResponseHeaders.forEach((value, key) => response.headers.set(key, value));
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
    signInUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return redirectWithCookies(signInUrl);
  }

  if (isAuthenticated && AUTH_ROUTES.includes(pathname)) {
    // A valid JWT can outlive a disabled profile. Do not send that account
    // back to a protected page, which would otherwise redirect here forever.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("account_status")
      .eq("id", data!.claims.sub)
      .maybeSingle();
    if (profileError || !profile) return response;
    if (profile.account_status === "suspended" || profile.account_status === "deleted") {
      await supabase.auth.signOut({ scope: "local" });
      return profile.account_status === "suspended"
        ? redirectWithCookies(new URL("/suspended", request.url))
        : response;
    }
    return redirectWithCookies(new URL("/dashboard", request.url));
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
    "/report/:path*",
    "/business/:path*",
    "/mentor/:path*",
    "/signin",
    "/signup",
    "/reset-password",
    "/update-password",
  ],
};
