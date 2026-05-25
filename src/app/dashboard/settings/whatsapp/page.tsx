"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Copy, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { WhatsAppConnectButton, type WASuccessData } from "@/components/whatsapp-connect-button";
import type { PhoneOption } from "@/app/api/whatsapp/callback/route";

type Status =
  | { connected: false }
  | { connected: true; phoneNumberId: string; displayPhoneNumber: string | null };

type SelectionState = { options: PhoneOption[]; accessToken: string };

export default function WhatsAppSettingsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selection, setSelection] = useState<SelectionState | null>(null);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const webhookUrl = `${appUrl}/api/webhooks/whatsapp`;
  const verifyToken = "configured in server env";

  useEffect(() => {
    fetch("/api/settings/whatsapp")
      .then((r) => r.json())
      .then((data) => setStatus(data as Status))
      .catch(() => setStatus({ connected: false }));
  }, []);

  async function completeConnection(body: Record<string, string>) {
    setSubmitting(true);
    const res = await fetch("/api/whatsapp/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json() as { needsSelection?: boolean; options?: PhoneOption[]; accessToken?: string; phoneNumberId?: string; error?: string };

    if (!res.ok) {
      setSubmitting(false);
      toast.error(data.error ?? "Failed to connect WhatsApp. Please try again.");
      return;
    }

    if (data.needsSelection && data.options && data.accessToken) {
      setSubmitting(false);
      setSelection({ options: data.options, accessToken: data.accessToken });
      return;
    }

    setSubmitting(false);
    toast.success("WhatsApp Business connected!");
    setStatus({ connected: true, phoneNumberId: data.phoneNumberId!, displayPhoneNumber: null });
    fetch("/api/settings/whatsapp")
      .then((r) => r.json())
      .then((d) => setStatus(d as Status));
  }

  async function handleSuccess({ code, phoneNumberId, wabaId, redirectUri }: WASuccessData) {
    await completeConnection({ code, phoneNumberId, wabaId, redirectUri });
  }

  async function handleSelect(option: PhoneOption) {
    if (!selection) return;
    setSelection(null);
    await completeConnection({
      accessToken: selection.accessToken,
      phoneNumberId: option.phoneNumberId,
      wabaId: option.wabaId,
    });
  }

  function handleError(error: string) {
    toast.error(error);
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    const res = await fetch("/api/settings/whatsapp", { method: "DELETE" });
    setDisconnecting(false);
    if (res.ok) {
      setStatus({ connected: false });
      toast.success("WhatsApp disconnected.");
    } else {
      toast.error("Failed to disconnect.");
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied!"));
  }

  return (
    <div>
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-foreground mb-4 cursor-pointer">
          ← Back to Settings
        </button>
        <h1 className="text-2xl font-bold text-foreground">WhatsApp</h1>
        <p className="text-muted-foreground text-sm mt-1">Connect your WhatsApp Business number to send and receive messages</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {status === null ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : status.connected ? (
          <StateConnected
            status={status}
            webhookUrl={webhookUrl}
            verifyToken={verifyToken}
            disconnecting={disconnecting}
            onDisconnect={handleDisconnect}
            onCopy={copyToClipboard}
          />
        ) : selection ? (
          <StatePicker
            options={selection.options}
            onSelect={handleSelect}
            onCancel={() => setSelection(null)}
          />
        ) : (
          <StateNotConnected
            submitting={submitting}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        )}
      </div>
    </div>
  );
}

function StateNotConnected({
  submitting,
  onSuccess,
  onError,
}: {
  submitting: boolean;
  onSuccess: (data: WASuccessData) => void;
  onError: (error: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center shrink-0">
          <WhatsAppIcon />
        </div>
        <div>
          <p className="font-semibold text-foreground">Connect WhatsApp Business</p>
          <p className="text-sm text-muted-foreground">Link your WABA to start sending and receiving messages</p>
        </div>
      </div>

      <ul className="space-y-2 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <span className="text-[#25D366] mt-0.5">✓</span>
          Send and receive WhatsApp messages from your inbox
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[#25D366] mt-0.5">✓</span>
          Automatic webhook registration — no manual setup needed
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[#25D366] mt-0.5">✓</span>
          Use message templates and quick replies
        </li>
      </ul>

      <Separator />

      {submitting ? (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Setting up WhatsApp…
        </div>
      ) : (
        <WhatsAppConnectButton onSuccess={onSuccess} onError={onError} />
      )}
    </div>
  );
}

function StatePicker({
  options,
  onSelect,
  onCancel,
}: {
  options: PhoneOption[];
  onSelect: (option: PhoneOption) => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-xl border border-border p-6 space-y-5">
      <div>
        <p className="font-semibold text-foreground">Select a phone number</p>
        <p className="text-sm text-muted-foreground mt-1">
          Multiple WhatsApp numbers were found on your account. Choose the one to connect.
        </p>
      </div>

      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.phoneNumberId}
            onClick={() => onSelect(opt)}
            className="w-full text-left rounded-lg border border-border hover:border-[#25D366] hover:bg-[#25D366]/5 p-4 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground text-sm">
                  {opt.displayPhoneNumber}
                </p>
                {opt.verifiedName && (
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.verifiedName}</p>
                )}
                <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {opt.phoneNumberId}</p>
              </div>
              <span className="text-xs text-[#25D366] opacity-0 group-hover:opacity-100 transition-opacity">
                Connect →
              </span>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onCancel}
        className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer"
      >
        Cancel
      </button>
    </div>
  );
}

function StateConnected({
  status,
  webhookUrl,
  verifyToken,
  disconnecting,
  onDisconnect,
  onCopy,
}: {
  status: { connected: true; phoneNumberId: string; displayPhoneNumber: string | null };
  webhookUrl: string;
  verifyToken: string;
  disconnecting: boolean;
  onDisconnect: () => void;
  onCopy: (text: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="font-semibold text-foreground">Connected</span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
            Active
          </span>
        </div>

        <Separator />

        <div className="space-y-3 text-sm">
          {status.displayPhoneNumber && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Phone number</span>
              <span className="font-medium">{status.displayPhoneNumber}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Phone Number ID</span>
            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{status.phoneNumberId}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border p-6 space-y-4">
        <p className="font-semibold text-foreground text-sm">Webhook Configuration</p>
        <p className="text-xs text-muted-foreground">
          These are registered automatically. Reference them if you need to update your Meta App settings.
        </p>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Callback URL</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono truncate">{webhookUrl}</code>
              <button
                onClick={() => onCopy(webhookUrl)}
                className="shrink-0 p-1.5 rounded hover:bg-muted transition-colors"
                aria-label="Copy webhook URL"
              >
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Verify Token</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono truncate">{verifyToken}</code>
              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-1.5 rounded hover:bg-muted transition-colors"
                aria-label="Open Meta developers"
              >
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-destructive/20 p-6 space-y-3">
        <p className="font-semibold text-foreground text-sm">Disconnect</p>
        <p className="text-sm text-muted-foreground">
          Removing this connection will stop all WhatsApp messages. You can reconnect at any time.
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDisconnect}
          disabled={disconnecting}
        >
          {disconnecting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
          Disconnect WhatsApp
        </Button>
      </div>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 2C8.268 2 2 8.268 2 16c0 2.493.655 4.832 1.8 6.857L2 30l7.352-1.776A13.93 13.93 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2Z" fill="#25D366"/>
      <path d="M22.5 19.5c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.68-2.08-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.17 0-.37-.02-.57-.02s-.52.07-.8.37c-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.48.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" fill="white"/>
    </svg>
  );
}
