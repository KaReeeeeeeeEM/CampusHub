"use client";

import Image from "next/image";
import { Suspense } from "react";
import { FiBookOpen, FiHome, FiShield } from "react-icons/fi";

import { DevelopmentRoleSwitcher } from "@/components/navigation/development-role-switcher";
import { cn } from "@/lib/utils";

type SidebarItem = {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type SidebarProps = {
  items?: SidebarItem[];
  className?: string;
};

const defaultItems: SidebarItem[] = [
  { label: "Foundation", href: "#", icon: FiHome },
  { label: "Tenant", href: "#", icon: FiBookOpen },
  { label: "Access", href: "#", icon: FiShield },
];

export function Sidebar({ items = defaultItems, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-72 flex-col border-r border-border bg-surface p-4",
        className,
      )}
    >
      <div className="mb-4 flex h-10 items-center gap-3 px-2 text-base font-semibold">
        <span className="relative h-9 w-9 overflow-hidden rounded-md">
          <Image
            src="/logo.png"
            alt="CampusHub logo"
            fill
            className="object-contain"
            sizes="36px"
            priority
          />
        </span>
        <span>CampusHub</span>
      </div>
      <Suspense fallback={null}>
        <DevelopmentRoleSwitcher />
      </Suspense>
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <a
              key={item.label}
              className="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-background hover:text-foreground"
              href={item.href}
            >
              {Icon ? (
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : null}
              <span className="truncate">{item.label}</span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
