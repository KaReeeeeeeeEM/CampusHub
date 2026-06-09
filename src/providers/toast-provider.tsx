"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      closeButton
      richColors
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "border border-border bg-surface text-foreground shadow-lg shadow-black/5"
        }
      }}
    />
  );
}
