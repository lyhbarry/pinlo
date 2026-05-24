"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BillingSuccessPage() {
  const [ready, setReady] = useState(false);

  // Poll until subscription is confirmed in session, then auto-redirect
  useEffect(() => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch("/api/billing/info");
        if (res.ok) {
          const { status } = await res.json();
          if (status === "active" || status === "trialing") {
            clearInterval(interval);
            setReady(true);
            setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
          }
        }
      } catch { /* ignore */ }

      if (attempts >= 20) clearInterval(interval); // stop after ~20s
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          You&apos;re all set!
        </h1>
        <p className="text-muted-foreground mb-8">
          Your subscription is active. Welcome to Pinlo Pro.
        </p>

        {ready ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Taking you to the dashboard…
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Activating your account…
            </div>
            <Button variant="outline" asChild className="mt-4">
              <a href="/dashboard">Go to dashboard</a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
