"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Users, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard/inbox", label: "Inbox", icon: MessageCircle },
  { href: "/dashboard/contacts", label: "Contacts", icon: Users },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const [hiddenInChat, setHiddenInChat] = useState(false);

  useEffect(() => {
    function handler(e: Event) {
      setHiddenInChat((e as CustomEvent<{ inChat: boolean }>).detail.inChat);
    }
    window.addEventListener("mobile-chat-change", handler);
    // Reset when navigating away from inbox
    if (!pathname.startsWith("/dashboard/inbox")) setHiddenInChat(false);
    return () => window.removeEventListener("mobile-chat-change", handler);
  }, [pathname]);

  if (hiddenInChat) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background border-t border-border flex h-16">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
