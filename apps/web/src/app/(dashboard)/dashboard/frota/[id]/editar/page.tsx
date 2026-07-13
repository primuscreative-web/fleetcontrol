import { VehicleForm } from "@/components/fleet/vehicle-form";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VehicleForm vehicleId={id} />;
}
