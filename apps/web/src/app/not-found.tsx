import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Página não encontrada</CardTitle>
          <CardDescription>O endereço acessado não existe no FleetControl.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard">Voltar ao dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
