import type { NextRequest } from "next/server";

export const TENANT_HEADER = "x-campushub-tenant";
export const TENANT_HOST_HEADER = "x-campushub-host";

export function normalizeTenantSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

export function getTenantSlugFromHost(host: string) {
  const hostname = host.split(":")[0];
  const parts = hostname.split(".");

  if (parts.length < 3 || hostname.endsWith("localhost")) {
    return null;
  }

  return normalizeTenantSlug(parts[0]);
}

export function getTenantSlugFromRequest(request: NextRequest) {
  const explicitTenant = request.headers.get(TENANT_HEADER);

  if (explicitTenant) {
    return normalizeTenantSlug(explicitTenant);
  }

  const host = request.headers.get("host");
  return host ? getTenantSlugFromHost(host) : null;
}
