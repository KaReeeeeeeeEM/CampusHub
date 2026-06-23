"use client";

import { useEffect } from "react";

import { useAuth } from "@/features/auth/auth-provider";

const dispatchIntervalMs = 5 * 60 * 1000;

export function NotificationReminderDispatcher() {
  const { isAuthenticated, isPending, user } = useAuth();

  useEffect(() => {
    if (isPending || !isAuthenticated || !user?.id) return;

    let cancelled = false;

    async function dispatchReminders() {
      try {
        const response = await fetch("/api/notifications/reminders/dispatch", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            universityId: user?.universityId ?? null,
          }),
        });

        if (!cancelled && response.ok) {
          window.dispatchEvent(
            new CustomEvent("campushub:notifications-updated"),
          );
        }
      } catch {
        return;
      }
    }

    void dispatchReminders();
    const intervalId = window.setInterval(
      dispatchReminders,
      dispatchIntervalMs,
    );

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, isPending, user?.id, user?.universityId]);

  return null;
}
