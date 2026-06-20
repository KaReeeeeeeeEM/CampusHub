"use client";

import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { CampusSearch, CampusSelect } from "@/components/campushub";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { UniversityCard } from "@/features/universities/components/university-card";
import type { PublicUniversity } from "@/features/universities/lib/university-directory-service";

type UniversityDiscoveryProps = {
  universities: PublicUniversity[];
};

export function UniversityDiscovery({
  universities,
}: UniversityDiscoveryProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");

  const filteredUniversities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return universities.filter((university) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          university.name,
          university.shortName,
          university.city,
          university.country,
          university.tagline,
          university.description,
          ...university.colleges,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesStatus = status === "all" || university.status === status;
      const matchesType = type === "all" || university.type === type;

      return matchesQuery && matchesStatus && matchesType;
    });
  }, [query, status, type, universities]);

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
          <CampusSearch
            placeholder="Search by name, city, college, or focus area"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <CampusSelect
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="Live">Live</option>
            <option value="Onboarding">Onboarding</option>
            <option value="Coming Soon">Coming Soon</option>
          </CampusSelect>
          <CampusSelect
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="all">All types</option>
            <option value="Public">Public</option>
            <option value="Private">Private</option>
          </CampusSelect>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setQuery("");
              setStatus("all");
              setType("all");
            }}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Reset
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Showing {filteredUniversities.length} of {universities.length}{" "}
          universities.
        </p>
      </div>

      {filteredUniversities.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {filteredUniversities.map((university) => (
            <UniversityCard key={university.slug} university={university} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No universities found"
          description="Try a different search term. Student enrollment still requires an invitation from an authorized college representative."
          actionLabel="Contact CampusHub"
          onAction={() => {
            window.location.href = "/contact";
          }}
        />
      )}
    </div>
  );
}
