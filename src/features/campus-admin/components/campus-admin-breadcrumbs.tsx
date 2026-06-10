"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function titleize(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function CampusAdminBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean).slice(1);

  return (
    <nav aria-label="Breadcrumb" className="hidden text-sm md:block">
      <ol className="flex items-center gap-2 text-muted-foreground">
        <li>
          <Link
            className="hover:text-foreground"
            href="/campus-admin/dashboard"
          >
            Campus Admin
          </Link>
        </li>
        {segments.map((segment, index) => {
          const href = `/campus-admin/${segments
            .slice(0, index + 1)
            .join("/")}`;
          const isLast = index === segments.length - 1;

          return (
            <li key={href} className="flex items-center gap-2">
              <span>/</span>
              {isLast ? (
                <span className="text-foreground">{titleize(segment)}</span>
              ) : (
                <Link className="hover:text-foreground" href={href}>
                  {titleize(segment)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
