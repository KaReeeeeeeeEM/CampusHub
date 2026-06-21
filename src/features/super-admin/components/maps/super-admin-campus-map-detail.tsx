"use client";

import { useMemo, useState } from "react";
import { FiMapPin, FiSearch } from "react-icons/fi";

import { CampusInput, Empty } from "@/components/campushub";
import { OpenStreetMap } from "@/components/maps/open-street-map";
import type { SuperAdminCampusMap } from "@/features/super-admin/lib/super-admin-map-service";

type SuperAdminCampusMapDetailProps = {
  campusMap: SuperAdminCampusMap;
};

function pointCoordinates(point: SuperAdminCampusMap["points"][number]) {
  return `${point.latitude}, ${point.longitude}`;
}

export function SuperAdminCampusMapDetail({
  campusMap,
}: SuperAdminCampusMapDetailProps) {
  const [query, setQuery] = useState("");
  const [selectedPointId, setSelectedPointId] = useState(
    campusMap.points[0]?.id,
  );

  const mapLocations = useMemo(
    () =>
      campusMap.points.map((point) => ({
        id: point.id,
        name: point.name,
        category: point.category,
        code: point.buildingCode ?? point.category,
        description: point.description ?? "",
        coordinates: pointCoordinates(point),
      })),
    [campusMap.points],
  );

  const filteredPoints = useMemo(() => {
    const normalized = query.toLowerCase().trim();

    return campusMap.points.filter((point) => {
      if (!normalized) return true;

      return [
        point.name,
        point.description,
        point.category,
        point.buildingCode,
        point.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [campusMap.points, query]);

  return (
    <section className="grid min-h-[calc(100vh-13rem)] gap-4 xl:grid-cols-[360px_1fr]">
      <aside className="flex min-h-0 flex-col rounded-lg border border-border bg-surface">
        <div className="border-b border-border p-4">
          <label className="relative block">
            <span className="sr-only">Search map points</span>
            <FiSearch
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <CampusInput
              className="pl-9"
              placeholder="Search map points"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {filteredPoints.length ? (
            <div className="space-y-2">
              {filteredPoints.map((point) => {
                const active = selectedPointId === point.id;

                return (
                  <button
                    key={point.id}
                    className={`w-full rounded-lg border p-4 text-left transition ${
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                    type="button"
                    onClick={() => setSelectedPointId(point.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{point.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {point.category}
                          {point.buildingCode ? ` • ${point.buildingCode}` : ""}
                        </p>
                      </div>
                      <span className="rounded-full border border-border px-2 py-1 text-[11px] uppercase text-muted-foreground">
                        {point.status}
                      </span>
                    </div>
                    {point.description ? (
                      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                        {point.description}
                      </p>
                    ) : null}
                    <p className="mt-3 text-xs text-muted-foreground">
                      {pointCoordinates(point)}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <Empty
              className="min-h-80"
              icon={FiMapPin}
              title={
                query
                  ? `No map points found for "${query}"`
                  : "No map points available"
              }
              description={
                query
                  ? "Try another point name, category, building code, or status."
                  : "Saved campus map points for this university will appear here."
              }
            />
          )}
        </div>
      </aside>

      <div className="min-h-[620px] overflow-hidden rounded-lg border border-border bg-surface">
        <OpenStreetMap
          className="h-full min-h-[620px] w-full"
          locations={mapLocations}
          selectedLocationId={selectedPointId}
          center={
            campusMap.centerLatitude !== null && campusMap.centerLongitude !== null
              ? [campusMap.centerLatitude, campusMap.centerLongitude]
              : undefined
          }
          onSelectLocation={setSelectedPointId}
        />
      </div>
    </section>
  );
}
