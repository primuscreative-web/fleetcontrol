import { Breadcrumb } from "@/components/navigation/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Configurações" }]} />
      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
          <CardDescription>
            Estrutura preparada para preferências, segurança e integrações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="geral">
            <TabsList>
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="seguranca">Segurança</TabsTrigger>
              <TabsTrigger value="integracoes">Integrações</TabsTrigger>
            </TabsList>
            <TabsContent value="geral">
              Configurações gerais serão conectadas aos módulos futuros.
            </TabsContent>
            <TabsContent value="seguranca">Políticas de acesso, auditoria e sessões.</TabsContent>
            <TabsContent value="integracoes">
              Storage, notificações e conectores externos.
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
