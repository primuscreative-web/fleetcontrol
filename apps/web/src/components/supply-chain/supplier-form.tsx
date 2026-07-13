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
import { createSupplier } from "@/lib/supply-chain";
export function SupplierForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    legalName: "",
    tradeName: "",
    document: "",
    category: "AUTO_PARTS",
    contactName: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    paymentTermsDays: "",
    leadTimeDays: "",
    notes: "",
  });
  const mutation = useMutation({
    mutationFn: () =>
      createSupplier({
        ...form,
        paymentTermsDays: form.paymentTermsDays ? Number(form.paymentTermsDays) : undefined,
        leadTimeDays: form.leadTimeDays ? Number(form.leadTimeDays) : undefined,
      }),
    onSuccess: () => router.push("/dashboard/fornecedores"),
  });
  const change = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((v) => ({ ...v, [k]: e.target.value })),
  });
  return (
    <AccessGuard permission={permissions.suppliers.manage}>
      <form
        className="space-y-6"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <Breadcrumb
          items={[{ label: "Fornecedores", href: "/dashboard/fornecedores" }, { label: "Novo" }]}
        />
        <h1 className="text-2xl font-semibold">Cadastrar fornecedor</h1>
        <Card>
          <CardHeader>
            <CardTitle>Dados fiscais e comerciais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Razao social" required {...change("legalName")} />
            <Field label="Nome fantasia" required {...change("tradeName")} />
            <Field label="CNPJ/Documento" required {...change("document")} />
            <label className="space-y-2 text-sm">
              Categoria
              <select
                className="mt-2 h-10 w-full rounded-md border bg-background px-3"
                {...change("category")}
              >
                <option>AUTO_PARTS</option>
                <option>TIRES</option>
                <option>FUEL</option>
                <option>SERVICES</option>
                <option>EQUIPMENT</option>
                <option>GENERAL</option>
              </select>
            </label>
            <Field label="Contato" {...change("contactName")} />
            <Field label="E-mail" type="email" {...change("email")} />
            <Field label="Telefone" {...change("phone")} />
            <Field label="Cidade" {...change("city")} />
            <Field label="UF" {...change("state")} />
            <Field label="Pagamento (dias)" type="number" {...change("paymentTermsDays")} />
            <Field label="Lead time (dias)" type="number" {...change("leadTimeDays")} />
            <div className="flex justify-end md:col-span-2 xl:col-span-3">
              <Button disabled={mutation.isPending}>Enviar para homologacao</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </AccessGuard>
  );
}
function Field({ label, ...p }: React.ComponentProps<typeof Input> & { label: string }) {
  return (
    <label className="space-y-2 text-sm">
      {label}
      <Input {...p} />
    </label>
  );
}
