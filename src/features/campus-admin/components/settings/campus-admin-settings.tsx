"use client";

import { useState } from "react";
import {
  FiBell,
  FiLock,
  FiSettings,
  FiShield,
  FiSliders,
} from "react-icons/fi";

import {
  CampusInput,
  CampusTextarea,
  campusToast,
} from "@/components/campushub";
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
              <label className="space-y-2">
                <span className="text-sm font-medium">University Name</span>
                <CampusInput defaultValue="University of Dar es Salaam" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">
                  Administrative Email
                </span>
                <CampusInput defaultValue="admin@udsm.ac.tz" type="email" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Overview</span>
                <CampusTextarea defaultValue="A leading public university coordinating colleges, departments, representatives, and academic operations through CampusHub." />
              </label>
              <Button onClick={() => saveSettings("University Settings Saved")}>
                Save Changes
              </Button>
            </>
          ) : null}

          {activeTab === "branding" ? (
            <>
              <label className="space-y-2">
                <span className="text-sm font-medium">Primary Brand Color</span>
                <CampusInput defaultValue="#4F46E5" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Campus Motto</span>
                <CampusInput defaultValue="Advancing knowledge, service, and innovation." />
              </label>
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
              <label className="space-y-2">
                <span className="text-sm font-medium">
                  Default Landing Area
                </span>
                <CampusInput defaultValue="Dashboard" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Table Density</span>
                <CampusInput defaultValue="Comfortable" />
              </label>
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
