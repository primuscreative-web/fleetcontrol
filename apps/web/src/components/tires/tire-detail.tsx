"use client";
import { permissions } from "@fleetcontrol/authz";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LoadingState } from "@/components/feedback/loading-state";
import { Breadcrumb } from "@/components/navigation/breadcrumb";
import { AccessGuard } from "@/components/platform/access-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getTire, getTiresOptions, tireAction } from "@/lib/tires";
export function TireDetail({ id }: { id: string }) {
  const client = useQueryClient();
  const tire = useQuery({ queryKey: ["tire", id], queryFn: () => getTire(id) });
  const options = useQuery({ queryKey: ["tires-options"], queryFn: getTiresOptions });
  const [install, setInstall] = useState({ vehicleId: "", position: "", odometer: "" });
  const [inspection, setInspection] = useState({
    pressurePsi: "",
    inner: "",
    center: "",
    outer: "",
    hasDamage: false,
  });
  const [retread, setRetread] = useState({ providerName: "", cost: "", depth: "" });
  const [scrap, setScrap] = useState({ open: false, reason: "" });
  const mutation = useMutation({
    mutationFn: ({
      action,
      body,
      method,
    }: {
      action: string;
      body: Record<string, unknown>;
      method?: "POST" | "PATCH";
    }) => tireAction(id, action, body, method),
    onSuccess: async () => {
      setScrap((current) => ({ ...current, open: false }));
      await client.invalidateQueries({ queryKey: ["tire", id] });
      await client.invalidateQueries({ queryKey: ["tires-dashboard"] });
    },
  });
  if (tire.isLoading) return <LoadingState />;
  const value = tire.data;
  if (!value) return null;
  const currentRetread = value.retreads?.find((v) => ["SENT", "IN_PROGRESS"].includes(v.status));
  const odometer =
    options.data?.vehicles.find((v) => v.id === install.vehicleId)?.currentOdometer ?? 0;
  return (
    <AccessGuard permission={permissions.tires.read}>
      <div className="space-y-6">
        <Breadcrumb
          items={[{ label: "Pneus", href: "/dashboard/pneus" }, { label: value.serialNumber }]}
        />
        <div>
          <h1 className="text-2xl font-semibold">{value.serialNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {value.brand} {value.model} · {value.size} · {value.status}
          </p>
        </div>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Condicao"
            value={value.condition}
            danger={["CRITICAL", "CONDEMNED"].includes(value.condition)}
          />
          <Metric
            label="Sulco atual"
            value={
              value.currentTreadDepthMm != null ? `${value.currentTreadDepthMm.toFixed(1)} mm` : "—"
            }
          />
          <Metric
            label="Quilometragem"
            value={`${value.accumulatedKm.toLocaleString("pt-BR")} km`}
          />
          <Metric label="Custo por km" value={money(value.costPerKm)} />
        </section>
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Operacao</CardTitle>
              <CardDescription>
                {value.currentVehicle
                  ? `${value.currentVehicle.plate} · ${value.currentPosition}`
                  : "Pneu fora de veiculo"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {["IN_STOCK", "IN_REPAIR"].includes(value.status) ? (
                <div className="grid gap-3 rounded-md border p-4 md:grid-cols-4">
                  <select
                    className="h-10 rounded-md border bg-background px-3"
                    aria-label="Veiculo"
                    value={install.vehicleId}
                    onChange={(e) =>
                      setInstall((v) => ({
                        ...v,
                        vehicleId: e.target.value,
                        odometer: String(
                          options.data?.vehicles.find((x) => x.id === e.target.value)
                            ?.currentOdometer ?? "",
                        ),
                      }))
                    }
                  >
                    <option value="">Veiculo</option>
                    {options.data?.vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-10 rounded-md border bg-background px-3"
                    aria-label="Posicao"
                    value={install.position}
                    onChange={(e) => setInstall((v) => ({ ...v, position: e.target.value }))}
                  >
                    <option value="">Posicao</option>
                    {options.data?.positions.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    placeholder="Hodometro"
                    value={install.odometer}
                    onChange={(e) => setInstall((v) => ({ ...v, odometer: e.target.value }))}
                  />
                  <Button
                    disabled={!install.vehicleId || !install.position || mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        action: "install",
                        body: { ...install, odometer: Number(install.odometer || odometer) },
                      })
                    }
                  >
                    Instalar
                  </Button>
                </div>
              ) : null}
              {value.status === "INSTALLED" ? (
                <div className="flex flex-wrap gap-2 rounded-md border p-4">
                  <select
                    className="h-10 rounded-md border bg-background px-3"
                    aria-label="Nova posicao"
                    value={install.position}
                    onChange={(e) => setInstall((v) => ({ ...v, position: e.target.value }))}
                  >
                    <option value="">Nova posicao</option>
                    {options.data?.positions
                      .filter((position) => position !== value.currentPosition)
                      .map((position) => (
                        <option key={position}>{position}</option>
                      ))}
                  </select>
                  <Button
                    variant="outline"
                    disabled={!install.position || mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        action: "rotate",
                        body: {
                          position: install.position,
                          odometer:
                            options.data?.vehicles.find(
                              (vehicle) => vehicle.id === value.currentVehicle?.id,
                            )?.currentOdometer ??
                            value.installedOdometer ??
                            0,
                        },
                      })
                    }
                  >
                    Rodiziar
                  </Button>
                  <Button
                    variant="outline"
                    disabled={mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        action: "remove",
                        body: {
                          odometer: value.currentVehicle
                            ? (options.data?.vehicles.find((v) => v.id === value.currentVehicle?.id)
                                ?.currentOdometer ??
                              value.installedOdometer ??
                              0)
                            : 0,
                          reason: "Remocao operacional",
                        },
                      })
                    }
                  >
                    Remover do veiculo
                  </Button>
                </div>
              ) : null}
              <div className="grid gap-3 rounded-md border p-4 md:grid-cols-6">
                <Input
                  type="number"
                  placeholder="Pressao psi"
                  value={inspection.pressurePsi}
                  onChange={(e) => setInspection((v) => ({ ...v, pressurePsi: e.target.value }))}
                />
                <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={inspection.hasDamage}
                    onChange={(e) =>
                      setInspection((current) => ({ ...current, hasDamage: e.target.checked }))
                    }
                  />
                  Dano visivel
                </label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Sulco interno"
                  value={inspection.inner}
                  onChange={(e) => setInspection((v) => ({ ...v, inner: e.target.value }))}
                />
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Sulco central"
                  value={inspection.center}
                  onChange={(e) => setInspection((v) => ({ ...v, center: e.target.value }))}
                />
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Sulco externo"
                  value={inspection.outer}
                  onChange={(e) => setInspection((v) => ({ ...v, outer: e.target.value }))}
                />
                <Button
                  disabled={
                    mutation.isPending ||
                    (!inspection.pressurePsi &&
                      !inspection.inner &&
                      !inspection.center &&
                      !inspection.outer)
                  }
                  onClick={() =>
                    mutation.mutate({
                      action: "inspections",
                      method: "POST",
                      body: {
                        pressurePsi: inspection.pressurePsi
                          ? Number(inspection.pressurePsi)
                          : undefined,
                        treadDepthInnerMm: inspection.inner ? Number(inspection.inner) : undefined,
                        treadDepthCenterMm: inspection.center
                          ? Number(inspection.center)
                          : undefined,
                        treadDepthOuterMm: inspection.outer ? Number(inspection.outer) : undefined,
                        hasDamage: inspection.hasDamage,
                      },
                    })
                  }
                >
                  Inspecionar
                </Button>
              </div>
              {value.status !== "INSTALLED" &&
              value.status !== "SCRAPPED" &&
              value.status !== "IN_RETREAD" ? (
                <div className="grid gap-3 rounded-md border p-4 md:grid-cols-3">
                  <Input
                    placeholder="Recapadora"
                    value={retread.providerName}
                    onChange={(e) => setRetread((v) => ({ ...v, providerName: e.target.value }))}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Custo estimado"
                    value={retread.cost}
                    onChange={(e) => setRetread((v) => ({ ...v, cost: e.target.value }))}
                  />
                  <Button
                    disabled={!retread.providerName || mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        action: "retreads",
                        method: "POST",
                        body: {
                          providerName: retread.providerName,
                          cost: Number(retread.cost || 0),
                        },
                      })
                    }
                  >
                    Enviar para recapagem
                  </Button>
                </div>
              ) : null}
              {!["INSTALLED", "SCRAPPED", "IN_RETREAD"].includes(value.status) ? (
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    disabled={mutation.isPending}
                    onClick={() => setScrap((current) => ({ ...current, open: true }))}
                  >
                    Descartar pneu
                  </Button>
                </div>
              ) : null}
              {currentRetread ? (
                <div className="grid gap-3 rounded-md border p-4 md:grid-cols-3">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Custo final"
                    value={retread.cost}
                    onChange={(e) => setRetread((v) => ({ ...v, cost: e.target.value }))}
                  />
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Novo sulco mm"
                    value={retread.depth}
                    onChange={(e) => setRetread((v) => ({ ...v, depth: e.target.value }))}
                  />
                  <Button
                    disabled={!retread.depth || mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        action: `retreads/${currentRetread.id}/complete`,
                        body: {
                          cost: Number(retread.cost),
                          newTreadDepthMm: Number(retread.depth),
                        },
                      })
                    }
                  >
                    Concluir recapagem
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
              <CardTitle>Historico</CardTitle>
              <CardDescription>Ultimas movimentacoes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {value.movements?.map((movement) => (
                <div key={movement.id} className="border-b pb-3 text-sm last:border-0">
                  <p className="font-medium">{movement.type}</p>
                  <p className="text-muted-foreground">
                    {new Date(movement.occurredAt).toLocaleString("pt-BR")}
                  </p>
                  <p>
                    {movement.fromPosition || "—"} → {movement.toPosition || "—"}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <Dialog
          open={scrap.open}
          onOpenChange={(open) => setScrap((current) => ({ ...current, open }))}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar descarte</DialogTitle>
              <DialogDescription>
                O pneu sera condenado e nao podera voltar a operacao. Informe a justificativa
                tecnica.
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="Motivo do descarte"
              value={scrap.reason}
              onChange={(event) =>
                setScrap((current) => ({ ...current, reason: event.target.value }))
              }
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setScrap((current) => ({ ...current, open: false }))}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={!scrap.reason || mutation.isPending}
                onClick={() => mutation.mutate({ action: "scrap", body: { reason: scrap.reason } })}
              >
                Confirmar descarte
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AccessGuard>
  );
}
function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className={danger ? "text-destructive" : ""}>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 4 });
