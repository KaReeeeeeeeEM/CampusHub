"use client";

import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

export type MultiStepProgressItem = {
  label?: string;
  icon?: ComponentType<{ className?: string }>;
};

type MultiStepProgressProps = {
  steps: MultiStepProgressItem[];
  activeIndex: number;
  maxClickableIndex?: number;
  onStepClick?: (index: number) => void;
  className?: string;
};

export function MultiStepProgress({
  steps,
  activeIndex,
  maxClickableIndex,
  onStepClick,
  className,
}: MultiStepProgressProps) {
  return (
    <div
      className={cn("grid w-full", className)}
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((step, index) => {
        const complete = index < activeIndex;
        const active = index === activeIndex;
        const nextComplete = index < activeIndex;
        const hasNext = index < steps.length - 1;
        const available =
          typeof maxClickableIndex === "number"
            ? index <= maxClickableIndex
            : Boolean(onStepClick);
        const StepIcon = step.icon;
        const content = (
          <>
            <span className="relative flex h-7 items-center justify-center">
              {hasNext ? (
                <span
                  className={cn(
                    "absolute left-1/2 top-1/2 h-0.5 w-full -translate-y-1/2",
                    nextComplete
                      ? "bg-primary"
                      : "border-t border-dotted border-border bg-transparent",
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full transition-all",
                  complete && "bg-primary",
                  active &&
                    "h-7 w-7 border-2 border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20",
                  !complete && !active && "bg-border",
                )}
              >
                {active && StepIcon ? (
                  <StepIcon className="h-3.5 w-3.5" aria-hidden="true" />
                ) : null}
              </span>
            </span>
            <span
              className={cn(
                "mt-2 block truncate text-center text-xs font-medium",
                index <= activeIndex ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label ?? `Step ${index + 1}`}
            </span>
          </>
        );

        if (!onStepClick) {
          return (
            <div key={`${step.label ?? "step"}-${index}`} className="min-w-0">
              {content}
            </div>
          );
        }

        return (
          <button
            key={`${step.label ?? "step"}-${index}`}
            type="button"
            className="min-w-0 text-left disabled:cursor-default disabled:opacity-100"
            disabled={!available}
            onClick={() => onStepClick(index)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
