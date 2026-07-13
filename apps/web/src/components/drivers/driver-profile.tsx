"use client";

import { permissions } from "@fleetcontrol/authz";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Car, FilePlus, Pencil, Unplug } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  addDriverDocument,
  archiveDriver,
  assignDriverVehicle,
  changeDriverStatus,
  getDriver,
  getDriversOptions,
  unassignDriverVehicle,
} from "@/lib/drivers";
import { useSession } from "@/providers/session-provider";

export function DriverProfile({ driverId }: { driverId: string }) {
  const client = useQueryClient();
  const router = useRouter();
  const { profile } = useSession();
  const [assignOpen, setAssignOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState("");
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const driver = useQuery({
    queryKey: ["driver", driverId],
    queryFn: () => getDriver(driverId),
    retry: false,
  });
  const options = useQuery({
    queryKey: ["drivers-options"],
    queryFn: getDriversOptions,
    retry: false,
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["driver", driverId] });
    void client.invalidateQueries({ queryKey: ["drivers-dashboard"] });
  };
  const statusMutation = useMutation({
    mutationFn: (status: string) => changeDriverStatus(driverId, status),
    onSuccess: () => {
      toast.success("Status atualizado");
      refresh();
    },
  });
  const assignMutation = useMutation({
    mutationFn: () => assignDriverVehicle(driverId, vehicleId, assignmentNotes),
    onSuccess: () => {
      toast.success("Veiculo atribuido");
      setAssignOpen(false);
      refresh();
    },
    onError: () => toast.error("Nao foi possivel atribuir o veiculo"),
  });
  const unassignMutation = useMutation({
    mutationFn: (assignmentId: string) => unassignDriverVehicle(driverId, assignmentId),
    onSuccess: () => {
      toast.success("Veiculo desvinculado");
      refresh();
    },
  });
  const archiveMutation = useMutation({
    mutationFn: () => archiveDriver(driverId, archiveReason),
    onSuccess: () => {
      toast.success("Motorista arquivado");
      router.push("/dashboard/motoristas");
    },
    onError: () => toast.error("Nao foi possivel arquivar"),
  });
  if (driver.isLoading) return <LoadingState />;
  return (
    <AccessGuard permission={permissions.drivers.read}>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Motoristas", href: "/dashboard/motoristas" },
            { label: driver.data?.name ?? "Motorista" },
          ]}
        />
        {driver.data ? (
          <>
            <section className="grid gap-4 xl:grid-cols-[300px_1fr]">
              <Card>
                <CardHeader>
                  <CardDescription>Perfil do motorista</CardDescription>
                  <CardTitle>{driver.data.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StatusBadge
                    status={driver.data.status.toLowerCase()}
                    label={driver.data.status}
                  />
                  <Info
                    label="CNH"
                    value={`${driver.data.cnhNumber} / ${driver.data.cnhCategory}`}
                  />
                  <Info
                    label="Validade"
                    value={new Date(driver.data.cnhExpiresAt).toLocaleDateString("pt-BR")}
                  />
                  <Info label="Filial" value={driver.data.branch?.name} />
                  {canAccess(profile, permissions.drivers.manage) ? (
                    <>
                      <Select
                        value={driver.data.status}
                        onValueChange={(value) => statusMutation.mutate(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {options.data?.statuses.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button asChild variant="outline" className="w-full">
                        <Link href={`/dashboard/motoristas/${driverId}/editar`}>
                          <Pencil className="size-4" />
                          Editar cadastro
                        </Link>
                      </Button>
                    </>
                  ) : null}
                  {canAccess(profile, permissions.drivers.assign) &&
                  driver.data.status === "ACTIVE" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setAssignOpen(true)}
                    >
                      <Car className="size-4" />
                      Atribuir veiculo
                    </Button>
                  ) : null}
                  {canAccess(profile, permissions.drivers.archive) && !driver.data.archivedAt ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setArchiveOpen(true)}
                    >
                      <Archive className="size-4" />
                      Arquivar motorista
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
              <Tabs defaultValue="summary">
                <TabsList className="flex h-auto flex-wrap justify-start">
                  <TabsTrigger value="summary">Resumo</TabsTrigger>
                  <TabsTrigger value="assignments">Veiculos</TabsTrigger>
                  <TabsTrigger value="documents">Documentos</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>
                <TabsContent value="summary">
                  <Card>
                    <CardHeader>
                      <CardTitle>Dados profissionais</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2">
                      <Info label="CPF" value={driver.data.cpf} />
                      <Info label="Telefone" value={driver.data.phone} />
                      <Info label="E-mail" value={driver.data.email} />
                      <Info label="Departamento" value={driver.data.department?.name} />
                      <Info
                        label="Exame medico"
                        value={formatDate(driver.data.medicalExamExpiresAt)}
                      />
                      <Info
                        label="Exame toxicologico"
                        value={formatDate(driver.data.toxicologyExamExpiresAt)}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="assignments">
                  <Card>
                    <CardHeader>
                      <CardTitle>Historico de veiculos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {driver.data.assignments?.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-md border p-3"
                        >
                          <div>
                            <p className="font-medium">{item.vehicle.plate}</p>
                            <p className="text-xs text-muted-foreground">
                              Desde {formatDate(item.startsAt)}
                              {item.endsAt ? ` ate ${formatDate(item.endsAt)}` : " - atual"}
                            </p>
                          </div>
                          {!item.endsAt && canAccess(profile, permissions.drivers.assign) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => unassignMutation.mutate(item.id)}
                            >
                              <Unplug className="size-4" />
                              Desvincular
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="documents">
                  <DriverDocuments
                    driverId={driverId}
                    documents={driver.data.documents ?? []}
                    allowed={canAccess(profile, permissions.drivers.documents)}
                    onSaved={refresh}
                  />
                </TabsContent>
                <TabsContent value="timeline">
                  <Card>
                    <CardContent className="pt-6">
                      <Timeline
                        items={(driver.data.timeline ?? []).map((item) => ({
                          title: item.title,
                          description:
                            item.description ?? new Date(item.createdAt).toLocaleString("pt-BR"),
                        }))}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </section>
            <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Atribuir veiculo</DialogTitle>
                  <DialogDescription>
                    O vinculo primario anterior do motorista ou do veiculo sera encerrado.
                  </DialogDescription>
                </DialogHeader>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar veiculo" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.data?.vehicles.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.plate} - {item.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={assignmentNotes}
                  onChange={(event) => setAssignmentNotes(event.target.value)}
                  placeholder="Observacoes da alocacao"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAssignOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    disabled={!vehicleId || assignMutation.isPending}
                    onClick={() => assignMutation.mutate()}
                  >
                    Confirmar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Arquivar motorista?</DialogTitle>
                  <DialogDescription>
                    Alocacoes ativas serao encerradas e a operacao sera auditada.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  value={archiveReason}
                  onChange={(event) => setArchiveReason(event.target.value)}
                  placeholder="Motivo"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setArchiveOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    disabled={archiveMutation.isPending}
                    onClick={() => archiveMutation.mutate()}
                  >
                    Arquivar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        ) : null}
      </div>
    </AccessGuard>
  );
}

function DriverDocuments({
  driverId,
  documents,
  allowed,
  onSaved,
}: {
  driverId: string;
  documents: Array<{
    id: string;
    type: string;
    fileName: string;
    url: string;
    expiresAt?: string | null;
  }>;
  allowed: boolean;
  onSaved: () => void;
}) {
  const [type, setType] = useState("CNH");
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      addDriverDocument(driverId, {
        type,
        url,
        storageKey: url,
        fileName,
        mimeType: "application/octet-stream",
        expiresAt,
      }),
    onSuccess: () => {
      toast.success("Documento anexado");
      setUrl("");
      setFileName("");
      onSaved();
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos</CardTitle>
        <CardDescription>CNH, exames e certificados com alertas de vencimento.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {allowed ? (
          <div className="grid gap-2 md:grid-cols-4">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "CNH",
                  "MEDICAL_CERTIFICATE",
                  "TOXICOLOGY_EXAM",
                  "TRAINING_CERTIFICATE",
                  "OTHER",
                ].map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              placeholder="Nome do arquivo"
            />
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="URL segura do arquivo"
            />
            <Button
              disabled={!url || !fileName || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              <FilePlus className="size-4" />
              Anexar
            </Button>
            <Input
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>
        ) : null}
        {documents.map((item) => (
          <div key={item.id} className="flex justify-between rounded-md border p-3">
            <a
              className="font-medium text-primary"
              href={item.url}
              target="_blank"
              rel="noreferrer"
            >
              {item.fileName}
            </a>
            <span className="text-sm text-muted-foreground">
              {item.type} {item.expiresAt ? `- ${formatDate(item.expiresAt)}` : ""}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "Nao informado"}</p>
    </div>
  );
}
function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "Nao informado";
}
