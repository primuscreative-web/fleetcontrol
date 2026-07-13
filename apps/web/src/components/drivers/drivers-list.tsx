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
import { getDriversOptions, listDrivers, type DriverRecord } from "@/lib/drivers";
import { useSession } from "@/providers/session-provider";

export function DriversList() {
  const { profile } = useSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const options = useQuery({
    queryKey: ["drivers-options"],
    queryFn: getDriversOptions,
    retry: false,
  });
  const params = useMemo(() => {
    const value = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (search) value.set("search", search);
    if (status !== "all") value.set("status", status);
    return value;
  }, [page, search, status]);
  const drivers = useQuery({
    queryKey: ["drivers", params.toString()],
    queryFn: () => listDrivers(params),
    retry: false,
  });
  const columns = useMemo<Array<ColumnDef<DriverRecord>>>(
    () => [
      {
        accessorKey: "name",
        header: "Motorista",
        cell: ({ row }) => (
          <Link
            className="font-medium text-primary"
            href={`/dashboard/motoristas/${row.original.id}`}
          >
            {row.original.name}
          </Link>
        ),
      },
      { accessorKey: "cnhNumber", header: "CNH" },
      { accessorKey: "cnhCategory", header: "Categoria" },
      {
        header: "Validade",
        cell: ({ row }) => new Date(row.original.cnhExpiresAt).toLocaleDateString("pt-BR"),
      },
      {
        header: "Veiculo atual",
        cell: ({ row }) =>
          row.original.assignments?.find((item) => !item.endsAt)?.vehicle.plate ?? "Nao alocado",
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
    <AccessGuard permission={permissions.drivers.read}>
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>Cadastro de motoristas</CardTitle>
            <CardDescription>Pesquisa por nome, CPF, CNH ou e-mail.</CardDescription>
          </div>
          {canAccess(profile, permissions.drivers.manage) ? (
            <Button asChild>
              <Link href="/dashboard/motoristas/novo">
                <Plus className="size-4" />
                Novo motorista
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
                placeholder="Buscar motorista"
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
                <SelectValue placeholder="Status" />
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
          {drivers.isLoading ? <LoadingState /> : null}
          {drivers.data ? <DataGrid columns={columns} data={drivers.data.data} /> : null}
          {drivers.data && drivers.data.pagination.pageCount > 1 ? (
            <Pagination
              page={drivers.data.pagination.page}
              totalPages={drivers.data.pagination.pageCount}
              onPageChange={setPage}
            />
          ) : null}
        </CardContent>
      </Card>
    </AccessGuard>
  );
}
