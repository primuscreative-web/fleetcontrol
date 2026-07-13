import type { ReactNode } from "react";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Header />
          <main className="container py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
