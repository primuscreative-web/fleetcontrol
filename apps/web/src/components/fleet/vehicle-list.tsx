"use client";

import { permissions } from "@fleetcontrol/authz";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { DataGrid } from "@/components/data/data-grid";
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
import { getFleetOptions, listVehicles, type VehicleRecord } from "@/lib/fleet";

export function VehicleList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const options = useQuery({ queryKey: ["fleet-options"], queryFn: getFleetOptions, retry: false });
  const params = useMemo(() => {
    const searchParams = new URLSearchParams();
    if (search) {
      searchParams.set("search", search);
    }
    if (status !== "all") {
      searchParams.set("status", status);
    }
    searchParams.set("pageSize", "25");
    return searchParams;
  }, [search, status]);
  const vehicles = useQuery({
    queryKey: ["vehicles", params.toString()],
    queryFn: () => listVehicles(params),
    retry: false,
  });

  const columns = useMemo<Array<ColumnDef<VehicleRecord>>>(
    () => [
      {
        accessorKey: "plate",
        header: "Placa",
        cell: ({ row }) => (
          <Link className="font-medium text-primary" href={`/dashboard/frota/${row.original.id}`}>
            {row.original.plate}
          </Link>
        ),
      },
      {
        header: "Veiculo",
        cell: ({ row }) =>
          [row.original.make?.name, row.original.model?.name, row.original.version?.name]
            .filter(Boolean)
            .join(" ") || "Nao informado",
      },
      {
        header: "Filial",
        cell: ({ row }) => row.original.branch?.name ?? "Nao vinculada",
      },
      {
        header: "Departamento",
        cell: ({ row }) => row.original.department?.name ?? "Nao vinculado",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge status={row.original.status.toLowerCase()} label={row.original.status} />
        ),
      },
      {
        header: "Ano",
        cell: ({ row }) => row.original.modelYear ?? "-",
      },
    ],
    [],
  );

  return (
    <AccessGuard permission={permissions.fleet.read}>
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Listagem de veiculos</CardTitle>
              <CardDescription>
                Pesquisa por placa, RENAVAM, chassi, modelo, categoria, marca, empresa ou filial.
              </CardDescription>
            </div>
            <Button asChild>
              <Link href="/dashboard/frota/novo">
                <Plus className="h-4 w-4" />
                Novo veiculo
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
              <label className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar frota"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <Select value={status} onValueChange={setStatus}>
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
              <Button type="button" variant="outline">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
              </Button>
            </div>

            {vehicles.isLoading ? <LoadingState /> : null}
            {vehicles.data ? <DataGrid columns={columns} data={vehicles.data.data} /> : null}
            {vehicles.data?.data.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum veiculo encontrado para os filtros atuais.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AccessGuard>
  );
}
