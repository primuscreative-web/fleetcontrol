import { DriverProfile } from "@/components/drivers/driver-profile";
export default async function DriverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DriverProfile driverId={id} />;
}
