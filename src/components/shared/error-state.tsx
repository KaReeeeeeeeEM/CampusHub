"use client";

import { FiAlertTriangle } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again.",
  actionLabel,
  onAction,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex w-full max-w-md flex-col items-center justify-center rounded-lg border border-border bg-surface p-8 text-center",
        className,
      )}
    >
      <div className="mb-4 rounded-full border border-destructive/25 bg-destructive/10 p-3 text-destructive">
        <FiAlertTriangle className="h-5 w-5" aria-hidden="true" />
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {actionLabel && onAction ? (
        <Button className="mt-6" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
