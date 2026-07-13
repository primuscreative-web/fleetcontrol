import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Manutenção programada</CardTitle>
          <CardDescription>O FleetControl está temporariamente indisponível.</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
