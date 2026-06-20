"use client";

import { useEffect } from "react";

import { defaultAppearancePalette } from "@/constants/appearance";

type PublicThemeProviderProps = {
  children: React.ReactNode;
};

function applyBrandTheme() {
  const root = document.documentElement;
  const palette = defaultAppearancePalette;

  root.classList.remove("dark");
  root.dataset.theme = "brand";
  root.dataset.appearance = "campushub-brand";
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
}

export function PublicThemeProvider({ children }: PublicThemeProviderProps) {
  useEffect(() => {
    applyBrandTheme();
  }, []);

  return <>{children}</>;
}
