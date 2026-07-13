import { permissions } from "@fleetcontrol/authz";

import { ResourcePage } from "@/components/platform/resource-page";

export default function DepartamentosPage() {
  return (
    <ResourcePage
      title="Departamentos"
      description="Estrutura organizacional por filial e empresa."
      endpoint="/companies/:companyId/departments"
      permission={permissions.departments.read}
    />
  );
}
