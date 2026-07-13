"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, type ReactNode } from "react";

import { getProfile, signOut, type AuthProfile } from "@/lib/auth";

interface SessionContextValue {
  profile: AuthProfile | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const isAuthRoute = pathname?.startsWith("/login") || pathname?.startsWith("/reset-password");
  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getProfile,
    retry: false,
    enabled: !isAuthRoute,
  });

  useEffect(() => {
    if (!isAuthRoute && query.isError) {
      router.replace(`/login?next=${encodeURIComponent(pathname ?? "/dashboard")}`);
    }
  }, [isAuthRoute, pathname, query.isError, router]);

  async function logout() {
    await signOut();
    queryClient.clear();
    router.replace("/login");
  }

  return (
    <SessionContext.Provider
      value={{
        profile: query.data ?? null,
        isLoading: query.isLoading,
        logout,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used inside SessionProvider");
  }

  return context;
}
