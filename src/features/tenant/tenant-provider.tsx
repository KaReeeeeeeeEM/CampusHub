"use client";

import { createContext, useContext, useMemo } from "react";

import { useTenantStore } from "@/store/tenant-store";
import type { TenantContextValue } from "@/types/tenant";

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  tenantId: null,
  isTenantResolved: false
});

type TenantProviderProps = {
  children: React.ReactNode;
};

export function TenantProvider({ children }: TenantProviderProps) {
  const tenant = useTenantStore((state) => state.tenant);

  const value = useMemo<TenantContextValue>(
    () => ({
      tenant,
      tenantId: tenant?.id ?? null,
      isTenantResolved: true
    }),
    [tenant]
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
