import { ChartCard } from "@/components/data/chart-card";
import { Filters } from "@/components/data/filters";
import { Kanban } from "@/components/data/kanban";
import { StatusBadge } from "@/components/data/status-badge";
import { Timeline } from "@/components/data/timeline";
import { Breadcrumb } from "@/components/navigation/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const metrics = [
  { title: "Base SaaS", value: "Enterprise", status: "active" },
  { title: "Arquitetura", value: "Clean", status: "active" },
  { title: "Segurança", value: "RBAC", status: "pending" },
  { title: "Módulos", value: "Planejados", status: "disabled" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Dashboard" }]} />

      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-normal">FleetControl</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Fundação técnica pronta para evoluir módulos de gestão de frotas sem comprometer
          arquitetura, segurança ou identidade visual.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader>
              <CardDescription>{metric.title}</CardDescription>
              <CardTitle className="text-2xl">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusBadge status={metric.status} label="Preparado" />
            </CardContent>
          </Card>
        ))}
      </section>

      <Filters />

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <ChartCard />
        <Card>
          <CardHeader>
            <CardTitle>Linha do tempo técnica</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline
              items={[
                { title: "Base", description: "Monorepo, temas, providers, CI e Docker." },
                { title: "Segurança", description: "JWT, refresh token e RBAC preparados na API." },
                { title: "Escala", description: "Prisma multi-tenant e auditoria desde o início." },
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <Kanban />
    </div>
  );
}
