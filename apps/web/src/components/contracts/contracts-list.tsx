"use client";
import { permissions } from "@fleetcontrol/authz";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DataGrid } from "@/components/data/data-grid";
import { Pagination } from "@/components/data/pagination";
import { StatusBadge } from "@/components/data/status-badge";
import { LoadingState } from "@/components/feedback/loading-state";
import { AccessGuard } from "@/components/platform/access-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { canAccess } from "@/lib/auth";
import { getContractsOptions, listContracts, type ContractRecord } from "@/lib/contracts";
import { useSession } from "@/providers/session-provider";
export function ContractsList() {
  const { profile } = useSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const options = useQuery({
    queryKey: ["contracts-options"],
    queryFn: getContractsOptions,
    retry: false,
  });
  const params = useMemo(() => {
    const value = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (search) value.set("search", search);
    if (status !== "all") value.set("status", status);
    return value;
  }, [page, search, status]);
  const query = useQuery({
    queryKey: ["contracts", params.toString()],
    queryFn: () => listContracts(params),
    retry: false,
  });
  const columns = useMemo<Array<ColumnDef<ContractRecord>>>(
    () => [
      {
        accessorKey: "number",
        header: "Contrato",
        cell: ({ row }) => (
          <Link
            className="font-medium text-primary"
            href={`/dashboard/contratos/${row.original.id}`}
          >
            {row.original.number}
          </Link>
        ),
      },
      { accessorKey: "title", header: "Objeto" },
      { accessorKey: "clientName", header: "Contratante" },
      {
        header: "Vigencia",
        cell: ({ row }) => `${date(row.original.startsAt)} - ${date(row.original.endsAt)}`,
      },
      {
        header: "Saldo",
        cell: ({ row }) => currency(row.original.totalValue - row.original.consumedValue),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge status={row.original.status.toLowerCase()} label={row.original.status} />
        ),
      },
    ],
    [],
  );
  return (
    <AccessGuard permission={permissions.contracts.read}>
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>Carteira contratual</CardTitle>
            <CardDescription>
              Pesquisa por numero, licitacao, objeto, orgao ou contratante.
            </CardDescription>
          </div>
          {canAccess(profile, permissions.contracts.manage) ? (
            <Button asChild>
              <Link href="/dashboard/contratos/novo">
                <Plus className="size-4" />
                Novo contrato
              </Link>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_240px]">
            <label className="relative">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Buscar contratos"
              />
            </label>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {options.data?.statuses.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {query.isLoading ? <LoadingState /> : null}
          {query.data ? <DataGrid columns={columns} data={query.data.data} /> : null}
          {query.data && query.data.pagination.pageCount > 1 ? (
            <Pagination
              page={query.data.pagination.page}
              totalPages={query.data.pagination.pageCount}
              onPageChange={setPage}
            />
          ) : null}
        </CardContent>
      </Card>
    </AccessGuard>
  );
}
const date = (value: string) => new Date(value).toLocaleDateString("pt-BR");
const currency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
