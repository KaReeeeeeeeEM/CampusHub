"use client";

import { AuthProvider } from "@/features/auth/auth-provider";
import { UniversalSearch } from "@/components/navigation/universal-search";
import { StreakCelebrationProvider } from "@/features/streak-celebration/components/streak-celebration-provider";
import { TenantProvider } from "@/features/tenant/tenant-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ToastProvider } from "@/providers/toast-provider";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <TenantProvider>
          <StreakCelebrationProvider>
            {children}
            <UniversalSearch />
          </StreakCelebrationProvider>
        </TenantProvider>
      </AuthProvider>
      <ToastProvider />
    </QueryProvider>
  );
}
