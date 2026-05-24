import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users, BarChart3, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">P</span>
            </div>
            <span className="font-bold text-foreground">Pinlo</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full mb-6">
          <Zap className="w-3 h-3" />
          WhatsApp CRM for growing teams
        </div>
        <h1 className="text-5xl font-bold text-foreground leading-tight mb-4">
          Turn WhatsApp into your{" "}
          <span className="text-primary">sales engine</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Pinlo is a multi-tenant WhatsApp CRM that helps teams manage
          conversations, track contacts, and close deals — all in one place.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/signup">Start free trial</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: MessageCircle,
              title: "Shared Inbox",
              description:
                "All your WhatsApp conversations in a single inbox. Assign, reply, and resolve without missing a message.",
            },
            {
              icon: Users,
              title: "Contact Management",
              description:
                "Automatically create and tag contacts from inbound messages. Segment by behavior and history.",
            },
            {
              icon: BarChart3,
              title: "Pipeline Tracking",
              description:
                "Move deals through a visual pipeline. Know exactly where every lead stands in real time.",
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
    </div>
  );
}
