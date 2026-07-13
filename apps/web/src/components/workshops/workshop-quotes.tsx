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
  createWorkshopQuote,
  getWorkshopQuotes,
  getWorkshopsOptions,
  selectWorkshopQuote,
} from "@/lib/workshops";
export function WorkshopQuotes() {
  const client = useQueryClient();
  const options = useQuery({ queryKey: ["workshops-options"], queryFn: getWorkshopsOptions });
  const [form, setForm] = useState({
    maintenanceOrderId: "",
    workshopId: "",
    number: "",
    description: "",
    category: "SERVICE",
    quantity: "1",
    unitPrice: "",
    validUntil: "",
    warrantyDays: "",
  });
  const quotes = useQuery({
    queryKey: ["workshop-quotes", form.maintenanceOrderId],
    queryFn: () => getWorkshopQuotes(form.maintenanceOrderId || undefined),
  });
  const create = useMutation({
    mutationFn: () =>
      createWorkshopQuote({
        maintenanceOrderId: form.maintenanceOrderId,
        workshopId: form.workshopId,
        number: form.number,
        validUntil: form.validUntil || undefined,
        warrantyDays: form.warrantyDays ? Number(form.warrantyDays) : undefined,
        items: [
          {
            category: form.category,
            description: form.description,
            quantity: Number(form.quantity),
            unitPrice: Number(form.unitPrice),
          },
        ],
      }),
    onSuccess: async () => client.invalidateQueries({ queryKey: ["workshop-quotes"] }),
  });
  const select = useMutation({
    mutationFn: selectWorkshopQuote,
    onSuccess: async () => client.invalidateQueries({ queryKey: ["workshop-quotes"] }),
  });
  return (
    <AccessGuard permission={permissions.workshops.quotes}>
      <div className="space-y-6">
        <Breadcrumb
          items={[{ label: "Oficinas", href: "/dashboard/oficinas" }, { label: "Cotacoes" }]}
        />
        <div>
          <h1 className="text-2xl font-semibold">Cotacoes de oficina</h1>
          <p className="text-sm text-muted-foreground">
            Compare custo, prazo, garantia e avaliacao antes da selecao.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Nova proposta</CardTitle>
            <CardDescription>Uma oficina pode enviar uma proposta por ordem.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
            <select
              className="h-10 rounded-md border bg-background px-3"
              value={form.maintenanceOrderId}
              onChange={(e) => setForm((v) => ({ ...v, maintenanceOrderId: e.target.value }))}
            >
              <option value="">Ordem de manutencao</option>
              {options.data?.orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code} · {o.vehicle.plate}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border bg-background px-3"
              value={form.workshopId}
              onChange={(e) => setForm((v) => ({ ...v, workshopId: e.target.value }))}
            >
              <option value="">Oficina</option>
              {options.data?.workshops.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.tradeName} · {w.rating.toFixed(1)}
                </option>
              ))}
            </select>
            <Input
              placeholder="Numero da proposta"
              value={form.number}
              onChange={(e) => setForm((v) => ({ ...v, number: e.target.value }))}
            />
            <Input
              type="date"
              aria-label="Validade"
              value={form.validUntil}
              onChange={(e) => setForm((v) => ({ ...v, validUntil: e.target.value }))}
            />
            <select
              className="h-10 rounded-md border bg-background px-3"
              value={form.category}
              onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))}
            >
              <option>SERVICE</option>
              <option>LABOR</option>
              <option>PART</option>
              <option>FEE</option>
            </select>
            <Input
              placeholder="Descricao do item"
              value={form.description}
              onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))}
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Valor unitario"
              value={form.unitPrice}
              onChange={(e) => setForm((v) => ({ ...v, unitPrice: e.target.value }))}
            />
            <Button
              disabled={
                !form.maintenanceOrderId ||
                !form.workshopId ||
                !form.number ||
                !form.description ||
                !form.unitPrice ||
                create.isPending
              }
              onClick={() => create.mutate()}
            >
              Registrar proposta
            </Button>
          </CardContent>
        </Card>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quotes.data?.map((q) => (
            <Card key={q.id} className={q.status === "SELECTED" ? "border-primary" : ""}>
              <CardHeader>
                <CardTitle className="text-base">{q.workshop.tradeName}</CardTitle>
                <CardDescription>
                  {q.number} · {q.status} · nota {q.workshop.rating.toFixed(1)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-2xl font-semibold">{money(q.totalAmount)}</p>
                <p>Mao de obra: {money(q.laborAmount)}</p>
                <p>Pecas: {money(q.partsAmount)}</p>
                <p>Garantia: {q.warrantyDays ?? 0} dias</p>
                {q.status === "SUBMITTED" ? (
                  <Button
                    className="w-full"
                    disabled={select.isPending}
                    onClick={() => select.mutate(q.id)}
                  >
                    Selecionar proposta
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </AccessGuard>
  );
}
const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
