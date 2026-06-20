"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FiSidebar } from "react-icons/fi";

import { Drawer } from "@/components/shared/drawer";
import { Button } from "@/components/ui/button";
import {
  representativeNavItems,
  representativeWorkspace,
} from "@/features/representative/components/representative-navigation";
import { cn } from "@/lib/utils";

export function RepresentativeMobileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const WorkspaceIcon = representativeWorkspace.icon;

  return (
    <>
      <Button
        aria-label="Open Representative navigation"
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
        title="Representative"
        description="College operations"
        direction="left"
        className="max-w-80"
      >
        <Link
          className="mb-4 flex items-center gap-3 rounded-lg px-2 py-2"
          href="/representative/dashboard"
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
              Representative
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
                {representativeWorkspace.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {representativeWorkspace.description}
              </p>
            </div>
          </div>
        </div>

        <nav className="space-y-1">
          {representativeNavItems.map((item) => {
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
