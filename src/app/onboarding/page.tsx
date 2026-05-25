"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { selectTemplate } from "@/app/actions/onboarding";
import { WhatsAppConnectButton } from "@/components/whatsapp-connect-button";

export default function OnboardingPage() {
  const [connected, setConnected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const provisionRef = useRef<Promise<{ error?: string }> | null>(null);

  // Provision generic CRM in background immediately
  useEffect(() => {
    provisionRef.current = selectTemplate("generic_crm");
  }, []);

  async function proceed() {
    if (provisionRef.current) {
      const result = await provisionRef.current;
      if (result?.error?.includes("sign up again")) {
        window.location.href = "/signup";
        return;
      }
    }
    window.location.href = "/dashboard";
  }

  async function handleSuccess({ code, phoneNumberId, wabaId, redirectUri }: { code: string; phoneNumberId: string; wabaId: string; redirectUri: string }) {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/whatsapp/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, phoneNumberId, wabaId, redirectUri }),
    });
    setSubmitting(false);
    if (res.ok) {
      setConnected(true);
      await proceed();
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Failed to connect WhatsApp. You can set it up later in Settings.");
    }
  }

  function handleError(message: string) {
    setError(message);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="font-bold text-foreground">Pinlo</span>
          </div>
          <button
            onClick={proceed}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Skip for now
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center space-y-6">
          <div>
            <div className="w-16 h-16 rounded-2xl bg-[#25D366]/10 flex items-center justify-center mx-auto mb-5">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <path d="M16 2C8.268 2 2 8.268 2 16c0 2.493.655 4.832 1.8 6.857L2 30l7.352-1.776A13.93 13.93 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2Z" fill="#25D366"/>
                <path d="M22.5 19.5c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.68-2.08-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.17 0-.37-.02-.57-.02s-.52.07-.8.37c-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.48.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" fill="white"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Connect WhatsApp</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Link your WhatsApp Business number so you can send and receive messages directly in Pinlo.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {connected ? (
            <div className="flex flex-col items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-8 h-8" />
              <p className="font-medium">Connected! Taking you to your dashboard…</p>
            </div>
          ) : submitting ? (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Setting up WhatsApp…
            </div>
          ) : (
            <div className="space-y-3">
              <WhatsAppConnectButton onSuccess={handleSuccess} onError={handleError} />
              <button
                onClick={proceed}
                className="w-full text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer"
              >
                Skip — I&apos;ll set this up later
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
