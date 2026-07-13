"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { permissions } from "@fleetcontrol/authz";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Breadcrumb } from "@/components/navigation/breadcrumb";
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
import {
  createContract,
  getContract,
  getContractsOptions,
  updateContract,
  type ContractPayload,
} from "@/lib/contracts";
const schema = z.object({
  number: z.string().min(1),
  biddingNumber: z.string().optional(),
  title: z.string().min(3),
  object: z.string().min(3),
  clientName: z.string().min(2),
  clientDocument: z.string().optional(),
  agency: z.string().optional(),
  type: z.string().min(1),
  status: z.string().optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  signedAt: z.string().optional(),
  totalValue: z.coerce.number().min(0),
  consumedValue: z.coerce.number().min(0).optional(),
  guaranteeValue: z.coerce.number().min(0).optional(),
  renewalNoticeDays: z.coerce.number().int().min(1).optional(),
  branchId: z.string().optional(),
  managerUserId: z.string().optional(),
  notes: z.string().optional(),
});
type Values = z.infer<typeof schema>;
export function ContractForm({ contractId }: { contractId?: string }) {
  const router = useRouter();
  const editing = Boolean(contractId);
  const options = useQuery({
    queryKey: ["contracts-options"],
    queryFn: getContractsOptions,
    retry: false,
  });
  const contract = useQuery({
    queryKey: ["contract", contractId],
    queryFn: () => getContract(contractId as string),
    enabled: editing,
    retry: false,
  });
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      number: "",
      title: "",
      object: "",
      clientName: "",
      type: "PUBLIC_BID",
      status: "DRAFT",
      startsAt: "",
      endsAt: "",
      totalValue: 0,
      consumedValue: 0,
      renewalNoticeDays: 60,
    },
  });
  useEffect(() => {
    const item = contract.data;
    if (!item) return;
    form.reset({
      number: item.number,
      biddingNumber: item.biddingNumber ?? "",
      title: item.title,
      object: item.object,
      clientName: item.clientName,
      clientDocument: item.clientDocument ?? "",
      agency: item.agency ?? "",
      type: item.type,
      status: item.status,
      startsAt: day(item.startsAt),
      endsAt: day(item.endsAt),
      signedAt: day(item.signedAt),
      totalValue: item.totalValue,
      consumedValue: item.consumedValue,
      guaranteeValue: item.guaranteeValue ?? undefined,
      renewalNoticeDays: item.renewalNoticeDays,
      branchId: item.branchId ?? "",
      managerUserId: item.managerUserId ?? "",
      notes: item.notes ?? "",
    });
  }, [contract.data, form]);
  const mutation = useMutation({
    mutationFn: (value: ContractPayload) =>
      contractId ? updateContract(contractId, value) : createContract(value),
    onSuccess: (value) => {
      toast.success(editing ? "Contrato atualizado" : "Contrato cadastrado");
      router.push(`/dashboard/contratos/${value.id}`);
    },
    onError: () => toast.error("Nao foi possivel salvar o contrato"),
  });
  return (
    <AccessGuard permission={permissions.contracts.manage}>
      <form className="space-y-6" onSubmit={form.handleSubmit((value) => mutation.mutate(value))}>
        <Breadcrumb
          items={[
            { label: "Contratos", href: "/dashboard/contratos" },
            { label: editing ? "Editar" : "Novo" },
          ]}
        />
        <section>
          <h1 className="text-2xl font-semibold">
            {editing ? "Editar contrato" : "Novo contrato"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Instrumento, vigencia, valores, responsaveis e dados da licitacao.
          </p>
        </section>
        <Card>
          <CardHeader>
            <CardTitle>Identificacao</CardTitle>
            <CardDescription>Dados oficiais do processo e do contratante.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Numero">
              <Input {...form.register("number")} />
            </Field>
            <Field label="Numero da licitacao">
              <Input {...form.register("biddingNumber")} />
            </Field>
            <Field label="Titulo">
              <Input {...form.register("title")} />
            </Field>
            <Field label="Objeto">
              <Input {...form.register("object")} />
            </Field>
            <Field label="Contratante">
              <Input {...form.register("clientName")} />
            </Field>
            <Field label="Documento">
              <Input {...form.register("clientDocument")} />
            </Field>
            <Field label="Orgao">
              <Input {...form.register("agency")} />
            </Field>
            <SelectField
              label="Tipo"
              value={form.watch("type")}
              onChange={(value) => form.setValue("type", value)}
              items={options.data?.types ?? []}
            />
            <SelectField
              label="Status"
              value={form.watch("status") ?? "DRAFT"}
              onChange={(value) => form.setValue("status", value)}
              items={options.data?.statuses ?? []}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vigencia e valores</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Inicio">
              <Input type="date" {...form.register("startsAt")} />
            </Field>
            <Field label="Termino">
              <Input type="date" {...form.register("endsAt")} />
            </Field>
            <Field label="Assinatura">
              <Input type="date" {...form.register("signedAt")} />
            </Field>
            <Field label="Valor total">
              <Input type="number" step="0.01" {...form.register("totalValue")} />
            </Field>
            <Field label="Valor consumido">
              <Input type="number" step="0.01" {...form.register("consumedValue")} />
            </Field>
            <Field label="Garantia">
              <Input type="number" step="0.01" {...form.register("guaranteeValue")} />
            </Field>
            <Field label="Aviso de renovacao (dias)">
              <Input type="number" {...form.register("renewalNoticeDays")} />
            </Field>
            <SelectField
              label="Filial"
              value={form.watch("branchId") ?? ""}
              onChange={(value) => form.setValue("branchId", value)}
              items={
                options.data?.branches.map((item) => ({ value: item.id, label: item.name })) ?? []
              }
            />
            <SelectField
              label="Gestor"
              value={form.watch("managerUserId") ?? ""}
              onChange={(value) => form.setValue("managerUserId", value)}
              items={
                options.data?.managers.map((item) => ({ value: item.id, label: item.name })) ?? []
              }
            />
            <Field label="Observacoes">
              <Input {...form.register("notes")} />
            </Field>
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            <Save className="size-4" />
            {mutation.isPending ? "Salvando..." : "Salvar contrato"}
          </Button>
        </div>
      </form>
    </AccessGuard>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
function SelectField({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: ContractOption[];
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecionar" />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
type ContractOption = { value: string; label: string };
const day = (value?: string | null) => (value ? value.slice(0, 10) : "");
