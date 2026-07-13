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
  createVehicle,
  getFleetOptions,
  getVehicle,
  updateVehicle,
  type VehiclePayload,
  type VehicleRecord,
} from "@/lib/fleet";

const vehicleSchema = z.object({
  plate: z.string().min(3),
  renavam: z.string().optional(),
  chassis: z.string().optional(),
  color: z.string().optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  makeId: z.string().optional(),
  modelId: z.string().optional(),
  versionId: z.string().optional(),
  manufactureYear: z.coerce.number().int().optional(),
  modelYear: z.coerce.number().int().optional(),
  engineNumber: z.string().optional(),
  power: z.string().optional(),
  fuelType: z.string().optional(),
  capacity: z.string().optional(),
  grossWeight: z.coerce.number().optional(),
  netWeight: z.coerce.number().optional(),
  axleCount: z.coerce.number().int().optional(),
  vehicleType: z.string().optional(),
  operationalCategory: z.string().optional(),
  branchId: z.string().optional(),
  departmentId: z.string().optional(),
  costCenterId: z.string().optional(),
  contractId: z.string().optional(),
  status: z.string().optional(),
  estimatedValue: z.coerce.number().optional(),
  currentOdometer: z.coerce.number().optional(),
  observations: z.string().optional(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

export function VehicleForm({ vehicleId }: { vehicleId?: string }) {
  const router = useRouter();
  const editing = Boolean(vehicleId);
  const options = useQuery({ queryKey: ["fleet-options"], queryFn: getFleetOptions, retry: false });
  const vehicle = useQuery({
    queryKey: ["vehicle", vehicleId],
    queryFn: () => getVehicle(vehicleId as string),
    enabled: editing,
    retry: false,
  });
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { plate: "", status: "AVAILABLE" },
  });
  useEffect(() => {
    if (vehicle.data) form.reset(toFormValues(vehicle.data));
  }, [form, vehicle.data]);
  const mutation = useMutation({
    mutationFn: (payload: VehiclePayload) =>
      vehicleId ? updateVehicle(vehicleId, payload) : createVehicle(payload),
    onSuccess: (vehicle) => {
      toast.success(editing ? "Veiculo atualizado" : "Veiculo cadastrado");
      router.push(`/dashboard/frota/${vehicle.id}`);
    },
    onError: () => toast.error("Nao foi possivel salvar o veiculo"),
  });

  return (
    <AccessGuard permission={permissions.fleet.manage}>
      <form className="space-y-6" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <Breadcrumb
          items={[
            { label: "Frota", href: "/dashboard/frota" },
            ...(editing
              ? [
                  {
                    label: vehicle.data?.plate ?? "Veiculo",
                    href: `/dashboard/frota/${vehicleId}`,
                  },
                  { label: "Editar" },
                ]
              : [{ label: "Novo" }]),
          ]}
        />
        <section className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-normal">
            {editing ? "Editar veiculo" : "Novo veiculo"}
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {editing
              ? "Atualize a identidade, os dados tecnicos e os vinculos operacionais do ativo."
              : "Identidade operacional, documental e financeira inicial do ativo."}
          </p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Identificacao</CardTitle>
            <CardDescription>Dados oficiais e classificacao principal do veiculo.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Placa" error={form.formState.errors.plate?.message}>
              <Input {...form.register("plate")} placeholder="ABC1D23" />
            </Field>
            <Field label="RENAVAM">
              <Input {...form.register("renavam")} />
            </Field>
            <Field label="Chassi">
              <Input {...form.register("chassis")} />
            </Field>
            <Field label="Cor">
              <Input {...form.register("color")} />
            </Field>
            <SelectField
              label="Categoria"
              value={form.watch("categoryId") ?? ""}
              onChange={(value) => form.setValue("categoryId", value)}
              items={options.data?.categories ?? []}
            />
            <SelectField
              label="Subcategoria"
              value={form.watch("subcategoryId") ?? ""}
              onChange={(value) => form.setValue("subcategoryId", value)}
              items={options.data?.subcategories ?? []}
            />
            <SelectField
              label="Marca"
              value={form.watch("makeId") ?? ""}
              onChange={(value) => form.setValue("makeId", value)}
              items={options.data?.makes ?? []}
            />
            <SelectField
              label="Modelo"
              value={form.watch("modelId") ?? ""}
              onChange={(value) => form.setValue("modelId", value)}
              items={options.data?.models ?? []}
            />
            <SelectField
              label="Versao"
              value={form.watch("versionId") ?? ""}
              onChange={(value) => form.setValue("versionId", value)}
              items={options.data?.versions ?? []}
            />
            <Field label="Ano fabricacao">
              <Input type="number" {...form.register("manufactureYear")} />
            </Field>
            <Field label="Ano modelo">
              <Input type="number" {...form.register("modelYear")} />
            </Field>
            <SelectField
              label="Status"
              value={form.watch("status") ?? "AVAILABLE"}
              onChange={(value) => form.setValue("status", value)}
              items={options.data?.statuses ?? []}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operacao e capacidade</CardTitle>
            <CardDescription>Dados tecnicos e vinculos organizacionais.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Motor">
              <Input {...form.register("engineNumber")} />
            </Field>
            <Field label="Potencia">
              <Input {...form.register("power")} />
            </Field>
            <SelectField
              label="Combustivel"
              value={form.watch("fuelType") ?? ""}
              onChange={(value) => form.setValue("fuelType", value)}
              items={options.data?.fuelTypes ?? []}
            />
            <Field label="Capacidade">
              <Input {...form.register("capacity")} />
            </Field>
            <Field label="Peso bruto">
              <Input type="number" step="0.01" {...form.register("grossWeight")} />
            </Field>
            <Field label="Peso liquido">
              <Input type="number" step="0.01" {...form.register("netWeight")} />
            </Field>
            <Field label="Eixos">
              <Input type="number" {...form.register("axleCount")} />
            </Field>
            <Field label="Tipo">
              <Input {...form.register("vehicleType")} />
            </Field>
            <Field label="Categoria operacional">
              <Input {...form.register("operationalCategory")} />
            </Field>
            <SelectField
              label="Filial"
              value={form.watch("branchId") ?? ""}
              onChange={(value) => form.setValue("branchId", value)}
              items={options.data?.branches ?? []}
            />
            <SelectField
              label="Departamento"
              value={form.watch("departmentId") ?? ""}
              onChange={(value) => form.setValue("departmentId", value)}
              items={options.data?.departments ?? []}
            />
            <SelectField
              label="Centro de custo"
              value={form.watch("costCenterId") ?? ""}
              onChange={(value) => form.setValue("costCenterId", value)}
              items={options.data?.costCenters ?? []}
            />
            <Field label="Contrato">
              <Input {...form.register("contractId")} />
            </Field>
            <Field label="Valor estimado">
              <Input type="number" step="0.01" {...form.register("estimatedValue")} />
            </Field>
            <Field label="Hodometro atual">
              <Input type="number" step="0.01" {...form.register("currentOdometer")} />
            </Field>
            <Field label="Observacoes">
              <Input {...form.register("observations")} />
            </Field>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            <Save className="h-4 w-4" />
            {editing ? "Salvar alteracoes" : "Salvar veiculo"}
          </Button>
        </div>
      </form>
    </AccessGuard>
  );
}

function toFormValues(vehicle: VehicleRecord): VehicleFormValues {
  return {
    plate: vehicle.plate,
    renavam: vehicle.renavam ?? "",
    chassis: vehicle.chassis ?? "",
    color: vehicle.color ?? "",
    categoryId: vehicle.categoryId ?? vehicle.category?.id ?? "",
    subcategoryId: vehicle.subcategoryId ?? vehicle.subcategory?.id ?? "",
    makeId: vehicle.makeId ?? vehicle.make?.id ?? "",
    modelId: vehicle.modelId ?? vehicle.model?.id ?? "",
    versionId: vehicle.versionId ?? vehicle.version?.id ?? "",
    manufactureYear: vehicle.manufactureYear ?? undefined,
    modelYear: vehicle.modelYear ?? undefined,
    engineNumber: vehicle.engineNumber ?? "",
    power: vehicle.power ?? "",
    fuelType: vehicle.fuelType ?? "",
    capacity: vehicle.capacity ?? "",
    grossWeight: vehicle.grossWeight ?? undefined,
    netWeight: vehicle.netWeight ?? undefined,
    axleCount: vehicle.axleCount ?? undefined,
    vehicleType: vehicle.vehicleType ?? "",
    operationalCategory: vehicle.operationalCategory ?? "",
    branchId: vehicle.branchId ?? vehicle.branch?.id ?? "",
    departmentId: vehicle.departmentId ?? vehicle.department?.id ?? "",
    costCenterId: vehicle.costCenterId ?? vehicle.costCenter?.id ?? "",
    contractId: vehicle.contractId ?? "",
    status: vehicle.status,
    estimatedValue: vehicle.estimatedValue ?? undefined,
    currentOdometer: vehicle.currentOdometer ?? undefined,
    observations: vehicle.observations ?? "",
  };
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
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
  items: Array<{ id?: string; value?: string; name?: string; label?: string }>;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecionar" />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => {
            const optionValue = item.id ?? item.value ?? "";
            return (
              <SelectItem key={optionValue} value={optionValue}>
                {item.name ?? item.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </label>
  );
}
