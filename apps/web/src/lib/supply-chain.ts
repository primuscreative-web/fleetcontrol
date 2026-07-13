import { apiRequest } from "./api-client";
export interface Supplier {
  id: string;
  tradeName: string;
  legalName: string;
  document: string;
  category: string;
  status: string;
  rating: number;
  evaluationCount: number;
  totalPurchased: number;
  leadTimeDays?: number | null;
  paymentTermsDays?: number | null;
}
export interface StockLevel {
  quantityOnHand: number;
  quantityReserved: number;
  averageUnitCost: number;
  warehouse: { id: string; name: string; code: string };
}
export interface Part {
  id: string;
  sku: string;
  name: string;
  category?: string | null;
  unit: string;
  minimumStock: number;
  reorderPoint: number;
  stockLevels: StockLevel[];
}
export interface PurchaseOrder {
  id: string;
  number: string;
  status: string;
  totalAmount: number;
  expectedAt?: string | null;
  supplier: { id: string; tradeName: string };
  warehouse: { id: string; name: string };
  items: Array<{
    id: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitPrice: number;
    part: { id: string; sku: string; name: string };
  }>;
}
export interface SupplyDashboard {
  warehouses: number;
  approvedSuppliers: number;
  lowStock: number;
  pendingApproval: number;
  openPurchaseOrders: number;
  inventoryValue: number;
  stockedParts: number;
}
export interface SupplyOptions {
  suppliers: Array<{ id: string; tradeName: string }>;
  parts: Array<{ id: string; sku: string; name: string; unit: string }>;
  warehouses: Array<{ id: string; code: string; name: string }>;
  maintenanceOrders: Array<{ id: string; code: string; title: string; vehicle: { plate: string } }>;
}
export const getSupplyDashboard = () => apiRequest<SupplyDashboard>("/inventory/dashboard");
export const getSupplyOptions = () => apiRequest<SupplyOptions>("/inventory/options");
export const getSuppliers = (search = "") =>
  apiRequest<{ data: Supplier[]; pagination: { total: number } }>(
    `/suppliers?pageSize=50${search ? `&search=${encodeURIComponent(search)}` : ""}`,
  );
export const createSupplier = (body: Record<string, unknown>) =>
  apiRequest<Supplier>("/suppliers", { method: "POST", body: JSON.stringify(body) });
export const supplierAction = (id: string, action: string, reason?: string) =>
  apiRequest(`/suppliers/${id}/${action}`, { method: "PATCH", body: JSON.stringify({ reason }) });
export const getParts = (search = "") =>
  apiRequest<{ data: Part[]; pagination: { total: number } }>(
    `/inventory/parts?pageSize=100${search ? `&search=${encodeURIComponent(search)}` : ""}`,
  );
export const createPart = (body: Record<string, unknown>) =>
  apiRequest<Part>("/inventory/parts", { method: "POST", body: JSON.stringify(body) });
export const getWarehouses = () =>
  apiRequest<Array<{ id: string; code: string; name: string; _count: { stockLevels: number } }>>(
    "/inventory/warehouses",
  );
export const createWarehouse = (body: Record<string, unknown>) =>
  apiRequest("/inventory/warehouses", { method: "POST", body: JSON.stringify(body) });
export const getPurchaseOrders = () => apiRequest<PurchaseOrder[]>("/inventory/purchase-orders");
export const createPurchaseOrder = (body: Record<string, unknown>) =>
  apiRequest<PurchaseOrder>("/inventory/purchase-orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
export const purchaseAction = (id: string, action: string, body: Record<string, unknown> = {}) =>
  apiRequest(`/inventory/purchase-orders/${id}/${action}`, {
    method: action === "receipts" ? "POST" : "PATCH",
    body: JSON.stringify(body),
  });
export const inventoryAction = (action: string, body: Record<string, unknown>) =>
  apiRequest(`/inventory/${action}`, { method: "POST", body: JSON.stringify(body) });
