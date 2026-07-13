import { VehicleProfile } from "@/components/fleet/vehicle-profile";

export default async function VehicleProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VehicleProfile vehicleId={id} />;
}
