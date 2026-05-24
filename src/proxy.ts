import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
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
  const onboardingComplete = user?.user_metadata?.onboarding_complete === true;

  // ── Unauthenticated ───────────────────────────────────────────────────────
  if (!user) {
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding") || pathname.startsWith("/billing")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return supabaseResponse;
  }

  // ── Authenticated: redirect away from auth pages ──────────────────────────
  if (pathname === "/login" || pathname === "/signup") {
    return NextResponse.redirect(
      new URL(onboardingComplete ? "/dashboard" : "/onboarding", request.url)
    );
  }

  // ── Onboarding gate ───────────────────────────────────────────────────────
  if (!onboardingComplete) {
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/billing")) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    return supabaseResponse;
  }

  // ── Skip onboarding/billing if already onboarded ─────────────────────────
  if (pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Free-plan users can access /billing to upgrade.
  // /billing/success is always accessible after checkout.
  // No subscription gate — free plan users go straight to dashboard.

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|auth/callback).*)",
  ],
};
