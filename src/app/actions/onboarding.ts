"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { TEMPLATES, type TemplateId } from "@/lib/templates";

export async function selectTemplate(templateId: string): Promise<never> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) redirect("/login");

  const { data: dbUser } = await db
    .from("User")
    .select("id, tenantId")
    .eq("id", session.user.id)
    .single();

  if (!dbUser) redirect("/login");

  const tenantId = (dbUser as { tenantId: string }).tenantId;
  const id = (templateId in TEMPLATES ? templateId : "generic_crm") as TemplateId;
  const template = TEMPLATES[id];

  const { data: tenant } = await db
    .from("Tenant")
    .select("template")
    .eq("id", tenantId)
    .single();

  if (!tenant?.template) {
    await db
      .from("Tenant")
      .update({ template: id, contactFields: template.contactFields })
      .eq("id", tenantId);

    for (const [order, name] of template.stages.entries()) {
      await db.from("PipelineStage").insert({ tenantId, name, order });
    }

    for (const { title, body } of template.quickReplies) {
      await db.from("QuickReply").insert({ tenantId, title, body });
    }
  }

  await supabase.auth.updateUser({ data: { onboarding_complete: true } });
  redirect("/dashboard");
}
