"use client";

import { FiX } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { KiboVideo } from "./KiboVideo";
import type { KiboAnimation } from "../types";

type KiboNotificationProps = {
  animation?: KiboAnimation;
  title: string;
  description?: string;
  className?: string;
  onDismiss?: () => void;
};

export function KiboNotification({
  animation = "announcement",
  title,
  description,
  className,
  onDismiss,
}: KiboNotificationProps) {
  return (
    <article
      className={cn(
        "relative mt-9 rounded-xl border border-border bg-surface px-4 pb-4 pt-10 text-center shadow-lg",
        className,
      )}
    >
      <div className="absolute left-1/2 top-0 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-surface p-1 shadow-xl">
        <KiboVideo animation={animation} loop autoplay posterMood="happy" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description ? (
          <p className="mx-auto mt-1 max-w-xs text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {onDismiss ? (
        <Button
          className="absolute right-2 top-2 h-8 w-8"
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Dismiss Kibo notification"
          onClick={onDismiss}
        >
          <FiX className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : null}
    </article>
  );
}
