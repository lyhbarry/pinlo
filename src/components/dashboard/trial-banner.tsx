"use client";

import { useRouter } from "next/navigation";

interface TrialBannerProps {
  trialDaysLeft: number;
  plan: "free" | "pro";
}

export function TrialBanner({ trialDaysLeft, plan }: TrialBannerProps) {
  const router = useRouter();

  if (plan === "pro" && trialDaysLeft > 0) {
    return (
      <div className="flex items-center justify-between gap-2 bg-emerald-600 px-4 py-2 text-sm text-white">
        <span>
          Your free trial ends in <strong>{trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}</strong>.
        </span>
        <button
          onClick={() => router.push("/billing")}
          className="shrink-0 rounded bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30 transition-colors"
        >
          Subscribe now
        </button>
      </div>
    );
  }

  if (plan === "free") {
    return (
      <div className="flex items-center justify-between gap-2 bg-muted border-b border-border px-4 py-2 text-sm text-muted-foreground">
        <span>
          You're on the <strong className="text-foreground">Free plan</strong>. Upgrade to unlock unlimited contacts, messages, and more.
        </span>
        <button
          onClick={() => router.push("/billing")}
          className="shrink-0 rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Upgrade to Pro
        </button>
      </div>
    );
  }

  return null;
}
