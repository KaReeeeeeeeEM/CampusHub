"use client";

import { AuthProvider } from "@/features/auth/auth-provider";
import { SecuritySetupReminder } from "@/features/auth/components/security-setup-reminder";
import { NotificationReminderDispatcher } from "@/features/notifications/components/notification-reminder-dispatcher";
import { StreakCelebrationProvider } from "@/features/streak-celebration/components/streak-celebration-provider";
import { UniversalSearch } from "@/components/navigation/universal-search";
import { OverlayCoordinatorProvider } from "@/components/overlays/overlay-coordinator";
import { TenantProvider } from "@/features/tenant/tenant-provider";
import { PwaProvider } from "@/features/pwa/components/pwa-provider";
import { KiboProvider } from "@/lib/kibo";
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
          <KiboProvider>
            <OverlayCoordinatorProvider>
              <PwaProvider>
                <StreakCelebrationProvider>
                  {children}
                  <UniversalSearch />
                  <SecuritySetupReminder />
                  <NotificationReminderDispatcher />
                </StreakCelebrationProvider>
              </PwaProvider>
            </OverlayCoordinatorProvider>
          </KiboProvider>
        </TenantProvider>
      </AuthProvider>
      <ToastProvider />
    </QueryProvider>
  );
}
