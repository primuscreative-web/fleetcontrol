import { MaintenanceDetail } from "@/components/maintenance/maintenance-detail";
export default async function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MaintenanceDetail id={id} />;
}
