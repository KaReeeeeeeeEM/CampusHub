"use client";

import { AuthProvider } from "@/features/auth/auth-provider";
import { TenantProvider } from "@/features/tenant/tenant-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { ToastProvider } from "@/providers/toast-provider";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <TenantProvider>{children}</TenantProvider>
        </AuthProvider>
      </QueryProvider>
      <ToastProvider />
    </ThemeProvider>
  );
}
