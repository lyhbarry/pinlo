"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFacebookSDK, type FBLoginResponse } from "@/components/facebook-sdk";

type SuccessData = { code: string; phoneNumberId: string; wabaId: string };

type Props = {
  onSuccess: (data: SuccessData) => void;
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
  const configId = process.env.NEXT_PUBLIC_FACEBOOK_CONFIG_ID;

  useEffect(() => {
    console.log("[WA] message listener registered");

    function handleMessage(e: MessageEvent) {
      // Log ALL messages to catch origin mismatches
      console.log("[WA] raw message | origin:", e.origin, "| data:", JSON.stringify(e.data).slice(0, 300));

      if (!e.origin.includes("facebook.com")) return;

      let data: unknown;
      try {
        data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        console.log("[WA] failed to parse message data");
        return;
      }

      const msg = data as Partial<WAFinishEvent>;
      console.log("[WA] facebook.com message | type:", msg.type, "| event:", msg.event, "| data:", JSON.stringify(msg.data));

      if (msg.type !== "WA_EMBEDDED_SIGNUP") return;
      console.log("[WA] WA_EMBEDDED_SIGNUP event:", msg.event);

      if (msg.event !== "FINISH") return;

      const phoneNumberId = msg.data?.phone_number_id;
      const wabaId = msg.data?.waba_id;
      const code = codeRef.current;

      console.log("[WA] FINISH | phoneNumberId:", phoneNumberId, "| wabaId:", wabaId, "| hasCode:", !!code);

      if (!phoneNumberId || !wabaId || !code) {
        setConnecting(false);
        onError(`Could not retrieve WhatsApp account details (phoneNumberId=${phoneNumberId}, wabaId=${wabaId}, hasCode=${!!code}). Please try again.`);
        return;
      }

      codeRef.current = null;
      onSuccess({ code, phoneNumberId, wabaId });
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSuccess, onError]);

  function handleClick() {
    console.log("[WA] handleClick | sdkReady:", sdkReady, "| configId:", configId);
    if (!sdkReady || !configId) {
      onError("Facebook SDK not ready. Please refresh and try again.");
      return;
    }
    codeRef.current = null;
    setConnecting(true);

    const loginOptions = {
      config_id: configId,
      response_type: "code",
      override_default_response_type: true,
      extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
    };
    console.log("[WA] calling FB.login with:", JSON.stringify(loginOptions));

    window.FB.login(
      (res: FBLoginResponse) => {
        console.log("[WA] FB.login response:", JSON.stringify(res));
        const code = res.authResponse?.code ?? res.code;
        console.log("[WA] extracted code:", code ? code.slice(0, 20) + "..." : "NONE");
        if (!code) {
          setConnecting(false);
          onError(`Authorization not received (status: ${res.status}). Please try again.`);
          return;
        }
        codeRef.current = code;
        console.log("[WA] code stored in ref, waiting for FINISH postMessage...");
      },
      loginOptions,
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
