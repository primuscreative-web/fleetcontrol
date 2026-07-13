"use client";
import { permissions } from "@fleetcontrol/authz";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  ClipboardList,
  Plus,
  Settings2,
  Wrench,
} from "lucide-react";
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
import { getMaintenanceDashboard, getMaintenanceOrders } from "@/lib/maintenance";
export function MaintenanceDashboardView() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const dashboard = useQuery({
    queryKey: ["maintenance-dashboard"],
    queryFn: getMaintenanceDashboard,
  });
  const orders = useQuery({
    queryKey: ["maintenance-orders", status, search],
    queryFn: () => getMaintenanceOrders({ status, search }),
  });
  const d = dashboard.data;
  const metrics = d
    ? ([
        ["Aguardando aprovacao", d.awaitingApproval, ClipboardList],
        ["Em atendimento", d.active, Wrench],
        ["Criticas", d.critical, AlertTriangle],
        ["Planos proximos", d.plansDueSoon, CalendarClock],
        ["Custo no mes", money(d.monthlyCost), Banknote],
        ["Ticket medio", money(d.averageOrderCost), Banknote],
      ] as const)
    : [];
  return (
    <AccessGuard permission={permissions.maintenance.read}>
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Manutencao" }]} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Manutencao</h1>
            <p className="text-sm text-muted-foreground">
              Planos preventivos, ordens, indisponibilidade e custos.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/manutencao/planos">
                <Settings2 className="size-4" />
                Planos
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/manutencao/nova">
                <Plus className="size-4" />
                Nova ordem
              </Link>
            </Button>
          </div>
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
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Ordens de servico</CardTitle>
              <CardDescription>{orders.data?.pagination.total ?? 0} registros</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                className="w-56"
                aria-label="Pesquisar ordens"
                placeholder="OS, placa ou titulo"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                aria-label="Filtrar status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="AWAITING_APPROVAL">Aguardando aprovacao</option>
                <option value="APPROVED">Aprovadas</option>
                <option value="IN_PROGRESS">Em andamento</option>
                <option value="COMPLETED">Concluidas</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {orders.isLoading ? (
              <LoadingState />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Veiculo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Custo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.data?.data.map((order) => (
                    <TableRow key={order.id} className="cursor-pointer">
                      <TableCell>
                        <Link
                          className="font-medium hover:underline"
                          href={`/dashboard/manutencao/${order.id}`}
                        >
                          {order.code}
                          <span className="block text-xs font-normal text-muted-foreground">
                            {order.title}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>{order.vehicle.plate}</TableCell>
                      <TableCell>{order.type}</TableCell>
                      <TableCell
                        className={order.priority === "CRITICAL" ? "text-destructive" : ""}
                      >
                        {order.priority}
                      </TableCell>
                      <TableCell>{order.status}</TableCell>
                      <TableCell>{money(order.actualCost || order.estimatedCost || 0)}</TableCell>
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
