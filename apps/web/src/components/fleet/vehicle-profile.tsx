"use client";

import { permissions } from "@fleetcontrol/authz";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArrowRightLeft,
  FileText,
  ImagePlus,
  Pencil,
  Route,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Timeline } from "@/components/data/timeline";
import { StatusBadge } from "@/components/data/status-badge";
import { LoadingState } from "@/components/feedback/loading-state";
import { Breadcrumb } from "@/components/navigation/breadcrumb";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { canAccess } from "@/lib/auth";
import {
  addVehicleDocument,
  addVehiclePhoto,
  archiveVehicle,
  changeVehicleStatus,
  getFleetOptions,
  getVehicle,
  getVehicleAudit,
  getVehicleCosts,
  getVehicleEvents,
  getVehicleRelationships,
  transferVehicle,
  type VehicleRecord,
} from "@/lib/fleet";
import { useSession } from "@/providers/session-provider";
import { useState } from "react";

export function VehicleProfile({ vehicleId }: { vehicleId: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { profile } = useSession();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferBranchId, setTransferBranchId] = useState("");
  const [transferDepartmentId, setTransferDepartmentId] = useState("");
  const [transferCostCenterId, setTransferCostCenterId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const vehicle = useQuery({
    queryKey: ["vehicle", vehicleId],
    queryFn: () => getVehicle(vehicleId),
    retry: false,
  });
  const options = useQuery({ queryKey: ["fleet-options"], queryFn: getFleetOptions, retry: false });
  const statusMutation = useMutation({
    mutationFn: (status: string) => changeVehicleStatus(vehicleId, status),
    onSuccess: () => {
      toast.success("Status atualizado");
      void queryClient.invalidateQueries({ queryKey: ["vehicle", vehicleId] });
    },
  });
  const archiveMutation = useMutation({
    mutationFn: () => archiveVehicle(vehicleId, archiveReason.trim() || undefined),
    onSuccess: () => {
      toast.success("Veiculo arquivado");
      setArchiveOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      router.push("/dashboard/frota");
    },
    onError: () => toast.error("Nao foi possivel arquivar o veiculo"),
  });
  const transferMutation = useMutation({
    mutationFn: () =>
      transferVehicle(vehicleId, {
        branchId: transferBranchId || undefined,
        departmentId: transferDepartmentId || undefined,
        costCenterId: transferCostCenterId || undefined,
        reason: transferReason.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Veiculo transferido");
      setTransferOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["vehicle", vehicleId] });
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: () => toast.error("Nao foi possivel transferir o veiculo"),
  });

  function openTransfer() {
    setTransferBranchId(vehicle.data?.branchId ?? vehicle.data?.branch?.id ?? "");
    setTransferDepartmentId(vehicle.data?.departmentId ?? vehicle.data?.department?.id ?? "");
    setTransferCostCenterId(vehicle.data?.costCenterId ?? vehicle.data?.costCenter?.id ?? "");
    setTransferReason("");
    setTransferOpen(true);
  }

  return (
    <AccessGuard permission={permissions.fleet.read}>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Frota", href: "/dashboard/frota" },
            { label: vehicle.data?.plate ?? "Veiculo" },
          ]}
        />
        {vehicle.isLoading ? <LoadingState /> : null}
        {vehicle.data ? (
          <>
            <section className="grid gap-4 xl:grid-cols-[280px_1fr]">
              <Card>
                <CardHeader>
                  <CardDescription>Perfil do veiculo</CardDescription>
                  <CardTitle className="text-2xl">{vehicle.data.plate}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StatusBadge
                    status={vehicle.data.status.toLowerCase()}
                    label={vehicle.data.status}
                  />
                  <div className="space-y-2 text-sm">
                    <Info label="Marca" value={vehicle.data.make?.name} />
                    <Info label="Modelo" value={vehicle.data.model?.name} />
                    <Info label="Filial" value={vehicle.data.branch?.name} />
                    <Info label="Departamento" value={vehicle.data.department?.name} />
                    <Info label="Centro de custo" value={vehicle.data.costCenter?.name} />
                  </div>
                  <Select
                    value={vehicle.data.status}
                    onValueChange={(status) => statusMutation.mutate(status)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Alterar status" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.data?.statuses.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {canAccess(profile, permissions.fleet.manage) && !vehicle.data.archivedAt ? (
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/dashboard/frota/${vehicleId}/editar`}>
                        <Pencil className="mr-2 size-4" />
                        Editar cadastro
                      </Link>
                    </Button>
                  ) : null}
                  {canAccess(profile, permissions.fleet.transfer) && !vehicle.data.archivedAt ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={openTransfer}
                    >
                      <ArrowRightLeft className="mr-2 size-4" />
                      Transferir veiculo
                    </Button>
                  ) : null}
                  {canAccess(profile, permissions.fleet.archive) && !vehicle.data.archivedAt ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={archiveMutation.isPending}
                      onClick={() => setArchiveOpen(true)}
                    >
                      <Archive className="mr-2 size-4" />
                      {archiveMutation.isPending ? "Arquivando..." : "Arquivar veiculo"}
                    </Button>
                  ) : null}
                  <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Arquivar {vehicle.data.plate}?</DialogTitle>
                        <DialogDescription>
                          O veiculo sera removido da frota ativa. A operacao ficara registrada na
                          auditoria e no historico operacional.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2">
                        <label htmlFor="archive-reason" className="text-sm font-medium">
                          Motivo do arquivamento
                        </label>
                        <Input
                          id="archive-reason"
                          value={archiveReason}
                          onChange={(event) => setArchiveReason(event.target.value)}
                          placeholder="Ex.: fim de contrato ou baixa patrimonial"
                          autoComplete="off"
                        />
                      </div>
                      <div className="mt-6 flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setArchiveOpen(false)}
                          disabled={archiveMutation.isPending}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          onClick={() => archiveMutation.mutate()}
                          disabled={archiveMutation.isPending}
                        >
                          {archiveMutation.isPending ? "Arquivando..." : "Confirmar arquivamento"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Transferir {vehicle.data.plate}</DialogTitle>
                        <DialogDescription>
                          Atualize os vinculos organizacionais. A transferencia sera registrada na
                          timeline, auditoria e eventos do veiculo.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2 text-sm font-medium">
                          Filial
                          <Select value={transferBranchId} onValueChange={setTransferBranchId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar filial" />
                            </SelectTrigger>
                            <SelectContent>
                              {options.data?.branches.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </label>
                        <label className="space-y-2 text-sm font-medium">
                          Departamento
                          <Select
                            value={transferDepartmentId}
                            onValueChange={setTransferDepartmentId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar departamento" />
                            </SelectTrigger>
                            <SelectContent>
                              {options.data?.departments.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </label>
                        <label className="space-y-2 text-sm font-medium">
                          Centro de custo
                          <Select
                            value={transferCostCenterId}
                            onValueChange={setTransferCostCenterId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar centro de custo" />
                            </SelectTrigger>
                            <SelectContent>
                              {options.data?.costCenters.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </label>
                        <label className="space-y-2 text-sm font-medium">
                          Motivo
                          <Input
                            value={transferReason}
                            onChange={(event) => setTransferReason(event.target.value)}
                            placeholder="Motivo da transferencia"
                          />
                        </label>
                      </div>
                      <div className="mt-6 flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={transferMutation.isPending}
                          onClick={() => setTransferOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          disabled={transferMutation.isPending}
                          onClick={() => transferMutation.mutate()}
                        >
                          {transferMutation.isPending
                            ? "Transferindo..."
                            : "Confirmar transferencia"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              <Tabs defaultValue="summary" className="min-w-0">
                <TabsList className="flex h-auto flex-wrap justify-start">
                  <TabsTrigger value="summary">Resumo</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="costs">Custos</TabsTrigger>
                  <TabsTrigger value="documents">Documentos</TabsTrigger>
                  <TabsTrigger value="photos">Fotos</TabsTrigger>
                  <TabsTrigger value="history">Historico</TabsTrigger>
                  <TabsTrigger value="events">Eventos</TabsTrigger>
                  <TabsTrigger value="audit">Auditoria</TabsTrigger>
                  <TabsTrigger value="relationships">Relacionamentos</TabsTrigger>
                </TabsList>

                <TabsContent value="summary">
                  <Summary vehicle={vehicle.data} />
                </TabsContent>
                <TabsContent value="timeline">
                  <Timeline
                    items={(vehicle.data.timeline ?? []).map((item) => ({
                      title: item.title,
                      description:
                        item.description ?? new Date(item.createdAt).toLocaleString("pt-BR"),
                    }))}
                  />
                </TabsContent>
                <TabsContent value="costs">
                  <Costs vehicleId={vehicleId} />
                </TabsContent>
                <TabsContent value="documents">
                  <Documents vehicleId={vehicleId} />
                </TabsContent>
                <TabsContent value="photos">
                  <Photos vehicleId={vehicleId} />
                </TabsContent>
                <TabsContent value="history">
                  <Timeline
                    items={(vehicle.data.timeline ?? []).map((item) => ({
                      title: `${item.type} - ${item.title}`,
                      description: new Date(item.createdAt).toLocaleString("pt-BR"),
                    }))}
                  />
                </TabsContent>
                <TabsContent value="events">
                  <Events vehicleId={vehicleId} />
                </TabsContent>
                <TabsContent value="audit">
                  <Audit vehicleId={vehicleId} />
                </TabsContent>
                <TabsContent value="relationships">
                  <Relationships vehicleId={vehicleId} />
                </TabsContent>
              </Tabs>
            </section>
          </>
        ) : null}
      </div>
    </AccessGuard>
  );
}

function Summary({ vehicle }: { vehicle: VehicleRecord }) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Identificacao</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <Info label="RENAVAM" value={vehicle.renavam} />
          <Info label="Chassi" value={vehicle.chassis} />
          <Info label="Ano fabricacao" value={vehicle.manufactureYear} />
          <Info label="Ano modelo" value={vehicle.modelYear} />
          <Info label="Cor" value={vehicle.color} />
          <Info label="Combustivel" value={vehicle.fuelType} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Custos preparados</CardTitle>
          <CardDescription>Agregadores prontos para receber modulos futuros.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-3">
          <Info label="Valor estimado" value={formatCurrency(vehicle.estimatedValue)} />
          <Info label="Hodometro" value={vehicle.currentOdometer} />
          <Info label="Contrato" value={vehicle.contractId} />
        </CardContent>
      </Card>
    </section>
  );
}

function Documents({ vehicleId }: { vehicleId: string }) {
  const [fileName, setFileName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("CRLV");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      addVehicleDocument(vehicleId, {
        type,
        fileName,
        url,
        storageKey: url || fileName,
        mimeType: "application/octet-stream",
      }),
    onSuccess: () => {
      toast.success("Documento registrado");
      void queryClient.invalidateQueries({ queryKey: ["vehicle", vehicleId] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos</CardTitle>
        <CardDescription>CRLV, IPVA, seguro, licenciamento, ANTT e tacografos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[160px_1fr_1fr_auto]">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                "CRLV",
                "IPVA",
                "INSURANCE",
                "LICENSING",
                "ANTT",
                "TACHOGRAPH",
                "CHRONOTACHOGRAPH",
                "OTHER",
              ].map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Nome do arquivo"
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
          />
          <Input
            placeholder="URL segura do arquivo"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!fileName || mutation.isPending}
          >
            <FileText className="h-4 w-4" />
            Registrar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Photos({ vehicleId }: { vehicleId: string }) {
  const [fileName, setFileName] = useState("");
  const [url, setUrl] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      addVehiclePhoto(vehicleId, {
        fileName,
        url,
        storageKey: url || fileName,
        mimeType: "image/*",
        isPrimary: true,
      }),
    onSuccess: () => {
      toast.success("Foto registrada");
      void queryClient.invalidateQueries({ queryKey: ["vehicle", vehicleId] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Galeria</CardTitle>
        <CardDescription>Registro de fotos com imagem principal e historico.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <Input
          placeholder="Nome da imagem"
          value={fileName}
          onChange={(event) => setFileName(event.target.value)}
        />
        <Input
          placeholder="URL segura da imagem"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <Button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!fileName || mutation.isPending}
        >
          <ImagePlus className="h-4 w-4" />
          Adicionar
        </Button>
      </CardContent>
    </Card>
  );
}

function Costs({ vehicleId }: { vehicleId: string }) {
  const costs = useQuery({
    queryKey: ["vehicle-costs", vehicleId],
    queryFn: () => getVehicleCosts(vehicleId),
    retry: false,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custos</CardTitle>
        <CardDescription>
          Combustivel, pneus, oficina, pecas, seguro, impostos, pedagios e multas.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <Info label="Custo total" value={formatCurrency(costs.data?.total)} />
        <Info label="Custo mensal" value={formatCurrency(costs.data?.monthly)} />
        <Info label="Custo por KM" value={formatCurrency(costs.data?.costPerKm)} />
      </CardContent>
    </Card>
  );
}

function Relationships({ vehicleId }: { vehicleId: string }) {
  const relationships = useQuery({
    queryKey: ["vehicle-relationships", vehicleId],
    queryFn: () => getVehicleRelationships(vehicleId),
    retry: false,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relacionamentos</CardTitle>
        <CardDescription>
          Espaco reservado para pneus, abastecimentos, motoristas, multas, manutencoes e contratos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <Info
            label="Pneus"
            value={relationships.data?.prepared.tires ? "Preparado" : "Indisponivel"}
          />
          <Info
            label="Abastecimentos"
            value={relationships.data?.prepared.fuelings ? "Preparado" : "Indisponivel"}
          />
          <Info
            label="Motoristas"
            value={relationships.data?.prepared.drivers ? "Preparado" : "Indisponivel"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Events({ vehicleId }: { vehicleId: string }) {
  const events = useQuery({
    queryKey: ["vehicle-events", vehicleId],
    queryFn: () => getVehicleEvents(vehicleId),
    retry: false,
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3">
        <span className="rounded-md bg-primary/10 p-2 text-primary">
          <Route className="h-4 w-4" />
        </span>
        <div>
          <CardTitle>Eventos de dominio</CardTitle>
          <CardDescription>Outbox preparado para IA, analytics e integracoes.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.data?.map((event) => (
          <div key={event.id} className="rounded-md border p-3 text-sm">
            <p className="font-medium">{event.name}</p>
            <p className="text-xs text-muted-foreground">
              {event.status} - {new Date(event.createdAt).toLocaleString("pt-BR")}
            </p>
          </div>
        ))}
        {events.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento encontrado.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Audit({ vehicleId }: { vehicleId: string }) {
  const audit = useQuery({
    queryKey: ["vehicle-audit", vehicleId],
    queryFn: () => getVehicleAudit(vehicleId),
    retry: false,
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3">
        <span className="rounded-md bg-primary/10 p-2 text-primary">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div>
          <CardTitle>Auditoria</CardTitle>
          <CardDescription>
            Registro de quem alterou, quando e quais valores mudaram.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {audit.data?.map((entry) => (
          <div key={entry.id} className="rounded-md border p-3 text-sm">
            <p className="font-medium">
              {entry.action} em {entry.tableName}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(entry.createdAt).toLocaleString("pt-BR")}
            </p>
          </div>
        ))}
        {audit.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum registro de auditoria encontrado.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value ?? "Nao informado"}</p>
    </div>
  );
}

function formatCurrency(value?: number | null) {
  return Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
