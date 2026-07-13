import { permissions } from "@fleetcontrol/authz";

import { ResourcePage } from "@/components/platform/resource-page";

export default function UsuariosPage() {
  return (
    <ResourcePage
      title="Usuários"
      description="Usuários autorizados no contexto da empresa."
      endpoint="/companies/:companyId/users"
      permission={permissions.users.read}
    />
  );
}
