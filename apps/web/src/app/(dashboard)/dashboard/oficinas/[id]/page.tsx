import { WorkshopDetail } from "@/components/workshops/workshop-detail";
export default async function WorkshopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkshopDetail id={id} />;
}
