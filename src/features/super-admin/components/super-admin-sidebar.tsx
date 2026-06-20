"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FiChevronDown } from "react-icons/fi";

import { SidebarNavTooltip } from "@/components/navigation/sidebar-nav-tooltip";
import { SidebarFooterCard } from "@/components/navigation/sidebar-footer-card";
import { useAuth } from "@/features/auth/auth-provider";
import { superAdminNavSections } from "@/features/super-admin/components/super-admin-navigation";
import { cn } from "@/lib/utils";
import { useNavigationStore } from "@/store/navigation-store";
import type { AuthUser } from "@/types/auth";

function getUserName(user: AuthUser | null | undefined) {
  return (
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "CampusHub Admin"
  );
}

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const collapsed = useNavigationStore((state) => state.sidebarCollapsed);
  const activeSectionLabel = useMemo(() => {
    return (
      superAdminNavSections.find((section) =>
        section.items.some(
          (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
        ),
      )?.label ?? superAdminNavSections[0]?.label
    );
  }, [pathname]);
  const [openSection, setOpenSection] = useState<string | null>(
    activeSectionLabel ?? null,
  );

  useEffect(() => {
    setOpenSection(activeSectionLabel ?? null);
  }, [activeSectionLabel]);

  function toggleSection(label: string) {
    setOpenSection((current) => (current === label ? null : label));
  }

  return (
    <aside
      className={cn(
        "dashboard-sidebar hidden h-screen w-64 shrink-0 border-r border-border p-3 transition-[width] duration-200 lg:sticky lg:top-0 lg:flex lg:flex-col",
        collapsed && "w-16",
      )}
    >
      <Link
        className={cn(
          "mb-4 flex items-center gap-2.5 rounded-lg px-1 py-2",
          collapsed && "justify-center",
        )}
        href="/super-admin/dashboard"
      >
        <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md">
          <Image
            src="/logo.png"
            alt=""
            fill
            className="object-contain"
            sizes="32px"
            priority
          />
        </span>
        <span
          className={cn(
            "min-w-0 text-sm font-semibold leading-5",
            collapsed && "hidden",
          )}
        >
          <span className="campushub-logo-text">CampusHub</span>
          <span className="block text-[11px] font-normal leading-tight text-muted-foreground">
            Super Admin
          </span>
        </span>
      </Link>

      <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {superAdminNavSections.map((section, sectionIndex) => (
          <div key={section.label ?? `section-${sectionIndex}`} className="space-y-1">
            {section.label && !collapsed ? (
              <button
                type="button"
                className="flex h-9 w-full items-center justify-between rounded-md px-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                aria-expanded={openSection === section.label}
                onClick={() => toggleSection(section.label!)}
              >
                <span>{section.label}</span>
                <FiChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    openSection === section.label && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>
            ) : null}
            <div
              className={cn(
                "space-y-1",
                !collapsed &&
                  section.label &&
                  openSection !== section.label &&
                  "hidden",
              )}
            >
              {section.items.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <SidebarNavTooltip
                  key={item.href}
                  label={item.label}
                  enabled={collapsed}
                >
                  <Link
                    aria-label={item.label}
                    className={cn(
                      "dashboard-nav-item flex h-9 items-center gap-2 px-2 text-sm transition-colors",
                      collapsed && "justify-center",
                      active
                        ? "dashboard-nav-item-active"
                        : "text-muted-foreground",
                    )}
                    href={item.href}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className={cn("truncate", collapsed && "hidden")}>
                      {item.label}
                    </span>
                  </Link>
                </SidebarNavTooltip>
              );
              })}
            </div>
          </div>
        ))}
      </nav>
      <SidebarFooterCard
        className={cn("mt-auto", collapsed && "hidden")}
        email={user?.email ?? "admin@campushub.com"}
        name={getUserName(user)}
        profileHref="/super-admin/settings"
        streakLabel="Setup Streak"
      />
    </aside>
  );
}
