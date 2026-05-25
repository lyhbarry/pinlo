"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Tenant = {
  id: string; name: string; slug: string;
  template: string | null;
  whatsappPhoneNumberId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionStatus: string | null;
};

type Me = { id: string; email: string; role: string; plan: "free" | "pro"; trialDaysLeft: number; tenant: Tenant };

type SessionContextValue = { me: Me | null; refreshMe: () => Promise<void> };

const SessionContext = createContext<SessionContextValue>({ me: null, refreshMe: async () => {} });

export function useMe() {
  return useContext(SessionContext).me;
}

export function useRefreshMe() {
  return useContext(SessionContext).refreshMe;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);

  const refreshMe = useCallback(async () => {
    const data = await fetch("/api/me").then((r) => r.json());
    setMe(data);
  }, []);

  useEffect(() => { refreshMe(); }, [refreshMe]);

  return <SessionContext.Provider value={{ me, refreshMe }}>{children}</SessionContext.Provider>;
}
