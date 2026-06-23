"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FiChevronDown, FiSidebar } from "react-icons/fi";

import { Drawer } from "@/components/shared/drawer";
import { Button } from "@/components/ui/button";
import { superAdminNavSections } from "@/features/super-admin/components/super-admin-navigation";
import { cn } from "@/lib/utils";

export function SuperAdminMobileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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
    <>
      <Button
        aria-label="Open Super Admin navigation"
        className="lg:hidden"
        size="icon"
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
      >
        <FiSidebar className="h-5 w-5" aria-hidden="true" />
      </Button>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Super Admin"
        description="Platform operations"
        direction="left"
        className="max-w-80"
      >
        <Link
          className="mb-4 flex items-center gap-3 rounded-lg px-2 py-2"
          href="/super-admin/dashboard"
          prefetch={false}
          onClick={() => setOpen(false)}
        >
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
            <Image
              src="/logo.png"
              alt=""
              fill
              className="object-contain"
              sizes="40px"
              priority
            />
          </span>
          <span className="min-w-0 text-sm font-semibold leading-5">
            <span className="campushub-logo-text">CampusHub</span>
            <span className="block text-xs font-normal text-muted-foreground">
              Super Admin
            </span>
          </span>
        </Link>

        <nav className="space-y-2">
          {superAdminNavSections.map((section, sectionIndex) => (
            <div key={section.label ?? `section-${sectionIndex}`} className="space-y-1">
              {section.label ? (
                <button
                  type="button"
                  className="flex h-10 w-full items-center justify-between rounded-md px-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
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
                  <Link
                    key={item.href}
                    className={cn(
                      "flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-background hover:text-foreground",
                    )}
                    href={item.href}
                    prefetch={false}
                    onClick={() => setOpen(false)}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
                })}
              </div>
            </div>
          ))}
        </nav>
      </Drawer>
    </>
  );
}
