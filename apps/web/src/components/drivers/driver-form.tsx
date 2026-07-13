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
  createDriver,
  getDriver,
  getDriversOptions,
  updateDriver,
  type DriverPayload,
} from "@/lib/drivers";

const schema = z.object({
  name: z.string().min(3),
  cpf: z.string().min(11),
  cnhNumber: z.string().min(3),
  cnhCategory: z.string().min(1),
  cnhExpiresAt: z.string().min(1),
  cnhIssuedAt: z.string().optional(),
  birthDate: z.string().optional(),
  hireDate: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().or(z.literal("")).optional(),
  status: z.string().optional(),
  branchId: z.string().optional(),
  departmentId: z.string().optional(),
  medicalExamExpiresAt: z.string().optional(),
  toxicologyExamExpiresAt: z.string().optional(),
  notes: z.string().optional(),
});
type Values = z.infer<typeof schema>;

export function DriverForm({ driverId }: { driverId?: string }) {
  const router = useRouter();
  const editing = Boolean(driverId);
  const options = useQuery({
    queryKey: ["drivers-options"],
    queryFn: getDriversOptions,
    retry: false,
  });
  const driver = useQuery({
    queryKey: ["driver", driverId],
    queryFn: () => getDriver(driverId as string),
    enabled: editing,
    retry: false,
  });
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      cpf: "",
      cnhNumber: "",
      cnhCategory: "B",
      cnhExpiresAt: "",
      status: "ACTIVE",
    },
  });
  useEffect(() => {
    if (!driver.data) return;
    form.reset({
      name: driver.data.name,
      cpf: driver.data.cpf,
      cnhNumber: driver.data.cnhNumber,
      cnhCategory: driver.data.cnhCategory,
      cnhExpiresAt: dateValue(driver.data.cnhExpiresAt),
      cnhIssuedAt: dateValue(driver.data.cnhIssuedAt),
      birthDate: dateValue(driver.data.birthDate),
      hireDate: dateValue(driver.data.hireDate),
      phone: driver.data.phone ?? "",
      email: driver.data.email ?? "",
      status: driver.data.status,
      branchId: driver.data.branchId ?? "",
      departmentId: driver.data.departmentId ?? "",
      medicalExamExpiresAt: dateValue(driver.data.medicalExamExpiresAt),
      toxicologyExamExpiresAt: dateValue(driver.data.toxicologyExamExpiresAt),
      notes: driver.data.notes ?? "",
    });
  }, [driver.data, form]);
  const mutation = useMutation({
    mutationFn: (payload: DriverPayload) =>
      driverId ? updateDriver(driverId, payload) : createDriver(payload),
    onSuccess: (value) => {
      toast.success(editing ? "Motorista atualizado" : "Motorista cadastrado");
      router.push(`/dashboard/motoristas/${value.id}`);
    },
    onError: () => toast.error("Nao foi possivel salvar o motorista"),
  });
  return (
    <AccessGuard permission={permissions.drivers.manage}>
      <form className="space-y-6" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <Breadcrumb
          items={[
            { label: "Motoristas", href: "/dashboard/motoristas" },
            { label: editing ? "Editar" : "Novo" },
          ]}
        />
        <section>
          <h1 className="text-2xl font-semibold">
            {editing ? "Editar motorista" : "Novo motorista"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Dados pessoais, habilitacao, saude ocupacional e lotacao.
          </p>
        </section>
        <Card>
          <CardHeader>
            <CardTitle>Identificacao e CNH</CardTitle>
            <CardDescription>Dados oficiais utilizados na operacao e alertas.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Nome">
              <Input {...form.register("name")} />
            </Field>
            <Field label="CPF">
              <Input {...form.register("cpf")} />
            </Field>
            <Field label="Numero da CNH">
              <Input {...form.register("cnhNumber")} />
            </Field>
            <Field label="Categoria">
              <Input {...form.register("cnhCategory")} />
            </Field>
            <Field label="Validade da CNH">
              <Input type="date" {...form.register("cnhExpiresAt")} />
            </Field>
            <Field label="Emissao da CNH">
              <Input type="date" {...form.register("cnhIssuedAt")} />
            </Field>
            <Field label="Nascimento">
              <Input type="date" {...form.register("birthDate")} />
            </Field>
            <Field label="Admissao">
              <Input type="date" {...form.register("hireDate")} />
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Operacao e contatos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Telefone">
              <Input {...form.register("phone")} />
            </Field>
            <Field label="E-mail">
              <Input type="email" {...form.register("email")} />
            </Field>
            <SelectField
              label="Status"
              value={form.watch("status") ?? "ACTIVE"}
              onChange={(value) => form.setValue("status", value)}
              items={
                options.data?.statuses.map((item) => ({ value: item.value, label: item.label })) ??
                []
              }
            />
            <SelectField
              label="Filial"
              value={form.watch("branchId") ?? ""}
              onChange={(value) => form.setValue("branchId", value)}
              items={
                options.data?.branches.map((item) => ({ value: item.id, label: item.name })) ?? []
              }
            />
            <SelectField
              label="Departamento"
              value={form.watch("departmentId") ?? ""}
              onChange={(value) => form.setValue("departmentId", value)}
              items={
                options.data?.departments.map((item) => ({ value: item.id, label: item.name })) ??
                []
              }
            />
            <Field label="Validade exame medico">
              <Input type="date" {...form.register("medicalExamExpiresAt")} />
            </Field>
            <Field label="Validade exame toxicologico">
              <Input type="date" {...form.register("toxicologyExamExpiresAt")} />
            </Field>
            <Field label="Observacoes">
              <Input {...form.register("notes")} />
            </Field>
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            <Save className="size-4" />
            {mutation.isPending ? "Salvando..." : "Salvar motorista"}
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
  items: Array<{ value: string; label: string }>;
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
function dateValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}
