"use client";

import { cn } from "@/lib/utils";

type EmployerBadgeProps = {
  children: React.ReactNode;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
  className?: string;
};

const toneClassNames = {
  default: "bg-surface-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
};

export function EmployerBadge({
  children,
  tone = "default",
  className,
}: EmployerBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold",
        toneClassNames[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
