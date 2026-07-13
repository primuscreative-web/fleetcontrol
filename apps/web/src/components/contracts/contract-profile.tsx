"use client";
import { permissions } from "@fleetcontrol/authz";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, FilePlus, Pencil, Plus, Truck, Unplug } from "lucide-react";
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
  addContractAmendment,
  addContractDocument,
  allocateContractVehicle,
  archiveContract,
  changeContractStatus,
  getContract,
  getContractsOptions,
  releaseContractVehicle,
} from "@/lib/contracts";
import { useSession } from "@/providers/session-provider";
export function ContractProfile({ contractId }: { contractId: string }) {
  const client = useQueryClient();
  const router = useRouter();
  const { profile } = useSession();
  const [allocationOpen, setAllocationOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState("");
  const [monthlyValue, setMonthlyValue] = useState("");
  const [amendmentOpen, setAmendmentOpen] = useState(false);
  const [amendmentNumber, setAmendmentNumber] = useState("");
  const [amendmentDescription, setAmendmentDescription] = useState("");
  const [effectiveAt, setEffectiveAt] = useState("");
  const [newEndAt, setNewEndAt] = useState("");
  const [valueChange, setValueChange] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [reason, setReason] = useState("");
  const contract = useQuery({
    queryKey: ["contract", contractId],
    queryFn: () => getContract(contractId),
    retry: false,
  });
  const options = useQuery({
    queryKey: ["contracts-options"],
    queryFn: getContractsOptions,
    retry: false,
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["contract", contractId] });
    void client.invalidateQueries({ queryKey: ["contracts-dashboard"] });
  };
  const statusMutation = useMutation({
    mutationFn: (status: string) => changeContractStatus(contractId, status),
    onSuccess: () => {
      toast.success("Status atualizado");
      refresh();
    },
  });
  const allocationMutation = useMutation({
    mutationFn: () =>
      allocateContractVehicle(
        contractId,
        vehicleId,
        monthlyValue ? Number(monthlyValue) : undefined,
      ),
    onSuccess: () => {
      toast.success("Veiculo alocado");
      setAllocationOpen(false);
      refresh();
    },
    onError: () => toast.error("Nao foi possivel alocar"),
  });
  const releaseMutation = useMutation({
    mutationFn: (id: string) => releaseContractVehicle(contractId, id),
    onSuccess: () => {
      toast.success("Veiculo liberado");
      refresh();
    },
  });
  const amendmentMutation = useMutation({
    mutationFn: () =>
      addContractAmendment(contractId, {
        number: amendmentNumber,
        description: amendmentDescription,
        effectiveAt,
        newEndAt,
        valueChange: valueChange ? Number(valueChange) : undefined,
      }),
    onSuccess: () => {
      toast.success("Aditivo registrado");
      setAmendmentOpen(false);
      refresh();
    },
    onError: () => toast.error("Nao foi possivel registrar o aditivo"),
  });
  const archiveMutation = useMutation({
    mutationFn: () => archiveContract(contractId, reason),
    onSuccess: () => {
      toast.success("Contrato arquivado");
      router.push("/dashboard/contratos");
    },
  });
  if (contract.isLoading) return <LoadingState />;
  const item = contract.data;
  return (
    <AccessGuard permission={permissions.contracts.read}>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Contratos", href: "/dashboard/contratos" },
            { label: item?.number ?? "Contrato" },
          ]}
        />
        {item ? (
          <>
            <section className="grid gap-4 xl:grid-cols-[310px_1fr]">
              <Card>
                <CardHeader>
                  <CardDescription>Contrato</CardDescription>
                  <CardTitle>{item.number}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StatusBadge status={item.status.toLowerCase()} label={item.status} />
                  <Info label="Titulo" value={item.title} />
                  <Info label="Contratante" value={item.clientName} />
                  <Info label="Vigencia" value={`${date(item.startsAt)} - ${date(item.endsAt)}`} />
                  <Info label="Saldo" value={currency(item.totalValue - item.consumedValue)} />
                  {canAccess(profile, permissions.contracts.manage) ? (
                    <>
                      <Select
                        value={item.status}
                        onValueChange={(value) => statusMutation.mutate(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {options.data?.statuses.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button asChild variant="outline" className="w-full">
                        <Link href={`/dashboard/contratos/${contractId}/editar`}>
                          <Pencil className="size-4" />
                          Editar contrato
                        </Link>
                      </Button>
                    </>
                  ) : null}
                  {canAccess(profile, permissions.contracts.allocate) &&
                  item.status === "ACTIVE" ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setAllocationOpen(true)}
                    >
                      <Truck className="size-4" />
                      Alocar veiculo
                    </Button>
                  ) : null}
                  {canAccess(profile, permissions.contracts.amend) ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setAmendmentOpen(true)}
                    >
                      <Plus className="size-4" />
                      Novo aditivo
                    </Button>
                  ) : null}
                  {canAccess(profile, permissions.contracts.archive) && !item.archivedAt ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setArchiveOpen(true)}
                    >
                      <Archive className="size-4" />
                      Arquivar
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
              <Tabs defaultValue="summary">
                <TabsList className="flex h-auto flex-wrap justify-start">
                  <TabsTrigger value="summary">Resumo</TabsTrigger>
                  <TabsTrigger value="vehicles">Veiculos</TabsTrigger>
                  <TabsTrigger value="amendments">Aditivos</TabsTrigger>
                  <TabsTrigger value="documents">Documentos</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>
                <TabsContent value="summary">
                  <Card>
                    <CardHeader>
                      <CardTitle>Dados contratuais</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2">
                      <Info label="Objeto" value={item.object} />
                      <Info label="Licitacao" value={item.biddingNumber} />
                      <Info label="Orgao" value={item.agency} />
                      <Info label="Gestor" value={item.manager?.name} />
                      <Info label="Valor total" value={currency(item.totalValue)} />
                      <Info label="Consumido" value={currency(item.consumedValue)} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="vehicles">
                  <Card>
                    <CardHeader>
                      <CardTitle>Frota alocada</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {item.allocations?.map((allocation) => (
                        <div
                          key={allocation.id}
                          className="flex items-center justify-between rounded-md border p-3"
                        >
                          <div>
                            <Link
                              className="font-medium text-primary"
                              href={`/dashboard/frota/${allocation.vehicle.id}`}
                            >
                              {allocation.vehicle.plate}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {date(allocation.startsAt)}
                              {allocation.endsAt ? ` - ${date(allocation.endsAt)}` : " - atual"}
                            </p>
                          </div>
                          {!allocation.endsAt &&
                          canAccess(profile, permissions.contracts.allocate) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => releaseMutation.mutate(allocation.id)}
                            >
                              <Unplug className="size-4" />
                              Liberar
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="amendments">
                  <Card>
                    <CardHeader>
                      <CardTitle>Aditivos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {item.amendments?.map((value) => (
                        <div key={value.id} className="rounded-md border p-3">
                          <p className="font-medium">
                            {value.number} - {currency(value.valueChange)}
                          </p>
                          <p className="text-sm text-muted-foreground">{value.description}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="documents">
                  <ContractDocuments
                    contractId={contractId}
                    documents={item.documents ?? []}
                    allowed={canAccess(profile, permissions.contracts.documents)}
                    onSaved={refresh}
                  />
                </TabsContent>
                <TabsContent value="timeline">
                  <Card>
                    <CardContent className="pt-6">
                      <Timeline
                        items={(item.timeline ?? []).map((value) => ({
                          title: value.title,
                          description:
                            value.description ?? new Date(value.createdAt).toLocaleString("pt-BR"),
                        }))}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </section>
            <Dialog open={allocationOpen} onOpenChange={setAllocationOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Alocar veiculo</DialogTitle>
                  <DialogDescription>
                    Uma alocacao ativa anterior do veiculo sera encerrada automaticamente.
                  </DialogDescription>
                </DialogHeader>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar veiculo" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.data?.vehicles.map((value) => (
                      <SelectItem key={value.id} value={value.id}>
                        {value.plate} - {value.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  value={monthlyValue}
                  onChange={(event) => setMonthlyValue(event.target.value)}
                  placeholder="Valor mensal"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAllocationOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    disabled={!vehicleId || allocationMutation.isPending}
                    onClick={() => allocationMutation.mutate()}
                  >
                    Alocar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={amendmentOpen} onOpenChange={setAmendmentOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo aditivo</DialogTitle>
                  <DialogDescription>
                    Registre alteracoes de prazo e valor no instrumento contratual.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    value={amendmentNumber}
                    onChange={(event) => setAmendmentNumber(event.target.value)}
                    placeholder="Numero"
                  />
                  <Input
                    value={amendmentDescription}
                    onChange={(event) => setAmendmentDescription(event.target.value)}
                    placeholder="Descricao"
                  />
                  <Input
                    type="date"
                    value={effectiveAt}
                    onChange={(event) => setEffectiveAt(event.target.value)}
                  />
                  <Input
                    type="date"
                    value={newEndAt}
                    onChange={(event) => setNewEndAt(event.target.value)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={valueChange}
                    onChange={(event) => setValueChange(event.target.value)}
                    placeholder="Variacao de valor"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAmendmentOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    disabled={
                      !amendmentNumber ||
                      !amendmentDescription ||
                      !effectiveAt ||
                      amendmentMutation.isPending
                    }
                    onClick={() => amendmentMutation.mutate()}
                  >
                    Registrar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Arquivar contrato?</DialogTitle>
                  <DialogDescription>
                    Alocacoes ativas serao encerradas e os veiculos liberados.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Motivo"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setArchiveOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => archiveMutation.mutate()}>Arquivar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        ) : null}
      </div>
    </AccessGuard>
  );
}
function ContractDocuments({
  contractId,
  documents,
  allowed,
  onSaved,
}: {
  contractId: string;
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
  const [type, setType] = useState("CONTRACT");
  const [fileName, setFileName] = useState("");
  const [url, setUrl] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      addContractDocument(contractId, {
        type,
        fileName,
        url,
        storageKey: url,
        mimeType: "application/octet-stream",
      }),
    onSuccess: () => {
      toast.success("Documento anexado");
      onSaved();
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos</CardTitle>
        <CardDescription>Editais, contrato, aditivos e garantias.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {allowed ? (
          <div className="grid gap-2 md:grid-cols-4">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["NOTICE", "PROPOSAL", "CONTRACT", "AMENDMENT", "GUARANTEE", "OTHER"].map(
                  (value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ),
                )}
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
              placeholder="URL segura"
            />
            <Button
              disabled={!fileName || !url || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              <FilePlus className="size-4" />
              Anexar
            </Button>
          </div>
        ) : null}
        {documents.map((value) => (
          <div key={value.id} className="flex justify-between rounded-md border p-3">
            <a
              className="font-medium text-primary"
              href={value.url}
              target="_blank"
              rel="noreferrer"
            >
              {value.fileName}
            </a>
            <span className="text-sm text-muted-foreground">{value.type}</span>
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
const date = (value: string) => new Date(value).toLocaleDateString("pt-BR");
const currency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
