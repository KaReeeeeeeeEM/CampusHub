"use client";

import { useEffect } from "react";

import { useThemeStore } from "@/store/theme-store";

type ThemeProviderProps = {
  children: React.ReactNode;
};

function resolveTheme(theme: "light" | "dark" | "system") {
  if (theme !== "system") {
    return theme;
  }

  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      const resolvedTheme = resolveTheme(theme);
      root.classList.toggle("dark", resolvedTheme === "dark");
      root.dataset.theme = resolvedTheme;
    };

    applyTheme();

    if (theme !== "system") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", applyTheme);

    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  return <>{children}</>;
}
