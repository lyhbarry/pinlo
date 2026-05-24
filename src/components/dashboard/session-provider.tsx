"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Tenant = {
  id: string; name: string; slug: string;
  template: string | null;
  whatsappPhoneNumberId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionStatus: string | null;
};

type Me = { id: string; email: string; role: string; plan: "free" | "pro"; trialDaysLeft: number; tenant: Tenant };

const SessionContext = createContext<Me | null>(null);

export function useMe() {
  return useContext(SessionContext);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then(setMe);
  }, []);

  return <SessionContext.Provider value={me}>{children}</SessionContext.Provider>;
}
