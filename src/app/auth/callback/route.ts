import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  // "invite" | "recovery" | "email" | "signup" | etc.
  const type = searchParams.get("type") as "invite" | "recovery" | "email" | "signup" | "magiclink" | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const cookieStore = await cookies();

  // Capture cookies set during auth exchange so we can attach them to the
  // redirect response. NextResponse.redirect() creates a new Response object
  // that doesn't inherit cookies set via cookieStore.set().
  const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          pendingCookies.push(...cookiesToSet);
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const redirect = (destination: string) => {
    const response = NextResponse.redirect(new URL(destination, origin));
    // Forward session cookies onto the redirect response
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
    });
    return response;
  };

  // PKCE flow — used by OAuth, email confirmation, and magic links
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirect(next);
  }

  // Token hash flow — used by inviteUserByEmail and email OTP links
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) return redirect(next);
  }

  return redirect("/login?error=invite_expired");
}
