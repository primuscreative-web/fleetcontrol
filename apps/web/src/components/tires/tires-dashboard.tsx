"use client";
import { permissions } from "@fleetcontrol/authz";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Banknote, CircleDot, Gauge, Package, Plus, RefreshCw } from "lucide-react";
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
import { getTires, getTiresDashboard } from "@/lib/tires";
export function TiresDashboardView() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const dashboard = useQuery({ queryKey: ["tires-dashboard"], queryFn: getTiresDashboard });
  const tires = useQuery({
    queryKey: ["tires", status, search],
    queryFn: () => getTires({ status, search }),
  });
  const d = dashboard.data;
  const metrics = d
    ? ([
        ["Em estoque", d.inStock, Package],
        ["Instalados", d.installed, CircleDot],
        ["Requerem atencao", d.attention, AlertTriangle],
        ["Em recapagem", d.inRetread, RefreshCw],
        ["Custo por km", money(d.costPerKm), Gauge],
        ["Custo do ciclo", money(d.lifecycleCost), Banknote],
      ] as const)
    : [];
  return (
    <AccessGuard permission={permissions.tires.read}>
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Pneus" }]} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Pneus</h1>
            <p className="text-sm text-muted-foreground">
              Ativos, posicoes, desgaste, recapagens e custo por quilometro.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/pneus/novo">
              <Plus className="size-4" />
              Cadastrar pneu
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
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Inventario de pneus</CardTitle>
              <CardDescription>{tires.data?.pagination.total ?? 0} ativos</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                className="w-56"
                placeholder="Serie, fogo, marca ou placa"
                aria-label="Pesquisar pneus"
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
                <option value="IN_STOCK">Em estoque</option>
                <option value="INSTALLED">Instalados</option>
                <option value="IN_RETREAD">Em recapagem</option>
                <option value="SCRAPPED">Descartados</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {tires.isLoading ? (
              <LoadingState />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Identificacao</TableHead>
                    <TableHead>Especificacao</TableHead>
                    <TableHead>Veiculo / posicao</TableHead>
                    <TableHead>Condicao</TableHead>
                    <TableHead>Sulco</TableHead>
                    <TableHead>Custo/km</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tires.data?.data.map((tire) => (
                    <TableRow key={tire.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/pneus/${tire.id}`}
                          className="font-medium hover:underline"
                        >
                          {tire.serialNumber}
                        </Link>
                        <span className="block text-xs text-muted-foreground">{tire.status}</span>
                      </TableCell>
                      <TableCell>
                        {tire.brand} {tire.model}
                        <span className="block text-xs text-muted-foreground">{tire.size}</span>
                      </TableCell>
                      <TableCell>
                        {tire.currentVehicle?.plate ?? "Estoque"}
                        <span className="block text-xs text-muted-foreground">
                          {tire.currentPosition ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell
                        className={
                          ["CRITICAL", "CONDEMNED"].includes(tire.condition)
                            ? "text-destructive"
                            : ""
                        }
                      >
                        {tire.condition}
                      </TableCell>
                      <TableCell>{tire.currentTreadDepthMm?.toFixed(1) ?? "—"} mm</TableCell>
                      <TableCell>{money(tire.costPerKm)}</TableCell>
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
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
