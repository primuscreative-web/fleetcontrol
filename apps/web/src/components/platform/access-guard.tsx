"use client";

import type { Permission } from "@fleetcontrol/authz";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canAccess } from "@/lib/auth";
import { useSession } from "@/providers/session-provider";

export function AccessGuard({
  permission,
  children,
}: {
  permission?: Permission;
  children: ReactNode;
}) {
  const { profile, isLoading } = useSession();

  if (isLoading) {
    return null;
  }

  if (!canAccess(profile, permission)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso negado</CardTitle>
          <CardDescription>
            Seu perfil não possui permissão para visualizar esta área.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/dashboard">Voltar ao dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return children;
}
