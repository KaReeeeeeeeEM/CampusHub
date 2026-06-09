"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { type Theme, THEME_STORAGE_KEY } from "@/constants/theme";

type ThemeState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme })
    }),
    {
      name: THEME_STORAGE_KEY
    }
  )
);
