"use client";

import { useRouter } from "next/navigation";

interface WhatsAppSetupBannerProps {
  whatsappPhoneNumberId: string | null;
}

export function WhatsAppSetupBanner({ whatsappPhoneNumberId }: WhatsAppSetupBannerProps) {
  const router = useRouter();

  if (whatsappPhoneNumberId) return null;

  return (
    <div className="flex items-center justify-between gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-400">
      <span>
        WhatsApp is not connected — the app won&apos;t send or receive messages until you connect your business number.
      </span>
      <button
        onClick={() => router.push("/dashboard/settings")}
        className="shrink-0 rounded bg-amber-800/10 px-3 py-1 text-xs font-semibold hover:bg-amber-800/20 transition-colors cursor-pointer"
      >
        Connect now →
      </button>
    </div>
  );
}
