"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FiSidebar } from "react-icons/fi";

import { Drawer } from "@/components/shared/drawer";
import { Button } from "@/components/ui/button";
import {
  campusAdminNavItems,
  campusAdminWorkspace,
} from "@/features/campus-admin/components/campus-admin-navigation";
import { cn } from "@/lib/utils";

export function CampusAdminMobileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const WorkspaceIcon = campusAdminWorkspace.icon;

  return (
    <>
      <Button
        aria-label="Open Campus Admin navigation"
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
        title="Campus Admin"
        description="University operations"
        direction="left"
        className="max-w-80"
      >
        <Link
          className="mb-4 flex items-center gap-3 rounded-lg px-2 py-2"
          href="/campus-admin/dashboard"
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
              Campus Admin
            </span>
          </span>
        </Link>

        <div className="mb-4 rounded-lg border border-border bg-background p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <WorkspaceIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium">
                {campusAdminWorkspace.label}
              </p>
              <p className="text-xs text-muted-foreground">
                University control
              </p>
            </div>
          </div>
        </div>

        <nav className="space-y-1">
          {campusAdminNavItems.map((item) => {
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
                onClick={() => setOpen(false)}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </Drawer>
    </>
  );
}
