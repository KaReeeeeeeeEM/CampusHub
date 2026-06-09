"use client";

import Image from "next/image";
import { Home, Shield, University } from "lucide-react";

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
  { label: "Foundation", href: "#", icon: Home },
  { label: "Tenant", href: "#", icon: University },
  { label: "Access", href: "#", icon: Shield },
];

export function Sidebar({ items = defaultItems, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-72 flex-col border-r border-border bg-surface p-4",
        className,
      )}
    >
      <div className="mb-6 flex h-10 items-center gap-3 px-2 text-base font-semibold">
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
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <a
              key={item.label}
              className="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-background hover:text-foreground"
              href={item.href}
            >
              {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
              {item.label}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
