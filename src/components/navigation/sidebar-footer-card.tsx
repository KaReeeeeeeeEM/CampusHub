"use client";

import Link from "next/link";
import { FaFire } from "react-icons/fa6";
import { FiChevronRight, FiGlobe } from "react-icons/fi";

import { cn } from "@/lib/utils";

type SidebarFooterCardProps = {
  name: string;
  email: string;
  domain?: string;
  streakLabel?: string;
  streakDays?: string;
  profileHref?: string;
  className?: string;
};

const weekDays = ["M", "T", "W", "T", "F", "S", "S"];

export function SidebarFooterCard({
  name,
  email,
  domain = "campushub.com",
  streakLabel = "Campus Streak",
  streakDays = "7 days",
  profileHref = "/portal-selection",
  className,
}: SidebarFooterCardProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="rounded-xl bg-surface-muted p-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <FaFire
              className="h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {streakLabel}
            </p>
          </div>
          <p className="shrink-0 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.08em] text-primary">
            {streakDays}
          </p>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-medium">
          {weekDays.map((day, index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const active = index < 5;
            return (
              <span
                className={cn(
                  "flex aspect-square items-center justify-center rounded-full text-[10px]",
                  active
                    ? "bg-primary/15 text-primary"
                    : "bg-background text-muted-foreground",
                )}
                key={`${day}-dot-${index}`}
              >
                {active ? "•" : ""}
              </span>
            );
          })}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/15">
          <div className="h-full w-[71%] rounded-full bg-primary" />
        </div>
        <p className="mt-4 text-center text-xs font-semibold">
          5 of 7 days this week
        </p>
      </div>

      <Link
        className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-surface text-sm font-semibold text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary"
        href="/"
      >
        <FiGlobe className="h-4 w-4" aria-hidden="true" />
        {domain}
      </Link>

      <Link
        className="flex items-center gap-3 border-t border-border px-1 pt-4"
        href={profileHref}
      >
        <span className="h-9 w-9 rounded-full bg-gradient-to-br from-primary via-primary/80 to-pink-400" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-muted-foreground">
            {name}
          </span>
          <span className="block truncate text-xs font-semibold">{email}</span>
        </span>
        <FiChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </div>
  );
}
