import { apiRequest } from "./api-client";
export interface WorkshopService {
  id: string;
  category: string;
  name: string;
  laborRate?: number | null;
  fixedPrice?: number | null;
  estimatedHours?: number | null;
  warrantyDays?: number | null;
  active: boolean;
}
export interface Workshop {
  id: string;
  code?: string | null;
  legalName: string;
  tradeName: string;
  document: string;
  type: string;
  status: string;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
  rating: number;
  evaluationCount: number;
  totalBilled: number;
  paymentTermsDays?: number | null;
  defaultWarrantyDays?: number | null;
  slaResponseHours?: number | null;
  slaCompletionDays?: number | null;
  services?: WorkshopService[];
  quotes?: WorkshopQuote[];
  evaluations?: Array<{
    id: string;
    overallScore: number;
    comments?: string | null;
    createdAt: string;
  }>;
}
export interface WorkshopQuote {
  id: string;
  number: string;
  status: string;
  validUntil?: string | null;
  totalAmount: number;
  laborAmount: number;
  partsAmount: number;
  discountAmount: number;
  warrantyDays?: number | null;
  workshop: { id: string; tradeName: string; rating: number };
  maintenanceOrder: { id: string; code: string; title: string; status: string };
  items: Array<{
    id: string;
    category: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}
export interface WorkshopsDashboard {
  approved: number;
  pendingApproval: number;
  suspended: number;
  activeOrders: number;
  submittedQuotes: number;
  averageRating: number;
  totalBilled: number;
}
export interface WorkshopsOptions {
  workshops: Array<{ id: string; tradeName: string; rating: number }>;
  orders: Array<{ id: string; code: string; title: string; vehicle: { plate: string } }>;
  categories: string[];
}
export const getWorkshopsDashboard = () => apiRequest<WorkshopsDashboard>("/workshops/dashboard");
export const getWorkshops = (filters: { status?: string; search?: string } = {}) => {
  const params = new URLSearchParams({ pageSize: "50" });
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  return apiRequest<{ data: Workshop[]; pagination: { total: number } }>(`/workshops?${params}`);
};
export const getWorkshop = (id: string) => apiRequest<Workshop>(`/workshops/${id}`);
export const getWorkshopsOptions = () => apiRequest<WorkshopsOptions>("/workshops/options");
export const getWorkshopQuotes = (orderId?: string) =>
  apiRequest<WorkshopQuote[]>(
    `/workshops/quotes${orderId ? `?maintenanceOrderId=${orderId}` : ""}`,
  );
export const createWorkshop = (body: Record<string, unknown>) =>
  apiRequest<Workshop>("/workshops", { method: "POST", body: JSON.stringify(body) });
export const workshopAction = (
  id: string,
  action: string,
  body: Record<string, unknown> = {},
  method: "POST" | "PATCH" = "PATCH",
) => apiRequest(`/workshops/${id}/${action}`, { method, body: JSON.stringify(body) });
export const createWorkshopQuote = (body: Record<string, unknown>) =>
  apiRequest<WorkshopQuote>("/workshops/quotes", { method: "POST", body: JSON.stringify(body) });
export const selectWorkshopQuote = (id: string) =>
  apiRequest(`/workshops/quotes/${id}/select`, { method: "PATCH", body: "{}" });
