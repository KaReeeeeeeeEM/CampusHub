"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { allCountries } from "country-region-data";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiArrowLeft,
  FiArrowRight,
  FiEdit,
  FiEye,
  FiBookOpen,
  FiMapPin,
  FiLoader,
  FiPlus,
  FiSearch,
  FiSlash,
} from "react-icons/fi";
import type { z } from "zod";

import {
  CampusDataTable,
  CampusFileUpload,
  CampusInput,
  CampusTextarea,
  campusToast,
} from "@/components/campushub";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { MultiStepProgress } from "@/components/shared/multi-step-progress";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import { AdminActionMenu } from "@/features/administration/components/admin-action-menu";
import {
  universityInputSchema,
  type UniversityInput,
} from "@/features/super-admin/lib/schemas";
import type { SerializedUniversity } from "@/features/super-admin/lib/super-admin-service";
import type { DataTableColumn } from "@/components/shared/data-table";

type UniversityManagementProps = {
  initialUniversities: SerializedUniversity[];
};

type ApiResponse<T> = {
  data: T | null;
  error: {
    message: string;
  } | null;
};

const statusOptions = [
  { label: "Active", value: "ACTIVE" },
  { label: "Pending", value: "PENDING" },
  { label: "Inactive", value: "INACTIVE" },
] as const;

const countryOptions = allCountries.map(([name]) => name);

type UniversityFormField = keyof z.input<typeof universityInputSchema>;

type UniversityLocationResult = {
  id: string;
  name: string;
  address: string;
  country: string | null;
  latitude: number;
  longitude: number;
  source: "OPENSTREETMAP" | "OPENAI_WEB";
};

type UniversityLocationSearchResponse = {
  data?: {
    results?: UniversityLocationResult[];
  };
  error?: {
    message?: string;
  } | null;
};

const universityFormSteps: {
  id: string;
  title: string;
  description: string;
  fields: UniversityFormField[];
}[] = [
  {
    id: "foundation",
    title: "Foundation",
    description: "Core tenant identity and operational status.",
    fields: ["name", "shortName", "slug", "status"],
  },
  {
    id: "contact",
    title: "Contact",
    description: "Location and public contact details.",
    fields: ["country", "region", "website", "email", "phone"],
  },
  {
    id: "location",
    title: "Location",
    description: "Search and pin the university location.",
    fields: [
      "locationName",
      "locationAddress",
      "locationLatitude",
      "locationLongitude",
    ],
  },
  {
    id: "media",
    title: "Media",
    description: "Brand assets and tenant description.",
    fields: ["logo", "coverImage", "description"],
  },
];

function getDefaultValues(university?: SerializedUniversity): UniversityInput {
  return {
    name: university?.name ?? "",
    shortName: university?.shortName ?? "",
    slug: university?.slug ?? "",
    description: university?.description ?? "",
    logo: university?.logo ?? "",
    coverImage: university?.coverImage ?? "",
    country: university?.country ?? "",
    region: university?.region ?? "",
    website: university?.website ?? "",
    email: university?.email ?? "",
    phone: university?.phone ?? "",
    locationName: university?.locationName ?? "",
    locationAddress: university?.locationAddress ?? "",
    locationLatitude: university?.locationLatitude ?? null,
    locationLongitude: university?.locationLongitude ?? null,
    status: university?.status ?? "ACTIVE",
  };
}

function StatusBadge({ status }: { status: SerializedUniversity["status"] }) {
  const styles = {
    ACTIVE: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
    INACTIVE: "border-red-500/25 bg-red-500/10 text-red-400",
    PENDING: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  } satisfies Record<SerializedUniversity["status"], string>;

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function getCountryRegions(country: string) {
  const normalized = country.trim().toLowerCase();
  const countryData = allCountries.find(
    ([name]) => name.toLowerCase() === normalized,
  );

  return countryData?.[2].map(([name]) => name) ?? [];
}

function selectOptionsWithCurrent(options: string[], current: string) {
  return current && !options.includes(current) ? [current, ...options] : options;
}

function UniversityLocationPicker({
  country,
  region,
  name,
  address,
  latitude,
  longitude,
  onSelect,
  onPinChange,
}: {
  country: string;
  region: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  onSelect: (result: UniversityLocationResult) => void;
  onPinChange: (latitude: number, longitude: number) => void;
}) {
  const [query, setQuery] = useState(name || address);
  const [results, setResults] = useState<UniversityLocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<{
    map: import("leaflet").Map;
    marker: import("leaflet").Marker;
  } | null>(null);

  const searchLocations = useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim();

      if (trimmed.length < 2) {
        setResults([]);
        setSearched(false);
        return;
      }

      setLoading(true);
      setSearched(true);

      try {
        const params = new URLSearchParams({ q: trimmed });

        if (country.trim()) params.set("country", country.trim());
        if (region.trim()) params.set("region", region.trim());

        const response = await fetch(
          `/api/super-admin/university-locations/search?${params.toString()}`,
          {
            credentials: "include",
            cache: "no-store",
          },
        );
        const payload =
          (await response.json()) as UniversityLocationSearchResponse;

        if (!response.ok || payload.error) {
          setResults([]);
          return;
        }

        setResults(payload.data?.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [country, region],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void searchLocations(query);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [query, searchLocations]);

  useEffect(() => {
    let cancelled = false;

    async function setupMap() {
      if (!mapElementRef.current || leafletRef.current) return;

      const L = await import("leaflet");

      if (cancelled || !mapElementRef.current) return;

      const initialLatitude = latitude ?? -6.7924;
      const initialLongitude = longitude ?? 39.2083;
      const map = L.map(mapElementRef.current, {
        center: [initialLatitude, initialLongitude],
        zoom: latitude !== null && longitude !== null ? 15 : 5,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([initialLatitude, initialLongitude], {
        draggable: true,
        icon: L.divIcon({
          className: "",
          html: '<span style="display:flex;height:30px;width:30px;align-items:center;justify-content:center;border-radius:999px;background:#c45a05;color:white;box-shadow:0 8px 22px rgba(0,0,0,.35);font-size:18px;">●</span>',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
      }).addTo(map);

      marker.on("dragend", () => {
        const pin = marker.getLatLng();
        onPinChange(Number(pin.lat.toFixed(6)), Number(pin.lng.toFixed(6)));
      });

      leafletRef.current = { map, marker };
      window.setTimeout(() => map.invalidateSize(), 120);
    }

    void setupMap();

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, onPinChange]);

  useEffect(() => {
    const leaflet = leafletRef.current;

    if (!leaflet || latitude === null || longitude === null) return;

    leaflet.marker.setLatLng([latitude, longitude]);
    leaflet.map.setView([latitude, longitude], Math.max(leaflet.map.getZoom(), 15));
  }, [latitude, longitude]);

  function selectLocation(result: UniversityLocationResult) {
    setQuery(result.name);
    setResults([]);
    onSelect(result);
  }

  return (
    <div className="space-y-4">
      <label className="space-y-2">
        <span className="text-sm font-medium">Search University Location</span>
        <CampusInput
          placeholder={
            [country, region].filter(Boolean).length
              ? "Search university name"
              : "Search university name or campus address"
          }
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {country || region ? (
        <p className="pt-2 text-xs font-medium text-muted-foreground">
          Search is scoped to {[region, country].filter(Boolean).join(", ")}.
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-muted-foreground">
          <FiLoader className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          Searching locations
        </div>
      ) : null}

      {!loading && results.length ? (
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              className="flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-surface-muted"
              onClick={() => selectLocation(result)}
            >
              <FiMapPin
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{result.name}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {result.address}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {searched && !loading && !results.length ? (
        <p className="text-xs font-medium text-muted-foreground">
          No matching locations found. Search by country, city, or campus name,
          then drag the map pin to refine manually.
        </p>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-lg border border-border">
        <div ref={mapElementRef} className="h-72 w-full bg-surface-muted" />
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Selected Location
          </p>
          <p className="mt-1 font-medium">{name || "No location selected"}</p>
          {address ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {address}
            </p>
          ) : null}
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Coordinates
          </p>
          <p className="mt-1 font-medium">
            {latitude !== null && longitude !== null
              ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
              : "Drag the pin or choose a result"}
          </p>
        </div>
      </div>
    </div>
  );
}

function UniversityForm({
  university,
  onSubmit,
  isSubmitting,
}: {
  university?: SerializedUniversity;
  onSubmit: (values: UniversityInput) => void;
  isSubmitting: boolean;
}) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<z.input<typeof universityInputSchema>, unknown, UniversityInput>({
    resolver: zodResolver(universityInputSchema),
    defaultValues: getDefaultValues(university),
  });
  const status = watch("status");
  const logo = watch("logo");
  const coverImage = watch("coverImage");
  const country = watch("country");
  const region = watch("region");
  const locationName = watch("locationName");
  const locationAddress = watch("locationAddress");
  const locationLatitude = watch("locationLatitude");
  const locationLongitude = watch("locationLongitude");
  const activeStep = universityFormSteps[activeStepIndex];
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === universityFormSteps.length - 1;
  const visibleCountryOptions = useMemo(
    () => selectOptionsWithCurrent(countryOptions, country ?? ""),
    [country],
  );
  const regionOptions = useMemo(() => getCountryRegions(country ?? ""), [country]);
  const visibleRegionOptions = useMemo(
    () => selectOptionsWithCurrent(regionOptions, region ?? ""),
    [region, regionOptions],
  );

  async function goToNextStep() {
    const valid = await trigger(activeStep.fields, { shouldFocus: true });

    if (!valid) return;

    setActiveStepIndex((current) =>
      Math.min(current + 1, universityFormSteps.length - 1),
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <MultiStepProgress
        activeIndex={activeStepIndex}
        className="mb-8"
        maxClickableIndex={activeStepIndex}
        steps={universityFormSteps.map((step) => ({
          label: step.title,
          icon: FiArrowRight,
        }))}
        onStepClick={setActiveStepIndex}
      />

      <div>
        {activeStep.id === "foundation" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Name</span>
              <CampusInput
                {...register("name")}
                invalid={Boolean(errors.name)}
                placeholder="University name"
              />
              {errors.name ? (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              ) : null}
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Short Name</span>
              <CampusInput
                {...register("shortName")}
                invalid={Boolean(errors.shortName)}
                placeholder="UDSM"
              />
              {errors.shortName ? (
                <p className="text-xs text-destructive">
                  {errors.shortName.message}
                </p>
              ) : null}
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Slug</span>
              <CampusInput
                {...register("slug")}
                invalid={Boolean(errors.slug)}
                placeholder="university-of-dar-es-salaam"
              />
              {errors.slug ? (
                <p className="text-xs text-destructive">
                  {errors.slug.message}
                </p>
              ) : null}
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Status</span>
              <Select
                value={status}
                onValueChange={(value) =>
                  setValue("status", value as UniversityInput["status"], {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
        ) : null}

        {activeStep.id === "contact" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Country</span>
              <Select
                value={country ?? ""}
                onValueChange={(value) => {
                  setValue("country", value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setValue("region", "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {visibleCountryOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country ? (
                <p className="text-xs text-destructive">
                  {errors.country.message}
                </p>
              ) : null}
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Region</span>
              <Select
                value={region ?? ""}
                disabled={!country || visibleRegionOptions.length === 0}
                onValueChange={(value) =>
                  setValue("region", value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      country
                        ? "Select region"
                        : "Select a country first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {visibleRegionOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.region ? (
                <p className="text-xs text-destructive">
                  {errors.region.message}
                </p>
              ) : null}
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Website</span>
              <CampusInput
                {...register("website")}
                invalid={Boolean(errors.website)}
                placeholder="https://university.edu"
                type="url"
              />
              {errors.website ? (
                <p className="text-xs text-destructive">
                  {errors.website.message}
                </p>
              ) : null}
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Email</span>
              <CampusInput
                {...register("email")}
                invalid={Boolean(errors.email)}
                placeholder="admin@university.edu"
                type="email"
              />
              {errors.email ? (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              ) : null}
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Phone</span>
              <CampusInput
                {...register("phone")}
                placeholder="+255 000 000 000"
              />
            </label>
          </div>
        ) : null}

        {activeStep.id === "location" ? (
          <UniversityLocationPicker
            address={locationAddress ?? ""}
            country={country ?? ""}
            region={region ?? ""}
            latitude={
              typeof locationLatitude === "number" ? locationLatitude : null
            }
            longitude={
              typeof locationLongitude === "number" ? locationLongitude : null
            }
            name={locationName ?? ""}
            onPinChange={(latitude, longitude) => {
              setValue("locationLatitude", latitude, {
                shouldDirty: true,
                shouldValidate: true,
              });
              setValue("locationLongitude", longitude, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
            onSelect={(result) => {
              setValue("locationName", result.name, {
                shouldDirty: true,
                shouldValidate: true,
              });
              setValue("locationAddress", result.address, {
                shouldDirty: true,
                shouldValidate: true,
              });
              setValue("locationLatitude", result.latitude, {
                shouldDirty: true,
                shouldValidate: true,
              });
              setValue("locationLongitude", result.longitude, {
                shouldDirty: true,
                shouldValidate: true,
              });
              if (!country && result.country) {
                setValue("country", result.country, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }
            }}
          />
        ) : null}

        {activeStep.id === "media" ? (
          <div className="grid gap-4">
            <CampusFileUpload
              label="Logo Upload"
              value={logo}
              error={errors.logo?.message}
              onValueChange={(value) =>
                setValue("logo", value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
            <CampusFileUpload
              label="Cover Image Upload"
              value={coverImage}
              error={errors.coverImage?.message}
              maxSizeMb={2}
              onValueChange={(value) =>
                setValue("coverImage", value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
            <label className="space-y-2">
              <span className="text-sm font-medium">Description</span>
              <CampusTextarea
                {...register("description")}
                invalid={Boolean(errors.description)}
                placeholder="Describe the university and its CampusHub readiness."
              />
              {errors.description ? (
                <p className="text-xs text-destructive">
                  {errors.description.message}
                </p>
              ) : null}
            </label>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="secondary"
          disabled={isFirstStep || isSubmitting}
          onClick={() =>
            setActiveStepIndex((current) => Math.max(current - 1, 0))
          }
        >
          <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        {isLastStep ? (
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? (
              <FiLoader className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {university ? "Save Changes" : "Create University"}
          </Button>
        ) : (
          <Button disabled={isSubmitting} type="button" onClick={goToNextStep}>
            Continue
            <FiArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </form>
  );
}

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

export function UniversityManagement({
  initialUniversities,
}: UniversityManagementProps) {
  const router = useRouter();
  const [universities, setUniversities] = useState(initialUniversities);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SerializedUniversity | null>(null);
  const [deactivating, setDeactivating] = useState<SerializedUniversity | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const filteredUniversities = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return universities;
    }

    return universities.filter((university) =>
      [
        university.name,
        university.shortName,
        university.country,
        university.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, universities]);

  async function refreshUniversities() {
    const response = await fetch("/api/super-admin/universities", {
      cache: "no-store",
    });
    const payload = (await response.json()) as ApiResponse<{
      universities: SerializedUniversity[];
    }>;

    if (payload.data) {
      setUniversities(payload.data.universities);
    }
  }

  function createUniversity(values: UniversityInput) {
    startTransition(async () => {
      const response = await fetch("/api/super-admin/universities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json()) as ApiResponse<{
        university: SerializedUniversity;
      }>;

      if (!response.ok || !payload.data) {
        campusToast.error({
          title: "Creation Failed",
          description:
            payload.error?.message ??
            "Unable to create university. Please try again.",
        });
        return;
      }

      setCreateOpen(false);
      await refreshUniversities();
      campusToast.success({
        title: "University Created",
        description: "The university was created successfully.",
      });
    });
  }

  function updateSelectedUniversity(values: UniversityInput) {
    if (!editing) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(
        `/api/super-admin/universities/${editing.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      const payload = (await response.json()) as ApiResponse<{
        university: SerializedUniversity;
      }>;

      if (!response.ok || !payload.data) {
        campusToast.error({
          title: "Update Failed",
          description:
            payload.error?.message ??
            "Unable to update university. Please try again.",
        });
        return;
      }

      setEditing(null);
      await refreshUniversities();
      campusToast.success({
        title: "University Updated",
        description: "University information updated successfully.",
      });
    });
  }

  function deactivateSelectedUniversity() {
    if (!deactivating) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(
        `/api/super-admin/universities/${deactivating.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "deactivate" }),
        },
      );
      const payload = (await response.json()) as ApiResponse<{
        university: SerializedUniversity;
      }>;

      if (!response.ok || !payload.data) {
        campusToast.error({
          title: "Deactivation Failed",
          description:
            payload.error?.message ??
            "Unable to deactivate university. Please try again.",
        });
        return;
      }

      setDeactivating(null);
      await refreshUniversities();
      campusToast.warning({
        title: "University Deactivated",
        description: "The university has been deactivated successfully.",
      });
    });
  }

  const columns: DataTableColumn<SerializedUniversity>[] = [
    {
      key: "logo",
      header: "Logo",
      className: "w-20",
      cell: (university) => (
        <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-border bg-background text-primary">
          {university.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={university.logo}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <FiBookOpen className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (university) => <p className="font-medium">{university.name}</p>,
    },
    { key: "shortName", header: "Short Name" },
    { key: "country", header: "Country" },
    {
      key: "status",
      header: "Status",
      cell: (university) => <StatusBadge status={university.status} />,
    },
    {
      key: "createdAt",
      header: "Created Date",
      cell: (university) => formatDate(university.createdAt),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-16 text-right",
      cell: (university) => (
        <AdminActionMenu
          items={[
            {
              label: "View",
              icon: FiEye,
              onSelect: () =>
                router.push(`/super-admin/universities/${university.id}`),
            },
            {
              label: "Edit",
              icon: FiEdit,
              onSelect: () => setEditing(university),
            },
            {
              label: "Deactivate",
              icon: FiSlash,
              disabled: university.status === "INACTIVE",
              onSelect: () => setDeactivating(university),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <FiSearch
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <CampusInput
            className="pl-9"
            placeholder="Search universities"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <FiPlus className="h-4 w-4" aria-hidden="true" />
          Create University
        </Button>
      </div>

      <div className="mt-5">
        <CampusDataTable
          columns={columns}
          data={filteredUniversities}
          getRowId={(university) => university.id}
          empty={
            <EmptyState
              title={query ? "No matching universities" : "No universities yet"}
              description={
                query
                  ? "Adjust your search and try again."
                  : "Create the first university to unlock Campus Admin invitations."
              }
              className="mx-auto border-0 bg-transparent"
            />
          }
        />
      </div>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create University"
        description="Create a university tenant foundation for CampusHub."
        className="max-h-[90vh] max-w-4xl overflow-y-auto"
      >
        <UniversityForm onSubmit={createUniversity} isSubmitting={isPending} />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit University"
        description="Update university details."
        className="max-h-[90vh] max-w-4xl overflow-y-auto"
      >
        {editing ? (
          <UniversityForm
            key={editing.id}
            university={editing}
            onSubmit={updateSelectedUniversity}
            isSubmitting={isPending}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deactivating)}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title="Deactivate University"
        description={`Deactivate ${deactivating?.name ?? "this university"}? This will prevent new enrollments until reactivated.`}
        confirmLabel="Deactivate"
        destructive
        onConfirm={deactivateSelectedUniversity}
      />
    </>
  );
}
