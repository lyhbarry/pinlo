"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search, Circle, Send, Check, CheckCheck, AlertCircle, Phone, Tag, MessageCircle, Loader2, Zap, CheckCheck as Done, Lock, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Contact = { id: string; name: string; phone: string; tags: string[] };
type Message = { id: string; body: string; direction: string; timestamp: string; status: string; wamid?: string | null };
type ConvSummary = {
  id: string; status: string; lastMessageAt: string;
  contact: Contact;
  messages: Message[];
};
type ConvDetail = { id: string; status: string; contact: Contact; messages: Message[]; contactIsLocked?: boolean };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const userTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZone: userTz });
}

function dateDivider(iso: string) {
  const localDay = (d: Date) =>
    d.toLocaleDateString("en-CA", { timeZone: userTz }); // YYYY-MM-DD — stable for comparison
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (localDay(d) === localDay(today)) return "Today";
  if (localDay(d) === localDay(yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: userTz });
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700", "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700", "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
];
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const initials = (name: string) => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

type Filter = "all" | "open" | "closed";
type QuickReply = { id: string; title: string; body: string };

// ─── Component ────────────────────────────────────────────────────────────────

function InboxShellInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [selected, setSelected] = useState<ConvDetail | null>(null);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [supabase] = useState(() => createClient());

  // Load quick replies once
  useEffect(() => {
    fetch("/api/quick-replies").then((r) => r.json()).then(setQuickReplies).catch(() => {});
  }, []);

  const pendingConvRef = useRef<string | null>(searchParams.get("conv"));

  const selectConversation = useCallback(async (id: string) => {
    setMobileShowChat(true);
    if (selected?.id === id) return;
    setLoadingChat(true);
    setViewedIds((prev) => new Set([...prev, id]));
    const data = await fetch(`/api/conversations/${id}/messages`).then((r) => r.json());
    setSelected(data);
    setLoadingChat(false);
  }, [selected?.id]);

  const fetchConvs = useCallback(async () => {
    const r = await fetch("/api/conversations");
    if (!r.ok) return;
    const data: ConvSummary[] = await r.json();
    setConversations(data);
    setLoadingConvs(false);
    if (pendingConvRef.current) {
      const convId = pendingConvRef.current;
      pendingConvRef.current = null;
      selectConversation(convId);
      router.replace("/dashboard/inbox");
    }
  }, [selectConversation, router]);

  // Realtime: Conversation table changes → refresh list
  // Initial load happens on SUBSCRIBED; re-fetches on any Conversation change
  useEffect(() => {
    const channel = supabase
      .channel("convs-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "Conversation" }, () => fetchConvs())
      .subscribe((status) => { if (status === "SUBSCRIBED") fetchConvs(); });
    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchConvs]);

  // Notify bottom nav to hide/show when entering/leaving a conversation on mobile
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("mobile-chat-change", { detail: { inChat: mobileShowChat } }));
  }, [mobileShowChat]);

  // Realtime: Message INSERT + UPDATE for the selected conversation
  useEffect(() => {
    if (!selected?.id) return;
    const convId = selected.id;
    const channel = supabase
      .channel(`messages-${convId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Message", filter: `conversationId=eq.${convId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setSelected((prev) => {
            if (!prev || prev.id !== convId) return prev;
            if (prev.messages.some((m) => m.id === newMsg.id)) return prev;
            return { ...prev, messages: [...prev.messages, newMsg] };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "Message", filter: `conversationId=eq.${convId}` },
        (payload) => {
          const updated = payload.new as Message;
          setSelected((prev) => {
            if (!prev || prev.id !== convId) return prev;
            return { ...prev, messages: prev.messages.map((m) => m.id === updated.id ? updated : m) };
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, selected?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages]);

  async function handleToggleStatus() {
    if (!selected) return;
    const newStatus = selected.status === "OPEN" ? "CLOSED" : "OPEN";
    await fetch(`/api/conversations/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setSelected((prev) => prev ? { ...prev, status: newStatus } : prev);
    setConversations((prev) =>
      prev.map((c) => c.id === selected.id ? { ...c, status: newStatus } : c)
    );
  }

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed || sending || !selected) return;
    setSending(true);
    setBody("");

    // Optimistic update
    const optimistic: Message = {
      id: `tmp-${Date.now()}`, body: trimmed,
      direction: "OUTBOUND", timestamp: new Date().toISOString(), status: "SENT",
    };
    setSelected((prev) => prev ? { ...prev, messages: [...prev.messages, optimistic] } : prev);

    const res = await fetch(`/api/conversations/${selected.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: trimmed }),
    });

    if (!res.ok) {
      // Roll back optimistic message
      setSelected((prev) =>
        prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== optimistic.id) } : prev
      );
      setBody(trimmed);
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Message limit reached.", {
          action: { label: "Upgrade to Pro", onClick: () => { window.location.href = "/billing"; } },
        });
      } else {
        toast.error("Failed to send message. Please try again.");
      }
      setSending(false);
      return;
    }

    const real: Message = await res.json();

    // Replace optimistic with real; guard against poller having already inserted it
    setSelected((prev) => {
      if (!prev) return prev;
      const withoutOptimistic = prev.messages.filter((m) => m.id !== optimistic.id);
      const alreadyPresent = withoutOptimistic.some((m) => m.id === real.id);
      return { ...prev, messages: alreadyPresent ? withoutOptimistic : [...withoutOptimistic, real] };
    });

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selected.id
          ? { ...c, lastMessageAt: real.timestamp, messages: [real] }
          : c
      )
    );
    setSending(false);
  }

  const isUnread = (conv: ConvSummary) =>
    conv.messages[0]?.direction === "INBOUND" && !viewedIds.has(conv.id) && selected?.id !== conv.id;

  // ─── Filtered list ──────────────────────────────────────────────────────────

  const filtered = conversations.filter((c) => {
    const matchFilter = filter === "all" || c.status.toLowerCase() === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || c.contact.name.toLowerCase().includes(q) ||
      c.contact.phone.includes(q) || c.messages[0]?.body.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full">

      {/* ── Left: conversation list ── */}
      <div className={cn(
        "flex-col border-r border-border overflow-hidden",
        "md:flex md:w-80 md:shrink-0 xl:w-96",
        mobileShowChat ? "hidden" : "flex w-full",
      )}>

        {/* Header */}
        <div className="px-4 pt-4 pb-3 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Inbox</h2>
            <div className="flex items-center gap-1.5">
              {conversations.filter(isUnread).length > 0 && (
                <span className="text-xs font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full min-w-5 text-center">
                  {conversations.filter(isUnread).length}
                </span>
              )}
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {conversations.filter((c) => c.status === "OPEN").length} open
              </span>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text" placeholder="Search…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-1">
            {(["all", "open", "closed"] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("flex-1 py-1 text-xs font-medium rounded capitalize transition-colors",
                  filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          {loadingConvs ? (
            <div className="space-y-px">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-28 bg-muted rounded" />
                    <div className="h-3 w-40 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center text-center mt-12 px-6 gap-2">
              <p className="text-sm font-medium text-foreground">
                {search || filter !== "all" ? "No conversations match" : "No conversations yet"}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {search || filter !== "all"
                  ? "Try clearing your search or filter"
                  : "Conversations will appear here once your customers message your WhatsApp number"}
              </p>
            </div>
          ) : (
            filtered.map((conv) => (
              <button key={conv.id} onClick={() => selectConversation(conv.id)}
                className={cn("w-full flex items-start gap-3 px-4 py-3 border-b border-border text-left transition-colors hover:bg-muted/50",
                  selected?.id === conv.id && "bg-muted"
                )}>
                <div className="relative shrink-0 mt-0.5">
                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold", avatarColor(conv.contact.name))}>
                    {initials(conv.contact.name)}
                  </div>
                  {isUnread(conv) && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-sm truncate", isUnread(conv) ? "font-semibold text-foreground" : "font-medium text-foreground")}>
                      {conv.contact.name}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">{timeAgo(conv.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Circle className={cn("w-2 h-2 shrink-0", conv.status === "OPEN" ? "fill-green-500 text-green-500" : "fill-muted-foreground text-muted-foreground")} />
                    <p className={cn("text-xs truncate", isUnread(conv) ? "text-foreground" : "text-muted-foreground")}>
                      {conv.messages[0]
                        ? `${conv.messages[0].direction === "OUTBOUND" ? "You: " : ""}${conv.messages[0].body}`
                        : "No messages"}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right: chat ── */}
      <div className={cn(
        "flex-1 flex-col overflow-hidden",
        "md:flex",
        mobileShowChat ? "flex" : "hidden",
      )}>
        {!selected && !loadingChat && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">Select a conversation</p>
              <p className="text-sm text-muted-foreground mt-0.5">Choose from the list to start messaging</p>
            </div>
          </div>
        )}

        {loadingChat && (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0 md:hidden">
              <button onClick={() => setMobileShowChat(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        {selected && !loadingChat && (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2 md:gap-3">
                <button
                  onClick={() => setMobileShowChat(false)}
                  className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0", avatarColor(selected.contact.name))}>
                  {initials(selected.contact.name)}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{selected.contact.name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" />+{selected.contact.phone}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {selected.contact.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    <Tag className="w-2.5 h-2.5" />{tag}
                  </span>
                ))}
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleToggleStatus}>
                  {selected.status === "OPEN" ? (
                    <><Done className="w-3.5 h-3.5" />Close</>
                  ) : (
                    <><Circle className="w-3 h-3 fill-green-500 text-green-500" />Reopen</>
                  )}
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1 bg-muted/20">
              {selected.messages.map((msg, i) => {
                const isOut = msg.direction === "OUTBOUND";
                const cur = msg.timestamp;
                const divider = i === 0 || dateDivider(cur) !== dateDivider(selected.messages[i - 1].timestamp)
                  ? dateDivider(cur) : null;
                return (
                  <div key={msg.id}>
                    {divider && (
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">{divider}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    <div className={cn("flex mb-1", isOut ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[68%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        isOut ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-background text-foreground border border-border rounded-bl-sm shadow-sm"
                      )}>
                        <p>{msg.body}</p>
                        <div className={cn("flex items-center gap-1 mt-1", isOut ? "justify-end" : "justify-start")}>
                          <span className={cn("text-[10px]", isOut ? "text-primary-foreground/70" : "text-muted-foreground")}>
                            {timeLabel(msg.timestamp)}
                          </span>
                          {isOut && (
                            msg.status === "READ" ? <CheckCheck className="w-3 h-3 text-blue-400" /> :
                            msg.status === "DELIVERED" ? <CheckCheck className="w-3 h-3 text-primary-foreground/70" /> :
                            msg.status === "FAILED" ? <AlertCircle className="w-3 h-3 text-red-400" /> :
                            <Check className="w-3 h-3 text-primary-foreground/70" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border shrink-0">
              {selected.contactIsLocked ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                    <Lock className="w-4 h-4 shrink-0" />
                    <p className="text-sm">This contact is beyond your free plan limit.</p>
                  </div>
                  <Button size="sm" className="shrink-0 h-7 text-xs"
                    onClick={() => { window.location.href = "/billing"; }}>
                    Upgrade to Pro
                  </Button>
                </div>
              ) : (
                <>
                  {/* Quick reply picker */}
                  {showQR && quickReplies.length > 0 && (
                    <div className="mb-2 rounded-lg border border-border bg-background shadow-md overflow-hidden">
                      {quickReplies.map((qr) => (
                        <button
                          key={qr.id}
                          onClick={() => { setBody(qr.body); setShowQR(false); textareaRef.current?.focus(); }}
                          className="w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b border-border last:border-0"
                        >
                          <p className="text-xs font-medium text-foreground">{qr.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{qr.body}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-ring">
                    {quickReplies.length > 0 && (
                      <button
                        onClick={() => setShowQR((v) => !v)}
                        className={cn("shrink-0 transition-colors", showQR ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                        title="Quick replies"
                      >
                        <Zap className="w-4 h-4" />
                      </button>
                    )}
                    <textarea ref={textareaRef} rows={1} value={body}
                      onChange={(e) => setBody(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = `${t.scrollHeight}px`; }}
                      placeholder="Type a message… (Enter to send)"
                      className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground max-h-32 leading-relaxed"
                    />
                    <Button size="icon" className="h-8 w-8 shrink-0 rounded-lg"
                      onClick={handleSend} disabled={!body.trim() || sending}>
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5 px-1">Shift+Enter for new line</p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function InboxShell() {
  return (
    <Suspense>
      <InboxShellInner />
    </Suspense>
  );
}
