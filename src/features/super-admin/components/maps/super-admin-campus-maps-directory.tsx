"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FiClock,
  FiFilter,
  FiGrid,
  FiLayers,
  FiList,
  FiMap,
  FiMapPin,
  FiSearch,
} from "react-icons/fi";

import {
  CampusDataTable,
  CampusInput,
  CampusViewToggle,
  Empty,
} from "@/components/campushub";
import type { DataTableColumn } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import type { SuperAdminCampusMap } from "@/features/super-admin/lib/super-admin-map-service";

type ViewMode = "grid" | "list";

type SuperAdminCampusMapsDirectoryProps = {
  maps: SuperAdminCampusMap[];
};

const viewOptions = [
  { value: "grid", label: "Grid view", icon: FiGrid },
  { value: "list", label: "List view", icon: FiList },
] as const;

function formatDate(value: string | null) {
  if (!value) return "Not updated";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function mapLocationSummary(map: SuperAdminCampusMap) {
  return [map.region, map.country].filter(Boolean).join(", ") || "Location not set";
}

function mapHref(map: SuperAdminCampusMap) {
  return `/super-admin/maps/${map.universityId}`;
}

export function SuperAdminCampusMapsDirectory({
  maps,
}: SuperAdminCampusMapsDirectoryProps) {
  const [query, setQuery] = useState("");
  const [universityId, setUniversityId] = useState("all");
  const [view, setView] = useState<ViewMode>("grid");

  const filteredMaps = useMemo(() => {
    const normalized = query.toLowerCase().trim();

    return maps.filter((map) => {
      const matchesUniversity =
        universityId === "all" || map.universityId === universityId;
      const matchesQuery =
        !normalized ||
        [
          map.universityName,
          map.universityShortName,
          map.country,
          map.region,
          ...map.categories,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return matchesUniversity && matchesQuery;
    });
  }, [maps, query, universityId]);

  const columns: DataTableColumn<SuperAdminCampusMap>[] = [
    {
      key: "universityName",
      header: "Campus Map",
      cell: (map) => (
        <div>
          <Link
            className="font-semibold text-foreground hover:text-primary"
            href={mapHref(map)}
          >
            {map.universityName}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            {mapLocationSummary(map)}
          </p>
        </div>
      ),
    },
    {
      key: "pointCount",
      header: "Points",
      cell: (map) => `${map.pointCount} total`,
    },
    {
      key: "activePointCount",
      header: "Active",
      cell: (map) => map.activePointCount,
    },
    {
      key: "categories",
      header: "Categories",
      cell: (map) =>
        map.categories.length ? map.categories.slice(0, 3).join(", ") : "None",
    },
    {
      key: "lastUpdatedAt",
      header: "Last Updated",
      cell: (map) => formatDate(map.lastUpdatedAt),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-36 text-right",
      cell: (map) => (
        <Button asChild size="sm" variant="secondary">
          <Link href={mapHref(map)}>Open map</Link>
        </Button>
      ),
    },
  ];

  return (
    <section className="space-y-6">
      <div className="grid gap-3 rounded-lg border border-border bg-surface p-4 lg:grid-cols-[1fr_280px_auto]">
        <label className="relative">
          <span className="sr-only">Search campus maps</span>
          <FiSearch
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <CampusInput
            className="pl-9"
            placeholder="Search campus maps"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <Select value={universityId} onValueChange={setUniversityId}>
          <SelectTrigger>
            <SelectValue placeholder="University" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Universities</SelectItem>
            {maps.map((map) => (
              <SelectItem key={map.universityId} value={map.universityId}>
                {map.universityName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <CampusViewToggle
          className="justify-self-start lg:justify-self-end"
          value={view}
          options={viewOptions}
          onValueChange={setView}
        />
      </div>

      {filteredMaps.length ? (
        view === "grid" ? (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {filteredMaps.map((map) => (
              <Link
                key={map.universityId}
                className="group rounded-lg border border-border bg-surface p-5 transition hover:border-primary/40 hover:bg-surface-muted"
                href={mapHref(map)}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FiMap className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                    {map.activePointCount} active
                  </span>
                </div>
                <h2 className="mt-5 text-lg font-semibold text-foreground group-hover:text-primary">
                  {map.universityName}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {mapLocationSummary(map)}
                </p>
                <div className="mt-5 flex flex-wrap gap-x-4 gap-y-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <FiMapPin
                      className="h-4 w-4 text-muted-foreground/70"
                      aria-hidden="true"
                    />
                    {map.pointCount} {map.pointCount === 1 ? "point" : "points"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <FiLayers
                      className="h-4 w-4 text-muted-foreground/70"
                      aria-hidden="true"
                    />
                    {map.categories.length}{" "}
                    {map.categories.length === 1 ? "category" : "categories"}
                  </span>
                </div>
                <div className="mt-4 text-xs text-muted-foreground/70">
                  <span className="inline-flex items-center gap-2">
                    <FiClock className="h-4 w-4" aria-hidden="true" />
                    Updated {formatDate(map.lastUpdatedAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <CampusDataTable
            columns={columns}
            data={filteredMaps}
            getRowId={(map) => map.universityId}
          />
        )
      ) : (
        <Empty
          filterName={query || "campus maps"}
          icon={query ? FiFilter : FiMapPin}
          title={query ? `No campus maps found for "${query}"` : "No campus maps"}
          description={
            query
              ? "Try a different university, region, or map category."
              : "Campus maps will appear here once universities have saved map coordinates or campus map points."
          }
        />
      )}
    </section>
  );
}
