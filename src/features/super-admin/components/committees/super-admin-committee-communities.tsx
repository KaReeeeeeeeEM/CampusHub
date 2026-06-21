"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FiArrowRight, FiSearch, FiUsers } from "react-icons/fi";

import { CampusInput } from "@/components/campushub";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { SerializedSuperAdminCommitteeCommunity } from "@/features/super-admin/lib/super-admin-service";

type Props = {
  communities: SerializedSuperAdminCommitteeCommunity[];
};

export function SuperAdminCommitteeCommunities({ communities }: Props) {
  const [query, setQuery] = useState("");
  const filteredCommunities = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return communities;

    return communities.filter((community) =>
      [
        community.name,
        community.universityName,
        community.ownerName,
        community.status,
        community.visibility,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [communities, query]);
  const grouped = useMemo(() => {
    const groups = new Map<string, SerializedSuperAdminCommitteeCommunity[]>();

    for (const community of filteredCommunities) {
      const university = community.universityName;
      groups.set(university, [...(groups.get(university) ?? []), community]);
    }

    return Array.from(groups.entries()).sort(([first], [second]) =>
      first.localeCompare(second),
    );
  }, [filteredCommunities]);

  return (
    <section className="mt-8 space-y-6">
      <div className="relative w-full sm:max-w-sm">
        <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <CampusInput
          className="pl-9"
          placeholder="Search communities or universities"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {grouped.length > 0 ? (
        grouped.map(([universityName, items]) => (
          <div key={universityName} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">
                {universityName}
              </h2>
              <span className="text-sm text-muted-foreground">
                {items.length.toLocaleString()} communities
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((community) => (
                <article
                  key={community.id}
                  className="rounded-lg border border-border bg-surface p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary">
                      <FiUsers className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
                      {community.status}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold">
                    {community.name}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {community.description ?? "No description provided."}
                  </p>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                        Committees
                      </dt>
                      <dd className="mt-1 font-medium">
                        {community.committees.toLocaleString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                        Members
                      </dt>
                      <dd className="mt-1 font-medium">
                        {community.committeeMembers.toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                  <Button asChild className="mt-5 w-full" variant="secondary">
                    <Link href={`/super-admin/committees/${community.id}`}>
                      View Committees
                      <FiArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </article>
              ))}
            </div>
          </div>
        ))
      ) : (
        <EmptyState
          title={query ? "No matching communities" : "No communities available"}
          description={
            query
              ? "Adjust your search and try again."
              : "Committee communities will appear here once they exist."
          }
          className="max-w-none"
        />
      )}
    </section>
  );
}
