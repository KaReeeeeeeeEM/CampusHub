"use client";

import { Drawer as DrawerPrimitive } from "vaul";
import { FiX } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  direction?: "top" | "right" | "bottom" | "left";
  className?: string;
};

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  direction = "right",
  className,
}: DrawerProps) {
  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      direction={direction}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <DrawerPrimitive.Content
          className={cn(
            "fixed z-50 flex h-full w-full max-w-md flex-col border-border bg-surface p-6 text-foreground outline-none",
            direction === "right" && "right-0 top-0 border-l",
            direction === "left" && "left-0 top-0 border-r",
            direction === "bottom" &&
              "bottom-0 left-0 h-auto max-h-[85vh] max-w-none rounded-t-lg border-t",
            direction === "top" &&
              "left-0 top-0 h-auto max-h-[85vh] max-w-none rounded-b-lg border-b",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DrawerPrimitive.Title className="text-lg font-semibold">
                {title}
              </DrawerPrimitive.Title>
              {description ? (
                <DrawerPrimitive.Description className="text-sm text-muted-foreground">
                  {description}
                </DrawerPrimitive.Description>
              ) : null}
            </div>
            <DrawerPrimitive.Close asChild>
              <Button aria-label="Close drawer" size="icon" variant="ghost">
                <FiX className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DrawerPrimitive.Close>
          </div>
          <div className="mt-6 flex-1 overflow-y-auto">{children}</div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
