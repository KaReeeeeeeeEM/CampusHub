"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiChevronRight } from "react-icons/fi";

import { getStudentNavItemByKey } from "@/features/student-portal/lib/navigation";
import { cn } from "@/lib/utils";

const nestedRouteLabels: Record<string, string> = {
  browse: "Browse",
  categories: "Categories",
  favorites: "Favorites",
  "my-shop": "My Shop",
  "my-products": "My Products",
  orders: "Orders",
  showcase: "Showcase",
  explore: "Explore",
  leaderboards: "Leaderboards",
  achievements: "Achievements",
  leadership: "Leadership",
  committee: "Committee Management",
  invitations: "Student Invitations",
  polls: "Polls Management",
  forums: "Forums Management",
  "my-committee": "My Committee",
  tasks: "Tasks",
  discussions: "Category Discussions",
};

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
  const Icon = current?.icon;
  const crumbs =
    segments.length > 0
      ? segments.map((segment, index) => {
          const href = `/student/${segments.slice(0, index + 1).join("/")}`;
          const item = index === 0 ? getStudentNavItemByKey(segment) : null;

          return {
            href,
            label: item?.label ?? nestedRouteLabels[segment] ?? toTitle(segment),
            icon: index === 0 ? item?.icon : undefined,
            clickable: Boolean(item),
          };
        })
      : [
          {
            href: "/student/dashboard",
            label: current?.label ?? "Dashboard",
            icon: current?.icon,
            clickable: Boolean(current),
          },
        ];

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex h-full min-w-0 items-center gap-1 px-4 text-sm font-semibold"
    >
      {crumbs.map((crumb, index) => {
        const CrumbIcon = crumb.icon ?? (index === 0 ? Icon : undefined);
        const currentPage = index === crumbs.length - 1;
        const content = (
          <>
            {CrumbIcon ? (
              <CrumbIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : null}
            <span className="truncate">{crumb.label}</span>
          </>
        );

        return (
          <div key={crumb.href} className="flex min-w-0 items-center gap-1">
            {index > 0 ? (
              <FiChevronRight
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            ) : null}
            {currentPage || !crumb.clickable ? (
              <span className="flex min-w-0 items-center gap-2 text-foreground">
                {content}
              </span>
            ) : (
              <Link
                className={cn(
                  "flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground",
                  index > 0 && "hidden sm:flex",
                )}
                href={crumb.href}
              >
                {content}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
