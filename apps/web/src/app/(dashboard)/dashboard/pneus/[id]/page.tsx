import { TireDetail } from "@/components/tires/tire-detail";
export default async function TireDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TireDetail id={id} />;
}
