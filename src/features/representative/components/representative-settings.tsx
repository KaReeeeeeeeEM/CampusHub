"use client";

import { useState } from "react";
import { FiBell, FiSave, FiShield, FiUsers } from "react-icons/fi";

import { campusToast } from "@/components/campushub";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tabs = [
  "College Information",
  "Branding",
  "Notifications",
  "Committee Settings",
  "Student Enrollment Settings",
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

export function RepresentativeSettings() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>(
    "College Information",
  );

  function saveSettings(title: string) {
    campusToast.success({
      title,
      description: "Mock settings were saved for preview purposes.",
    });
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
      <Card className="h-fit">
        <CardContent className="p-3">
          <div className="grid gap-1">
            {tabs.map((tab) => (
              <Button
                key={tab}
                className={cn(
                  "justify-start",
                  activeTab === tab && "bg-primary text-primary-foreground",
                )}
                type="button"
                variant={activeTab === tab ? "default" : "ghost"}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {activeTab === "College Information" ? (
        <Card>
          <CardHeader>
            <CardTitle>College Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <SettingValue label="College Name" value="College of ICT" />
              <SettingValue label="Short Name" value="CoICT" />
              <SettingValue
                className="md:col-span-2"
                label="Description"
                value="College of Information and Communication Technologies at the University of Dar es Salaam."
              />
            </div>
            <Button
              type="button"
              onClick={() => saveSettings("College Information Saved")}
            >
              <FiSave className="h-4 w-4" aria-hidden="true" />
              Save Information
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "Branding" ? (
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <SettingValue label="Primary Color" value="#4F46E5" />
              <SettingValue
                label="College Tagline"
                value="Innovation for society"
              />
            </div>
            <div className="rounded-lg border border-border bg-primary/5 p-5">
              <p className="text-sm font-medium text-primary">
                CoICT Representative Portal
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Branding preview for announcements, invitations, and student
                communication surfaces.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => saveSettings("Branding Saved")}
            >
              <FiSave className="h-4 w-4" aria-hidden="true" />
              Save Branding
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "Notifications" ? (
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              "Email committee members when announcements are published",
              "Notify representatives when suggestions are submitted",
              "Send reminder before event registration closes",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-4"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FiBell className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="text-sm">{item}</p>
              </div>
            ))}
            <Button
              type="button"
              onClick={() => saveSettings("Notification Settings Saved")}
            >
              <FiSave className="h-4 w-4" aria-hidden="true" />
              Save Notifications
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "Committee Settings" ? (
        <Card>
          <CardHeader>
            <CardTitle>Committee Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              "Academic Affairs",
              "Sports",
              "Media",
              "Technology",
              "Entertainment",
              "Student Welfare",
            ].map((category) => (
              <div
                key={category}
                className="flex items-center justify-between rounded-lg border border-border bg-background p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FiUsers className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-medium">{category}</p>
                </div>
                <span className="text-xs text-muted-foreground">Enabled</span>
              </div>
            ))}
            <Button
              type="button"
              onClick={() => saveSettings("Committee Settings Saved")}
            >
              <FiSave className="h-4 w-4" aria-hidden="true" />
              Save Committee Settings
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "Student Enrollment Settings" ? (
        <Card>
          <CardHeader>
            <CardTitle>Student Enrollment Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <SettingValue label="Default Link Expiry" value="90 days" />
              <SettingValue label="Default Usage Limit" value="500 students" />
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
              <FiShield
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <p className="text-sm leading-6 text-muted-foreground">
                Students remain invitation-only. University and college fields
                are locked from the representative-generated link.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => saveSettings("Enrollment Settings Saved")}
            >
              <FiSave className="h-4 w-4" aria-hidden="true" />
              Save Enrollment Settings
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
