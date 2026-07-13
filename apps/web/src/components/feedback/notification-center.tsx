"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/api-client";

interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  priority: string;
  readAt?: string | null;
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["notifications", "center"],
    queryFn: () => apiRequest<NotificationRecord[]>("/notifications?unreadOnly=false"),
    enabled: open,
    retry: false,
  });

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Central de notificações"
        onClick={() => setOpen(true)}
      >
        <Bell className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notificações</DialogTitle>
            <DialogDescription>
              Central de notificações internas e canais transacionais.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {query.isLoading ? (
              <>
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </>
            ) : null}
            {query.data?.map((notification) => (
              <div key={notification.id} className="rounded-md border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{notification.title}</p>
                  <span className="text-xs text-muted-foreground">{notification.priority}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
              </div>
            ))}
            {query.data?.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma notificação encontrada.
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
