"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { canAccess } from "@/lib/auth";
import { navigationItems } from "@/lib/navigation";
import { useSession } from "@/providers/session-provider";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { profile } = useSession();
  const items = navigationItems.filter((item) => canAccess(profile, item.permission));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0">
        <Command>
          <CommandInput placeholder="Digite um comando ou busca" />
          <CommandList>
            {items.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => {
                  router.push(item.href);
                  onOpenChange(false);
                }}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </CommandItem>
            ))}
            <CommandItem>
              <Search className="h-4 w-4" />
              Buscar em FleetControl
            </CommandItem>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
