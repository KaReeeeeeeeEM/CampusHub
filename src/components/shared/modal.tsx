"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FiX } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  const reducedMotion = useReducedMotion();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal forceMount>
        <AnimatePresence>
          {open ? (
            <>
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  className="fixed inset-0 z-50 bg-black/60"
                  initial={reducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reducedMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild forceMount>
                <motion.div
                  className={cn(
                    "fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg border border-border bg-surface p-6 text-foreground shadow-xl focus:outline-none",
                    className,
                    "max-w-5xl",
                  )}
                  initial={
                    reducedMotion
                      ? false
                      : {
                          opacity: 0,
                          scale: 0.96,
                          x: "-50%",
                          y: "calc(-50% + 14px)",
                        }
                  }
                  animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                  exit={
                    reducedMotion
                      ? undefined
                      : {
                          opacity: 0,
                          scale: 0.98,
                          x: "-50%",
                          y: "calc(-50% + 10px)",
                        }
                  }
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <Dialog.Title className="text-lg font-semibold">
                        {title}
                      </Dialog.Title>
                      {description ? (
                        <Dialog.Description className="text-sm text-muted-foreground">
                          {description}
                        </Dialog.Description>
                      ) : null}
                    </div>
                    <Dialog.Close asChild>
                      <Button
                        aria-label="Close modal"
                        size="icon"
                        variant="ghost"
                      >
                        <FiX className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </Dialog.Close>
                  </div>
                  <div className="mt-6 [&_form>div>label]:space-y-3 [&_form>label]:space-y-3">
                    {children}
                  </div>
                  {footer ? (
                    <div className="mt-6 flex justify-end gap-3">{footer}</div>
                  ) : null}
                </motion.div>
              </Dialog.Content>
            </>
          ) : null}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
