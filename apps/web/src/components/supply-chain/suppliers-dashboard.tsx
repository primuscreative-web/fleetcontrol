"use client";
import { permissions } from "@fleetcontrol/authz";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Plus, Search, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
import { getSuppliers, supplierAction } from "@/lib/supply-chain";
export function SuppliersDashboard() {
  const [search, setSearch] = useState("");
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["suppliers", search], queryFn: () => getSuppliers(search) });
  const action = useMutation({
    mutationFn: ({ id, a }: { id: string; a: string }) =>
      supplierAction(id, a, a === "reject" ? "Documentacao reprovada" : undefined),
    onSuccess: () => client.invalidateQueries({ queryKey: ["suppliers"] }),
  });
  const approved = query.data?.data.filter((s) => s.status === "APPROVED").length ?? 0,
    pending = query.data?.data.filter((s) => s.status === "PENDING_APPROVAL").length ?? 0;
  return (
    <AccessGuard permission={permissions.suppliers.read}>
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Fornecedores" }]} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Fornecedores</h1>
            <p className="text-sm text-muted-foreground">
              Homologacao, prazos, compras e desempenho.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/fornecedores/novo">
              <Plus className="size-4" />
              Cadastrar
            </Link>
          </Button>
        </div>
        <section className="grid gap-4 md:grid-cols-3">
          <Metric label="Homologados" value={approved} icon={CheckCircle2} />
          <Metric label="Pendentes" value={pending} icon={Clock} />
          <Metric label="Cadastrados" value={query.data?.pagination.total ?? 0} icon={Star} />
        </section>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Base de fornecedores</CardTitle>
              <CardDescription>Dados fiscais e indicadores comerciais.</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                className="w-64 pl-9"
                placeholder="Nome ou documento"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Comprado</TableHead>
                  <TableHead>Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data?.data.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.tradeName}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {s.document}
                      </span>
                    </TableCell>
                    <TableCell>{s.category}</TableCell>
                    <TableCell>{s.status}</TableCell>
                    <TableCell>{s.leadTimeDays ?? 0} dias</TableCell>
                    <TableCell>{money(s.totalPurchased)}</TableCell>
                    <TableCell>
                      {s.status === "PENDING_APPROVAL" ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => action.mutate({ id: s.id, a: "reject" })}
                          >
                            Rejeitar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => action.mutate({ id: s.id, a: "approve" })}
                          >
                            Homologar
                          </Button>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AccessGuard>
  );
}
function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Star }) {
  return (
    <Card>
      <CardHeader className="flex-row justify-between">
        <div>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-2xl">{value}</CardTitle>
        </div>
        <Icon className="size-5 text-primary" />
      </CardHeader>
    </Card>
  );
}
const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
