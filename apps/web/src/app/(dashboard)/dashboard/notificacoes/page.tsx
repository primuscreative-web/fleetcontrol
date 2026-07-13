import { permissions } from "@fleetcontrol/authz";

import { ResourcePage } from "@/components/platform/resource-page";

export default function NotificacoesPage() {
  return (
    <ResourcePage
      title="Notificações"
      description="Central de notificações internas e canais transacionais."
      endpoint="/notifications"
      permission={permissions.notifications.read}
    />
  );
}
