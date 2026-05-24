"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMe } from "@/components/dashboard/session-provider";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil, Plus, Trash2, UserPlus, Crown, Shield, User, Lock, ChevronRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Billing button ───────────────────────────────────────────────────────────

function ManageBillingButton({ hasCustomer }: { hasCustomer: boolean }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch(hasCustomer ? "/api/billing/portal" : "/api/billing/checkout", {
      method: "POST",
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading} className="w-full">
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />}
      {hasCustomer ? "Manage billing" : "Subscribe"}
    </Button>
  );
}

// ─── Workspace card ───────────────────────────────────────────────────────────

function WorkspaceCard({ orgName, slug, role }: { orgName: string; slug: string; role: string }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(orgName);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim() || name.trim() === orgName) { setEditing(false); return; }
    setSaving(true);
    const res = await fetch("/api/settings/org", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Organization name updated.");
      setEditing(false);
    } else {
      toast.error("Failed to update name.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Workspace</CardTitle>
          <CardDescription>Your organization details</CardDescription>
        </div>
        {!editing && (role === "OWNER" || role === "ADMIN") && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="-mt-1">
            <Pencil className="w-3.5 h-3.5 mr-1.5" />Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center text-sm gap-4">
          <span className="text-muted-foreground shrink-0">Organization</span>
          {editing ? (
            <div className="flex items-center gap-2 flex-1 justify-end">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                className="h-7 text-sm w-48"
                autoFocus
              />
              <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditing(false); setName(orgName); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <span className="font-medium">{name}</span>
          )}
        </div>
        <Separator />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Slug</span>
          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{slug}</span>
        </div>
        <Separator />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Your role</span>
          <span className="font-medium capitalize">{role.toLowerCase()}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Team card ────────────────────────────────────────────────────────────────

type Member = { id: string; email: string; role: string; createdAt: string };

const ROLE_ICONS: Record<string, React.ElementType> = {
  OWNER: Crown,
  ADMIN: Shield,
  MEMBER: User,
};

const ROLE_CLASSES: Record<string, string> = {
  OWNER: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  ADMIN: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  MEMBER: "bg-muted text-muted-foreground",
};

function TeamCard({ currentUserId, currentUserRole, isPro }: {
  currentUserId: string;
  currentUserRole: string;
  isPro: boolean;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((data) => { setMembers(data); setLoading(false); });
  }, []);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    setInviting(false);
    if (res.ok) {
      toast.success(`Invite sent to ${inviteEmail.trim()}.`);
      setInviteEmail("");
      setShowInvite(false);
      // Refresh list
      fetch("/api/team").then((r) => r.json()).then(setMembers);
    } else {
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) {
        toast.error(data.error ?? "User limit reached.", {
          action: { label: "Upgrade", onClick: () => { window.location.href = "/billing"; } },
        });
      } else {
        toast.error(data.error ?? "Failed to send invite.");
      }
    }
  }

  async function handleRemove(id: string, email: string) {
    setRemovingId(id);
    const res = await fetch(`/api/team/${id}`, { method: "DELETE" });
    setRemovingId(null);
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== id));
      toast.success(`${email} removed from workspace.`);
    } else {
      toast.error("Failed to remove member.");
    }
  }

  const canInvite = currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const canRemove = (m: Member) =>
    canInvite && m.id !== currentUserId && !(m.role === "OWNER" && currentUserRole !== "OWNER");

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Team</CardTitle>
          <CardDescription>Members who have access to your workspace</CardDescription>
        </div>
        {canInvite && !showInvite && (
          <Button
            variant="ghost"
            size="sm"
            className="-mt-1"
            onClick={() => {
              if (!isPro) {
                toast.error("Upgrade to Pro to invite team members.", {
                  action: { label: "Upgrade", onClick: () => { window.location.href = "/billing"; } },
                });
                return;
              }
              setShowInvite(true);
            }}
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />Invite
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {!isPro && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>Team collaboration is a <button onClick={() => { window.location.href = "/billing"; }} className="font-medium text-foreground underline underline-offset-2">Pro feature</button>. Upgrade to invite up to 5 members.</span>
          </div>
        )}

        {showInvite && (
          <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
            <div className="flex gap-2">
              <Input
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                className="h-8 text-sm flex-1"
                autoFocus
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "MEMBER" | "ADMIN")}
                className="h-8 text-sm rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="h-7 text-xs">
                {inviting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Send invite
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowInvite(false); setInviteEmail(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-1">
            {members.map((m) => {
              const RoleIcon = ROLE_ICONS[m.role] ?? User;
              return (
                <div key={m.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-semibold text-muted-foreground">
                      {m.email.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", ROLE_CLASSES[m.role] ?? ROLE_CLASSES.MEMBER)}>
                      <RoleIcon className="w-2.5 h-2.5" />
                      {m.role.toLowerCase()}
                    </span>
                    {canRemove(m) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemove(m.id, m.email)}
                        disabled={removingId === m.id}
                      >
                        {removingId === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Security card ────────────────────────────────────────────────────────────

function SecurityCard({ email }: { email: string }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleChangePassword() {
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Security</CardTitle>
        <CardDescription>Change your password for {email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="new-pw" className="text-xs">New password</Label>
          <Input
            id="new-pw"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 8 characters"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-pw" className="text-xs">Confirm new password</Label>
          <Input
            id="confirm-pw"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
            placeholder="Repeat password"
            className="h-8 text-sm"
          />
        </div>
        <Button
          size="sm"
          onClick={handleChangePassword}
          disabled={saving || !newPassword || !confirmPassword}
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
          Update password
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── WhatsApp card ────────────────────────────────────────────────────────────

function WhatsAppCard({ phoneNumberId }: { phoneNumberId: string | null }) {
  const router = useRouter();
  const connected = !!phoneNumberId;

  return (
    <Card
      className="cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={() => router.push("/dashboard/settings/whatsapp")}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            WhatsApp
            {connected ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                <CheckCircle2 className="w-3 h-3" />Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                Not connected
              </span>
            )}
          </CardTitle>
          <CardDescription>Meta WhatsApp Cloud API</CardDescription>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5" />
      </CardHeader>
      {connected && (
        <CardContent>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Phone Number ID</span>
            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{phoneNumberId}</span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Quick Replies card ───────────────────────────────────────────────────────

type QuickReply = { id: string; title: string; body: string };

function QuickRepliesCard() {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", body: "" });
  const [editForm, setEditForm] = useState({ title: "", body: "" });

  useEffect(() => {
    fetch("/api/quick-replies").then((r) => r.json()).then((data) => { setReplies(data); setLoading(false); });
  }, []);

  async function handleAdd() {
    setSaving(true);
    const res = await fetch("/api/quick-replies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (res.ok) {
      const created = await res.json();
      setReplies((prev) => [...prev, created]);
      setForm({ title: "", body: "" });
      setAdding(false);
    } else if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Quick reply limit reached.");
    } else {
      toast.error("Failed to create quick reply.");
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/quick-replies/${id}`, { method: "DELETE" });
    setReplies((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleEdit(id: string) {
    setSaving(true);
    const res = await fetch(`/api/quick-replies/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
    setSaving(false);
    if (res.ok) {
      setReplies((prev) => prev.map((r) => r.id === id ? { ...r, ...editForm } : r));
      setEditingId(null);
    } else {
      toast.error("Failed to update quick reply.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Quick Replies</CardTitle>
          <CardDescription>Saved responses you can insert while messaging</CardDescription>
        </div>
        {!adding && (
          <Button variant="ghost" size="sm" onClick={() => setAdding(true)} className="-mt-1">
            <Plus className="w-3.5 h-3.5 mr-1.5" />Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && (
          <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
            <Input placeholder="Title (e.g. Greeting)" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="h-8 text-sm" />
            <textarea placeholder="Message body…" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={3} className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving || !form.title.trim() || !form.body.trim()}>
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setForm({ title: "", body: "" }); }}>Cancel</Button>
            </div>
          </div>
        )}
        {loading ? (
          <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
        ) : replies.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground text-center py-4">No quick replies yet.</p>
        ) : (
          <div className="space-y-2">
            {replies.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-3">
                {editingId === r.id ? (
                  <div className="space-y-2">
                    <Input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} className="h-8 text-sm" />
                    <textarea value={editForm.body} onChange={(e) => setEditForm((f) => ({ ...f, body: e.target.value }))} rows={3} className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleEdit(r.id)} disabled={saving}>
                        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{r.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.body}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(r.id); setEditForm({ title: r.title, body: r.body }); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const me = useMe();

  if (!me) {
    return (
      <div className="space-y-4 max-w-2xl animate-pulse">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-40 rounded-xl bg-muted" />)}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your workspace and integrations</p>
      </div>

      <div className="space-y-4 max-w-2xl">
        <WhatsAppCard phoneNumberId={me.tenant.whatsappPhoneNumberId} />

        <WorkspaceCard orgName={me.tenant.name} slug={me.tenant.slug} role={me.role} />

        <TeamCard
          currentUserId={me.id}
          currentUserRole={me.role}
          isPro={me.plan === "pro"}
        />

        <SecurityCard email={me.email} />

        <QuickRepliesCard />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Billing</CardTitle>
            <CardDescription>Subscription and payment details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium capitalize">{me.plan === "pro" ? "Pinlo Pro" : "Free"}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Status</span>
              {me.tenant.stripeSubscriptionStatus ? (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                  me.tenant.stripeSubscriptionStatus === "active" || me.tenant.stripeSubscriptionStatus === "trialing"
                    ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                }`}>
                  {me.tenant.stripeSubscriptionStatus}
                </span>
              ) : (
                <span className="text-muted-foreground italic text-xs">Free plan</span>
              )}
            </div>
            <Separator />
            <ManageBillingButton hasCustomer={!!me.tenant.stripeCustomerId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
