"use client";

import { Breadcrumb } from "@/components/navigation/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/providers/session-provider";

export function ProfilePage() {
  const { profile } = useSession();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Perfil" }]} />
      <Card>
        <CardHeader>
          <CardTitle>Perfil do usuário</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2">
          <Info label="Nome" value={profile?.name} />
          <Info label="E-mail" value={profile?.email} />
          <Info label="Empresa" value={profile?.company?.name} />
          <Info label="Perfil" value={profile?.role?.name} />
          <Info label="Filial" value={profile?.branch?.name} />
          <Info label="Departamento" value={profile?.department?.name} />
          <Info label="Equipe" value={profile?.team?.name} />
          <Info label="Cargo" value={profile?.position?.name} />
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value ?? "-"}</p>
    </div>
  );
}
