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
import { createFueling, getFuelOptions } from "@/lib/fuel";

export function FuelForm() {
  const router = useRouter();
  const options = useQuery({ queryKey: ["fuel-options"], queryFn: getFuelOptions });
  const [form, setForm] = useState({
    stationId: "",
    vehicleId: "",
    driverId: "",
    fuelType: "DIESEL",
    fueledAt: new Date().toISOString().slice(0, 16),
    odometer: "",
    liters: "",
    unitPrice: "",
    invoiceNumber: "",
    notes: "",
  });
  const mutation = useMutation({
    mutationFn: createFueling,
    onSuccess: () => router.push("/dashboard/abastecimentos"),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({
      ...form,
      driverId: form.driverId || undefined,
      odometer: Number(form.odometer),
      liters: Number(form.liters),
      unitPrice: Number(form.unitPrice),
      totalAmount: Number(form.liters) * Number(form.unitPrice),
      fueledAt: new Date(form.fueledAt).toISOString(),
      fullTank: true,
    });
  };
  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((value) => ({ ...value, [key]: event.target.value })),
  });
  return (
    <AccessGuard permission={permissions.fuel.manage}>
      <form className="space-y-6" onSubmit={submit}>
        <Breadcrumb
          items={[
            { label: "Abastecimentos", href: "/dashboard/abastecimentos" },
            { label: "Novo" },
          ]}
        />
        <div>
          <h1 className="text-2xl font-semibold">Registrar abastecimento</h1>
          <p className="text-sm text-muted-foreground">
            O registro passa por conferencia antes de compor custos e indicadores.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Dados operacionais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              Veiculo
              <select
                required
                className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                {...field("vehicleId")}
              >
                <option value="">Selecione</option>
                {options.data?.vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              Posto
              <select
                required
                className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                {...field("stationId")}
              >
                <option value="">Selecione</option>
                {options.data?.stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              Combustivel
              <select
                className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                {...field("fuelType")}
              >
                {options.data?.fuelTypes.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              Data e hora
              <Input required type="datetime-local" {...field("fueledAt")} />
            </label>
            <label className="space-y-2 text-sm">
              Hodometro
              <Input required type="number" min="0" step="0.1" {...field("odometer")} />
            </label>
            <label className="space-y-2 text-sm">
              Litros
              <Input required type="number" min="0.001" step="0.001" {...field("liters")} />
            </label>
            <label className="space-y-2 text-sm">
              Preco unitario
              <Input required type="number" min="0.0001" step="0.0001" {...field("unitPrice")} />
            </label>
            <label className="space-y-2 text-sm">
              Nota fiscal
              <Input {...field("invoiceNumber")} />
            </label>
            <div className="md:col-span-2 flex justify-end">
              <Button disabled={mutation.isPending} type="submit">
                {mutation.isPending ? "Salvando..." : "Enviar para aprovacao"}
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
