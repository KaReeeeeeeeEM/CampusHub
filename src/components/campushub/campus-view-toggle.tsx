"use client";

import type { IconType } from "react-icons";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CampusViewToggleOption<T extends string> = {
  value: T;
  label: string;
  icon: IconType;
};

export function CampusViewToggle<T extends string>({
  value,
  options,
  onValueChange,
  className,
}: {
  value: T;
  options: readonly CampusViewToggleOption<T>[];
  onValueChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-full border border-border bg-background p-1 shadow-sm",
        className,
      )}
      role="tablist"
      aria-label="View mode"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;

        return (
          <Button
            key={option.value}
            aria-label={option.label}
            aria-selected={active}
            className={cn(
              "h-9 min-w-11 rounded-full px-3 text-muted-foreground shadow-none",
              active &&
                "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary",
            )}
            title={option.label}
            type="button"
            variant="ghost"
            role="tab"
            onClick={() => onValueChange(option.value)}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </Button>
        );
      })}
    </div>
  );
}
