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
import { getMaintenanceOrder, transitionMaintenance } from "@/lib/maintenance";
export function MaintenanceDetail({ id }: { id: string }) {
  const client = useQueryClient();
  const [resolution, setResolution] = useState("");
  const [item, setItem] = useState({
    description: "",
    type: "SERVICE",
    quantity: "1",
    unitCost: "0",
  });
  const query = useQuery({
    queryKey: ["maintenance-order", id],
    queryFn: () => getMaintenanceOrder(id),
  });
  const mutation = useMutation({
    mutationFn: ({
      action,
      body,
    }: {
      action: "approve" | "reject" | "start" | "complete";
      body?: Record<string, unknown>;
    }) => transitionMaintenance(id, action, body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["maintenance-order", id] });
      await client.invalidateQueries({ queryKey: ["maintenance-dashboard"] });
    },
  });
  if (query.isLoading) return <LoadingState />;
  const order = query.data;
  if (!order) return null;
  const complete = () =>
    mutation.mutate({
      action: "complete",
      body: {
        resolution,
        items: item.description
          ? [
              {
                type: item.type,
                description: item.description,
                quantity: Number(item.quantity),
                unitCost: Number(item.unitCost),
              },
            ]
          : [],
      },
    });
  return (
    <AccessGuard permission={permissions.maintenance.read}>
      <div className="space-y-6">
        <Breadcrumb
          items={[{ label: "Manutencao", href: "/dashboard/manutencao" }, { label: order.code }]}
        />
        <div>
          <h1 className="text-2xl font-semibold">
            {order.code} · {order.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {order.vehicle.plate} · {order.type} · {order.priority}
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Execucao</CardTitle>
              <CardDescription>Status atual: {order.status}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{order.description || "Sem descricao adicional."}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Info label="Hodometro" value={order.odometer.toLocaleString("pt-BR")} />
                <Info label="Estimativa" value={money(order.estimatedCost || 0)} />
                <Info label="Realizado" value={money(order.actualCost)} />
              </div>
              {order.status === "AWAITING_APPROVAL" ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        action: "reject",
                        body: { reason: "Reprovada na conferencia" },
                      })
                    }
                  >
                    Rejeitar
                  </Button>
                  <Button
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ action: "approve" })}
                  >
                    Aprovar
                  </Button>
                </div>
              ) : null}
              {order.status === "APPROVED" || order.status === "PAUSED" ? (
                <Button
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ action: "start" })}
                >
                  Iniciar manutencao
                </Button>
              ) : null}
              {order.status === "IN_PROGRESS" ? (
                <div className="space-y-3 rounded-md border p-4">
                  <h2 className="font-medium">Conclusao</h2>
                  <label className="space-y-2 text-sm">
                    Resolucao
                    <textarea
                      required
                      className="mt-2 min-h-20 w-full rounded-md border bg-background p-3"
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      Item/servico
                      <Input
                        value={item.description}
                        onChange={(e) => setItem((v) => ({ ...v, description: e.target.value }))}
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      Custo unitario
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitCost}
                        onChange={(e) => setItem((v) => ({ ...v, unitCost: e.target.value }))}
                      />
                    </label>
                  </div>
                  <Button disabled={!resolution || mutation.isPending} onClick={complete}>
                    Concluir ordem
                  </Button>
                </div>
              ) : null}
              {mutation.error ? (
                <p className="text-sm text-destructive">{mutation.error.message}</p>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Itens</CardTitle>
              <CardDescription>Composicao do custo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.items.length ? (
                order.items.map((value, index) => (
                  <div key={value.id ?? index} className="border-b pb-3 text-sm last:border-0">
                    <p className="font-medium">{value.description}</p>
                    <p className="text-muted-foreground">
                      {value.quantity} × {money(value.unitCost)} ·{" "}
                      {money(value.totalCost ?? value.quantity * value.unitCost)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum item registrado.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AccessGuard>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
