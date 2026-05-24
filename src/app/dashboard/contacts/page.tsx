"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, User, Plus, X, MessageCircle, Pencil, Check, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

type Contact = {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  createdAt: string;
  isLocked: boolean;
  _count: { conversations: number };
  conversations: { id: string; status: string; lastMessageAt: string }[];
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

function avatarColor(id: string) {
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", tagInput: "", tags: [] as string[] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", tagInput: "", tags: [] as string[] });

  function addTag() {
    const t = form.tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm((f) => ({ ...f, tags: [...f.tags, t], tagInput: "" }));
    }
  }

  async function handleEdit(id: string) {
    setSaving(true);
    const res = await fetch(`/api/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editForm.name, tags: editForm.tags }),
    });
    setSaving(false);
    if (res.ok) {
      setContacts((prev) => prev.map((c) => c.id === id ? { ...c, name: editForm.name, tags: editForm.tags } : c));
      setEditingId(null);
      toast.success("Contact updated.");
    } else {
      toast.error("Failed to update contact.");
    }
  }

  async function handleCreate() {
    setSaving(true);
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, phone: form.phone, tags: form.tags }),
    });
    setSaving(false);
    if (res.ok) {
      const created = await res.json();
      setContacts((prev) => [{ ...created, _count: { conversations: 0 }, conversations: [] }, ...prev]);
      setForm({ name: "", phone: "", tagInput: "", tags: [] });
      setShowForm(false);
      toast.success("Contact added.");
    } else if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Contact limit reached.", {
        action: { label: "Upgrade", onClick: () => { window.location.href = "/billing"; } },
      });
    } else if (res.status === 409) {
      toast.error("A contact with this phone number already exists.");
    } else {
      toast.error("Failed to create contact.");
    }
  }

  useEffect(() => {
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => {
        setContacts(data);
        setLoading(false);
      });
  }, []);

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {loading ? "Loading…" : `${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add contact
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-border bg-card p-5 max-w-lg space-y-4">
          <h3 className="font-semibold text-foreground text-sm">New contact</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-name" className="text-xs">Name</Label>
              <Input id="c-name" placeholder="Jane Smith" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-phone" className="text-xs">Phone (with country code)</Label>
              <Input id="c-phone" placeholder="6591234567" value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tags</Label>
            <div className="flex gap-2">
              <Input placeholder="Add tag…" value={form.tagInput}
                onChange={(e) => setForm((f) => ({ ...f, tagInput: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {form.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                    {t}
                    <button onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleCreate} disabled={saving || !form.name.trim() || !form.phone.trim()}>
              Save contact
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-xl text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <User className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {search ? "No contacts match your search" : "No contacts yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {search ? "Try a different search" : "Add one manually or they'll appear when messages arrive"}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tags</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Conversations</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last active</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact, i) => {
                const lastConv = contact.conversations[0];
                return (
                  <tr
                    key={contact.id}
                    className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${
                      i % 2 === 0 ? "" : "bg-muted/10"
                    }`}
                  >
                    <td className="px-4 py-3">
                      {editingId === contact.id ? (
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          className="h-7 text-sm w-40"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 ${avatarColor(contact.id)}`}>
                            {getInitials(contact.name)}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground">{contact.name}</span>
                            {contact.isLocked && (
                              <div title="Beyond free plan limit">
                                <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{contact.phone}</td>
                    <td className="px-4 py-3">
                      {editingId === contact.id ? (
                        <div className="flex flex-wrap gap-1 items-center">
                          {editForm.tags.map((t) => (
                            <span key={t} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                              {t}
                              <button onClick={() => setEditForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))}>
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          <Input
                            placeholder="Add tag…"
                            value={editForm.tagInput}
                            onChange={(e) => setEditForm((f) => ({ ...f, tagInput: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const t = editForm.tagInput.trim();
                                if (t && !editForm.tags.includes(t)) setEditForm((f) => ({ ...f, tags: [...f.tags, t], tagInput: "" }));
                              }
                            }}
                            className="h-6 text-xs w-24"
                          />
                        </div>
                      ) : contact.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground">{contact._count.conversations}</span>
                        {lastConv && (
                          <Badge variant={lastConv.status === "OPEN" ? "default" : "secondary"} className="text-xs">
                            {lastConv.status.toLowerCase()}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {lastConv ? formatDate(lastConv.lastMessageAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(contact.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {editingId === contact.id ? (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEdit(contact.id)} disabled={saving}>
                              <Check className="w-3.5 h-3.5 text-primary" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => { setEditingId(contact.id); setEditForm({ name: contact.name, tagInput: "", tags: [...contact.tags] }); }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            {lastConv && (
                              <Button size="sm" variant="ghost"
                                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
                                disabled={contact.isLocked}
                                title={contact.isLocked ? "Upgrade to Pro to message this contact" : undefined}
                                onClick={() => router.push(`/dashboard/inbox?conv=${lastConv.id}`)}>
                                <MessageCircle className="w-3.5 h-3.5" />
                                Message
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
