"use client";

import { usePathname } from "next/navigation";

import { campusAdminNavItems } from "@/features/campus-admin/components/campus-admin-navigation";

function titleize(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function CampusAdminBreadcrumbs() {
  const pathname = usePathname();
  const current =
    campusAdminNavItems.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? campusAdminNavItems[0];
  const Icon = current.icon;

  return (
    <nav
      aria-label="Current page"
      className="hidden h-full items-center gap-2 px-4 text-sm font-semibold md:flex"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{current.label ?? titleize(pathname.split("/").pop() ?? "")}</span>
    </nav>
  );
}
