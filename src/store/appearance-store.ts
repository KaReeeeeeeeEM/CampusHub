"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  APPEARANCE_STORAGE_KEY,
  defaultAppearancePalette,
} from "@/constants/appearance";

type AppearanceState = {
  paletteId: string;
  setPaletteId: (paletteId: string) => void;
};

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      paletteId: defaultAppearancePalette.id,
      setPaletteId: (paletteId) => set({ paletteId }),
    }),
    {
      name: APPEARANCE_STORAGE_KEY,
    },
  ),
);
