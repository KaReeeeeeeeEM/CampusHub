"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  studentNavigationItems,
  type StudentNavItem,
} from "@/features/student-portal/lib/navigation";
import { cn } from "@/lib/utils";

function isActive(pathname: string, item: StudentNavItem) {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

type StudentSidebarProps = {
  className?: string;
};

export function StudentSidebar({ className }: StudentSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-72 flex-col border-r border-border bg-surface",
        className,
      )}
    >
      <div className="border-b border-border p-5">
        <Link className="flex items-center gap-3" href="/student/dashboard">
          <span className="relative h-10 w-10 overflow-hidden rounded-md">
            <Image
              src="/logo.png"
              alt="CampusHub logo"
              fill
              className="object-contain"
              sizes="40px"
              priority
            />
          </span>
          <span>
            <span className="block text-sm font-semibold">CampusHub</span>
            <span className="block text-xs text-muted-foreground">
              Student Portal
            </span>
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {studentNavigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item);

          return (
            <Link
              key={item.key}
              className={cn(
                "group flex min-h-11 items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-background hover:text-foreground",
              )}
              href={item.href}
            >
              <span className="flex min-w-0 items-center gap-3">
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </span>
              {item.comingSoon ? (
                <span
                  className={cn(
                    "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium",
                    active
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  Soon
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
