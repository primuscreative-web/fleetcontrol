import { permissions } from "@fleetcontrol/authz";

import { ResourcePage } from "@/components/platform/resource-page";

export default function FiliaisPage() {
  return (
    <ResourcePage
      title="Filiais"
      description="Unidades vinculadas à empresa autenticada."
      endpoint="/companies/:companyId/branches"
      permission={permissions.branches.read}
    />
  );
}
