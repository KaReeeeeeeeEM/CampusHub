"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiChevronRight } from "react-icons/fi";

import { getAlumniNavItemByPath } from "@/features/alumni-portal/lib/navigation";

export function AlumniBreadcrumbs() {
  const pathname = usePathname();
  const item = getAlumniNavItemByPath(pathname);

  return (
    <nav className="flex h-full items-center gap-2 px-4 text-sm">
      <Link
        href="/alumni/dashboard"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        Alumni
      </Link>
      <FiChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-semibold text-foreground">{item.label}</span>
    </nav>
  );
}
