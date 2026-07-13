"use client";

import Link from "next/link";

import { canAccess } from "@/lib/auth";
import { navigationItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "@/providers/session-provider";

export function Sidebar({ className }: { className?: string }) {
  const { profile } = useSession();
  const visibleNavigation = navigationItems.filter((item) => canAccess(profile, item.permission));

  return (
    <aside
      className={cn(
        "hidden min-h-screen w-[17rem] border-r bg-card/80 px-4 py-5 backdrop-blur lg:block",
        className,
      )}
    >
      <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          FC
        </span>
        <span className="text-base font-semibold">FleetControl</span>
      </Link>

      <nav className="space-y-1">
        {visibleNavigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
