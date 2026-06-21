"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { KiboVideo } from "./KiboVideo";
import type { KiboModalPayload } from "../types";

type KiboModalProps = KiboModalPayload & {
  open: boolean;
  onClose: () => void;
};

export function KiboModal({
  open,
  animation,
  title,
  description,
  primaryActionLabel = "Continue",
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
  onClose,
  children,
}: KiboModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current
      ?.querySelector<HTMLButtonElement>("[data-kibo-primary]")
      ?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  function trapFocus(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;

    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[220] flex min-h-dvh items-center justify-center bg-background/55 px-4 py-6 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kibo-modal-title"
          aria-describedby={description ? "kibo-modal-description" : undefined}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
          onKeyDown={trapFocus}
        >
          <motion.div
            ref={panelRef}
            className={cn(
              "relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface p-6 text-center shadow-2xl",
              "before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-primary/50",
            )}
            initial={{ opacity: 0, scale: 0.9, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="mx-auto h-44 w-44">
              <KiboVideo
                animation={animation}
                loop={animation === "idle" || animation === "thinking"}
                autoplay
                posterMood="celebrate"
              />
            </div>
            <h2 id="kibo-modal-title" className="mt-4 text-2xl font-semibold">
              {title}
            </h2>
            {description ? (
              <p
                id="kibo-modal-description"
                className="mt-2 text-sm leading-6 text-muted-foreground"
              >
                {description}
              </p>
            ) : null}
            {children ? <div className="mt-5">{children}</div> : null}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {secondaryActionLabel ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    onSecondaryAction?.();
                    onClose();
                  }}
                >
                  {secondaryActionLabel}
                </Button>
              ) : null}
              <Button
                data-kibo-primary
                type="button"
                onClick={() => {
                  onPrimaryAction?.();
                  onClose();
                }}
              >
                {primaryActionLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
