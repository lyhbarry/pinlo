import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

// cache() deduplicates calls within a single server render —
// no matter how many layouts/pages call this, it runs once per request.
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export const getDbUser = cache(async () => {
  const user = await getSession();
  if (!user) redirect("/login");

  return prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    include: { tenant: true },
  });
});
