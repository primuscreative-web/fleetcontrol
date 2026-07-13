import { FileUpload } from "@/components/data/file-upload";
import { Breadcrumb } from "@/components/navigation/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OperacaoPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Operação" }]} />
      <Card>
        <CardHeader>
          <CardTitle>Operação</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload />
        </CardContent>
      </Card>
    </div>
  );
}
