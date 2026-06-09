import { NextResponse, type NextRequest } from "next/server";

import {
  getTenantSlugFromRequest,
  TENANT_HEADER,
  TENANT_HOST_HEADER
} from "@/features/tenant/tenant-utils";

export function withTenant(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const tenantSlug = getTenantSlugFromRequest(request);
  const host = request.headers.get("host");

  if (tenantSlug) {
    requestHeaders.set(TENANT_HEADER, tenantSlug);
  }

  if (host) {
    requestHeaders.set(TENANT_HOST_HEADER, host);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}
