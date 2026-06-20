"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FiBookOpen, FiExternalLink, FiSearch } from "react-icons/fi";

import { CampusDataTable, CampusInput } from "@/components/campushub";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/shared/data-table";
import type { SerializedSuperAdminCollege } from "@/features/super-admin/lib/super-admin-service";
import { cn } from "@/lib/utils";

type SuperAdminCollegesManagementProps = {
  colleges: SerializedSuperAdminCollege[];
  initialUniversityId?: string | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function StatusBadge({
  status,
}: {
  status: SerializedSuperAdminCollege["status"];
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-1 text-xs font-medium",
        status === "ACTIVE"
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
          : "border-red-500/25 bg-red-500/10 text-red-400",
      )}
    >
      {status}
    </span>
  );
}

export function SuperAdminCollegesManagement({
  colleges,
  initialUniversityId,
}: SuperAdminCollegesManagementProps) {
  const [query, setQuery] = useState("");

  const scopedColleges = useMemo(() => {
    if (!initialUniversityId) {
      return colleges;
    }

    return colleges.filter(
      (college) => college.universityId === initialUniversityId,
    );
  }, [colleges, initialUniversityId]);

  const filteredColleges = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return scopedColleges;
    }

    return scopedColleges.filter((college) =>
      [
        college.name,
        college.shortName,
        college.code,
        college.status,
        college.universityName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, scopedColleges]);

  const columns: DataTableColumn<SerializedSuperAdminCollege>[] = [
    {
      key: "logo",
      header: "Logo",
      className: "w-20",
      cell: (college) => (
        <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-border bg-background text-primary">
          {college.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={college.logo}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <FiBookOpen className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
      ),
    },
    { key: "name", header: "College" },
    { key: "code", header: "Code" },
    {
      key: "universityName",
      header: "University",
      cell: (college) => (
        <Link
          className="font-medium text-foreground transition hover:text-primary"
          href={`/super-admin/universities/${college.universityId}`}
        >
          {college.universityName}
        </Link>
      ),
    },
    {
      key: "departmentsCount",
      header: "Departments",
      cell: (college) => college.departmentsCount.toLocaleString(),
    },
    {
      key: "usersCount",
      header: "Users",
      cell: (college) => college.usersCount.toLocaleString(),
    },
    {
      key: "status",
      header: "Status",
      cell: (college) => <StatusBadge status={college.status} />,
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (college) => formatDate(college.createdAt),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-20 text-right",
      cell: (college) => (
        <Button asChild size="sm" variant="ghost">
          <Link href={`/super-admin/universities/${college.universityId}`}>
            <FiExternalLink className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Open university</span>
          </Link>
        </Button>
      ),
    },
  ];

  const scopeName = initialUniversityId
    ? colleges.find((college) => college.universityId === initialUniversityId)
        ?.universityName
    : null;

  return (
    <section className="mt-8 space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <FiSearch
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <CampusInput
            className="pl-9"
            placeholder="Search colleges"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {scopeName ? (
          <p className="text-sm text-muted-foreground">
            Showing colleges for{" "}
            <span className="font-medium text-foreground">{scopeName}</span>
          </p>
        ) : null}
      </div>

      <CampusDataTable
        columns={columns}
        data={filteredColleges}
        getRowId={(college) => college.id}
        pageSize={10}
        empty={
          <EmptyState
            title={query ? "No matching colleges" : "No colleges available"}
            description={
              query
                ? "Adjust your search and try again."
                : scopeName
                  ? `${scopeName} does not have any college records yet.`
                  : "No college records exist in the database yet."
            }
            className="mx-auto border-0 bg-transparent"
          />
        }
      />
    </section>
  );
}
