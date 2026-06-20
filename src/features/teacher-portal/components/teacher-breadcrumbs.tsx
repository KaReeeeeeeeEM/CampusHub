"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiChevronRight } from "react-icons/fi";

import { getTeacherNavItemByPath } from "@/features/teacher-portal/lib/navigation";

export function TeacherBreadcrumbs() {
  const pathname = usePathname();
  const item = getTeacherNavItemByPath(pathname);

  return (
    <nav className="flex h-full items-center gap-2 px-4 text-sm">
      <Link
        href="/teacher/dashboard"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        Teacher
      </Link>
      <FiChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-semibold text-foreground">{item.label}</span>
    </nav>
  );
}
