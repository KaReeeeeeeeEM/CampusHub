"use client";

import { FiMoon, FiSun } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/store/theme-store";

type DashboardThemeToggleProps = {
  className?: string;
};

export function DashboardThemeToggle({ className }: DashboardThemeToggleProps) {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <Button
      aria-label="Toggle theme"
      className={className}
      size="icon"
      type="button"
      variant="ghost"
      onClick={() => setTheme(nextTheme)}
    >
      <FiSun className="h-4 w-4 dark:hidden" aria-hidden="true" />
      <FiMoon className="hidden h-4 w-4 dark:block" aria-hidden="true" />
    </Button>
  );
}
