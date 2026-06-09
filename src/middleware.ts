import type { NextRequest } from "next/server";

import { withAuthGuard } from "@/lib/auth/middleware";
import { withTenant } from "@/lib/tenant/tenant-middleware";

export function middleware(request: NextRequest) {
  const authResponse = withAuthGuard(request);

  if (authResponse.status >= 300 && authResponse.status < 400) {
    return authResponse;
  }

  return withTenant(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)"]
};
