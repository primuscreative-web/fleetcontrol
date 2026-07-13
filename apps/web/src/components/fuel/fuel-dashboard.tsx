"use client";
import { permissions } from "@fleetcontrol/authz";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Banknote, Droplets, Fuel, Gauge, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LoadingState } from "@/components/feedback/loading-state";
import { Breadcrumb } from "@/components/navigation/breadcrumb";
import { AccessGuard } from "@/components/platform/access-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFuelDashboard, getFuelings, reviewFueling } from "@/lib/fuel";

export function FuelDashboard() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const client = useQueryClient();
  const dashboard = useQuery({ queryKey: ["fuel-dashboard"], queryFn: getFuelDashboard });
  const list = useQuery({
    queryKey: ["fuelings", status, search],
    queryFn: () => getFuelings(status, search),
  });
  const review = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      reviewFueling(
        id,
        action,
        action === "reject" ? "Rejeitado na conferencia operacional" : undefined,
      ),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["fuelings"] });
      await client.invalidateQueries({ queryKey: ["fuel-dashboard"] });
    },
  });
  const data = dashboard.data;
  const metrics = data
    ? ([
        ["Aprovados no mes", data.approved, Fuel],
        ["Pendentes", data.pending, Gauge],
        ["Divergencias", data.anomalies, AlertTriangle],
        ["Volume", `${data.liters.toLocaleString("pt-BR")} L`, Droplets],
        ["Custo", money(data.totalAmount), Banknote],
        ["Consumo medio", `${data.averageConsumption.toFixed(2)} km/L`, Gauge],
      ] as const)
    : [];
  return (
    <AccessGuard permission={permissions.fuel.read}>
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Abastecimentos" }]} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Abastecimentos</h1>
            <p className="text-sm text-muted-foreground">
              Consumo, custos, divergencias e aprovacao operacional.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/abastecimentos/novo">
              <Plus className="size-4" />
              Registrar
            </Link>
          </Button>
        </div>
        {dashboard.isLoading ? (
          <LoadingState />
        ) : (
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
        )}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Historico</CardTitle>
              <CardDescription>
                {list.data?.pagination.total ?? 0} registros no filtro
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                aria-label="Pesquisar abastecimentos"
                className="w-56"
                placeholder="Placa, posto ou nota"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                aria-label="Filtrar status"
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">Todos</option>
                <option value="PENDING">Pendentes</option>
                <option value="APPROVED">Aprovados</option>
                <option value="REJECTED">Rejeitados</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {list.isLoading ? (
              <LoadingState />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Veiculo</TableHead>
                    <TableHead>Posto</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.data?.data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.fueledAt).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-medium">{item.vehicle.plate}</TableCell>
                      <TableCell>{item.station.name}</TableCell>
                      <TableCell>{item.liters.toFixed(3)} L</TableCell>
                      <TableCell>{money(item.totalAmount)}</TableCell>
                      <TableCell>
                        <span className={item.anomaly ? "text-destructive" : ""}>
                          {item.status}
                          {item.anomaly ? " · divergencia" : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.status === "PENDING" ? (
                          <span className="inline-flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={review.isPending}
                              onClick={() => review.mutate({ id: item.id, action: "reject" })}
                            >
                              Rejeitar
                            </Button>
                            <Button
                              size="sm"
                              disabled={review.isPending}
                              onClick={() => review.mutate({ id: item.id, action: "approve" })}
                            >
                              Aprovar
                            </Button>
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AccessGuard>
  );
}
const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
