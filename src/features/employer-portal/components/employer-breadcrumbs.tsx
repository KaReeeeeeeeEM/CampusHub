"use client";

import { usePathname } from "next/navigation";

import { getEmployerNavItemByPath } from "@/features/employer-portal/lib/navigation";

export function EmployerBreadcrumbs() {
  const pathname = usePathname();
  const current = getEmployerNavItemByPath(pathname);

  return (
    <div className="flex h-full items-center gap-2 px-4 text-sm">
      <span className="text-muted-foreground">Employer</span>
      <span className="text-muted-foreground">/</span>
      <span className="font-medium text-foreground">{current.label}</span>
    </div>
  );
}
