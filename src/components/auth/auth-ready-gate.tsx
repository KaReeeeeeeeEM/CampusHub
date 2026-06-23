"use client";

import { useEffect, useState } from "react";

import { PageLoadingState } from "@/components/shared/page-loading-state";
import { useAuth } from "@/features/auth/auth-provider";

type AuthReadyGateProps = {
  children: React.ReactNode;
  title?: string;
  description?: string;
};

export function AuthReadyGate({
  children,
  title = "Loading workspace",
  description = "Fetching your account, role, and university details.",
}: AuthReadyGateProps) {
  const { isPending } = useAuth();
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (!hasHydrated || isPending) {
    return <PageLoadingState title={title} description={description} />;
  }

  return <>{children}</>;
}
