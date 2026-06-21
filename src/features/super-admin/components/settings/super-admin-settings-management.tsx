"use client";

import { useState } from "react";
import { FiBell, FiLock } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { AccountSecuritySettings } from "@/features/auth/components/account-security-settings";
import { NotificationSettingsPanel } from "@/features/pwa/components/notification-settings-panel";
import { cn } from "@/lib/utils";

const settingsTabs = [
  {
    id: "security",
    label: "Security",
    description: "Passkeys and authenticator app protection for your account.",
    icon: FiLock,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Notification delivery preferences for this account.",
    icon: FiBell,
  },
] as const;

export function SuperAdminSettingsManagement() {
  const [activeTab, setActiveTab] =
    useState<(typeof settingsTabs)[number]["id"]>("security");
  const activeTabConfig =
    settingsTabs.find((tab) => tab.id === activeTab) ?? settingsTabs[0];
  const ActiveIcon = activeTabConfig.icon;

  return (
    <div className="mt-6 space-y-5">
      <div
        className="flex flex-wrap gap-2 rounded-lg border border-border bg-surface p-2"
        role="tablist"
        aria-label="Super admin settings sections"
      >
        {settingsTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          return (
            <Button
              key={tab.id}
              className={cn(
                "justify-start",
                active && "bg-primary text-primary-foreground",
              )}
              type="button"
              variant={active ? "default" : "ghost"}
              role="tab"
              aria-selected={active}
              aria-controls={`super-admin-settings-panel-${tab.id}`}
              id={`super-admin-settings-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      <section
        className="rounded-lg border border-border bg-surface p-5"
        role="tabpanel"
        id={`super-admin-settings-panel-${activeTabConfig.id}`}
        aria-labelledby={`super-admin-settings-tab-${activeTabConfig.id}`}
      >
        <div className="mb-6 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ActiveIcon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-semibold">{activeTabConfig.label}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {activeTabConfig.description}
            </p>
          </div>
        </div>

        {activeTab === "security" ? <AccountSecuritySettings /> : null}
        {activeTab === "notifications" ? <NotificationSettingsPanel /> : null}
      </section>
    </div>
  );
}
