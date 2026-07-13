"use client";

import { Command, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useEffect, useState } from "react";

import { NotificationCenter } from "@/components/feedback/notification-center";
import { CommandPalette } from "@/components/navigation/command-palette";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/providers/session-provider";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { profile, logout } = useSession();
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/85 px-4 backdrop-blur lg:px-6">
        <button
          type="button"
          className="relative hidden w-full max-w-md text-left md:block"
          onClick={() => setCommandOpen(true)}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pointer-events-none pl-9 pr-24" placeholder="Buscar no sistema" />
          <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded border px-2 py-1 text-xs text-muted-foreground">
            <Command className="h-3 w-3" /> K
          </span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <NotificationCenter />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Alternar tema"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          </Button>
          <Button asChild variant="ghost">
            <Link href="/dashboard/perfil">{profile?.name ?? "Perfil"}</Link>
          </Button>
          <Button variant="outline" onClick={() => void logout()}>
            Sair
          </Button>
          <Avatar>
            <AvatarFallback>{profile?.name?.slice(0, 2).toUpperCase() ?? "FC"}</AvatarFallback>
          </Avatar>
        </div>
      </header>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
