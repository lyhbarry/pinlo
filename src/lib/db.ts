import { createAdminClient } from "@/lib/supabase/admin";

const g = globalThis as unknown as { db: ReturnType<typeof createAdminClient> };
export const db = g.db ?? createAdminClient();
g.db = db;
