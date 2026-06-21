"use client";

import { cn } from "@/lib/utils";

type NotificationTab = {
  key: string;
  label: string;
  count: number;
};

export function NotificationTabs({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: NotificationTab[];
  activeTab: string;
  onChange: (tab: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-surface p-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={cn(
            "flex min-h-10 items-center justify-between gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === tab.key
              ? "bg-primary text-primary-foreground"
              : "bg-transparent text-muted-foreground hover:bg-surface-muted hover:text-foreground",
          )}
          onClick={() => onChange(tab.key)}
        >
          <span>{tab.label}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs",
              activeTab === tab.key
                ? "bg-primary-foreground/15 text-primary-foreground"
                : "bg-background text-muted-foreground",
            )}
          >
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}
