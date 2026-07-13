"use client";

import { permissions } from "@fleetcontrol/authz";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Save, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { DataGrid } from "@/components/data/data-grid";
import { StatusBadge } from "@/components/data/status-badge";
import { LoadingState } from "@/components/feedback/loading-state";
import { AccessGuard } from "@/components/platform/access-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteVehicleSavedFilter,
  getFleetOptions,
  listVehicles,
  listVehicleSavedFilters,
  saveVehicleFilter,
  type VehicleRecord,
  type VehicleSavedFilter,
} from "@/lib/fleet";

export function VehicleList() {
  const queryClient = useQueryClient();
  const appliedDefaultFilter = useRef(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [branchId, setBranchId] = useState("all");
  const [departmentId, setDepartmentId] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [selectedFilterId, setSelectedFilterId] = useState("none");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const options = useQuery({ queryKey: ["fleet-options"], queryFn: getFleetOptions, retry: false });
  const savedFilters = useQuery({
    queryKey: ["vehicle-saved-filters"],
    queryFn: listVehicleSavedFilters,
    retry: false,
  });
  useEffect(() => {
    if (appliedDefaultFilter.current || !savedFilters.data) return;
    appliedDefaultFilter.current = true;
    const filter = savedFilters.data.find((item) => item.isDefault);
    if (!filter) return;
    setSearch(filter.filters.search ?? "");
    setStatus(filter.filters.status ?? "all");
    setBranchId(filter.filters.branchId ?? "all");
    setDepartmentId(filter.filters.departmentId ?? "all");
    setCategoryId(filter.filters.categoryId ?? "all");
    setSelectedFilterId(filter.id);
  }, [savedFilters.data]);
  const params = useMemo(() => {
    const searchParams = new URLSearchParams();
    if (search) {
      searchParams.set("search", search);
    }
    if (status !== "all") {
      searchParams.set("status", status);
    }
    if (branchId !== "all") {
      searchParams.set("branchId", branchId);
    }
    if (departmentId !== "all") {
      searchParams.set("departmentId", departmentId);
    }
    if (categoryId !== "all") {
      searchParams.set("categoryId", categoryId);
    }
    searchParams.set("pageSize", "25");
    return searchParams;
  }, [branchId, categoryId, departmentId, search, status]);
  const vehicles = useQuery({
    queryKey: ["vehicles", params.toString()],
    queryFn: () => listVehicles(params),
    retry: false,
  });
  const saveFilterMutation = useMutation({
    mutationFn: () =>
      saveVehicleFilter({
        name: filterName.trim(),
        filters: currentFilters(),
        isDefault,
      }),
    onSuccess: (filter) => {
      toast.success("Filtro salvo");
      setSelectedFilterId(filter.id);
      setSaveDialogOpen(false);
      setFilterName("");
      setIsDefault(false);
      void queryClient.invalidateQueries({ queryKey: ["vehicle-saved-filters"] });
    },
    onError: () => toast.error("Nao foi possivel salvar o filtro"),
  });
  const deleteFilterMutation = useMutation({
    mutationFn: (id: string) => deleteVehicleSavedFilter(id),
    onSuccess: () => {
      toast.success("Filtro excluido");
      setSelectedFilterId("none");
      void queryClient.invalidateQueries({ queryKey: ["vehicle-saved-filters"] });
    },
    onError: () => toast.error("Nao foi possivel excluir o filtro"),
  });

  function currentFilters() {
    return Object.fromEntries(
      Object.entries({ search, status, branchId, departmentId, categoryId }).filter(
        ([, value]) => value && value !== "all",
      ),
    );
  }

  function applySavedFilter(filter: VehicleSavedFilter) {
    setSearch(filter.filters.search ?? "");
    setStatus(filter.filters.status ?? "all");
    setBranchId(filter.filters.branchId ?? "all");
    setDepartmentId(filter.filters.departmentId ?? "all");
    setCategoryId(filter.filters.categoryId ?? "all");
    setSelectedFilterId(filter.id);
  }

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setBranchId("all");
    setDepartmentId("all");
    setCategoryId("all");
    setSelectedFilterId("none");
  }

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
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger aria-label="Filtrar por filial">
                  <SelectValue placeholder="Filial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as filiais</SelectItem>
                  {options.data?.branches.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger aria-label="Filtrar por departamento">
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os departamentos</SelectItem>
                  {options.data?.departments.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger aria-label="Filtrar por categoria">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {options.data?.categories.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 lg:flex-row lg:items-center">
              <Select
                value={selectedFilterId}
                onValueChange={(id) => {
                  if (id === "none") {
                    clearFilters();
                    return;
                  }
                  const filter = savedFilters.data?.find((item) => item.id === id);
                  if (filter) applySavedFilter(filter);
                }}
              >
                <SelectTrigger className="lg:max-w-xs" aria-label="Visoes de filtro salvas">
                  <SelectValue placeholder="Filtros salvos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem filtro salvo</SelectItem>
                  {savedFilters.data?.map((filter) => (
                    <SelectItem key={filter.id} value={filter.id}>
                      {filter.name}
                      {filter.isDefault ? " (padrao)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2 lg:ml-auto">
                <Button type="button" variant="outline" onClick={clearFilters}>
                  Limpar
                </Button>
                {selectedFilterId !== "none" ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={deleteFilterMutation.isPending}
                    onClick={() => deleteFilterMutation.mutate(selectedFilterId)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir visao
                  </Button>
                ) : null}
                <Button type="button" variant="outline" onClick={() => setSaveDialogOpen(true)}>
                  <Save className="h-4 w-4" />
                  Salvar visao
                </Button>
              </div>
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
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Salvar visao da frota</DialogTitle>
              <DialogDescription>
                Guarde os filtros atuais para reutiliza-los sem configurar a pesquisa novamente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="filter-name" className="text-sm font-medium">
                  Nome da visao
                </label>
                <Input
                  id="filter-name"
                  value={filterName}
                  onChange={(event) => setFilterName(event.target.value)}
                  placeholder="Ex.: veiculos parados da matriz"
                  autoComplete="off"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(event) => setIsDefault(event.target.checked)}
                  className="size-4 rounded border-input accent-primary"
                />
                Aplicar como minha visao padrao
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={!filterName.trim() || saveFilterMutation.isPending}
                onClick={() => saveFilterMutation.mutate()}
              >
                {saveFilterMutation.isPending ? "Salvando..." : "Salvar visao"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AccessGuard>
  );
}
