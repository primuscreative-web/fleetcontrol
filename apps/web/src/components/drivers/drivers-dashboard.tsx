"use client";

import { permissions } from "@fleetcontrol/authz";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  Car,
  UserRoundX,
  UsersRound,
} from "lucide-react";

import { LoadingState } from "@/components/feedback/loading-state";
import { Breadcrumb } from "@/components/navigation/breadcrumb";
import { AccessGuard } from "@/components/platform/access-guard";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDriversDashboard } from "@/lib/drivers";

export function DriversDashboard() {
  const query = useQuery({
    queryKey: ["drivers-dashboard"],
    queryFn: getDriversDashboard,
    retry: false,
  });
  const metrics = query.data
    ? ([
        ["Motoristas ativos", query.data.active, UsersRound],
        ["Sem veiculo", query.data.withoutVehicle, Car],
        ["CNHs vencidas", query.data.expiredCnh, AlertTriangle],
        ["CNHs vencendo", query.data.expiringCnh, CalendarClock],
        ["Exames vencendo", query.data.expiringMedical, BadgeCheck],
        ["Afastados", query.data.onLeave, UserRoundX],
      ] as const)
    : [];
  return (
    <AccessGuard permission={permissions.drivers.read}>
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Motoristas" }]} />
        <section>
          <h1 className="text-2xl font-semibold">Motoristas</h1>
          <p className="text-sm text-muted-foreground">
            Habilitacoes, vencimentos, documentos e alocacoes operacionais.
          </p>
        </section>
        {query.isLoading ? <LoadingState /> : null}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metrics.map(([title, value, Icon]) => (
            <Card key={title}>
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardDescription>{title}</CardDescription>
                  <CardTitle className="mt-1 text-2xl">{value}</CardTitle>
                </div>
                <span className="rounded-md bg-primary/10 p-2 text-primary">
                  <Icon className="size-4" />
                </span>
              </CardHeader>
            </Card>
          ))}
        </section>
      </div>
    </AccessGuard>
  );
}
