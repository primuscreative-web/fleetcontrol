import { permissions } from "@fleetcontrol/authz";

import { ResourcePage } from "@/components/platform/resource-page";

export default function CargosPage() {
  return (
    <ResourcePage
      title="Cargos"
      description="Cargos corporativos usados no controle de acesso e escopo."
      endpoint="/companies/:companyId/positions"
      permission={permissions.departments.read}
    />
  );
}
