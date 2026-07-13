"use client";
import { permissions } from "@fleetcontrol/authz";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { Breadcrumb } from "@/components/navigation/breadcrumb";
import { AccessGuard } from "@/components/platform/access-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createMaintenanceOrder, getMaintenanceOptions } from "@/lib/maintenance";
export function MaintenanceForm() {
  const router = useRouter();
  const options = useQuery({ queryKey: ["maintenance-options"], queryFn: getMaintenanceOptions });
  const [form, setForm] = useState({
    code: `OS-${new Date().getFullYear()}-`,
    vehicleId: "",
    planId: "",
    title: "",
    description: "",
    type: "PREVENTIVE",
    priority: "NORMAL",
    odometer: "",
    scheduledAt: "",
    estimatedCost: "",
    notes: "",
  });
  const mutation = useMutation({
    mutationFn: createMaintenanceOrder,
    onSuccess: (order) => router.push(`/dashboard/manutencao/${order.id}`),
  });
  const change = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => setForm((old) => ({ ...old, [key]: event.target.value })),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({
      ...form,
      planId: form.planId || undefined,
      odometer: Number(form.odometer),
      estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : undefined,
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
    });
  };
  return (
    <AccessGuard permission={permissions.maintenance.manage}>
      <form className="space-y-6" onSubmit={submit}>
        <Breadcrumb
          items={[{ label: "Manutencao", href: "/dashboard/manutencao" }, { label: "Nova ordem" }]}
        />
        <div>
          <h1 className="text-2xl font-semibold">Nova ordem de servico</h1>
          <p className="text-sm text-muted-foreground">
            A ordem sera enviada para aprovacao antes da execucao.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Identificacao e planejamento</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              Codigo
              <Input required {...change("code")} />
            </label>
            <label className="space-y-2 text-sm">
              Veiculo
              <select
                required
                className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                {...change("vehicleId")}
              >
                <option value="">Selecione</option>
                {options.data?.vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              Titulo
              <Input required {...change("title")} />
            </label>
            <label className="space-y-2 text-sm">
              Tipo
              <select
                className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                {...change("type")}
              >
                {options.data?.types.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              Prioridade
              <select
                className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                {...change("priority")}
              >
                {options.data?.priorities.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              Hodometro
              <Input required type="number" min="0" step="0.1" {...change("odometer")} />
            </label>
            <label className="space-y-2 text-sm">
              Custo estimado
              <Input type="number" min="0" step="0.01" {...change("estimatedCost")} />
            </label>
            <label className="space-y-2 text-sm">
              Agendamento
              <Input type="datetime-local" {...change("scheduledAt")} />
            </label>
            <label className="space-y-2 text-sm">
              Plano preventivo
              <select
                className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                {...change("planId")}
              >
                <option value="">Sem plano</option>
                {options.data?.plans
                  .filter((p) => !form.vehicleId || p.vehicleId === form.vehicleId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              Descricao
              <textarea
                className="mt-2 min-h-24 w-full rounded-md border bg-background p-3"
                {...change("description")}
              />
            </label>
            <div className="md:col-span-2 flex justify-end">
              <Button disabled={mutation.isPending}>
                {mutation.isPending ? "Enviando..." : "Enviar para aprovacao"}
              </Button>
            </div>
            {mutation.error ? (
              <p className="text-sm text-destructive md:col-span-2">{mutation.error.message}</p>
            ) : null}
          </CardContent>
        </Card>
      </form>
    </AccessGuard>
  );
}
