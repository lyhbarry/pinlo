"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthConfirm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();
    const next = searchParams.get("next") ?? "/dashboard";
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (code || (tokenHash && type)) {
      window.location.replace(`/auth/callback${window.location.search}`);
      return;
    }

    // Parse tokens from the URL hash (#access_token=...&refresh_token=...&type=invite)
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (access_token && refresh_token) {
      const type = params.get("type");
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        if (!error) {
          // Password recovery always goes to set-password regardless of next param
          router.replace(type === "recovery" ? "/set-password?mode=reset" : next);
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
