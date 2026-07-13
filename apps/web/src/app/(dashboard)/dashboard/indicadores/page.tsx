import { ChartCard } from "@/components/data/chart-card";
import { Breadcrumb } from "@/components/navigation/breadcrumb";

export default function IndicadoresPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Indicadores" }]} />
      <ChartCard />
    </div>
  );
}
