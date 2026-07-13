"use client";
import { permissions } from "@fleetcontrol/authz";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { Breadcrumb } from "@/components/navigation/breadcrumb";
import { AccessGuard } from "@/components/platform/access-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createTire } from "@/lib/tires";
export function TireForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    serialNumber: "",
    fireNumber: "",
    brand: "",
    model: "",
    size: "",
    dot: "",
    purchasedAt: "",
    purchaseCost: "",
    supplierName: "",
    invoiceNumber: "",
    warrantyUntil: "",
    initialTreadDepthMm: "",
    minimumTreadDepthMm: "1.6",
    recommendedPressurePsi: "",
    maxRetreads: "2",
    notes: "",
  });
  const mutation = useMutation({
    mutationFn: () =>
      createTire({
        ...form,
        purchasedAt: form.purchasedAt || undefined,
        warrantyUntil: form.warrantyUntil || undefined,
        purchaseCost: form.purchaseCost ? Number(form.purchaseCost) : undefined,
        initialTreadDepthMm: form.initialTreadDepthMm
          ? Number(form.initialTreadDepthMm)
          : undefined,
        minimumTreadDepthMm: Number(form.minimumTreadDepthMm),
        recommendedPressurePsi: form.recommendedPressurePsi
          ? Number(form.recommendedPressurePsi)
          : undefined,
        maxRetreads: Number(form.maxRetreads),
      }),
    onSuccess: (tire) => router.push(`/dashboard/pneus/${tire.id}`),
  });
  const change = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((v) => ({ ...v, [key]: e.target.value })),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };
  return (
    <AccessGuard permission={permissions.tires.manage}>
      <form className="space-y-6" onSubmit={submit}>
        <Breadcrumb items={[{ label: "Pneus", href: "/dashboard/pneus" }, { label: "Novo" }]} />
        <div>
          <h1 className="text-2xl font-semibold">Cadastrar pneu</h1>
          <p className="text-sm text-muted-foreground">
            Identificacao individual, aquisicao e parametros tecnicos.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Dados do ativo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Numero de serie" required {...change("serialNumber")} />
            <Field label="Numero de fogo" {...change("fireNumber")} />
            <Field label="Marca" required {...change("brand")} />
            <Field label="Modelo" required {...change("model")} />
            <Field label="Medida" required {...change("size")} />
            <Field label="DOT" {...change("dot")} />
            <Field label="Data da compra" type="date" {...change("purchasedAt")} />
            <Field label="Custo de compra" type="number" step="0.01" {...change("purchaseCost")} />
            <Field label="Fornecedor" {...change("supplierName")} />
            <Field label="Nota fiscal" {...change("invoiceNumber")} />
            <Field label="Garantia ate" type="date" {...change("warrantyUntil")} />
            <Field
              label="Sulco inicial (mm)"
              type="number"
              step="0.1"
              {...change("initialTreadDepthMm")}
            />
            <Field
              label="Sulco minimo (mm)"
              type="number"
              step="0.1"
              {...change("minimumTreadDepthMm")}
            />
            <Field
              label="Pressao recomendada (psi)"
              type="number"
              step="0.1"
              {...change("recommendedPressurePsi")}
            />
            <Field label="Maximo de recapagens" type="number" {...change("maxRetreads")} />
            <label className="space-y-2 text-sm md:col-span-2 xl:col-span-3">
              Observacoes
              <textarea
                className="mt-2 min-h-20 w-full rounded-md border bg-background p-3"
                {...change("notes")}
              />
            </label>
            <div className="flex justify-end md:col-span-2 xl:col-span-3">
              <Button disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : "Cadastrar pneu"}
              </Button>
            </div>
            {mutation.error ? (
              <p className="text-sm text-destructive">{mutation.error.message}</p>
            ) : null}
          </CardContent>
        </Card>
      </form>
    </AccessGuard>
  );
}
function Field({ label, ...props }: React.ComponentProps<typeof Input> & { label: string }) {
  return (
    <label className="space-y-2 text-sm">
      {label}
      <Input {...props} />
    </label>
  );
}
