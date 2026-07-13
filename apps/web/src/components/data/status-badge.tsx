import { Badge, type BadgeProps } from "@/components/ui/badge";

const statusVariant: Record<string, BadgeProps["variant"]> = {
  active: "success",
  pending: "warning",
  disabled: "muted",
  blocked: "destructive",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <Badge variant={statusVariant[status] ?? "default"}>{label}</Badge>;
}
