"use client";

export const dynamic = "force-dynamic";

/**
 * Handles hash-based auth redirects from Supabase email links (invite, recovery, magic link).
 *
 * After Supabase's /auth/v1/verify processes a token it redirects here with:
 *   #access_token=...&refresh_token=...&type=invite   (hash — never sent to server)
 *
 * @supabase/ssr's createBrowserClient has detectSessionInUrl: false, so we must
 * parse the hash manually and call setSession explicitly.
 */

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();
    const next = searchParams.get("next") ?? "/dashboard";

    // Parse tokens from the URL hash (#access_token=...&refresh_token=...&type=invite)
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        if (!error) {
          // Clear the hash from the URL before redirecting
          router.replace(next);
        } else {
          router.replace("/login?error=invite_expired");
        }
      });
      return;
    }

    // Fallback: already have a session (e.g. user hit back button)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace(next);
      } else {
        router.replace("/login?error=invite_expired");
      }
    });
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );
}
