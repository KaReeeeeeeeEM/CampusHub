"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { KiboAvatar } from "./KiboAvatar";
import type { KiboMood } from "../types";

type KiboEmptyStateProps = {
  mood?: KiboMood;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function KiboEmptyState({
  mood = "curious",
  title,
  description,
  actionLabel,
  onAction,
  className,
}: KiboEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex w-full max-w-xl flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface p-8 text-center",
        className,
      )}
    >
      <KiboAvatar mood={mood} size="lg" />
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <Button className="mt-6" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
