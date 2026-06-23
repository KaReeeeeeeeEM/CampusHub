"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiEdit,
  FiEye,
  FiGrid,
  FiList,
  FiLoader,
  FiMap,
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
import type { CampusMapRoute } from "@/components/maps/open-street-map";
import {
  formatRouteDistance,
  formatRouteDuration,
  getCampusRoute,
  type RouteTravelMode,
} from "@/components/maps/route-service";
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

type CoordinatePair = {
  lat: number;
  lng: number;
};

type LocationApiResponse = {
  data?: {
    location?: CampusLocation;
  };
  location?: CampusLocation;
};

const defaultLocationCoordinates: CoordinatePair = {
  lat: -6.7786,
  lng: 39.2054,
};
const currentLocationValue = "CURRENT_LOCATION";

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
const workspaceTabs = [
  { value: "locations", label: "Locations", icon: FiList },
  { value: "map", label: "Map", icon: FiMap },
] as const;
const travelModeOptions = [
  { value: "foot", label: "On foot", icon: FiNavigation },
  { value: "car", label: "By car", icon: FiMap },
] as const;
const liveRoutePollIntervalMs = 8_000;

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

function isValidCoordinate(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function getLocationCoordinates(location: CampusLocation) {
  return `${location.latitude}, ${location.longitude}`;
}

function parseCoordinates(value: string): CoordinatePair | null {
  const [lat, lng] = value.split(",").map((part) => Number(part.trim()));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

function getLocationCoordinatePair(location: CampusLocation): CoordinatePair {
  return {
    lat: location.latitude,
    lng: location.longitude,
  };
}

function formatCoordinates(coordinates: CoordinatePair) {
  return `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`;
}

function getRouteUnavailableMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (!message || message === "fetch failed") {
    return "Road routing is temporarily unavailable. Please try again shortly.";
  }

  return message;
}

function normalizeLocation(location: CampusLocation): CampusLocation {
  if (
    !location?.id ||
    !isValidCoordinate(location.latitude) ||
    !isValidCoordinate(location.longitude)
  ) {
    throw new Error("Map location response is missing valid coordinates.");
  }

  return {
    ...location,
    description: location.description ?? "",
    buildingCode: location.buildingCode ?? "",
  };
}

async function readLocationResponse(response: Response) {
  const payload = (await response.json()) as LocationApiResponse;
  const location = payload.data?.location ?? payload.location;

  if (!location) {
    throw new Error("Map location response is missing location data.");
  }

  return normalizeLocation(location);
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
  const initialCoordinates = location
    ? parseCoordinates(getLocationCoordinates(location)) ?? defaultLocationCoordinates
    : defaultLocationCoordinates;
  const [coordinateMode, setCoordinateMode] = useState<"pin" | "manual">(
    "pin",
  );
  const [pinCoordinates, setPinCoordinates] =
    useState<CoordinatePair>(initialCoordinates);
  const [manualLatitude, setManualLatitude] = useState(
    String(initialCoordinates.lat),
  );
  const [manualLongitude, setManualLongitude] = useState(
    String(initialCoordinates.lng),
  );
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
      coordinates: formatCoordinates(initialCoordinates),
      description: location?.description ?? "",
    },
  });

  function syncCoordinates(coordinates: CoordinatePair) {
    setPinCoordinates(coordinates);
    setManualLatitude(String(Number(coordinates.lat.toFixed(6))));
    setManualLongitude(String(Number(coordinates.lng.toFixed(6))));
    setValue("coordinates", formatCoordinates(coordinates), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function updateManualCoordinates(
    nextLatitude: string,
    nextLongitude: string,
  ) {
    setManualLatitude(nextLatitude);
    setManualLongitude(nextLongitude);

    const lat = Number(nextLatitude);
    const lng = Number(nextLongitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setValue("coordinates", `${nextLatitude}, ${nextLongitude}`, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    syncCoordinates({ lat, lng });
  }

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
        <div className="space-y-3 md:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-sm font-medium">Location Coordinates</span>
              <p className="mt-1 text-xs text-muted-foreground">
                Set the point by dragging the map pin or entering latitude and
                longitude directly.
              </p>
            </div>
            <div
              aria-label="Coordinate input method"
              className="grid grid-cols-2 rounded-lg border border-border bg-background p-1"
              role="tablist"
            >
              {[
                { value: "pin", label: "Drag Pin" },
                { value: "manual", label: "Latitude / Longitude" },
              ].map((mode) => (
                <Button
                  key={mode.value}
                  aria-selected={coordinateMode === mode.value}
                  className={cn(
                    "h-9 px-3 text-xs",
                    coordinateMode === mode.value
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-transparent text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                  )}
                  role="tab"
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setCoordinateMode(mode.value as "pin" | "manual")
                  }
                >
                  {mode.label}
                </Button>
              ))}
            </div>
          </div>

          <input type="hidden" {...register("coordinates")} />

          {coordinateMode === "pin" ? (
            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <div className="relative h-80">
                <OpenStreetMap
                  className="absolute inset-0"
                  locations={[]}
                  center={[pinCoordinates.lat, pinCoordinates.lng]}
                  editableMarker={pinCoordinates}
                  editableMarkerLabel={watch("name") || "New campus location"}
                  onEditableMarkerChange={syncCoordinates}
                />
              </div>
              <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
                Current coordinates:{" "}
                <span className="font-medium text-foreground">
                  {watch("coordinates")}
                </span>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium">Latitude</span>
                <CampusInput
                  inputMode="decimal"
                  invalid={Boolean(errors.coordinates)}
                  placeholder="-6.780100"
                  value={manualLatitude}
                  onChange={(event) =>
                    updateManualCoordinates(
                      event.target.value,
                      manualLongitude,
                    )
                  }
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Longitude</span>
                <CampusInput
                  inputMode="decimal"
                  invalid={Boolean(errors.coordinates)}
                  placeholder="39.205100"
                  value={manualLongitude}
                  onChange={(event) =>
                    updateManualCoordinates(
                      manualLatitude,
                      event.target.value,
                    )
                  }
                />
              </label>
            </div>
          )}
          {errors.coordinates ? (
            <p className="text-sm text-destructive">
              {errors.coordinates.message}
            </p>
          ) : null}
        </div>
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
  const [mapQuery, setMapQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"locations" | "map">(
    "locations",
  );
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<CampusLocation | null>(null);
  const [editing, setEditing] = useState<CampusLocation | null>(null);
  const [deleting, setDeleting] = useState<CampusLocation | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState(
    initialLocations[0]?.id ?? "",
  );
  const [startingPoint, setStartingPoint] = useState<string>(
    currentLocationValue,
  );
  const [routeDestinationId, setRouteDestinationId] = useState(
    initialLocations[0]?.id ?? "",
  );
  const [activeRoute, setActiveRoute] = useState<CampusMapRoute | null>(null);
  const [detailRoute, setDetailRoute] = useState<CampusMapRoute | null>(null);
  const [detailRouteDistanceMeters, setDetailRouteDistanceMeters] = useState<
    number | null
  >(null);
  const [detailRouteDurationSeconds, setDetailRouteDurationSeconds] =
    useState<number | null>(null);
  const [detailRouteSource, setDetailRouteSource] = useState<"road" | null>(
    null,
  );
  const [isDetailRouteLoading, setIsDetailRouteLoading] = useState(false);
  const [detailRouteProblem, setDetailRouteProblem] = useState<
    "location" | "route" | null
  >(null);
  const [detailRouteMessage, setDetailRouteMessage] = useState<string | null>(
    null,
  );
  const [routeDistanceMeters, setRouteDistanceMeters] = useState<number | null>(
    null,
  );
  const [routeDurationSeconds, setRouteDurationSeconds] = useState<
    number | null
  >(null);
  const [routeSource, setRouteSource] = useState<"road" | null>(null);
  const [travelMode, setTravelMode] = useState<RouteTravelMode>("foot");
  const [isNavigating, setIsNavigating] = useState(false);
  const [isRouteLive, setIsRouteLive] = useState(false);
  const [isRouteRefreshing, setIsRouteRefreshing] = useState(false);
  const [lastRouteUpdatedAt, setLastRouteUpdatedAt] = useState<Date | null>(
    null,
  );
  const routeRefreshInFlightRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const startingPointOptions = useMemo(
    () => [
      { value: currentLocationValue, label: "Current location" },
      ...locations.map((location) => ({
        value: location.id,
        label: location.name,
      })),
    ],
    [locations],
  );

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
  const mapLocations = useMemo(() => {
    const normalized = mapQuery.toLowerCase().trim();
    if (!normalized) return locations;
    return locations.filter((location) =>
      [location.name, location.category, getLocationCode(location)]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [locations, mapQuery]);

  const selectedLocation =
    locations.find((location) => location.id === selectedLocationId) ??
    locations[0] ??
    null;
  const routeDestination =
    locations.find((location) => location.id === routeDestinationId) ??
    selectedLocation;
  const hasCampusLocations = locations.length > 0;
  const startingLocation =
    startingPoint === currentLocationValue
      ? null
      : locations.find((location) => location.id === startingPoint) ?? null;
  const startingPointLabel =
    startingPoint === currentLocationValue
      ? "Current location"
      : startingLocation?.name ?? "Starting point";

  async function getCurrentCoordinates() {
    if (!("geolocation" in navigator)) {
      throw new Error("Current location is not available in this browser.");
    }

    return new Promise<CoordinatePair>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
        () => reject(new Error("Unable to access your current location.")),
        {
          enableHighAccuracy: true,
          maximumAge: 3_000,
          timeout: 12_000,
        },
      );
    });
  }

  async function resolveRouteOrigin() {
    if (startingPoint === currentLocationValue) {
      return {
        coordinates: await getCurrentCoordinates(),
        label: "Current location",
      };
    }

    if (!startingLocation) {
      throw new Error("Choose a valid starting point.");
    }

    return {
      coordinates: getLocationCoordinatePair(startingLocation),
      label: startingLocation.name,
    };
  }

  function clearRouteNavigation() {
    setActiveRoute(null);
    setRouteDistanceMeters(null);
    setRouteDurationSeconds(null);
    setRouteSource(null);
    setIsRouteLive(false);
    setIsRouteRefreshing(false);
    setLastRouteUpdatedAt(null);
  }

  async function updateRouteNavigation({
    showToast,
    logDirections,
  }: {
    showToast: boolean;
    logDirections: boolean;
  }) {
    if (!routeDestination) {
      if (showToast) {
        campusToast.error({
          title: "Destination Required",
          description: "Choose a campus location before starting navigation.",
        });
      }
      return false;
    }

    try {
      const origin = await resolveRouteOrigin();
      const destination = getLocationCoordinatePair(routeDestination);
      const route = await getCampusRoute(
        origin.coordinates,
        destination,
        travelMode,
      );

      if (logDirections) {
        await fetch(`/api/map-locations/${routeDestination.id}/directions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originLatitude: origin.coordinates.lat,
            originLongitude: origin.coordinates.lng,
          }),
        });
      }

      setActiveRoute({
        origin: {
          ...origin.coordinates,
          label: origin.label,
        },
        destinationId: routeDestination.id,
        path: route.path,
      });
      setRouteDistanceMeters(route.distanceMeters);
      setRouteDurationSeconds(route.durationSeconds);
      setRouteSource(route.source);
      setLastRouteUpdatedAt(new Date());
      setSelectedLocationId(routeDestination.id);
      setRouteDestinationId(routeDestination.id);
      if (showToast) {
        campusToast.success({
          title: "Live Route Started",
          description: `${formatRouteDistance(route.distanceMeters)} route to ${routeDestination.name}.`,
        });
      }
      return true;
    } catch (error) {
      if (showToast) {
        campusToast.error({
          title: "Navigation Unavailable",
          description: getRouteUnavailableMessage(error),
        });
      }
      return false;
    }
  }

  async function refreshRouteNavigation() {
    if (
      routeRefreshInFlightRef.current ||
      !isRouteLive ||
      startingPoint !== currentLocationValue
    ) {
      return;
    }

    routeRefreshInFlightRef.current = true;
    setIsRouteRefreshing(true);

    try {
      await updateRouteNavigation({
        showToast: false,
        logDirections: false,
      });
    } finally {
      routeRefreshInFlightRef.current = false;
      setIsRouteRefreshing(false);
    }
  }

  async function startRouteNavigation() {
    setIsNavigating(true);

    try {
      const routeReady = await updateRouteNavigation({
        showToast: true,
        logDirections: true,
      });
      setIsRouteLive(routeReady && startingPoint === currentLocationValue);
    } finally {
      setIsNavigating(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadDetailRoute(location: CampusLocation) {
      setDetailRoute(null);
      setDetailRouteDistanceMeters(null);
      setDetailRouteDurationSeconds(null);
      setDetailRouteSource(null);
      setDetailRouteMessage(null);
      setDetailRouteProblem(null);
      setIsDetailRouteLoading(true);

      let origin: CoordinatePair;

      try {
        origin = await getCurrentCoordinates();
      } catch (error) {
        if (!active) return;

        setDetailRouteProblem("location");
        setDetailRouteMessage(
          error instanceof Error
            ? error.message
            : "Enable location access to show distance from your current position.",
        );
        setIsDetailRouteLoading(false);
        return;
      }

      try {
        const destination = getLocationCoordinatePair(location);
        const route = await getCampusRoute(origin, destination, travelMode);

        if (!active) return;

        setDetailRoute({
          origin: {
            ...origin,
            label: "Current location",
          },
          destinationId: location.id,
          path: route.path,
        });
        setDetailRouteDistanceMeters(route.distanceMeters);
        setDetailRouteDurationSeconds(route.durationSeconds);
        setDetailRouteSource(route.source);
      } catch (error) {
        if (!active) return;

        setDetailRouteProblem("route");
        setDetailRouteMessage(getRouteUnavailableMessage(error));
      } finally {
        if (active) setIsDetailRouteLoading(false);
      }
    }

    if (!viewing) {
      setDetailRoute(null);
      setDetailRouteDistanceMeters(null);
      setDetailRouteDurationSeconds(null);
      setDetailRouteSource(null);
      setDetailRouteMessage(null);
      setDetailRouteProblem(null);
      setIsDetailRouteLoading(false);
      return () => {
        active = false;
      };
    }

    void loadDetailRoute(viewing);

    return () => {
      active = false;
    };
  }, [travelMode, viewing]);

  useEffect(() => {
    if (
      !isRouteLive ||
      !activeRoute ||
      startingPoint !== currentLocationValue ||
      !routeDestination
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshRouteNavigation();
    }, liveRoutePollIntervalMs);

    return () => window.clearInterval(intervalId);
  });

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

      let location: CampusLocation;

      try {
        location = await readLocationResponse(response);
      } catch {
        campusToast.error({
          title: "Location Not Created",
          description: "The saved location did not include valid coordinates.",
        });
        return;
      }

      setLocations((current) => [location, ...current]);
      setSelectedLocationId(location.id);
      setRouteDestinationId(location.id);
      clearRouteNavigation();
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

      let updatedLocation: CampusLocation;

      try {
        updatedLocation = await readLocationResponse(response);
      } catch {
        campusToast.error({
          title: "Location Not Updated",
          description: "The saved location did not include valid coordinates.",
        });
        return;
      }

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
  const navigationControls = (
    <div className="space-y-7">
      <label className="block space-y-3">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          Starting point
        </span>
        <Select
          value={startingPoint}
          onValueChange={(value) => {
            setStartingPoint(value);
            clearRouteNavigation();
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {startingPointOptions.map((point) => (
              <SelectItem key={point.value} value={point.value}>
                {point.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="block space-y-3">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          Destination
        </span>
        <Select
          value={routeDestinationId}
          disabled={!hasCampusLocations}
          onValueChange={(value) => {
            setRouteDestinationId(value);
            setSelectedLocationId(value);
            clearRouteNavigation();
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
      <div className="space-y-3">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          Travel mode
        </span>
        <div className="grid grid-cols-2 rounded-lg border border-border bg-background p-1">
          {travelModeOptions.map((option) => {
            const Icon = option.icon;
            const active = travelMode === option.value;

            return (
              <Button
                key={option.value}
                className={cn(
                  "h-9 px-2 text-xs",
                  active
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-transparent text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                )}
                type="button"
                variant="ghost"
                onClick={() => {
                  setTravelMode(option.value);
                  clearRouteNavigation();
                }}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-background/70 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FiTarget className="h-4 w-4 text-primary" />
          Route preview
        </div>
        {hasCampusLocations ? (
          <>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {startingPointLabel} to{" "}
              <span className="font-medium text-foreground">
                {routeDestination?.name ?? "destination"}
              </span>
            </p>
            {routeDistanceMeters !== null ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {formatRouteDistance(routeDistanceMeters)} ·{" "}
                {routeDurationSeconds !== null
                  ? formatRouteDuration(routeDurationSeconds)
                  : "duration unavailable"}
                {" · "}
                {travelMode === "car" ? "by car" : "on foot"}
                {routeSource === "road" ? " · follows roads" : ""}
                {isRouteLive ? " · live" : ""}
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Click Navigate to draw this route on the map.
              </p>
            )}
            {lastRouteUpdatedAt ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {isRouteRefreshing
                  ? "Refreshing route..."
                  : `Updated ${lastRouteUpdatedAt.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}`}
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Add at least one campus location before route previews can be used.
          </p>
        )}
      </div>
      <div className="space-y-3 pt-1">
        <Button
          className="w-full"
          disabled={!hasCampusLocations || isNavigating}
          type="button"
          onClick={startRouteNavigation}
        >
          {isNavigating ? (
            <FiLoader className="h-4 w-4 animate-spin" />
          ) : (
            <FiNavigation className="h-4 w-4" />
          )}
          {isRouteLive ? "Restart Live Navigation" : "Navigate"}
        </Button>
        {isRouteLive ? (
          <Button
            className="w-full"
            type="button"
            variant="secondary"
            onClick={() => setIsRouteLive(false)}
          >
            Stop Live Updates
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <section className="mt-8 space-y-5">
        <div
          aria-label="Campus map workspace"
          className="inline-flex rounded-full border border-border bg-surface p-1"
          role="tablist"
        >
          {workspaceTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.value;

            return (
              <Button
                key={tab.value}
                aria-selected={active}
                className={cn(
                  "h-10 rounded-full px-4",
                  active
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-transparent text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                )}
                role="tab"
                type="button"
                variant="ghost"
                onClick={() => setActiveTab(tab.value)}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {activeTab === "locations" ? (
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Locations</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage created campus map points, edit details, and switch
                  between table and card views.
                </p>
              </div>
              <Button onClick={() => setCreateOpen(true)}>
                <FiPlus className="h-4 w-4" />
                Create Location
              </Button>
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
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {filtered.length} points
                </span>
                <CampusViewToggle
                  value={viewMode}
                  options={viewOptions}
                  onValueChange={setViewMode}
                />
              </div>
            </div>

            {viewMode === "cards" ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.length > 0 ? (
                  filtered.map((location) => (
                    <article
                      key={location.id}
                      className="flex h-full flex-col rounded-xl border border-border bg-background/60 p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
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
                    className="mx-auto border-0 bg-transparent md:col-span-2 xl:col-span-3"
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
                      title={
                        query ? "No matching locations" : "No map locations"
                      }
                      description="Add campus locations to populate the map management table."
                      className="mx-auto border-0 bg-transparent"
                    />
                  }
                />
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="grid min-h-[46rem] lg:grid-cols-[20rem_1fr] xl:grid-cols-[24rem_1fr]">
              <aside className="flex max-h-[46rem] min-h-0 flex-col border-b border-border bg-background/55 p-4 lg:border-b-0 lg:border-r">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">Campus Locations</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Select a location from the list or map pins.
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                    {mapLocations.length} points
                  </span>
                </div>
                <div className="relative mt-4">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <CampusInput
                    className="pl-9"
                    placeholder="Search map locations"
                    type="search"
                    value={mapQuery}
                    onChange={(event) => setMapQuery(event.target.value)}
                  />
                </div>
                <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {mapLocations.length > 0 ? (
                    mapLocations.map((location) => {
                      const active = selectedLocation?.id === location.id;

                      return (
                        <Button
                          key={location.id}
                          className={cn(
                            "h-auto w-full justify-start rounded-lg border p-3 text-left",
                            active
                              ? "border-primary/60 bg-primary/10 text-foreground"
                              : "border-border bg-surface hover:border-primary/35 hover:bg-surface-muted",
                          )}
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setSelectedLocationId(location.id);
                            setRouteDestinationId(location.id);
                            clearRouteNavigation();
                          }}
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
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
                    })
                  ) : (
                    <EmptyState
                      title={
                        mapQuery ? "No matching locations" : "No map locations"
                      }
                      description="Create locations from the Locations tab to populate this map."
                      className="border-0 bg-transparent"
                    />
                  )}
                </div>
              </aside>

              <div className="relative min-h-[34rem] overflow-hidden xl:min-h-0">
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
                  route={activeRoute}
                  selectedLocationId={selectedLocationId}
                  onSelectLocation={(locationId) => {
                    setSelectedLocationId(locationId);
                    setRouteDestinationId(locationId);
                    clearRouteNavigation();
                  }}
                />
                <div
                  className={cn(
                    "absolute right-4 top-4 z-[1000] flex flex-col items-end gap-3",
                    navigationOpen && "hidden",
                  )}
                >
                  <Button
                    type="button"
                    onClick={() => setNavigationOpen(true)}
                  >
                    <FiNavigation className="h-4 w-4" aria-hidden="true" />
                    Navigation
                  </Button>
                  {routeDistanceMeters !== null ? (
                    <div className="max-w-xs rounded-lg border border-border bg-surface/95 p-3 text-xs shadow-lg backdrop-blur">
                      <p className="font-semibold text-foreground">
                        {formatRouteDistance(routeDistanceMeters)} ·{" "}
                        {routeDurationSeconds !== null
                          ? formatRouteDuration(routeDurationSeconds)
                          : "duration unavailable"}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {travelMode === "car" ? "By car" : "On foot"}
                        {isRouteLive ? " · live" : ""}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
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
        open={navigationOpen}
        onOpenChange={setNavigationOpen}
        title="Navigation"
        description="Plan or restart a live route to a campus location."
        className="max-w-lg"
      >
        {navigationControls}
      </Drawer>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.name ?? "Location details"}
      >
        {viewing ? (
          <div className="space-y-5">
            <div>
              <p className="text-sm leading-6 text-muted-foreground">
                {viewing.description || "No description provided."}
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {viewing.category} · {getLocationCode(viewing)}
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <OpenStreetMap
                className="h-80 w-full"
                locations={[
                  {
                    id: viewing.id,
                    name: viewing.name,
                    category: viewing.category,
                    code: getLocationCode(viewing),
                    description: viewing.description ?? "",
                    coordinates: getLocationCoordinates(viewing),
                  },
                ]}
                routeDestinationId={viewing.id}
                route={detailRoute}
                selectedLocationId={viewing.id}
              />
            </div>
            <div className="rounded-lg border border-border bg-background/70 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {isDetailRouteLoading ? (
                    <FiLoader className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <FiNavigation className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {detailRouteDistanceMeters !== null
                      ? `${formatRouteDistance(detailRouteDistanceMeters)} from your current location`
                      : isDetailRouteLoading
                        ? "Checking your current location"
                        : detailRouteProblem === "route"
                          ? "Route unavailable"
                          : "Current location unavailable"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {detailRouteDistanceMeters !== null
                      ? `${detailRouteDurationSeconds !== null ? formatRouteDuration(detailRouteDurationSeconds) : "Duration unavailable"} · ${
                          travelMode === "car" ? "by car" : "on foot"
                        }${detailRouteSource === "road" ? " · follows roads" : ""}`
                      : detailRouteMessage ??
                        "Enable location access on your device to preview the route and distance."}
                  </p>
                </div>
              </div>
            </div>
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
              if (
                selectedLocationId === deleting.id ||
                routeDestinationId === deleting.id
              ) {
                const nextLocation = locations.find(
                  (location) => location.id !== deleting.id,
                );
                setSelectedLocationId(nextLocation?.id ?? "");
                setRouteDestinationId(nextLocation?.id ?? "");
                setActiveRoute(null);
                setRouteDistanceMeters(null);
                setRouteDurationSeconds(null);
                setRouteSource(null);
              }
              if (startingPoint === deleting.id) {
                setStartingPoint(currentLocationValue);
              }
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
