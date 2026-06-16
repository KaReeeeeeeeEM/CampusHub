"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type SidebarNavTooltipProps = {
  label: string;
  enabled: boolean;
  children: React.ReactNode;
};

export function SidebarNavTooltip({
  label,
  enabled,
  children,
}: SidebarNavTooltipProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null,
  );

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <span
      className="group relative block"
      onBlur={() => setPosition(null)}
      onFocus={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPosition({ top: rect.top + rect.height / 2, left: rect.right + 12 });
      }}
      onMouseEnter={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPosition({ top: rect.top + rect.height / 2, left: rect.right + 12 });
      }}
      onMouseLeave={() => setPosition(null)}
    >
      {children}
      {position ? (
        <span
          role="tooltip"
          style={{ top: position.top, left: position.left }}
          className={cn(
            "pointer-events-none fixed z-[100] hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-foreground opacity-0 shadow-lg transition-all duration-150",
            "lg:block lg:opacity-100",
          )}
        >
          {label}
          <span
            aria-hidden="true"
            className="absolute right-full top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1 rotate-45 border-b border-l border-border bg-surface"
          />
        </span>
      ) : null}
    </span>
  );
}
