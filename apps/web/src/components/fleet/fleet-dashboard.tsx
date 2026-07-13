"use client";

import { permissions } from "@fleetcontrol/authz";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Car, CircleDollarSign, FileClock, Wrench } from "lucide-react";

import { LoadingState } from "@/components/feedback/loading-state";
import { Breadcrumb } from "@/components/navigation/breadcrumb";
import { AccessGuard } from "@/components/platform/access-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFleetDashboard } from "@/lib/fleet";

const metricIcons = {
  active: Car,
  available: Car,
  stopped: AlertTriangle,
  maintenance: Wrench,
  documents: FileClock,
  value: CircleDollarSign,
};

export function FleetDashboard() {
  const dashboard = useQuery({
    queryKey: ["fleet-dashboard"],
    queryFn: getFleetDashboard,
    retry: false,
  });

  return (
    <AccessGuard permission={permissions.fleet.read}>
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Frota" }]} />
        <section className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-normal">Frota</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Base oficial dos veiculos, documentos, custos, timeline e relacionamentos da operacao.
          </p>
        </section>

        {dashboard.isLoading ? <LoadingState /> : null}
        {dashboard.data ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Veiculos ativos"
              value={dashboard.data.active}
              icon={metricIcons.active}
            />
            <MetricCard
              title="Disponiveis"
              value={dashboard.data.available}
              icon={metricIcons.available}
            />
            <MetricCard title="Parados" value={dashboard.data.stopped} icon={metricIcons.stopped} />
            <MetricCard
              title="Em manutencao"
              value={dashboard.data.maintenance}
              icon={metricIcons.maintenance}
            />
            <MetricCard
              title="Sem motorista"
              value={dashboard.data.withoutDriver}
              icon={metricIcons.stopped}
            />
            <MetricCard
              title="Sem contrato"
              value={dashboard.data.withoutContract}
              icon={metricIcons.documents}
            />
            <MetricCard
              title="Docs vencendo"
              value={dashboard.data.expiringDocuments}
              icon={metricIcons.documents}
            />
            <MetricCard
              title="Valor estimado"
              value={dashboard.data.estimatedFleetValue.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
              icon={metricIcons.value}
            />
          </section>
        ) : null}
      </div>
    </AccessGuard>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: typeof Car;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="mt-1 text-2xl">{value}</CardTitle>
        </div>
        <span className="rounded-md bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="h-1.5 rounded-full bg-muted">
          <div className="h-1.5 w-2/3 rounded-full bg-primary" />
        </div>
      </CardContent>
    </Card>
  );
}
