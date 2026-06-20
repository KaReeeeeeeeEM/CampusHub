import { redirect } from "next/navigation";

import { getSessionLandingPath } from "@/lib/auth/role-redirect";
import { requireSession } from "@/lib/auth/route-guards";
import type { AuthSession } from "@/types/auth";

export default async function PortalSelectionPage() {
  const session = (await requireSession()) as AuthSession;

  redirect(getSessionLandingPath(session));
}
