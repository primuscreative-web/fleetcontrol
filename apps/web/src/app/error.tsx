"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Erro inesperado</CardTitle>
          <CardDescription>Não foi possível concluir a operação solicitada.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reset}>Tentar novamente</Button>
        </CardContent>
      </Card>
    </main>
  );
}
