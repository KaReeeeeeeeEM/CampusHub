"use client";

import { useState } from "react";
import { FiBell, FiLock } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountSecuritySettings } from "@/features/auth/components/account-security-settings";
import { NotificationSettingsPanel } from "@/features/pwa/components/notification-settings-panel";
import { cn } from "@/lib/utils";

const settingsTabs = [
  {
    key: "security",
    label: "Security",
    description: "Manage passkey login and authenticator app protection.",
    icon: FiLock,
  },
  {
    key: "notifications",
    label: "Notifications",
    description: "Control the notification types you receive.",
    icon: FiBell,
  },
] as const;

export function RepresentativeSettings() {
  const [activeTab, setActiveTab] =
    useState<(typeof settingsTabs)[number]["key"]>("security");
  const activeTabConfig =
    settingsTabs.find((tab) => tab.key === activeTab) ?? settingsTabs[0];
  const ActiveIcon = activeTabConfig.icon;

  return (
    <div className="mt-8 space-y-5">
      <div
        className="flex flex-wrap gap-2 rounded-lg border border-border bg-surface p-2"
        role="tablist"
        aria-label="Representative settings"
      >
        {settingsTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;

          return (
            <Button
              key={tab.key}
              className={cn(
                "justify-start",
                active && "bg-primary text-primary-foreground",
              )}
              type="button"
              variant={active ? "default" : "ghost"}
              role="tab"
              aria-selected={active}
              aria-controls={`representative-settings-${tab.key}`}
              id={`representative-settings-tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      <Card
        role="tabpanel"
        id={`representative-settings-${activeTabConfig.key}`}
        aria-labelledby={`representative-settings-tab-${activeTabConfig.key}`}
      >
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ActiveIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>{activeTabConfig.label}</CardTitle>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {activeTabConfig.description}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === "security" ? <AccountSecuritySettings /> : null}
          {activeTab === "notifications" ? (
            <NotificationSettingsPanel />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
