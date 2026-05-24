"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";

interface UpgradePromptProps {
  feature: string;
  benefit?: string;
  variant?: "inline" | "banner";
}

export function UpgradePrompt({ feature, benefit, variant = "inline" }: UpgradePromptProps) {
  const router = useRouter();

  if (variant === "banner") {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/40 dark:bg-amber-900/20">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            <span className="font-medium">{feature}</span> is a Pro feature.
            {benefit && <span className="ml-1 text-amber-700 dark:text-amber-400">{benefit}</span>}
          </span>
        </div>
        <button
          onClick={() => router.push("/billing")}
          className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
        >
          Upgrade to Pro — S$29/mo
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/20 p-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Lock className="w-5 h-5 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold text-foreground">{feature} is a Pro feature</p>
        {benefit && <p className="mt-0.5 text-sm text-muted-foreground">{benefit}</p>}
      </div>
      <button
        onClick={() => router.push("/billing")}
        className="mt-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Upgrade to Pro — S$29/mo
      </button>
    </div>
  );
}
