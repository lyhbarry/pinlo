import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export type DbTenant = {
  id: string;
  name: string;
  slug: string;
  template: string | null;
  whatsappPhoneNumberId: string | null;
  whatsappAccessToken: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null;
  stripeTrialEndsAt: string | null;
};

export type DbUser = {
  id: string;
  email: string;
  tenantId: string;
  role: string;
  tenant: DbTenant;
};

// For server components — deduplicates within a single render tree.
// Uses getSession() (local JWT decode, no HTTP round-trip).
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
});

export const getDbUser = cache(async () => {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { data } = await db
    .from("User")
    .select("*, tenant:Tenant(*)")
    .eq("id", user.id)
    .single();

  if (!data) redirect("/login");
  return data as DbUser;
});

// For API routes — returns null instead of redirecting.
// Avoids an HTTP round-trip by reading the JWT from the cookie locally.
// Includes tenant so billing/settings routes don't need a second query.
export async function requireAuth(): Promise<DbUser | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data } = await db
    .from("User")
    .select("*, tenant:Tenant(*)")
    .eq("id", session.user.id)
    .single();

  return (data as DbUser | null) ?? null;
}
