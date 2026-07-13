import { DriversDashboard } from "@/components/drivers/drivers-dashboard";
import { DriversList } from "@/components/drivers/drivers-list";

export default function DriversPage() {
  return (
    <div className="space-y-6">
      <DriversDashboard />
      <DriversList />
    </div>
  );
}
