import { permissions } from "@fleetcontrol/authz";

import { ResourcePage } from "@/components/platform/resource-page";

export default function EmpresaPage() {
  return (
    <ResourcePage
      title="Empresa"
      description="Dados corporativos disponíveis para o escopo autenticado."
      endpoint="/companies"
      permission={permissions.company.read}
    />
  );
}
