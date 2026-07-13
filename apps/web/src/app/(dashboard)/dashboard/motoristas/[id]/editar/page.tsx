import { DriverForm } from "@/components/drivers/driver-form";
export default async function EditDriverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DriverForm driverId={id} />;
}
