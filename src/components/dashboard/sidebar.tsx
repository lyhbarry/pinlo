"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  Users,
  BarChart3,
  BarChart2,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logout } from "@/app/actions/auth";
import { LogoMark } from "@/components/logo";

const NAV_ITEMS = [
  { href: "/dashboard/inbox", label: "Inbox", icon: MessageCircle },
  { href: "/dashboard/contacts", label: "Contacts", icon: Users },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: BarChart3 },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  userEmail?: string;
  orgName?: string;
}

export function Sidebar({ userEmail, orgName }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchUnread() {
      const r = await fetch("/api/conversations").catch(() => null);
      if (!r?.ok) return;
      const convs: { messages: { direction: string }[] }[] = await r.json();
      setUnreadCount(convs.filter((c) => c.messages[0]?.direction === "INBOUND").length);
    }
    fetchUnread();
    const id = setInterval(fetchUnread, 10000);
    return () => clearInterval(id);
  }, []);

  const initials = userEmail?.slice(0, 2).toUpperCase() ?? "U";

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-2">
        <LogoMark size={32} className="shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">Pinlo</p>
          {orgName && (
            <p className="text-xs text-muted-foreground truncate">{orgName}</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          const showBadge = href === "/dashboard/inbox" && unreadCount > 0 && !active;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {showBadge && (
                <span className="text-[10px] font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full min-w-5 text-center">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* User */}
      <div className="p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="w-7 h-7 text-xs">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <p className="text-sm text-muted-foreground truncate flex-1 min-w-0">
            {userEmail}
          </p>
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-muted-foreground hover:text-foreground shrink-0"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-64 border-r border-sidebar-border bg-sidebar shrink-0 h-screen sticky top-0">
        <NavContent />
      </aside>

      {/* Mobile toggle */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 bg-background"
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-64 z-50 bg-sidebar border-r border-sidebar-border flex flex-col">
            <NavContent />
          </aside>
        </>
      )}
    </>
  );
}
