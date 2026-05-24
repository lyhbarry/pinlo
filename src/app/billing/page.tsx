"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/actions/auth";
import {
  FREE_PLAN_FEATURES,
  PRO_PLAN_FEATURES,
  PRICING,
} from "@/lib/config/plans";

type BillingInfo = {
  status: string | null;
  currentPeriodEnd: string | null;
  price: { amount: number; currency: string; interval: string } | null;
};

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

const ALL_FEATURES = [
  { label: "Contacts", free: "50", pro: "Unlimited" },
  { label: "Messages / month", free: "100", pro: "Unlimited" },
  { label: "Team members", free: "1", pro: "Up to 5" },
  { label: "Pipeline templates", free: true, pro: true },
  { label: "Quick replies", free: true, pro: true },
  { label: "Pipeline customisation", free: false, pro: true },
  { label: "Analytics", free: false, pro: "Coming soon" },
];

export default function BillingPage() {
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [subscribing, setSubscribing] = useState(false);
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    fetch("/api/billing/info")
      .then(async (r) => {
        if (!r.ok) return;
        return r.json();
      })
      .then((data) => {
        if (data) setInfo(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubscribe() {
    setSubscribing(true);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interval }),
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      setSubscribing(false);
    }
  }

  async function handleManage() {
    setManaging(true);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      setManaging(false);
    }
  }

  const isActive = info?.status === "active" || info?.status === "trialing";
  const isTrialing = info?.status === "trialing";

  const monthlyPrice = formatPrice(
    PRICING.monthly.amount,
    PRICING.monthly.currency,
  );
  const annualPrice = formatPrice(
    PRICING.annual.amount,
    PRICING.annual.currency,
  );
  const annualMonthly = formatPrice(
    Math.round(PRICING.annual.amount / 12),
    PRICING.annual.currency,
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">
                P
              </span>
            </div>
            <span className="font-bold text-foreground">Pinlo</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to dashboard
            </a>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full mb-4">
              <Zap className="w-3 h-3" />
              Pinlo Pro
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {isActive ? "Your subscription" : "Upgrade to Pinlo Pro"}
            </h1>
            <p className="text-muted-foreground">
              {isActive
                ? "Manage your plan below."
                : "Start with a 14-day free trial. No credit card required upfront."}
            </p>
          </div>

          {/* Active subscription card */}
          {!loading && isActive && (
            <div className="max-w-sm mx-auto rounded-2xl border-2 border-primary bg-card p-6 shadow-sm mb-10">
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isTrialing ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-primary/10 text-primary"}`}
                >
                  {isTrialing ? "Trialing" : "Active"}
                </span>
              </div>
              {info?.currentPeriodEnd && (
                <p className="text-sm text-muted-foreground mb-6">
                  {isTrialing ? "Trial ends" : "Renews"}{" "}
                  {new Date(info.currentPeriodEnd).toLocaleDateString(
                    undefined,
                    { month: "long", day: "numeric", year: "numeric" },
                  )}
                </p>
              )}
              <div className="space-y-2">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleManage}
                  disabled={managing}
                >
                  {managing && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  Manage billing
                </Button>
                <Button className="w-full" asChild>
                  <a href="/dashboard">Go to dashboard</a>
                </Button>
              </div>
            </div>
          )}

          {/* Pricing toggle + cards (only for non-active) */}
          {!loading && !isActive && (
            <>
              {/* Interval toggle */}
              <div className="flex justify-center mb-8">
                <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted p-1 text-sm">
                  <button
                    onClick={() => setInterval("monthly")}
                    className={`px-4 py-1.5 rounded-md font-medium transition-colors ${interval === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setInterval("annual")}
                    className={`px-4 py-1.5 rounded-md font-medium transition-colors ${interval === "annual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Annual
                    <span className="ml-1.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                      Save 21%
                    </span>
                  </button>
                </div>
              </div>

              {/* Plan cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                {/* Free */}
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="mb-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      Free
                    </p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-bold text-foreground">
                        S$0
                      </span>
                      <span className="text-muted-foreground text-sm">
                        / mo
                      </span>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {FREE_PLAN_FEATURES.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <Check className="w-4 h-4 text-muted-foreground shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant="outline" asChild>
                    <a href="/dashboard">Continue on Free</a>
                  </Button>
                </div>

                {/* Pro */}
                <div className="rounded-2xl border-2 border-primary bg-card p-6 relative">
                  <div className="absolute -top-3 left-6">
                    <span className="bg-primary text-primary-foreground text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide">
                      Most Popular
                    </span>
                  </div>
                  <div className="mb-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      Pro
                    </p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-bold text-foreground">
                        {interval === "annual" ? annualMonthly : monthlyPrice}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        / mo
                      </span>
                    </div>
                    {interval === "annual" && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Billed {annualPrice} / year
                      </p>
                    )}
                  </div>
                  <ul className="space-y-2 mb-6">
                    {PRO_PLAN_FEATURES.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-sm text-foreground"
                      >
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    onClick={handleSubscribe}
                    disabled={subscribing}
                  >
                    {subscribing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    {subscribing ? "Redirecting…" : "Start 14-day free trial"}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    No credit card required
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Comparison table */}
          <div className="rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">
                    Feature
                  </th>
                  <th className="text-center px-6 py-3 font-medium text-muted-foreground">
                    Free
                  </th>
                  <th className="text-center px-6 py-3 font-medium text-foreground">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {ALL_FEATURES.map((f, i) => (
                  <tr
                    key={f.label}
                    className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
                  >
                    <td className="px-6 py-3 text-foreground">{f.label}</td>
                    <td className="px-6 py-3 text-center text-muted-foreground">
                      {typeof f.free === "boolean" ? (
                        f.free ? (
                          <Check className="w-4 h-4 text-muted-foreground mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                        )
                      ) : (
                        f.free
                      )}
                    </td>
                    <td className="px-6 py-3 text-center text-foreground font-medium">
                      {typeof f.pro === "boolean" ? (
                        f.pro ? (
                          <Check className="w-4 h-4 text-primary mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                        )
                      ) : (
                        f.pro
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
