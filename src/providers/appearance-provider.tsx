"use client";

import { useEffect } from "react";

import { getAppearancePalette } from "@/constants/appearance";
import { useAppearanceStore } from "@/store/appearance-store";

type AppearanceProviderProps = {
  children: React.ReactNode;
};

export function AppearanceProvider({ children }: AppearanceProviderProps) {
  const paletteId = useAppearanceStore((state) => state.paletteId);

  useEffect(() => {
    const palette = getAppearancePalette(paletteId);
    const root = document.documentElement;

    root.dataset.appearance = palette.id;
    root.style.setProperty("--primary", palette.primary);
    root.style.setProperty("--primary-hover", palette.primaryHover);
    root.style.setProperty("--primary-active", palette.primaryActive);
    root.style.setProperty("--ring", palette.primary);
    root.style.setProperty("--success", palette.success);
    root.style.setProperty("--info", palette.info);
    root.style.setProperty("--warning", palette.warning);
    root.style.setProperty("--achievement", palette.achievement);
    root.style.setProperty("--chart-primary", palette.primary);
    root.style.setProperty("--chart-secondary", palette.info);
    root.style.setProperty("--chart-tertiary", palette.success);
    root.style.setProperty("--chart-accent", palette.warning);
  }, [paletteId]);

  return <>{children}</>;
}
