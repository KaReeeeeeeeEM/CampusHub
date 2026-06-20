"use client";

import { useState } from "react";
import {
  FiBell,
  FiLock,
  FiSettings,
  FiShield,
  FiSliders,
} from "react-icons/fi";

import { campusToast } from "@/components/campushub";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "university", label: "University Information", icon: FiSettings },
  { key: "branding", label: "Branding", icon: FiSliders },
  { key: "notifications", label: "Notifications", icon: FiBell },
  { key: "preferences", label: "User Preferences", icon: FiShield },
  { key: "security", label: "Security", icon: FiLock },
] as const;

function SettingValue({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-background p-4",
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium leading-6 text-foreground">
        {value}
      </p>
    </div>
  );
}

export function CampusAdminSettings() {
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]["key"]>("university");

  function saveSettings(title: string) {
    campusToast.success({
      title,
      description: "Mock settings were saved for stakeholder preview.",
    });
  }

  return (
    <section className="mt-8 grid gap-5 lg:grid-cols-[280px_1fr]">
      <Card>
        <CardContent className="p-3">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.key}
                  className={cn(
                    "w-full justify-start",
                    activeTab === tab.key &&
                      "bg-primary text-primary-foreground",
                  )}
                  type="button"
                  variant={activeTab === tab.key ? "default" : "ghost"}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              );
            })}
          </nav>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {tabs.find((tab) => tab.key === activeTab)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {activeTab === "university" ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <SettingValue
                  label="University Name"
                  value="Not configured"
                />
                <SettingValue
                  label="Administrative Email"
                  value="Not configured"
                />
                <SettingValue
                  className="md:col-span-2"
                  label="Overview"
                  value="University settings will appear after real records are configured."
                />
              </div>
              <Button onClick={() => saveSettings("University Settings Saved")}>
                Save Changes
              </Button>
            </>
          ) : null}

          {activeTab === "branding" ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <SettingValue label="Primary Brand Color" value="#4F46E5" />
                <SettingValue
                  label="Campus Motto"
                  value="Advancing knowledge, service, and innovation."
                />
              </div>
              <Button onClick={() => saveSettings("Branding Saved")}>
                Save Branding
              </Button>
            </>
          ) : null}

          {activeTab === "notifications" ? (
            <>
              {[
                "Representative invitations",
                "Teacher invitations",
                "Almanac reminders",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-md border border-border bg-background p-4"
                >
                  <span className="text-sm font-medium">{item}</span>
                  <span className="rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    Enabled
                  </span>
                </div>
              ))}
              <Button onClick={() => saveSettings("Notifications Updated")}>
                Save Notifications
              </Button>
            </>
          ) : null}

          {activeTab === "preferences" ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <SettingValue label="Default Landing Area" value="Dashboard" />
                <SettingValue label="Table Density" value="Comfortable" />
              </div>
              <Button onClick={() => saveSettings("Preferences Saved")}>
                Save Preferences
              </Button>
            </>
          ) : null}

          {activeTab === "security" ? (
            <>
              {[
                "Two-step approvals",
                "Invitation expiry: 14 days",
                "Audit sensitive actions",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-md border border-border bg-background p-4 text-sm text-muted-foreground"
                >
                  {item}
                </div>
              ))}
              <Button onClick={() => saveSettings("Security Policy Saved")}>
                Save Security
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
