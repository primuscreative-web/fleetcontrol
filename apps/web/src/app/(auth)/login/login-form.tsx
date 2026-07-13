"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  companyId: z.string().optional(),
  rememberMe: z.boolean().default(false),
});

type LoginFormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      companyId: "",
      rememberMe: false,
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setError(null);

    try {
      await signIn({
        ...values,
        companyId: values.companyId || undefined,
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível entrar.");
      return;
    }

    router.replace(searchParams.get("next") ?? "/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Entrar no FleetControl</CardTitle>
        <CardDescription>Acesso seguro para equipes autorizadas.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <Input type="email" placeholder="E-mail corporativo" {...form.register("email")} />
          <Input type="password" placeholder="Senha" {...form.register("password")} />
          <Input placeholder="ID da empresa, quando necessário" {...form.register("companyId")} />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              {...form.register("rememberMe")}
            />
            Manter sessão ativa
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
