"use client";
import { permissions } from "@fleetcontrol/authz";
import { useQuery } from "@tanstack/react-query";
import { Ban, Banknote, Building2, ClipboardCheck, FileText, Plus, Star } from "lucide-react";
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
import { getWorkshops, getWorkshopsDashboard } from "@/lib/workshops";
export function WorkshopsDashboardView() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const dashboard = useQuery({ queryKey: ["workshops-dashboard"], queryFn: getWorkshopsDashboard });
  const list = useQuery({
    queryKey: ["workshops", status, search],
    queryFn: () => getWorkshops({ status, search }),
  });
  const d = dashboard.data;
  const metrics = d
    ? ([
        ["Homologadas", d.approved, Building2],
        ["Pendentes", d.pendingApproval, ClipboardCheck],
        ["Suspensas", d.suspended, Ban],
        ["Ordens ativas", d.activeOrders, FileText],
        ["Avaliacao media", d.averageRating.toFixed(2), Star],
        ["Faturamento", money(d.totalBilled), Banknote],
      ] as const)
    : [];
  return (
    <AccessGuard permission={permissions.workshops.read}>
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Oficinas" }]} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Oficinas</h1>
            <p className="text-sm text-muted-foreground">
              Rede homologada, especialidades, propostas e desempenho.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/oficinas/cotacoes">Cotar servico</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/oficinas/nova">
                <Plus className="size-4" />
                Cadastrar
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
              <CardTitle>Rede de atendimento</CardTitle>
              <CardDescription>{list.data?.pagination.total ?? 0} oficinas</CardDescription>
            </div>
            <div className="flex gap-2">
              <Input
                className="w-56"
                aria-label="Pesquisar oficinas"
                placeholder="Nome, CNPJ, cidade"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="APPROVED">Homologadas</option>
                <option value="PENDING_APPROVAL">Pendentes</option>
                <option value="SUSPENDED">Suspensas</option>
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
                    <TableHead>Oficina</TableHead>
                    <TableHead>Localidade</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Avaliacao</TableHead>
                    <TableHead>Faturamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.data?.data.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/oficinas/${w.id}`}
                          className="font-medium hover:underline"
                        >
                          {w.tradeName}
                        </Link>
                        <span className="block text-xs text-muted-foreground">{w.document}</span>
                      </TableCell>
                      <TableCell>{[w.city, w.state].filter(Boolean).join("/") || "—"}</TableCell>
                      <TableCell>{w.type}</TableCell>
                      <TableCell>{w.status}</TableCell>
                      <TableCell>
                        {w.rating.toFixed(2)} ({w.evaluationCount})
                      </TableCell>
                      <TableCell>{money(w.totalBilled)}</TableCell>
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
const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
