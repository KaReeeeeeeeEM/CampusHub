"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getStudentNavItemByKey } from "@/features/student-portal/lib/navigation";

function toTitle(value: string) {
  return value
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function StudentBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((segment) => segment !== "student");
  const currentKey = segments[0] ?? "dashboard";
  const current = getStudentNavItemByKey(currentKey);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      <Link
        className="text-muted-foreground transition-colors hover:text-primary"
        href="/student/dashboard"
      >
        Student
      </Link>
      <span className="text-muted-foreground">/</span>
      <span className="font-medium text-foreground">
        {current?.label ?? toTitle(currentKey)}
      </span>
    </nav>
  );
}
