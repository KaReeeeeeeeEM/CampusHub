"use client";

import { AuthProvider } from "@/features/auth/auth-provider";
import { UniversalSearch } from "@/components/navigation/universal-search";
import { TenantProvider } from "@/features/tenant/tenant-provider";
import { AppearanceProvider } from "@/providers/appearance-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { ToastProvider } from "@/providers/toast-provider";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <AppearanceProvider>
        <QueryProvider>
          <AuthProvider>
            <TenantProvider>
              {children}
              <UniversalSearch />
            </TenantProvider>
          </AuthProvider>
        </QueryProvider>
        <ToastProvider />
      </AppearanceProvider>
    </ThemeProvider>
  );
}
