/**
 * Unit tests for POST /api/team (teammate invite)
 *
 * Run with:  npx vitest src/app/api/team/__tests__/route.test.ts
 * (or jest if you prefer)
 *
 * Dependencies to install first:
 *   npm install -D vitest
 *
 * The route under test: src/app/api/team/route.ts
 * External deps mocked: @/lib/session, @/lib/db, @/lib/supabase/admin, @/lib/plan
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock factories ───────────────────────────────────────────────────────────

const mockDb = {
  from: vi.fn(),
};

const mockInviteUserByEmail = vi.fn();
const mockAdminAuth = { admin: { inviteUserByEmail: mockInviteUserByEmail } };
const mockCreateAdminClient = vi.fn(() => ({ auth: mockAdminAuth }));

const mockCheckLimit = vi.fn();
const mockGetPlanId = vi.fn(() => "free");

vi.mock("@/lib/session", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mockCreateAdminClient }));
vi.mock("@/lib/plan", () => ({
  checkLimit: mockCheckLimit,
  getPlanId: mockGetPlanId,
}));

import { requireAuth } from "@/lib/session";
import { POST } from "../route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: object) {
  return new Request("http://localhost/api/team", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

function ownerUser(overrides = {}) {
  return {
    id: "user-1",
    email: "owner@example.com",
    tenantId: "tenant-1",
    role: "OWNER",
    tenant: { stripeSubscriptionStatus: null },
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/team — invite teammate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: db insert succeeds
    mockDb.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
  });

  // ── Auth & permission guards ──

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue(null as any);
    const res = await POST(makeRequest({ email: "a@b.com" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when caller is a MEMBER (not OWNER or ADMIN)", async () => {
    vi.mocked(requireAuth).mockResolvedValue(ownerUser({ role: "MEMBER" }) as any);
    const res = await POST(makeRequest({ email: "a@b.com" }));
    expect(res.status).toBe(403);
  });

  it("allows ADMIN to invite", async () => {
    vi.mocked(requireAuth).mockResolvedValue(ownerUser({ role: "ADMIN" }) as any);
    mockCheckLimit.mockResolvedValue({ allowed: true, current: 1, limit: 5 });
    mockInviteUserByEmail.mockResolvedValue({
      data: { user: { id: "new-user-id" } },
      error: null,
    });
    const res = await POST(makeRequest({ email: "new@example.com", role: "MEMBER" }));
    expect(res.status).toBe(201);
  });

  // ── Input validation ──

  it("returns 400 when email is missing", async () => {
    vi.mocked(requireAuth).mockResolvedValue(ownerUser() as any);
    const res = await POST(makeRequest({ role: "MEMBER" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is blank string", async () => {
    vi.mocked(requireAuth).mockResolvedValue(ownerUser() as any);
    const res = await POST(makeRequest({ email: "   " }));
    expect(res.status).toBe(400);
  });

  // ── Plan limit enforcement ──

  it("returns 403 with USER_LIMIT_REACHED code when free plan is full", async () => {
    vi.mocked(requireAuth).mockResolvedValue(ownerUser() as any);
    mockCheckLimit.mockResolvedValue({ allowed: false, current: 2, limit: 2 });

    const res = await POST(makeRequest({ email: "extra@example.com" }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("USER_LIMIT_REACHED");
    expect(body.error).toMatch(/2-member limit/i);
  });

  it("passes when pro plan has no user limit", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      ownerUser({ tenant: { stripeSubscriptionStatus: "active" } }) as any
    );
    mockGetPlanId.mockReturnValue("pro");
    mockCheckLimit.mockResolvedValue({ allowed: true, current: 20, limit: Infinity });
    mockInviteUserByEmail.mockResolvedValue({
      data: { user: { id: "new-user-id" } },
      error: null,
    });
    const res = await POST(makeRequest({ email: "pro-user@example.com" }));
    expect(res.status).toBe(201);
  });

  // ── Role defaulting ──

  it("defaults unknown role to MEMBER", async () => {
    vi.mocked(requireAuth).mockResolvedValue(ownerUser() as any);
    mockCheckLimit.mockResolvedValue({ allowed: true, current: 1, limit: 5 });
    mockInviteUserByEmail.mockResolvedValue({
      data: { user: { id: "new-user-id" } },
      error: null,
    });

    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockDb.from.mockReturnValue({ insert: insertMock });

    await POST(makeRequest({ email: "new@example.com", role: "SUPERADMIN" }));

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ role: "MEMBER" })
    );
  });

  it("accepts ADMIN role", async () => {
    vi.mocked(requireAuth).mockResolvedValue(ownerUser() as any);
    mockCheckLimit.mockResolvedValue({ allowed: true, current: 1, limit: 5 });
    mockInviteUserByEmail.mockResolvedValue({
      data: { user: { id: "new-user-id" } },
      error: null,
    });

    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockDb.from.mockReturnValue({ insert: insertMock });

    await POST(makeRequest({ email: "admin@example.com", role: "ADMIN" }));

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ role: "ADMIN" })
    );
  });

  // ── Email normalisation ──

  it("lowercases and trims the email before inserting", async () => {
    vi.mocked(requireAuth).mockResolvedValue(ownerUser() as any);
    mockCheckLimit.mockResolvedValue({ allowed: true, current: 1, limit: 5 });
    mockInviteUserByEmail.mockResolvedValue({
      data: { user: { id: "new-user-id" } },
      error: null,
    });

    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockDb.from.mockReturnValue({ insert: insertMock });

    await POST(makeRequest({ email: "  ALICE@EXAMPLE.COM  " }));

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: "alice@example.com" })
    );
  });

  // ── Supabase invite errors ──

  it("returns 500 when Supabase inviteUserByEmail fails", async () => {
    vi.mocked(requireAuth).mockResolvedValue(ownerUser() as any);
    mockCheckLimit.mockResolvedValue({ allowed: true, current: 1, limit: 5 });
    mockInviteUserByEmail.mockResolvedValue({
      data: { user: null },
      error: { message: "Email service unavailable" },
    });

    const res = await POST(makeRequest({ email: "new@example.com" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Email service unavailable");
  });

  // ── Duplicate user ──

  it("returns 409 when user is already a member (unique constraint violation)", async () => {
    vi.mocked(requireAuth).mockResolvedValue(ownerUser() as any);
    mockCheckLimit.mockResolvedValue({ allowed: true, current: 1, limit: 5 });
    mockInviteUserByEmail.mockResolvedValue({
      data: { user: { id: "existing-user-id" } },
      error: null,
    });

    mockDb.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: { code: "23505" } }),
    });

    const res = await POST(makeRequest({ email: "existing@example.com" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already a member/i);
  });

  // ── Happy path ──

  it("returns 201 with email and role on successful invite", async () => {
    vi.mocked(requireAuth).mockResolvedValue(ownerUser() as any);
    mockCheckLimit.mockResolvedValue({ allowed: true, current: 1, limit: 5 });
    mockInviteUserByEmail.mockResolvedValue({
      data: { user: { id: "new-user-id" } },
      error: null,
    });

    const res = await POST(makeRequest({ email: "New@Example.COM", role: "MEMBER" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ email: "new@example.com", role: "MEMBER" });
  });

  it("inserts user with correct tenantId", async () => {
    vi.mocked(requireAuth).mockResolvedValue(ownerUser({ tenantId: "tenant-abc" }) as any);
    mockCheckLimit.mockResolvedValue({ allowed: true, current: 1, limit: 5 });
    mockInviteUserByEmail.mockResolvedValue({
      data: { user: { id: "new-user-id" } },
      error: null,
    });

    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockDb.from.mockReturnValue({ insert: insertMock });

    await POST(makeRequest({ email: "new@example.com" }));

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-abc" })
    );
  });
});
