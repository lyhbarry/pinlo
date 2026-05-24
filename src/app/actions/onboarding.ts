"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { TEMPLATES, type TemplateId } from "@/lib/templates";

export async function selectTemplate(templateId: string): Promise<never> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) redirect("/login");

  const id = (templateId in TEMPLATES ? templateId : "generic_crm") as TemplateId;

  const template = TEMPLATES[id];

  const tenant = await prisma.tenant.findUnique({
    where: { id: dbUser.tenantId },
    select: { template: true },
  });

  if (!tenant?.template) {
    await prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: dbUser.tenantId },
        data: { template: id, contactFields: template.contactFields },
      });
      for (const [order, name] of template.stages.entries()) {
        await tx.pipelineStage.create({ data: { tenantId: dbUser.tenantId, name, order } });
      }
      for (const { title, body } of template.quickReplies) {
        await tx.quickReply.create({ data: { tenantId: dbUser.tenantId, title, body } });
      }
    });
  }

  await supabase.auth.updateUser({ data: { onboarding_complete: true } });
  redirect("/dashboard");
}
