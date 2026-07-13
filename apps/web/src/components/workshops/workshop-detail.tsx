"use client";
import { permissions } from "@fleetcontrol/authz";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LoadingState } from "@/components/feedback/loading-state";
import { Breadcrumb } from "@/components/navigation/breadcrumb";
import { AccessGuard } from "@/components/platform/access-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getWorkshop, workshopAction } from "@/lib/workshops";
export function WorkshopDetail({ id }: { id: string }) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["workshop", id], queryFn: () => getWorkshop(id) });
  const [service, setService] = useState({
    name: "",
    category: "GENERAL",
    fixedPrice: "",
    laborRate: "",
    warrantyDays: "",
  });
  const mutation = useMutation({
    mutationFn: ({
      action,
      body = {},
      method = "PATCH",
    }: {
      action: string;
      body?: Record<string, unknown>;
      method?: "POST" | "PATCH";
    }) => workshopAction(id, action, body, method),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["workshop", id] });
      await client.invalidateQueries({ queryKey: ["workshops-dashboard"] });
    },
  });
  if (query.isLoading) return <LoadingState />;
  const w = query.data;
  if (!w) return null;
  return (
    <AccessGuard permission={permissions.workshops.read}>
      <div className="space-y-6">
        <Breadcrumb
          items={[{ label: "Oficinas", href: "/dashboard/oficinas" }, { label: w.tradeName }]}
        />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{w.tradeName}</h1>
            <p className="text-sm text-muted-foreground">
              {w.legalName} · {w.document} · {w.status}
            </p>
          </div>
          <div className="flex gap-2">
            {w.status === "PENDING_APPROVAL" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    mutation.mutate({
                      action: "reject",
                      body: { reason: "Documentacao insuficiente" },
                    })
                  }
                >
                  Rejeitar
                </Button>
                <Button onClick={() => mutation.mutate({ action: "approve" })}>Homologar</Button>
              </>
            ) : null}
            {w.status === "APPROVED" ? (
              <Button
                variant="destructive"
                onClick={() =>
                  mutation.mutate({
                    action: "suspend",
                    body: { reason: "Suspensao administrativa" },
                  })
                }
              >
                Suspender
              </Button>
            ) : null}
          </div>
        </div>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Avaliacao" value={`${w.rating.toFixed(2)} / 5`} />
          <Metric label="Avaliacoes" value={String(w.evaluationCount)} />
          <Metric label="Faturamento" value={money(w.totalBilled)} />
          <Metric label="SLA" value={w.slaCompletionDays ? `${w.slaCompletionDays} dias` : "—"} />
        </section>
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Catalogo de servicos</CardTitle>
              <CardDescription>Especialidades, precos e garantias de referencia.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-5">
                <Input
                  placeholder="Servico"
                  value={service.name}
                  onChange={(e) => setService((v) => ({ ...v, name: e.target.value }))}
                />
                <select
                  className="h-10 rounded-md border bg-background px-3"
                  value={service.category}
                  onChange={(e) => setService((v) => ({ ...v, category: e.target.value }))}
                >
                  <option>GENERAL</option>
                  <option>ENGINE</option>
                  <option>BRAKES</option>
                  <option>SUSPENSION</option>
                  <option>ELECTRICAL</option>
                  <option>BODYWORK</option>
                  <option>TIRES</option>
                </select>
                <Input
                  type="number"
                  placeholder="Preco fixo"
                  value={service.fixedPrice}
                  onChange={(e) => setService((v) => ({ ...v, fixedPrice: e.target.value }))}
                />
                <Input
                  type="number"
                  placeholder="Mao de obra/h"
                  value={service.laborRate}
                  onChange={(e) => setService((v) => ({ ...v, laborRate: e.target.value }))}
                />
                <Button
                  disabled={!service.name || mutation.isPending}
                  onClick={() =>
                    mutation.mutate({
                      action: "services",
                      method: "POST",
                      body: {
                        name: service.name,
                        category: service.category,
                        fixedPrice: service.fixedPrice ? Number(service.fixedPrice) : undefined,
                        laborRate: service.laborRate ? Number(service.laborRate) : undefined,
                      },
                    })
                  }
                >
                  Adicionar
                </Button>
              </div>
              <div className="divide-y rounded-md border">
                {w.services?.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-muted-foreground">
                        {s.category} · garantia {s.warrantyDays ?? w.defaultWarrantyDays ?? 0} dias
                      </p>
                    </div>
                    <p>
                      {s.fixedPrice != null
                        ? money(s.fixedPrice)
                        : s.laborRate != null
                          ? `${money(s.laborRate)}/h`
                          : "Sob consulta"}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Contato</CardTitle>
              <CardDescription>{[w.city, w.state].filter(Boolean).join("/")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{w.phone || "Sem telefone"}</p>
              <p>{w.email || "Sem e-mail"}</p>
              <p>Pagamento: {w.paymentTermsDays ?? 0} dias</p>
              <p>Garantia: {w.defaultWarrantyDays ?? 0} dias</p>
            </CardContent>
          </Card>
        </div>
        {mutation.error ? (
          <p className="text-sm text-destructive">{mutation.error.message}</p>
        ) : null}
      </div>
    </AccessGuard>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
