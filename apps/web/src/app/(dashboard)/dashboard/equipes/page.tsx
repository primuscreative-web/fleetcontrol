import { permissions } from "@fleetcontrol/authz";

import { ResourcePage } from "@/components/platform/resource-page";

export default function EquipesPage() {
  return (
    <ResourcePage
      title="Equipes"
      description="Times internos vinculados aos departamentos."
      endpoint="/companies/:companyId/teams"
      permission={permissions.departments.read}
    />
  );
}
