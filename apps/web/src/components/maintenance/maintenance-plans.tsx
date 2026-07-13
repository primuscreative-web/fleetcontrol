"use client";
import { permissions } from "@fleetcontrol/authz";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Breadcrumb } from "@/components/navigation/breadcrumb";
import { AccessGuard } from "@/components/platform/access-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createMaintenancePlan,
  getMaintenanceOptions,
  getMaintenancePlans,
} from "@/lib/maintenance";
export function MaintenancePlans() {
  const client = useQueryClient();
  const plans = useQuery({ queryKey: ["maintenance-plans"], queryFn: getMaintenancePlans });
  const options = useQuery({ queryKey: ["maintenance-options"], queryFn: getMaintenanceOptions });
  const [form, setForm] = useState({
    vehicleId: "",
    name: "",
    intervalDays: "",
    intervalKm: "",
    estimatedCost: "",
  });
  const mutation = useMutation({
    mutationFn: () =>
      createMaintenancePlan({
        vehicleId: form.vehicleId,
        name: form.name,
        intervalDays: form.intervalDays ? Number(form.intervalDays) : undefined,
        intervalKm: form.intervalKm ? Number(form.intervalKm) : undefined,
        estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : undefined,
      }),
    onSuccess: async () => {
      setForm({ vehicleId: "", name: "", intervalDays: "", intervalKm: "", estimatedCost: "" });
      await client.invalidateQueries({ queryKey: ["maintenance-plans"] });
    },
  });
  return (
    <AccessGuard permission={permissions.maintenance.plans}>
      <div className="space-y-6">
        <Breadcrumb
          items={[{ label: "Manutencao", href: "/dashboard/manutencao" }, { label: "Planos" }]}
        />
        <div>
          <h1 className="text-2xl font-semibold">Planos preventivos</h1>
          <p className="text-sm text-muted-foreground">
            Recorrencia por tempo, quilometragem ou ambos.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Novo plano</CardTitle>
            <CardDescription>O proximo vencimento e calculado automaticamente.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-5">
            <select
              aria-label="Veiculo"
              className="h-10 rounded-md border bg-background px-3"
              value={form.vehicleId}
              onChange={(e) => setForm((v) => ({ ...v, vehicleId: e.target.value }))}
            >
              <option value="">Veiculo</option>
              {options.data?.vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate}
                </option>
              ))}
            </select>
            <Input
              placeholder="Nome do plano"
              value={form.name}
              onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
            />
            <Input
              type="number"
              min="1"
              placeholder="Intervalo (dias)"
              value={form.intervalDays}
              onChange={(e) => setForm((v) => ({ ...v, intervalDays: e.target.value }))}
            />
            <Input
              type="number"
              min="1"
              placeholder="Intervalo (km)"
              value={form.intervalKm}
              onChange={(e) => setForm((v) => ({ ...v, intervalKm: e.target.value }))}
            />
            <Button
              disabled={
                !form.vehicleId ||
                !form.name ||
                (!form.intervalDays && !form.intervalKm) ||
                mutation.isPending
              }
              onClick={() => mutation.mutate()}
            >
              Criar plano
            </Button>
          </CardContent>
        </Card>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.data?.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <CardTitle className="text-base">{plan.name}</CardTitle>
                <CardDescription>
                  {plan.vehicle.plate} · {plan.type}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>
                  Recorrencia:{" "}
                  {[
                    plan.intervalDays ? `${plan.intervalDays} dias` : "",
                    plan.intervalKm ? `${plan.intervalKm.toLocaleString("pt-BR")} km` : "",
                  ]
                    .filter(Boolean)
                    .join(" / ")}
                </p>
                <p>
                  Proxima data:{" "}
                  {plan.nextDueAt ? new Date(plan.nextDueAt).toLocaleDateString("pt-BR") : "—"}
                </p>
                <p>Proximo hodometro: {plan.nextDueOdometer?.toLocaleString("pt-BR") ?? "—"}</p>
                <p className="text-muted-foreground">{plan._count.orders} ordens vinculadas</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </AccessGuard>
  );
}
