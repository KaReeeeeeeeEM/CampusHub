"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  representativeNavItems,
  representativeWorkspace,
} from "@/features/representative/components/representative-navigation";
import { cn } from "@/lib/utils";

export function RepresentativeSidebar() {
  const pathname = usePathname();
  const WorkspaceIcon = representativeWorkspace.icon;

  return (
    <aside className="hidden h-screen w-72 shrink-0 border-r border-border bg-surface p-4 lg:sticky lg:top-0 lg:flex lg:flex-col">
      <Link
        className="mb-4 flex items-center gap-3 rounded-lg px-2 py-2"
        href="/representative/dashboard"
      >
        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md">
          <Image
            src="/logo.png"
            alt=""
            fill
            className="object-contain"
            sizes="44px"
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
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
