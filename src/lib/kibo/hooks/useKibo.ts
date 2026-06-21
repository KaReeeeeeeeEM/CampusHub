"use client";

import { createContext, useContext } from "react";

import type { KiboContextValue } from "../types";

export const KiboContext = createContext<KiboContextValue | null>(null);

export function useKibo() {
  const context = useContext(KiboContext);

  if (!context) {
    throw new Error("useKibo must be used inside KiboProvider.");
  }

  return context;
}
