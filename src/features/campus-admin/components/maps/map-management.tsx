"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiEdit,
  FiEye,
  FiGrid,
  FiList,
  FiLoader,
  FiMapPin,
  FiNavigation,
  FiPlus,
  FiSearch,
  FiTarget,
  FiTrash2,
} from "react-icons/fi";
import { z } from "zod";

import {
  CampusDataTable,
  CampusInput,
  CampusTextarea,
  CampusViewToggle,
  campusToast,
} from "@/components/campushub";
import { OpenStreetMap } from "@/components/maps/open-street-map";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Drawer } from "@/components/shared/drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import { AdminActionMenu } from "@/features/administration/components/admin-action-menu";
import type { DataTableColumn } from "@/components/shared/data-table";
import { cn } from "@/lib/utils";

type CampusLocation = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  latitude: number;
  longitude: number;
  buildingCode: string | null;
  status: string;
};

const categories = [
  { label: "Academic", value: "ACADEMIC" },
  { label: "Office", value: "OFFICE" },
  { label: "Hostel", value: "HOSTEL" },
  { label: "Library", value: "LIBRARY" },
  { label: "Cafeteria", value: "CAFETERIA" },
  { label: "Laboratory", value: "LABORATORY" },
  { label: "Health", value: "HEALTH" },
  { label: "Sports", value: "SPORTS" },
  { label: "Parking", value: "PARKING" },
  { label: "Other", value: "OTHER" },
] as const;
const viewOptions = [
  { value: "table", label: "Table view", icon: FiList },
  { value: "cards", label: "Card view", icon: FiGrid },
] as const;

const startingPointOptions = [
  "Current location",
  "Main Gate",
  "Student Center",
  "CoICT Entrance",
] as const;

const locationSchema = z.object({
  name: z.string().min(2, "Location name is required."),
  category: z.enum([
    "ACADEMIC",
    "OFFICE",
    "HOSTEL",
    "LIBRARY",
    "CAFETERIA",
    "LABORATORY",
    "HEALTH",
    "SPORTS",
    "PARKING",
    "OTHER",
  ]),
  code: z.string().min(2, "Code is required."),
  coordinates: z
    .string()
    .min(3, "Coordinates are required.")
    .refine((value) => {
      const [latitude, longitude] = value
        .split(",")
        .map((part) => Number(part.trim()));

      return Number.isFinite(latitude) && Number.isFinite(longitude);
    }, "Coordinates must use latitude, longitude format."),
  description: z.string().min(10, "Description is required."),
});

type LocationInput = z.infer<typeof locationSchema>;

function getLocationCode(location: CampusLocation) {
  return location.buildingCode ?? "";
}

function getLocationCoordinates(location: CampusLocation) {
  return `${location.latitude}, ${location.longitude}`;
}

function normalizeLocation(location: CampusLocation): CampusLocation {
  return {
    ...location,
    description: location.description ?? "",
    buildingCode: location.buildingCode ?? "",
  };
}

function getLocationPayload(values: LocationInput) {
  const [latitude, longitude] = values.coordinates
    .split(",")
    .map((value) => Number(value.trim()));

  return {
    name: values.name,
    description: values.description,
    category: values.category,
    latitude,
    longitude,
    buildingCode: values.code,
    status: "ACTIVE",
  };
}

function LocationForm({
  location,
  onSubmit,
  isSubmitting,
}: {
  location?: CampusLocation;
  onSubmit: (values: LocationInput) => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LocationInput>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: location?.name ?? "",
      category: (location?.category as LocationInput["category"]) ?? "LIBRARY",
      code: location ? getLocationCode(location) : "",
      coordinates: location ? getLocationCoordinates(location) : "",
      description: location?.description ?? "",
    },
  });

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">Location Name</span>
          <CampusInput
            {...register("name")}
            invalid={Boolean(errors.name)}
            placeholder="Main Library"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Category</span>
          <Select
            value={watch("category")}
            onValueChange={(value) =>
              setValue("category", value as LocationInput["category"], {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Code</span>
          <CampusInput
            {...register("code")}
            invalid={Boolean(errors.code)}
            placeholder="LIB-01"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Coordinates</span>
          <CampusInput
            {...register("coordinates")}
            invalid={Boolean(errors.coordinates)}
            placeholder="-6.7801, 39.2051"
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Description</span>
          <CampusTextarea
            {...register("description")}
            invalid={Boolean(errors.description)}
            placeholder="Add access notes, nearby landmarks, or opening hours."
          />
        </label>
      </div>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        {location ? "Save Changes" : "Add Location"}
      </Button>
    </form>
  );
}

export function MapManagement({
  initialLocations,
}: {
  initialLocations: CampusLocation[];
}) {
  const [locations, setLocations] = useState(() =>
    initialLocations.map(normalizeLocation),
  );
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<CampusLocation | null>(null);
  const [editing, setEditing] = useState<CampusLocation | null>(null);
  const [deleting, setDeleting] = useState<CampusLocation | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState(
    initialLocations[0]?.id ?? "",
  );
  const [startingPoint, setStartingPoint] =
    useState<string>("Current location");
  const [routeDestinationId, setRouteDestinationId] = useState(
    initialLocations[0]?.id ?? "",
  );
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return locations;
    return locations.filter((location) =>
      [location.name, location.category, getLocationCode(location)]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [locations, query]);

  const selectedLocation =
    locations.find((location) => location.id === selectedLocationId) ??
    locations[0] ??
    null;
  const routeDestination =
    locations.find((location) => location.id === routeDestinationId) ??
    selectedLocation;
  const hasCampusLocations = locations.length > 0;

  function createLocation(values: LocationInput) {
    startTransition(async () => {
      const response = await fetch("/api/map-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getLocationPayload(values)),
      });

      if (!response.ok) {
        campusToast.error({
          title: "Location Not Created",
          description: "The location could not be saved.",
        });
        return;
      }

      const location = normalizeLocation(await response.json());
      setLocations((current) => [location, ...current]);
      setSelectedLocationId(location.id);
      setRouteDestinationId(location.id);
      setCreateOpen(false);
      campusToast.success({
        title: "Map Point Added",
        description: "The campus location was saved.",
      });
    });
  }

  function updateLocation(values: LocationInput) {
    if (!editing) return;
    startTransition(async () => {
      const response = await fetch(`/api/map-locations/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getLocationPayload(values)),
      });

      if (!response.ok) {
        campusToast.error({
          title: "Location Not Updated",
          description: "The location could not be saved.",
        });
        return;
      }

      const updatedLocation = normalizeLocation(await response.json());
      setLocations((current) =>
        current.map((location) =>
          location.id === editing.id ? updatedLocation : location,
        ),
      );
      setEditing(null);
      campusToast.success({
        title: "Map Point Updated",
        description: "The campus location was updated successfully.",
      });
    });
  }

  const columns: DataTableColumn<CampusLocation>[] = [
    { key: "name", header: "Location" },
    { key: "category", header: "Category" },
    {
      key: "buildingCode",
      header: "Code",
      cell: (location) => getLocationCode(location) || "Not set",
    },
    { key: "status", header: "Status" },
    {
      key: "actions",
      header: "Actions",
      className: "w-16 text-right",
      cell: (location) => (
        <AdminActionMenu
          items={[
            {
              label: "View",
              icon: FiEye,
              onSelect: () => setViewing(location),
            },
            {
              label: "Edit",
              icon: FiEdit,
              onSelect: () => setEditing(location),
            },
            {
              label: "Delete",
              icon: FiTrash2,
              destructive: true,
              onSelect: () => setDeleting(location),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <section className="mt-8 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Campus Locations</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Select a location from the list or map pins.
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
              {filtered.length} points
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {filtered.map((location) => {
              const active = selectedLocation?.id === location.id;

              return (
                <Button
                  key={location.id}
                  className={cn(
                    "h-auto w-full justify-start rounded-lg border p-3 text-left",
                    active
                      ? "border-primary/60 bg-primary/10 text-foreground"
                      : "border-border bg-background/60 hover:border-primary/35 hover:bg-surface-muted",
                  )}
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSelectedLocationId(location.id);
                    setRouteDestinationId(location.id);
                  }}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FiMapPin className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {location.name}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {location.category} · {getLocationCode(location)}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
          {selectedLocation ? (
            <div className="mt-4 rounded-lg border border-border bg-background/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Selected
                  </p>
                  <h3 className="mt-2 text-base font-semibold">
                    {selectedLocation.name}
                  </h3>
                </div>
                <Button
                  size="sm"
                  type="button"
                  variant="secondary"
                  onClick={() => setViewing(selectedLocation)}
                >
                  <FiEye className="h-4 w-4" aria-hidden="true" />
                  View
                </Button>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {selectedLocation.description}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs uppercase text-muted-foreground">
                    Coordinates
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {getLocationCoordinates(selectedLocation)}
                  </p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs uppercase text-muted-foreground">
                    Status
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {selectedLocation.status}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="grid gap-0 lg:grid-cols-[1fr_18rem]">
              <div className="relative min-h-[32rem] overflow-hidden">
                <OpenStreetMap
                  className="absolute inset-0 z-0"
                  locations={locations.map((location) => ({
                    id: location.id,
                    name: location.name,
                    category: location.category,
                    code: getLocationCode(location),
                    description: location.description ?? "",
                    coordinates: getLocationCoordinates(location),
                  }))}
                  routeDestinationId={routeDestinationId}
                  selectedLocationId={selectedLocationId}
                  onSelectLocation={(locationId) => {
                    setSelectedLocationId(locationId);
                    setRouteDestinationId(locationId);
                  }}
                />
              </div>
              <aside className="border-t border-border bg-background/55 p-6 lg:border-l lg:border-t-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FiNavigation className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Navigate</p>
                    <p className="text-xs text-muted-foreground">
                      Plan a route to any campus point.
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-5">
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      Starting point
                    </span>
                    <Select
                      value={startingPoint}
                      onValueChange={setStartingPoint}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {startingPointOptions.map((point) => (
                          <SelectItem key={point} value={point}>
                            {point}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      Destination
                    </span>
                    <Select
                      value={routeDestinationId}
                      disabled={!hasCampusLocations}
                      onValueChange={(value) => {
                        setRouteDestinationId(value);
                        setSelectedLocationId(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <FiTarget className="h-4 w-4 text-primary" />
                      Route preview
                    </div>
                    {hasCampusLocations ? (
                      <>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {startingPoint} to{" "}
                          <span className="font-medium text-foreground">
                            {routeDestination?.name ?? "destination"}
                          </span>
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Estimated 6-12 min walk. Turn-by-turn routing will
                          connect to live map services later.
                        </p>
                      </>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        Add at least one campus location before route previews
                        can be used.
                      </p>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    disabled={!hasCampusLocations}
                    type="button"
                    onClick={() =>
                      campusToast.info({
                        title: "Navigation Preview",
                        description: `Route from ${startingPoint} to ${
                          routeDestination?.name ?? "selected destination"
                        } is ready for map integration.`,
                      })
                    }
                  >
                    <FiNavigation className="h-4 w-4" />
                    Navigate
                  </Button>
                </div>
              </aside>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <CampusInput
                className="pl-9"
                placeholder="Search locations"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <CampusViewToggle
                value={viewMode}
                options={viewOptions}
                onValueChange={setViewMode}
              />
              <Button onClick={() => setCreateOpen(true)}>
                <FiPlus className="h-4 w-4" />
                Create Location
              </Button>
            </div>
          </div>
          {viewMode === "cards" ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {filtered.length > 0 ? (
                filtered.map((location) => (
                  <article
                    key={location.id}
                    className="flex h-full flex-col rounded-xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FiMapPin className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <AdminActionMenu
                        items={[
                          {
                            label: "View",
                            icon: FiEye,
                            onSelect: () => setViewing(location),
                          },
                          {
                            label: "Edit",
                            icon: FiEdit,
                            onSelect: () => setEditing(location),
                          },
                          {
                            label: "Delete",
                            icon: FiTrash2,
                            destructive: true,
                            onSelect: () => setDeleting(location),
                          },
                        ]}
                      />
                    </div>
                    <h3 className="mt-4 text-base font-semibold">
                      {location.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {location.category} · {getLocationCode(location)}
                    </p>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {location.description}
                    </p>
                    <p className="mt-auto pt-5 text-xs text-muted-foreground">
                      {getLocationCoordinates(location)}
                    </p>
                  </article>
                ))
              ) : (
                <EmptyState
                  title={query ? "No matching locations" : "No map locations"}
                  description="Add campus locations to populate the map management table."
                  className="mx-auto border-0 bg-transparent md:col-span-2"
                />
              )}
            </div>
          ) : (
            <div className="mt-5">
              <CampusDataTable
                columns={columns}
                data={filtered}
                getRowId={(location) => location.id}
                empty={
                  <EmptyState
                    title={query ? "No matching locations" : "No map locations"}
                    description="Add campus locations to populate the map management table."
                    className="mx-auto border-0 bg-transparent"
                  />
                }
              />
            </div>
          )}
        </div>
      </section>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Location"
      >
        <LocationForm onSubmit={createLocation} isSubmitting={isPending} />
      </Modal>
      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit Location"
      >
        {editing ? (
          <LocationForm
            location={editing}
            onSubmit={updateLocation}
            isSubmitting={isPending}
          />
        ) : null}
      </Modal>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.name ?? "Location details"}
      >
        {viewing ? (
          <div className="space-y-3 text-sm">
            <p>{viewing.description}</p>
            <p className="text-muted-foreground">
              {viewing.category} · {getLocationCoordinates(viewing)}
            </p>
          </div>
        ) : null}
      </Drawer>
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete Location"
        description={`Delete ${deleting?.name ?? "this location"} from the campus map?`}
        destructive
        onConfirm={() => {
          if (deleting) {
            startTransition(async () => {
              const response = await fetch(`/api/map-locations/${deleting.id}`, {
                method: "DELETE",
              });

              if (!response.ok) {
                campusToast.error({
                  title: "Location Not Removed",
                  description: "The location could not be removed.",
                });
                return;
              }

              setLocations((current) =>
                current.filter((item) => item.id !== deleting.id),
              );
              setDeleting(null);
              campusToast.warning({
                title: "Map Point Removed",
                description: "The location was removed.",
              });
            });
          }
        }}
      />
    </>
  );
}
