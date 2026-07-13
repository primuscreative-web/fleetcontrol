import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const columns = ["Entrada", "Em análise", "Aprovado"];

export function Kanban() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {columns.map((column) => (
        <Card key={column}>
          <CardHeader>
            <CardTitle>{column}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Pronto para receber fluxos da operação.
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
