"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";

const SignupSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }).trim(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." }),
});

const LoginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }).trim(),
  password: z.string().min(1, { message: "Password is required." }),
});

const CompleteSignupSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email().trim(),
});

const SignupResponseUserSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email().nullable().optional(),
    identities: z.array(z.unknown()).nullable().optional(),
    email_confirmed_at: z.string().nullable().optional(),
    confirmation_sent_at: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
  })
  .passthrough();

const SignupResponseSessionSchema = z
  .object({
    access_token: z.string(),
    refresh_token: z.string(),
  })
  .passthrough();

export type AuthState = {
  errors?: Record<string, string[]>;
  message?: string;
  pendingConfirmation?: boolean;
  success?: boolean;
};

type SignupResponseUser = z.infer<typeof SignupResponseUserSchema>;
type SignupResponseSession = z.infer<typeof SignupResponseSessionSchema>;

type PublicSignupResult = {
  duplicateAccount: boolean;
  message?: string;
  raw: unknown;
  session: SignupResponseSession | null;
  user: SignupResponseUser | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getWorkspaceSeed(email: string): string {
  return email.split("@")[0]?.replace(/[^a-zA-Z0-9]+/g, " ").trim() ?? "";
}

function getDefaultWorkspaceName(email: string): string {
  const seed = getWorkspaceSeed(email)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

  return seed ? `${seed} Workspace` : "My Workspace";
}

function getDefaultWorkspaceSlug(email: string, userId: string): string {
  const seed = slugify(getWorkspaceSeed(email)) || "workspace";
  return `${seed}-${userId.slice(0, 8)}`;
}

function getSignupRedirectTo(): string | undefined {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) {
    return undefined;
  }

  const redirectTo = new URL("/auth/confirm", appUrl);
  redirectTo.searchParams.set("next", "/onboarding");
  return redirectTo.toString();
}

function getAuthResponseMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const candidates = [
    value.msg,
    value.message,
    value.error_description,
    value.error,
  ];

  return candidates.find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0,
  );
}

function extractSignupUser(value: unknown): SignupResponseUser | null {
  if (!isRecord(value)) {
    return null;
  }

  const nestedUser = SignupResponseUserSchema.safeParse(value.user);
  if (nestedUser.success) {
    return nestedUser.data;
  }

  const topLevelUser = SignupResponseUserSchema.safeParse(value);
  return topLevelUser.success ? topLevelUser.data : null;
}

function extractSignupSession(value: unknown): SignupResponseSession | null {
  if (!isRecord(value)) {
    return null;
  }

  const nestedSession = SignupResponseSessionSchema.safeParse(value.session);
  if (nestedSession.success) {
    return nestedSession.data;
  }

  const topLevelSession = SignupResponseSessionSchema.safeParse(value);
  return topLevelSession.success ? topLevelSession.data : null;
}

async function findAuthUserByEmail(
  email: string,
): Promise<SignupResponseUser | null> {
  const admin = createAdminClient();
  let page = 1;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      console.error("[signup] auth user search failed:", error);
      return null;
    }

    const match = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email,
    );

    if (match) {
      const parsed = SignupResponseUserSchema.safeParse(match);
      return parsed.success ? parsed.data : null;
    }

    if (!data.nextPage || data.nextPage <= page) {
      break;
    }

    page = data.nextPage;
  }

  return null;
}

async function signUpWithPassword(
  email: string,
  password: string,
): Promise<PublicSignupResult> {
  const signupUrl = new URL(
    "/auth/v1/signup",
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
  );
  const redirectTo = getSignupRedirectTo();

  if (redirectTo) {
    signupUrl.searchParams.set("redirect_to", redirectTo);
  }

  const response = await fetch(signupUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      "X-Client-Info": "pinlo-signup/1.0",
      "X-Supabase-Api-Version": "2024-01-01",
    },
    body: JSON.stringify({
      email,
      password,
      data: {},
    }),
  });

  const raw = await response.json().catch(() => null);
  const message = getAuthResponseMessage(raw);

  if (!response.ok) {
    return {
      duplicateAccount: false,
      message: message ?? "Signup failed. Please try again.",
      raw,
      session: null,
      user: null,
    };
  }

  let user = extractSignupUser(raw);
  const session = extractSignupSession(raw);
  let duplicateAccount =
    Array.isArray(user?.identities) && user.identities.length === 0;

  if (!user) {
    const existingUser = await findAuthUserByEmail(email);
    if (existingUser) {
      user = existingUser;
      duplicateAccount = Boolean(existingUser.email_confirmed_at);
    }
  }

  return {
    duplicateAccount,
    message,
    raw,
    session,
    user,
  };
}

async function createOrgForUser(
  userId: string,
  email: string,
): Promise<AuthState> {
  const orgName = getDefaultWorkspaceName(email);
  const slug = getDefaultWorkspaceSlug(email, userId);
  const admin = createAdminClient();

  const { data: tenant, error: tenantError } = await db
    .from("Tenant")
    .insert({ id: crypto.randomUUID(), name: orgName, slug })
    .select("id")
    .single();

  if (tenantError || !tenant) {
    await admin.auth.admin.deleteUser(userId);
    if (tenantError?.code === "23505") {
      return { message: "Failed to create your workspace. Please try again." };
    }
    console.error("[signup] tenant insert failed:", tenantError);
    return { message: tenantError?.message ?? "Failed to create organisation. Please try again." };
  }

  const tenantId = (tenant as { id: string }).id;
  const { error: userError } = await db
    .from("User")
    .insert({ id: userId, email, tenantId, role: "OWNER" });

  if (userError) {
    console.error("[signup] user insert failed:", userError.code, userError.message);
    await admin.auth.admin.deleteUser(userId);
    await db.from("Tenant").delete().eq("id", tenantId);
    return { message: userError.message ?? "Failed to set up account. Please try again." };
  }

  return {};
}

export async function completeSignup(
  userId: string,
  email: string,
): Promise<AuthState> {
  const validated = CompleteSignupSchema.safeParse({ userId, email });
  if (!validated.success) {
    return { message: "Invalid signup state. Please try again." };
  }

  const normalizedEmail = validated.data.email.toLowerCase();
  const admin = createAdminClient();

  const { data: authUserData, error: authUserError } = await admin.auth.admin.getUserById(validated.data.userId);
  if (authUserError || !authUserData.user) {
    console.error("[completeSignup] auth user lookup failed:", authUserError);
    return { message: "We couldn't finish creating your account. Please try again." };
  }

  if (authUserData.user.email?.toLowerCase() !== normalizedEmail) {
    console.error("[completeSignup] auth user email mismatch:", authUserData.user.id, authUserData.user.email, normalizedEmail);
    return { message: "We couldn't verify your signup. Please try again." };
  }

  const { data: existingUser } = await db
    .from("User")
    .select("id")
    .eq("id", validated.data.userId)
    .maybeSingle();

  if (existingUser) {
    return {};
  }

  return createOrgForUser(validated.data.userId, normalizedEmail);
}

export async function signup(email: string, password: string): Promise<AuthState> {
  const validated = SignupSchema.safeParse({
    email,
    password,
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email: normalizedEmail, password: normalizedPassword } = validated.data;
  const signupResult = await signUpWithPassword(normalizedEmail, normalizedPassword);

  if (!signupResult.user) {
    console.error("[signup] auth signup returned no user:", signupResult.raw);
    return {
      message: signupResult.message ?? "Signup failed. Please try again.",
    };
  }

  if (signupResult.duplicateAccount) {
    return {
      message: "We couldn't create that account. If you've used this email before, try signing in or resetting your password.",
    };
  }

  const setupState = await completeSignup(signupResult.user.id, normalizedEmail);
  if (setupState.message || setupState.errors) {
    return setupState;
  }

  if (!signupResult.session) {
    return { pendingConfirmation: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.setSession({
    access_token: signupResult.session.access_token,
    refresh_token: signupResult.session.refresh_token,
  });

  if (error) {
    console.error("[signup] setSession failed:", error);
    return {
      message: error.message ?? "We created your account, but couldn't sign you in.",
    };
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

export async function requestPasswordReset(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  if (!email || !z.string().email().safeParse(email).success) {
    return { errors: { email: ["Please enter a valid email address."] } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/set-password`,
  });

  // Don't reveal whether the email exists — always show success.
  if (error) console.error("[resetPassword]", error.message);

  return { success: true };
}
