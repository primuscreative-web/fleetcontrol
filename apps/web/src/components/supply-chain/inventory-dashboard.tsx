"use client";
import { permissions } from "@fleetcontrol/authz";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Boxes,
  Building2,
  DollarSign,
  PackageCheck,
  ShoppingCart,
} from "lucide-react";
import { useState } from "react";
import { Breadcrumb } from "@/components/navigation/breadcrumb";
import { AccessGuard } from "@/components/platform/access-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createPart,
  createPurchaseOrder,
  createWarehouse,
  getParts,
  getPurchaseOrders,
  getSupplyDashboard,
  getSupplyOptions,
  getWarehouses,
  inventoryAction,
  purchaseAction,
} from "@/lib/supply-chain";
export function InventoryDashboard() {
  const client = useQueryClient();
  const dashboard = useQuery({ queryKey: ["inventory-dashboard"], queryFn: getSupplyDashboard });
  const parts = useQuery({ queryKey: ["parts"], queryFn: () => getParts() });
  const options = useQuery({ queryKey: ["supply-options"], queryFn: getSupplyOptions });
  const orders = useQuery({ queryKey: ["purchase-orders"], queryFn: getPurchaseOrders });
  const warehouses = useQuery({ queryKey: ["warehouses"], queryFn: getWarehouses });
  const [part, setPart] = useState({
    sku: "",
    name: "",
    category: "",
    unit: "UN",
    minimumStock: "0",
    reorderPoint: "0",
  });
  const [warehouse, setWarehouse] = useState({ code: "", name: "" });
  const [po, setPo] = useState({
    number: "",
    supplierId: "",
    warehouseId: "",
    partId: "",
    quantity: "1",
    unitPrice: "",
  });
  const [issue, setIssue] = useState({
    warehouseId: "",
    partId: "",
    maintenanceOrderId: "",
    quantity: "1",
  });
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["inventory-dashboard"] }),
      client.invalidateQueries({ queryKey: ["parts"] }),
      client.invalidateQueries({ queryKey: ["purchase-orders"] }),
      client.invalidateQueries({ queryKey: ["warehouses"] }),
      client.invalidateQueries({ queryKey: ["supply-options"] }),
    ]);
  };
  const createPartMutation = useMutation({
    mutationFn: () =>
      createPart({
        ...part,
        minimumStock: Number(part.minimumStock),
        reorderPoint: Number(part.reorderPoint),
      }),
    onSuccess: refresh,
  });
  const createWarehouseMutation = useMutation({
    mutationFn: () => createWarehouse(warehouse),
    onSuccess: refresh,
  });
  const createPoMutation = useMutation({
    mutationFn: () =>
      createPurchaseOrder({
        number: po.number,
        supplierId: po.supplierId,
        warehouseId: po.warehouseId,
        items: [
          { partId: po.partId, quantity: Number(po.quantity), unitPrice: Number(po.unitPrice) },
        ],
      }),
    onSuccess: refresh,
  });
  const action = useMutation({
    mutationFn: ({ path, body }: { path: string; body: Record<string, unknown> }) =>
      inventoryAction(path, body),
    onSuccess: refresh,
  });
  const review = useMutation({
    mutationFn: ({ id, a, body = {} }: { id: string; a: string; body?: Record<string, unknown> }) =>
      purchaseAction(id, a, body),
    onSuccess: refresh,
  });
  const d = dashboard.data;
  const metrics = d
    ? ([
        ["Valor em estoque", money(d.inventoryValue), DollarSign],
        ["Pecas com saldo", d.stockedParts, Boxes],
        ["Baixo estoque", d.lowStock, AlertTriangle],
        ["Pedidos abertos", d.openPurchaseOrders, ShoppingCart],
        ["Aguardando aprovacao", d.pendingApproval, PackageCheck],
        ["Almoxarifados", d.warehouses, Building2],
      ] as const)
    : [];
  return (
    <AccessGuard permission={permissions.inventory.read}>
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Estoque e compras" }]} />
        <div>
          <h1 className="text-2xl font-semibold">Estoque e compras</h1>
          <p className="text-sm text-muted-foreground">
            Pecas, custo medio, reposicao, compras e consumo por manutencao.
          </p>
        </div>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metrics.map(([label, value, Icon]) => (
            <Card key={label}>
              <CardHeader className="flex-row justify-between">
                <div>
                  <CardDescription>{label}</CardDescription>
                  <CardTitle className="text-2xl">{value}</CardTitle>
                </div>
                <Icon className="size-5 text-primary" />
              </CardHeader>
            </Card>
          ))}
        </section>
        <Tabs defaultValue="stock">
          <TabsList>
            <TabsTrigger value="stock">Estoque</TabsTrigger>
            <TabsTrigger value="purchases">Compras</TabsTrigger>
            <TabsTrigger value="operations">Operacoes</TabsTrigger>
            <TabsTrigger value="setup">Cadastros</TabsTrigger>
          </TabsList>
          <TabsContent value="stock">
            <Card>
              <CardHeader>
                <CardTitle>Saldo por peca</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Peca</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Reservado</TableHead>
                      <TableHead>Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parts.data?.data.map((p) => {
                      const on = p.stockLevels.reduce((s, l) => s + l.quantityOnHand, 0),
                        res = p.stockLevels.reduce((s, l) => s + l.quantityReserved, 0),
                        val = p.stockLevels.reduce(
                          (s, l) => s + l.quantityOnHand * l.averageUnitCost,
                          0,
                        );
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.sku}</TableCell>
                          <TableCell>{p.name}</TableCell>
                          <TableCell>{p.category || "—"}</TableCell>
                          <TableCell
                            className={on - res <= p.reorderPoint ? "text-destructive" : ""}
                          >
                            {on} {p.unit}
                          </TableCell>
                          <TableCell>{res}</TableCell>
                          <TableCell>{money(val)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="purchases" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Novo pedido</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                <Input
                  placeholder="Numero"
                  value={po.number}
                  onChange={(e) => setPo((v) => ({ ...v, number: e.target.value }))}
                />
                <Select
                  value={po.supplierId}
                  onChange={(v) => setPo((x) => ({ ...x, supplierId: v }))}
                  label="Fornecedor"
                  items={options.data?.suppliers.map((x) => [x.id, x.tradeName])}
                />
                <Select
                  value={po.warehouseId}
                  onChange={(v) => setPo((x) => ({ ...x, warehouseId: v }))}
                  label="Almoxarifado"
                  items={options.data?.warehouses.map((x) => [x.id, x.name])}
                />
                <Select
                  value={po.partId}
                  onChange={(v) => setPo((x) => ({ ...x, partId: v }))}
                  label="Peca"
                  items={options.data?.parts.map((x) => [x.id, `${x.sku} - ${x.name}`])}
                />
                <Input
                  type="number"
                  placeholder="Qtd"
                  value={po.quantity}
                  onChange={(e) => setPo((v) => ({ ...v, quantity: e.target.value }))}
                />
                <Input
                  type="number"
                  placeholder="Preco"
                  value={po.unitPrice}
                  onChange={(e) => setPo((v) => ({ ...v, unitPrice: e.target.value }))}
                />
                <Button
                  className="xl:col-start-6"
                  disabled={
                    !po.number || !po.supplierId || !po.warehouseId || !po.partId || !po.unitPrice
                  }
                  onClick={() => createPoMutation.mutate()}
                >
                  Criar pedido
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Recebimento</TableHead>
                      <TableHead>Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.data?.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>{o.number}</TableCell>
                        <TableCell>{o.supplier.tradeName}</TableCell>
                        <TableCell>{o.status}</TableCell>
                        <TableCell>{money(o.totalAmount)}</TableCell>
                        <TableCell>
                          {o.items
                            .map((i) => `${i.quantityReceived}/${i.quantityOrdered}`)
                            .join(", ")}
                        </TableCell>
                        <TableCell>
                          {o.status === "AWAITING_APPROVAL" ? (
                            <Button
                              size="sm"
                              onClick={() => review.mutate({ id: o.id, a: "approve" })}
                            >
                              Aprovar
                            </Button>
                          ) : ["APPROVED", "ORDERED", "PARTIALLY_RECEIVED"].includes(o.status) &&
                            o.items.find((i) => i.quantityReceived < i.quantityOrdered) ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                const i = o.items.find(
                                  (x) => x.quantityReceived < x.quantityOrdered,
                                )!;
                                review.mutate({
                                  id: o.id,
                                  a: "receipts",
                                  body: {
                                    purchaseOrderItemId: i.id,
                                    quantity: i.quantityOrdered - i.quantityReceived,
                                  },
                                });
                              }}
                            >
                              Receber saldo
                            </Button>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="operations">
            <Card>
              <CardHeader>
                <CardTitle>Baixa para manutencao</CardTitle>
                <CardDescription>O custo medio entra automaticamente na ordem.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-5">
                <Select
                  value={issue.warehouseId}
                  onChange={(v) => setIssue((x) => ({ ...x, warehouseId: v }))}
                  label="Almoxarifado"
                  items={options.data?.warehouses.map((x) => [x.id, x.name])}
                />
                <Select
                  value={issue.partId}
                  onChange={(v) => setIssue((x) => ({ ...x, partId: v }))}
                  label="Peca"
                  items={options.data?.parts.map((x) => [x.id, `${x.sku} - ${x.name}`])}
                />
                <Select
                  value={issue.maintenanceOrderId}
                  onChange={(v) => setIssue((x) => ({ ...x, maintenanceOrderId: v }))}
                  label="Ordem"
                  items={options.data?.maintenanceOrders.map((x) => [
                    x.id,
                    `${x.code} - ${x.vehicle.plate}`,
                  ])}
                />
                <Input
                  type="number"
                  value={issue.quantity}
                  onChange={(e) => setIssue((v) => ({ ...v, quantity: e.target.value }))}
                />
                <Button
                  disabled={!issue.warehouseId || !issue.partId || !issue.maintenanceOrderId}
                  onClick={() =>
                    action.mutate({
                      path: "issues",
                      body: { ...issue, quantity: Number(issue.quantity) },
                    })
                  }
                >
                  Dar baixa
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="setup" className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Nova peca</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="SKU"
                  value={part.sku}
                  onChange={(e) => setPart((v) => ({ ...v, sku: e.target.value }))}
                />
                <Input
                  placeholder="Nome"
                  value={part.name}
                  onChange={(e) => setPart((v) => ({ ...v, name: e.target.value }))}
                />
                <Input
                  placeholder="Categoria"
                  value={part.category}
                  onChange={(e) => setPart((v) => ({ ...v, category: e.target.value }))}
                />
                <Input
                  placeholder="Unidade"
                  value={part.unit}
                  onChange={(e) => setPart((v) => ({ ...v, unit: e.target.value }))}
                />
                <Button
                  disabled={!part.sku || !part.name}
                  onClick={() => createPartMutation.mutate()}
                >
                  Cadastrar peca
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Novo almoxarifado</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="Codigo"
                  value={warehouse.code}
                  onChange={(e) => setWarehouse((v) => ({ ...v, code: e.target.value }))}
                />
                <Input
                  placeholder="Nome"
                  value={warehouse.name}
                  onChange={(e) => setWarehouse((v) => ({ ...v, name: e.target.value }))}
                />
                <Button
                  disabled={!warehouse.code || !warehouse.name}
                  onClick={() => createWarehouseMutation.mutate()}
                >
                  Cadastrar
                </Button>
                <p className="text-sm text-muted-foreground">
                  {warehouses.data?.length ?? 0} almoxarifados ativos.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AccessGuard>
  );
}
function Select({
  value,
  onChange,
  label,
  items = [],
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  items?: Array<[string, string]>;
}) {
  return (
    <select
      aria-label={label}
      className="h-10 rounded-md border bg-background px-3"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{label}</option>
      {items.map(([id, name]) => (
        <option key={id} value={id}>
          {name}
        </option>
      ))}
    </select>
  );
}
const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
