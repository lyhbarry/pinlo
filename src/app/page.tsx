import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Users,
  BarChart3,
  Zap,
  Check,
  ArrowRight,
} from "lucide-react";
import { LogoMark } from "@/components/logo";
import { PRICING, FREE_PLAN_FEATURES, PRO_PLAN_FEATURES } from "@/lib/config/plans";

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

const monthlyPrice = formatPrice(PRICING.monthly.amount);
const annualMonthly = formatPrice(Math.round(PRICING.annual.amount / 12));
const annualTotal = formatPrice(PRICING.annual.amount);

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="font-bold text-foreground">Pinlo</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get started free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full mb-6">
          <Zap className="w-3 h-3" />
          WhatsApp CRM for growing teams
        </div>
        <h1 className="text-5xl font-bold text-foreground leading-tight tracking-tight mb-5">
          Manage every customer conversation{" "}
          <span className="text-primary">from one inbox</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Pinlo connects to your WhatsApp Business number and gives your whole
          team a shared inbox, contact records, and a deal pipeline — no
          spreadsheets, no missed messages.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button size="lg" asChild>
            <Link href="/signup">
              Try now
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          14-day free trial · No credit card required
        </p>
      </section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-4 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Everything your team needs
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Built specifically for teams who close deals over WhatsApp.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: MessageCircle,
              title: "Shared Inbox",
              description:
                "All your WhatsApp conversations in one place. Reply as a team, see who's handling what, and never drop the ball.",
            },
            {
              icon: Users,
              title: "Contact Management",
              description:
                "Contacts are created automatically when someone messages you. Add notes, tags, and custom fields to keep context.",
            },
            {
              icon: BarChart3,
              title: "Deal Pipeline",
              description:
                "Drag deals through a visual pipeline tied to your contacts. Know exactly where every lead stands.",
            },
          ].map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-border p-6 bg-card"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-muted/30 py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-12">
            Up and running in minutes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Connect WhatsApp",
                description:
                  "Link your WhatsApp Business number via the Meta Cloud API. No additional hardware needed.",
              },
              {
                step: "2",
                title: "Invite your team",
                description:
                  "Add team members by email. They get access to the shared inbox instantly.",
              },
              {
                step: "3",
                title: "Start selling",
                description:
                  "Conversations flow in automatically. Create contacts, move deals, and close faster.",
              },
            ].map(({ step, title, description }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center mb-4">
                  {step}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-4xl mx-auto px-4 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground">
            Start free. Upgrade when you need more.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="rounded-2xl border border-border bg-card p-8">
            <p className="text-sm font-medium text-muted-foreground mb-1">Free</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold text-foreground">S$0</span>
              <span className="text-muted-foreground text-sm">/ mo</span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Perfect for solo operators getting started.
            </p>
            <ul className="space-y-2.5 mb-8">
              {FREE_PLAN_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-muted-foreground shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button className="w-full" variant="outline" asChild>
              <Link href="/signup">Get started free</Link>
            </Button>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border-2 border-primary bg-card p-8 relative">
            <div className="absolute -top-3 left-6">
              <span className="bg-primary text-primary-foreground text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide">
                Most Popular
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Pro</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold text-foreground">{annualMonthly}</span>
              <span className="text-muted-foreground text-sm">/ mo</span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Billed {annualTotal} / year · or {monthlyPrice} monthly
            </p>
            <ul className="space-y-2.5 mb-8">
              {PRO_PLAN_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button className="w-full" asChild>
              <Link href="/signup">Start 14-day free trial</Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-2">
              No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join teams already using Pinlo to manage their WhatsApp sales.
          </p>
          <Button size="lg" asChild>
            <Link href="/signup">
              Start free trial
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <LogoMark size={20} />
            <span className="font-medium text-foreground">Pinlo</span>
            <span className="text-border">·</span>
            <span>WhatsApp CRM for growing teams</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">Sign up</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
