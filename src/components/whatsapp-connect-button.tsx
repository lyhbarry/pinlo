"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFacebookSDK, type FBLoginResponse } from "@/components/facebook-sdk";

export type WASuccessData = {
  code: string;
  phoneNumberId: string;
  wabaId: string;
  redirectUri: string;
};

type Props = {
  onSuccess: (data: WASuccessData) => void;
  onError: (error: string) => void;
  className?: string;
  label?: string;
};

type WAFinishEvent = {
  type: "WA_EMBEDDED_SIGNUP";
  event: "FINISH";
  data: { phone_number_id: string; waba_id: string };
};

export function WhatsAppConnectButton({ onSuccess, onError, className, label = "Connect WhatsApp Business" }: Props) {
  const sdkReady = useFacebookSDK();
  const [connecting, setConnecting] = useState(false);
  const codeRef = useRef<string | null>(null);
  const redirectUriRef = useRef<string>("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configId = process.env.NEXT_PUBLIC_FACEBOOK_CONFIG_ID;

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!e.origin.includes("facebook.com")) return;
      let data: unknown;
      try { data = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch { return; }
      const msg = data as Partial<WAFinishEvent>;
      if (msg.type !== "WA_EMBEDDED_SIGNUP" || msg.event !== "FINISH") return;

      const phoneNumberId = msg.data?.phone_number_id ?? "";
      const wabaId = msg.data?.waba_id ?? "";
      const code = codeRef.current;
      console.log("[WA] FINISH | phoneNumberId:", phoneNumberId, "| wabaId:", wabaId, "| hasCode:", !!code);

      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      if (!code) { setConnecting(false); onError("Authorization code missing. Please try again."); return; }

      codeRef.current = null;
      onSuccess({ code, phoneNumberId, wabaId, redirectUri: redirectUriRef.current });
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSuccess, onError]);

  function handleClick() {
    if (!sdkReady || !configId) { onError("Facebook SDK not ready. Please refresh and try again."); return; }
    codeRef.current = null;
    redirectUriRef.current = "";
    setConnecting(true);

    // Intercept window.open to capture the redirect_uri Facebook embeds in the popup URL
    const origOpen = window.open;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).open = (...args: unknown[]) => {
      try {
        const urlStr = String(args[0] ?? "");
        const ru = new URL(urlStr).searchParams.get("redirect_uri") ?? "";
        redirectUriRef.current = ru;
        console.log("[WA] captured redirect_uri (first 80):", ru.slice(0, 80));
      } catch { /* not a parseable URL */ }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).open = origOpen;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (origOpen as any)(...args);
    };

    window.FB.login(
      (res: FBLoginResponse) => {
        console.log("[WA] FB.login response status:", res.status, "| hasCode:", !!(res.authResponse?.code ?? res.code));
        const code = res.authResponse?.code ?? res.code;
        if (!code) {
          setConnecting(false);
          onError(`Authorization not received (status: ${res.status}). Please try again.`);
          return;
        }
        codeRef.current = code;

        timeoutRef.current = setTimeout(() => {
          const storedCode = codeRef.current;
          if (!storedCode) return;
          codeRef.current = null;
          console.log("[WA] FINISH timeout — proceeding with code, redirectUri:", redirectUriRef.current.slice(0, 60));
          onSuccess({ code: storedCode, phoneNumberId: "", wabaId: "", redirectUri: redirectUriRef.current });
        }, 5000);
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
      },
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={connecting || !sdkReady || !configId}
      className={className ?? "w-full bg-[#25D366] hover:bg-[#128C7E] text-white"}
    >
      {connecting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
      {label}
    </Button>
  );
}
