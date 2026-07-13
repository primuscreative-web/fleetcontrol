import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";

export function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link href="/dashboard" aria-label="Início" className="hover:text-foreground">
        <Home className="h-4 w-4" />
      </Link>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4" />
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
