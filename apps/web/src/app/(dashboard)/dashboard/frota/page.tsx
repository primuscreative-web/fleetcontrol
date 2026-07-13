import { FleetDashboard } from "@/components/fleet/fleet-dashboard";
import { VehicleList } from "@/components/fleet/vehicle-list";

export default function FleetPage() {
  return (
    <div className="space-y-6">
      <FleetDashboard />
      <VehicleList />
    </div>
  );
}
