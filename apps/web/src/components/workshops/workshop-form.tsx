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
import { createWorkshop } from "@/lib/workshops";
export function WorkshopForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    code: "",
    legalName: "",
    tradeName: "",
    document: "",
    type: "EXTERNAL",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    paymentTermsDays: "",
    defaultWarrantyDays: "",
    slaResponseHours: "",
    slaCompletionDays: "",
    notes: "",
  });
  const mutation = useMutation({
    mutationFn: () =>
      createWorkshop({
        ...form,
        paymentTermsDays: form.paymentTermsDays ? Number(form.paymentTermsDays) : undefined,
        defaultWarrantyDays: form.defaultWarrantyDays
          ? Number(form.defaultWarrantyDays)
          : undefined,
        slaResponseHours: form.slaResponseHours ? Number(form.slaResponseHours) : undefined,
        slaCompletionDays: form.slaCompletionDays ? Number(form.slaCompletionDays) : undefined,
      }),
    onSuccess: (w) => router.push(`/dashboard/oficinas/${w.id}`),
  });
  const change = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((v) => ({ ...v, [key]: e.target.value })),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };
  return (
    <AccessGuard permission={permissions.workshops.manage}>
      <form className="space-y-6" onSubmit={submit}>
        <Breadcrumb
          items={[{ label: "Oficinas", href: "/dashboard/oficinas" }, { label: "Nova" }]}
        />
        <div>
          <h1 className="text-2xl font-semibold">Cadastrar oficina</h1>
          <p className="text-sm text-muted-foreground">
            O cadastro passa por homologacao antes de receber ordens.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Dados fiscais e operacionais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Razao social" required {...change("legalName")} />
            <Field label="Nome fantasia" required {...change("tradeName")} />
            <Field label="CNPJ/Documento" required {...change("document")} />
            <Field label="Codigo" {...change("code")} />
            <label className="space-y-2 text-sm">
              Tipo
              <select
                className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                {...change("type")}
              >
                <option value="EXTERNAL">Externa</option>
                <option value="INTERNAL">Interna</option>
                <option value="MOBILE">Movel</option>
              </select>
            </label>
            <Field label="Contato" {...change("contactName")} />
            <Field label="E-mail" type="email" {...change("email")} />
            <Field label="Telefone" {...change("phone")} />
            <Field label="Endereco" {...change("address")} />
            <Field label="Cidade" {...change("city")} />
            <Field label="UF" maxLength={2} {...change("state")} />
            <Field label="CEP" {...change("postalCode")} />
            <Field label="Prazo pagamento (dias)" type="number" {...change("paymentTermsDays")} />
            <Field
              label="Garantia padrao (dias)"
              type="number"
              {...change("defaultWarrantyDays")}
            />
            <Field label="SLA resposta (horas)" type="number" {...change("slaResponseHours")} />
            <Field label="SLA conclusao (dias)" type="number" {...change("slaCompletionDays")} />
            <label className="space-y-2 text-sm md:col-span-2 xl:col-span-3">
              Observacoes
              <textarea
                className="mt-2 min-h-20 w-full rounded-md border bg-background p-3"
                {...change("notes")}
              />
            </label>
            <div className="flex justify-end md:col-span-2 xl:col-span-3">
              <Button disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : "Enviar para homologacao"}
              </Button>
            </div>
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
