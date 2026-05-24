"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { useMe } from "./session-provider";
import { Sidebar } from "./sidebar";
import { TrialBanner } from "./trial-banner";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (searchParams.get("upgraded") === "true") {
      toast.success("Welcome to Pinlo Pro!", { description: "All features are now unlocked. Enjoy!" });
      const params = new URLSearchParams(searchParams.toString());
      params.delete("upgraded");
      const qs = params.toString();
      router.replace(pathname + (qs ? `?${qs}` : ""));
    }
  }, [searchParams, router, pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar userEmail={me?.email} orgName={me?.tenant.name} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {me && (
          <TrialBanner plan={me.plan} trialDaysLeft={me.trialDaysLeft} />
        )}
        <main className={pathname.startsWith("/dashboard/inbox") ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto"}>
          {pathname.startsWith("/dashboard/inbox")
            ? children
            : <div className="p-6 lg:p-8">{children}</div>}
        </main>
      </div>
    </div>
  );
}
