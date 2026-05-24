"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useMe } from "@/components/dashboard/session-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

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

function WhatsAppCard({ phoneNumberId, webhookUrl }: { phoneNumberId: string | null; webhookUrl: string }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pid, setPid] = useState(phoneNumberId ?? "");
  const [token, setToken] = useState("");

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/settings/whatsapp", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumberId: pid, accessToken: token || undefined }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("WhatsApp credentials saved.");
      setEditing(false);
      setToken("");
    } else {
      toast.error("Failed to save credentials.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">WhatsApp</CardTitle>
          <CardDescription>Meta WhatsApp Cloud API configuration</CardDescription>
        </div>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="-mt-1">
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pid" className="text-xs">Phone Number ID</Label>
              <Input
                id="pid"
                value={pid}
                onChange={(e) => setPid(e.target.value)}
                placeholder="1234567890"
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="token" className="text-xs">Access Token</Label>
              <Input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={phoneNumberId ? "Leave blank to keep existing token" : "EAAxxxxx..."}
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setPid(phoneNumberId ?? ""); setToken(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Phone Number ID</span>
              <span className="font-medium font-mono text-xs">
                {phoneNumberId ?? <span className="text-muted-foreground font-sans">Not configured</span>}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="text-muted-foreground shrink-0">Webhook URL</span>
              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded truncate">{webhookUrl}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

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
    fetch("/api/quick-replies")
      .then((r) => r.json())
      .then((data) => { setReplies(data); setLoading(false); });
  }, []);

  async function handleAdd() {
    setSaving(true);
    const res = await fetch("/api/quick-replies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
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
    const res = await fetch(`/api/quick-replies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
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
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && (
          <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
            <Input
              placeholder="Title (e.g. Greeting)"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="h-8 text-sm"
            />
            <textarea
              placeholder="Message body…"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={3}
              className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving || !form.title.trim() || !form.body.trim()}>
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setForm({ title: "", body: "" }); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
          </div>
        ) : replies.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground text-center py-4">No quick replies yet.</p>
        ) : (
          <div className="space-y-2">
            {replies.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-3">
                {editingId === r.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                      className="h-8 text-sm"
                    />
                    <textarea
                      value={editForm.body}
                      onChange={(e) => setEditForm((f) => ({ ...f, body: e.target.value }))}
                      rows={3}
                      className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleEdit(r.id)} disabled={saving}>
                        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                        Save
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

export default function SettingsPage() {
  const me = useMe();

  if (!me) {
    return (
      <div className="space-y-4 max-w-2xl animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-muted" />
        ))}
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workspace</CardTitle>
            <CardDescription>Your organization details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Organization</span>
              <span className="font-medium">{me.tenant.name}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Slug</span>
              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{me.tenant.slug}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your role</span>
              <span className="font-medium capitalize">{me.role.toLowerCase()}</span>
            </div>
          </CardContent>
        </Card>

        <WhatsAppCard
          phoneNumberId={me.tenant.whatsappPhoneNumberId}
          webhookUrl={`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`}
        />

        <QuickRepliesCard />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Billing</CardTitle>
            <CardDescription>Subscription and payment details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">Pinlo Pro</span>
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
                <span className="text-muted-foreground italic text-xs">No subscription</span>
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
