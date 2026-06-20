"use client";

import { useMemo, useState } from "react";
import { FiBriefcase, FiSearch, FiStar, FiUsers } from "react-icons/fi";

import { CampusInput } from "@/components/campushub";
import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import {
  employerOpportunities,
  employerProjects,
  employerStudents,
} from "@/features/employer-portal/lib/mock-data";
import { cn } from "@/lib/utils";

type EmployerSearchProps = {
  className?: string;
};

const staticItems = [
  {
    title: "Talent Discovery",
    description: "Advanced filters for candidates, skills, badges, and XP.",
    href: "/employer/talent-discovery",
    group: "Navigation",
    icon: FiUsers,
  },
  {
    title: "Projects & Showcase",
    description: "Discover high-signal student projects and innovators.",
    href: "/employer/showcase",
    group: "Navigation",
    icon: FiStar,
  },
  {
    title: "Opportunities",
    description: "Create and review internships, jobs, and competitions.",
    href: "/employer/opportunities",
    group: "Navigation",
    icon: FiBriefcase,
  },
];

export function EmployerSearch({ className }: EmployerSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const dynamicItems = [
      ...employerStudents.map((student) => ({
        title: student.name,
        description: `${student.department} · ${student.skills.slice(0, 3).join(", ")}`,
        href: "/employer/talent-discovery",
        group: "Students",
        icon: FiUsers,
      })),
      ...employerProjects.map((project) => ({
        title: project.name,
        description: `${project.owner} · ${project.category}`,
        href: "/employer/showcase",
        group: "Projects",
        icon: FiStar,
      })),
      ...employerOpportunities.map((opportunity) => ({
        title: opportunity.title,
        description: `${opportunity.type} · ${opportunity.status}`,
        href: "/employer/opportunities",
        group: "Opportunities",
        icon: FiBriefcase,
      })),
      ...staticItems,
    ];

    if (!normalized) {
      return dynamicItems.slice(0, 8);
    }

    return dynamicItems.filter((item) =>
      [item.title, item.description, item.group]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query]);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className={cn(
          "h-10 justify-start gap-2 rounded-lg px-3 text-muted-foreground",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <FiSearch className="h-4 w-4" />
        <span className="truncate">Search employer portal</span>
        <span className="ml-auto hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-flex">
          Ctrl K / ⌘ K
        </span>
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Employer Search"
        description="Search students, projects, skills, universities, departments, and opportunities."
      >
        <div className="space-y-4">
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <CampusInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search students, projects, skills, departments"
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            {results.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={`${item.group}-${item.title}`}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted p-3 transition-colors hover:border-primary/40"
                  onClick={() => setOpen(false)}
                >
                  <span className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                      {item.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.group} · {item.description}
                    </span>
                  </span>
                </a>
              );
            })}
            {results.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No employer search results for "{query}".
              </div>
            ) : null}
          </div>
        </div>
      </Modal>
    </>
  );
}
