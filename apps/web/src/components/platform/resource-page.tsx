"use client";

import type { Permission } from "@fleetcontrol/authz";
import { useQuery } from "@tanstack/react-query";

import { DataGrid } from "@/components/data/data-grid";
import { Filters } from "@/components/data/filters";
import { LoadingState } from "@/components/feedback/loading-state";
import { Breadcrumb } from "@/components/navigation/breadcrumb";
import { AccessGuard } from "@/components/platform/access-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api-client";
import { useSession } from "@/providers/session-provider";

interface ResourceRecord {
  id: string;
  name?: string;
  email?: string;
  key?: string;
  status?: string;
  code?: string | null;
  createdAt?: string;
}

export function ResourcePage({
  title,
  description,
  endpoint,
  permission,
}: {
  title: string;
  description: string;
  endpoint: string;
  permission?: Permission;
}) {
  const { profile } = useSession();
  const companyId = profile?.company?.id;
  const query = useQuery({
    queryKey: ["resource", title, companyId],
    queryFn: () => apiRequest<ResourceRecord[]>(endpoint.replace(":companyId", companyId ?? "")),
    enabled: Boolean(companyId),
    retry: false,
  });

  return (
    <AccessGuard permission={permission}>
      <div className="space-y-6">
        <Breadcrumb items={[{ label: title }]} />
        <section className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
        </section>
        <Filters />
        {query.isLoading ? <LoadingState /> : null}
        {query.isError ? (
          <Card>
            <CardHeader>
              <CardTitle>Não foi possível carregar</CardTitle>
              <CardDescription>Verifique sua sessão e permissões de acesso.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
        {query.data ? (
          <Card>
            <CardContent className="pt-5">
              <DataGrid
                data={query.data}
                columns={[
                  { accessorKey: "name", header: "Nome" },
                  { accessorKey: "email", header: "E-mail" },
                  { accessorKey: "code", header: "Código" },
                  { accessorKey: "status", header: "Status" },
                ]}
              />
              {query.data.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum registro encontrado.
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AccessGuard>
  );
}
