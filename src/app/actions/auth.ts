"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";

const SignupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).trim(),
  email: z.string().email({ message: "Please enter a valid email." }).trim(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." }),
  orgName: z
    .string()
    .min(2, { message: "Organization name must be at least 2 characters." })
    .trim(),
});

const LoginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }).trim(),
  password: z.string().min(1, { message: "Password is required." }),
});

export type AuthState = {
  errors?: Record<string, string[]>;
  message?: string;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function slugExists(slug: string): Promise<boolean> {
  const { data } = await db.from("Tenant").select("id").eq("slug", slug).maybeSingle();
  return !!data;
}

export async function signup(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const validated = SignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    orgName: formData.get("orgName"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email, password, orgName } = validated.data;

  const slug = slugify(orgName);
  if (await slugExists(slug)) {
    return { errors: { orgName: ["An organisation with this name already exists. Please choose a different name."] } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) {
    return { message: error?.message ?? "Signup failed. Please try again." };
  }

  const admin = createAdminClient();

  const { data: tenant, error: tenantError } = await db
    .from("Tenant")
    .insert({ id: crypto.randomUUID(), name: orgName, slug })
    .select("id")
    .single();

  if (tenantError || !tenant) {
    await admin.auth.admin.deleteUser(data.user.id);
    if (tenantError?.code === "23505") {
      return { errors: { orgName: ["An organisation with this name already exists. Please choose a different name."] } };
    }
    console.error("[signup] tenant insert failed:", tenantError);
    return { message: tenantError?.message ?? "Failed to create organisation. Please try again." };
  }

  const tenantId = (tenant as { id: string }).id;
  const { error: userError } = await db
    .from("User")
    .insert({ id: data.user.id, email, tenantId, role: "OWNER" });

  if (userError) {
    await admin.auth.admin.deleteUser(data.user.id);
    await db.from("Tenant").delete().eq("id", tenantId);
    return { message: "Failed to set up account. Please try again." };
  }

  redirect("/onboarding");
}

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email, password } = validated.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { message: "Invalid email or password." };
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
