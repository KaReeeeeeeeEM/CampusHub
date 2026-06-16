"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiAward,
  FiBell,
  FiBriefcase,
  FiGlobe,
  FiImage,
  FiLoader,
  FiLock,
  FiMonitor,
  FiShield,
  FiSliders,
  FiStar,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import { z } from "zod";

import {
  CampusCheckbox,
  CampusFileUpload,
  CampusInput,
  CampusTextarea,
  campusToast,
} from "@/components/campushub";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import { cn } from "@/lib/utils";

type SettingsTab = {
  id: string;
  label: string;
  icon: IconType;
};

const tabs: SettingsTab[] = [
  { id: "platform", label: "Platform", icon: FiMonitor },
  { id: "security", label: "Security", icon: FiLock },
  { id: "branding", label: "Branding", icon: FiImage },
  { id: "notifications", label: "Notifications", icon: FiBell },
  { id: "integrations", label: "Integrations", icon: FiGlobe },
  { id: "gamification", label: "Gamification", icon: FiAward },
  { id: "marketplace", label: "Marketplace", icon: FiBriefcase },
  { id: "showcase", label: "Showcase", icon: FiStar },
  { id: "audit", label: "Audit Configuration", icon: FiShield },
];

const platformSchema = z.object({
  platformName: z.string().min(2),
  description: z.string().min(10),
  supportEmail: z.string().email(),
  supportPhone: z.string().min(5),
  status: z.enum(["Operational", "Maintenance", "Restricted"]),
});

type PlatformInput = z.infer<typeof platformSchema>;

function SettingRow({
  title,
  description,
  defaultChecked = true,
}: {
  title: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background p-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      <CampusCheckbox defaultChecked={defaultChecked} />
    </div>
  );
}

function SaveButton({ isPending }: { isPending: boolean }) {
  return (
    <Button className="w-full sm:w-auto" disabled={isPending} type="submit">
      {isPending ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
      Save Settings
    </Button>
  );
}

function PlatformSettings() {
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, watch, setValue } = useForm<
    z.input<typeof platformSchema>,
    unknown,
    PlatformInput
  >({
    resolver: zodResolver(platformSchema),
    defaultValues: {
      platformName: "CampusHub",
      description:
        "A multi-university ecosystem platform for academics, community, employability, alumni, and marketplace engagement.",
      supportEmail: "support@campushub.com",
      supportPhone: "+255 700 000 000",
      status: "Operational",
    },
  });
  const status = watch("status");

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit(() =>
        startTransition(() =>
          campusToast.success({
            title: "Platform Settings Saved",
            description: "Platform configuration has been updated.",
          }),
        ),
      )}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-3">
          <span className="block text-sm font-medium">Platform Name</span>
          <CampusInput {...register("platformName")} placeholder="CampusHub" />
        </label>
        <label className="block space-y-3">
          <span className="block text-sm font-medium">Support Email</span>
          <CampusInput
            {...register("supportEmail")}
            placeholder="support@campushub.com"
            type="email"
          />
        </label>
        <label className="block space-y-3">
          <span className="block text-sm font-medium">Support Phone</span>
          <CampusInput
            {...register("supportPhone")}
            placeholder="+255 700 000 000"
          />
        </label>
        <div className="space-y-3">
          <span className="block text-sm font-medium">Platform Status</span>
          <Select
            value={status}
            onValueChange={(value) =>
              setValue("status", value as PlatformInput["status"], {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select platform status" />
            </SelectTrigger>
            <SelectContent>
              {["Operational", "Maintenance", "Restricted"].map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="block space-y-3 md:col-span-2">
          <span className="block text-sm font-medium">Platform Description</span>
          <CampusTextarea
            {...register("description")}
            placeholder="Describe CampusHub for internal platform operators."
          />
        </label>
      </div>
      <SaveButton isPending={isPending} />
    </form>
  );
}

function BrandingSettings() {
  const [logo, setLogo] = useState("");
  const [favicon, setFavicon] = useState("");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <CampusFileUpload label="Logo" value={logo} onValueChange={setLogo} />
        <CampusFileUpload
          label="Favicon"
          value={favicon}
          onValueChange={setFavicon}
        />
        <label className="block space-y-3">
          <span className="block text-sm font-medium">Primary Color</span>
          <CampusInput defaultValue="#22C55E" placeholder="#22C55E" />
        </label>
        <label className="block space-y-3">
          <span className="block text-sm font-medium">Public Website Theme</span>
          <CampusInput defaultValue="Modern university ecosystem" />
        </label>
      </div>
      <Button
        type="button"
        onClick={() =>
          campusToast.success({
            title: "Branding Saved",
            description: "CampusHub public branding configuration was updated.",
          })
        }
      >
        Save Branding
      </Button>
    </div>
  );
}

function SettingsList({ items }: { items: Array<[string, string, boolean?]> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map(([title, description, checked]) => (
        <SettingRow
          key={title}
          title={title}
          description={description}
          defaultChecked={checked}
        />
      ))}
    </div>
  );
}

const tabPanels: Record<string, React.ReactNode> = {
  platform: <PlatformSettings />,
  security: (
    <SettingsList
      items={[
        ["Strong passwords", "Require uppercase, lowercase, number, and symbol."],
        ["Session rotation", "Rotate session tokens after sensitive actions."],
        ["Login restrictions", "Flag suspicious login locations for review."],
        ["Account lockout", "Temporarily lock accounts after failed attempts."],
      ]}
    />
  ),
  branding: <BrandingSettings />,
  notifications: (
    <SettingsList
      items={[
        ["Email notifications", "Enable operational emails across the platform."],
        ["System notifications", "Show in-app notices for important events."],
        ["Reminder settings", "Send reminders for invitations and reviews."],
        ["Digest emails", "Prepare weekly platform summaries for admins."],
      ]}
    />
  ),
  integrations: (
    <SettingsList
      items={[
        ["Email provider", "Placeholder for transactional email integration."],
        ["Analytics", "Placeholder for future product analytics."],
        ["Storage provider", "Placeholder for media and document storage."],
        ["AI services", "Placeholder for future CampusHub AI features."],
      ]}
    />
  ),
  gamification: (
    <SettingsList
      items={[
        ["XP configuration", "Control XP earned from engagement actions."],
        ["Badge configuration", "Manage badge unlock rules and rarity."],
        ["Streak configuration", "Configure daily and weekly streak behavior."],
        ["Leaderboards", "Control public and private leaderboard rules."],
      ]}
    />
  ),
  marketplace: (
    <SettingsList
      items={[
        ["Marketplace visibility", "Control which roles can browse products."],
        ["Product moderation", "Require review before sensitive listings go live."],
        ["Marketplace rules", "Display commerce guidelines before ordering."],
        ["Seller verification", "Prepare verification requirements for sellers."],
      ]}
    />
  ),
  showcase: (
    <SettingsList
      items={[
        ["Project moderation", "Review public projects before featuring."],
        ["Showcase leaderboards", "Enable top projects and creators ranking."],
        ["Visibility rules", "Support public, private, and role-based projects."],
        ["Document attachments", "Allow project owners to attach documents."],
      ]}
    />
  ),
  audit: (
    <SettingsList
      items={[
        ["Retention settings", "Keep platform audit logs for 24 months."],
        ["Log categories", "Track users, tenants, auth, content, and commerce."],
        ["Audit visibility", "Restrict audit views to authorized operators."],
        ["Export preparation", "Prepare future CSV and PDF audit exports."],
      ]}
    />
  ),
};

export function SuperAdminSettingsManagement() {
  const [activeTab, setActiveTab] = useState("platform");

  return (
    <div className="mt-6 grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="dashboard-card">
        <CardContent className="space-y-2 p-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <Button
                key={tab.id}
                className={cn("w-full justify-start", active && "bg-primary text-primary-foreground")}
                type="button"
                variant={active ? "default" : "ghost"}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
              </Button>
            );
          })}
        </CardContent>
      </Card>
      <Card className="dashboard-card">
        <CardContent className="p-5">
          <div className="mb-6 flex items-center gap-3">
            <span className="dashboard-icon-tile flex h-10 w-10 items-center justify-center">
              {(() => {
                const Icon =
                  tabs.find((tab) => tab.id === activeTab)?.icon ?? FiSliders;
                return <Icon className="h-4 w-4" aria-hidden="true" />;
              })()}
            </span>
            <div>
              <p className="text-lg font-semibold">
                {tabs.find((tab) => tab.id === activeTab)?.label}
              </p>
              <p className="text-sm text-muted-foreground">
                Configure platform-wide standards for this area.
              </p>
            </div>
          </div>
          {tabPanels[activeTab]}
        </CardContent>
      </Card>
    </div>
  );
}
