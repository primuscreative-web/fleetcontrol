"use client";
import { permissions } from "@fleetcontrol/authz";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Banknote, CalendarClock, FileCheck2, Gauge, Truck } from "lucide-react";
import { LoadingState } from "@/components/feedback/loading-state";
import { Breadcrumb } from "@/components/navigation/breadcrumb";
import { AccessGuard } from "@/components/platform/access-guard";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getContractsDashboard } from "@/lib/contracts";
export function ContractsDashboard() {
  const query = useQuery({
    queryKey: ["contracts-dashboard"],
    queryFn: getContractsDashboard,
    retry: false,
  });
  const data = query.data;
  const metrics = data
    ? ([
        ["Contratos ativos", data.active, FileCheck2],
        ["Em licitacao", data.bidding, Gauge],
        ["Vencendo em 90 dias", data.expiring, CalendarClock],
        ["Vencidos", data.expired, AlertTriangle],
        ["Veiculos alocados", data.allocatedVehicles, Truck],
        ["Saldo contratual", currency(data.availableValue), Banknote],
      ] as const)
    : [];
  return (
    <AccessGuard permission={permissions.contracts.read}>
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Contratos" }]} />
        <section>
          <h1 className="text-2xl font-semibold">Contratos e licitacoes</h1>
          <p className="text-sm text-muted-foreground">
            Vigencia, aditivos, saldo, documentos e frota contratual.
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
const currency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
