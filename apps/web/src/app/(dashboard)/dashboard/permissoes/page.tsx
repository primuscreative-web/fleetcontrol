import { roles } from "@fleetcontrol/authz";

import { Breadcrumb } from "@/components/navigation/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PermissoesPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Permissões" }]} />
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(roles).map(([role, rolePermissions]) => (
          <Card key={role}>
            <CardHeader>
              <CardTitle className="capitalize">{role}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {rolePermissions.map((permission) => (
                  <li key={permission}>{permission}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
