"use client";

import { AppearanceProvider } from "@/providers/appearance-provider";
import { ThemeProvider } from "@/providers/theme-provider";

type DashboardThemeProviderProps = {
  children: React.ReactNode;
};

export function DashboardThemeProvider({
  children,
}: DashboardThemeProviderProps) {
  return (
    <ThemeProvider>
      <AppearanceProvider>{children}</AppearanceProvider>
    </ThemeProvider>
  );
}
