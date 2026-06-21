"use client";

import { useMemo, useState, useTransition } from "react";
import {
  FiArrowLeft,
  FiArrowRight,
  FiEdit,
  FiFilter,
  FiGrid,
  FiList,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";

import {
  CampusDataTable,
  CampusInput,
  CampusTextarea,
  CampusViewToggle,
  Empty,
  campusToast,
} from "@/components/campushub";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { DataTableColumn } from "@/components/shared/data-table";
import { MultiStepProgress } from "@/components/shared/multi-step-progress";
import { Modal } from "@/components/shared/modal";
import {
  OpenStreetMap,
  type CampusMapLocation,
} from "@/components/maps/open-street-map";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import {
  PollForm,
  type SharedPollFormValues,
} from "@/features/polls/components/poll-form";
import type {
  PlatformContentInput,
  PlatformContentItem,
  PlatformContentMapLocation,
  PlatformContentTarget,
  PlatformContentType,
  PlatformContentUniversity,
} from "@/features/super-admin/lib/platform-content-service";

type PlatformContentManagementProps = {
  initialItems: PlatformContentItem[];
  universities: PlatformContentUniversity[];
  colleges?: PlatformContentTarget[];
  departments?: PlatformContentTarget[];
  mapLocations?: PlatformContentMapLocation[];
  initialType?: PlatformContentType | "all";
  lockType?: boolean;
};

type ViewMode = "list" | "grid";

const typeOptions: Array<{ value: PlatformContentType | "all"; label: string }> = [
  { value: "all", label: "All Content" },
  { value: "announcements", label: "Announcements" },
  { value: "events", label: "Events" },
  { value: "almanac", label: "Almanac" },
  { value: "map-locations", label: "Map Locations" },
  { value: "polls", label: "Polls" },
  { value: "suggestions", label: "Suggestions" },
  { value: "forums", label: "Forums" },
  { value: "committees", label: "Committees" },
];

const createTypeOptions = typeOptions.filter(
  (option): option is { value: PlatformContentType; label: string } =>
    option.value !== "all",
);

const viewOptions = [
  { value: "list", label: "List view", icon: FiList },
  { value: "grid", label: "Grid view", icon: FiGrid },
] as const;

const categoryOptions: Partial<Record<PlatformContentType, string[]>> = {
  announcements: [
    "ACADEMICS",
    "SPORTS",
    "OFFERS",
    "CLUBS",
    "LEADERSHIP",
    "CAREER",
    "HEALTH",
    "GENERAL",
    "OTHER",
  ],
  events: [
    "ACADEMIC",
    "SPORTS",
    "CLUB",
    "WORKSHOP",
    "HACKATHON",
    "SEMINAR",
    "CAREER",
    "SOCIAL",
    "OTHER",
  ],
  almanac: [
    "SEMESTER_START",
    "SEMESTER_END",
    "REGISTRATION",
    "EXAMINATION",
    "GRADUATION",
    "ORIENTATION",
    "HOLIDAY",
    "WORKSHOP",
    "GENERAL",
    "OTHER",
  ],
  "map-locations": [
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
  ],
  committees: ["ACADEMIC", "WELFARE", "DISCIPLINARY", "EVENTS", "FINANCE", "GENERAL"],
};

const statusOptions: Record<PlatformContentType, string[]> = {
  announcements: ["DRAFT", "PUBLISHED", "ARCHIVED"],
  events: ["DRAFT", "OPEN", "FULL", "ONGOING", "COMPLETED", "CANCELLED"],
  almanac: ["ACTIVE", "ARCHIVED", "CANCELLED"],
  "map-locations": ["ACTIVE", "INACTIVE", "ARCHIVED"],
  polls: ["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"],
  suggestions: [
    "OPEN",
    "UNDER_REVIEW",
    "IN_REVIEW",
    "IN_PROGRESS",
    "RESOLVED",
    "REJECTED",
    "CLOSED",
    "ARCHIVED",
  ],
  forums: ["ACTIVE", "LOCKED", "ARCHIVED"],
  committees: ["ACTIVE", "INACTIVE", "ARCHIVED"],
};

const singularTypeLabels: Record<PlatformContentType, string> = {
  announcements: "Announcement",
  events: "Event",
  almanac: "Almanac Entry",
  "map-locations": "Map Location",
  polls: "Poll",
  suggestions: "Suggestion",
  forums: "Forum",
  committees: "Committee",
};

const defaultStatuses: Record<PlatformContentType, string> = {
  announcements: "DRAFT",
  events: "DRAFT",
  almanac: "ACTIVE",
  "map-locations": "ACTIVE",
  polls: "DRAFT",
  suggestions: "OPEN",
  forums: "ACTIVE",
  committees: "ACTIVE",
};

const defaultCategories: Record<PlatformContentType, string> = {
  announcements: "GENERAL",
  events: "SOCIAL",
  almanac: "GENERAL",
  "map-locations": "OTHER",
  polls: "GENERAL",
  suggestions: "GENERAL",
  forums: "GENERAL",
  committees: "GENERAL",
};

const typePlaceholders: Record<
  PlatformContentType,
  {
    title: string;
    description: string;
    category?: string;
    status: string;
    venue?: string;
    options?: string;
  }
> = {
  announcements: {
    title: "e.g. CampusHub maintenance window",
    description: "Write the announcement body students and staff should see.",
    category: "e.g. GENERAL, ACADEMIC, SYSTEM",
    status: "e.g. DRAFT or PUBLISHED",
  },
  events: {
    title: "e.g. Innovation Week opening ceremony",
    description: "Add event details, agenda, or attendee instructions.",
    category: "e.g. WORKSHOP, SEMINAR, SOCIAL",
    status: "e.g. DRAFT, PUBLISHED, CANCELLED",
    venue: "e.g. Nkrumah Hall",
  },
  almanac: {
    title: "e.g. Semester registration deadline",
    description: "Describe the academic calendar entry.",
    category: "e.g. ACADEMIC, EXAM, HOLIDAY",
    status: "e.g. ACTIVE or ARCHIVED",
  },
  "map-locations": {
    title: "e.g. Main Library",
    description: "Add directions, access notes, or location details.",
    category: "e.g. LIBRARY, OFFICE, LAB",
    status: "e.g. ACTIVE or ARCHIVED",
  },
  polls: {
    title: "e.g. Which workshop should run next?",
    description: "Explain what students are voting on.",
    category: "e.g. GENERAL, ACADEMIC, EVENT",
    status: "e.g. DRAFT, ACTIVE, CLOSED",
    options: "e.g. AI workshop, Startup clinic, Research methods",
  },
  suggestions: {
    title: "e.g. Add more evening shuttle routes",
    description: "Capture the suggestion details.",
    category: "e.g. TRANSPORT, ACADEMIC, SAFETY",
    status: "e.g. OPEN, REVIEWING, RESOLVED",
  },
  forums: {
    title: "e.g. Engineering student forum",
    description: "Describe the forum purpose and audience.",
    status: "e.g. ACTIVE or ARCHIVED",
  },
  committees: {
    title: "e.g. Student Welfare Committee",
    description: "Describe the committee mandate.",
    category: "e.g. GENERAL, ACADEMIC, WELFARE",
    status: "e.g. ACTIVE or ARCHIVED",
  },
};

function labelForType(type: string) {
  return typeOptions.find((option) => option.value === type)?.label ?? type;
}

function selectOptionsWithCurrent(options: string[], current: string | null | undefined) {
  return current && !options.includes(current) ? [current, ...options] : options;
}

function singularLabelForType(type: PlatformContentType) {
  return singularTypeLabels[type];
}

function shouldShowCategory(type: PlatformContentType) {
  return !["forums"].includes(type);
}

function shouldShowSchedule(type: PlatformContentType) {
  return ["events", "almanac", "polls"].includes(type);
}

function shouldShowVenue(type: PlatformContentType) {
  return type === "events";
}

function shouldShowCoordinates(type: PlatformContentType) {
  return type === "map-locations";
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function pollFormInitialValues(
  form: PlatformContentInput,
): Partial<SharedPollFormValues> {
  const visibility =
    form.visibility === "COLLEGE" || form.visibility === "DEPARTMENT"
      ? form.visibility
      : "UNIVERSITY";

  return {
    title: form.title,
    description: form.description ?? "",
    pollType: (form.category as SharedPollFormValues["pollType"]) ?? "GENERAL",
    visibility,
    collegeId: form.collegeIds?.[0] ?? "",
    departmentId: form.departmentIds?.[0] ?? "",
    startDate: form.startsAt ?? "",
    endDate: form.endsAt ?? "",
    status: (form.status as SharedPollFormValues["status"]) ?? "DRAFT",
    allowMultipleSelection: Boolean(form.allowMultipleSelection),
    anonymous: form.anonymous ?? true,
    options: (form.options ?? ["Yes", "No"]).map((label) => ({ label })),
  };
}

function pollValuesToPlatformInput(
  current: PlatformContentInput,
  values: SharedPollFormValues,
): PlatformContentInput {
  return {
    ...current,
    type: "polls",
    title: values.title,
    description: values.description,
    category: values.pollType,
    status: values.status,
    startsAt: values.startDate || null,
    endsAt: values.endDate,
    options: values.options.map((option) => option.label.trim()).filter(Boolean),
    visibility: values.visibility,
    collegeIds: values.visibility === "COLLEGE" ? [values.collegeId] : [],
    departmentIds:
      values.visibility === "DEPARTMENT" ? [values.departmentId] : [],
    customAudience: [],
    allowMultipleSelection: values.allowMultipleSelection,
    anonymous: values.anonymous,
  };
}

function isFiniteCoordinate(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function eventMapLocationToCampusLocation(
  location: PlatformContentMapLocation,
): CampusMapLocation {
  return {
    id: location.id,
    name: location.name,
    category: location.category,
    coordinates: location.coordinates,
  };
}

type EventFormProps = {
  form: PlatformContentInput;
  beforeFields?: React.ReactNode;
  mapLocations: PlatformContentMapLocation[];
  isSubmitting?: boolean;
  submitLabel: string;
  onFieldChange: <K extends keyof PlatformContentInput>(
    key: K,
    value: PlatformContentInput[K],
  ) => void;
  onSubmit: () => void;
};

function EventForm({
  form,
  beforeFields,
  mapLocations,
  isSubmitting = false,
  submitLabel,
  onFieldChange,
  onSubmit,
}: EventFormProps) {
  const [step, setStep] = useState(0);
  const selectedLocation = mapLocations.find(
    (location) => location.id === form.locationId,
  );
  const mapPreviewLocations = mapLocations.map(eventMapLocationToCampusLocation);
  const outsideMarker =
    form.venueMode === "OUTSIDE" &&
    isFiniteCoordinate(form.latitude) &&
    isFiniteCoordinate(form.longitude)
      ? { lat: Number(form.latitude), lng: Number(form.longitude) }
      : null;
  const steps = [
    {
      title: "Basics",
      description: "Set the event identity, publishing state, and description.",
    },
    {
      title: "Venue",
      description: "Choose a campus map point or verify an outside location.",
    },
    {
      title: "Schedule",
      description: "Set the event timing and confirm the record.",
    },
  ];
  const currentStep = steps[step];

  function validateStep(index: number) {
    if (index === 0) {
      if (!form.universityId || !form.title.trim() || !form.category || !form.status) {
        campusToast.error({
          title: "Complete event basics",
          description: "University, title, category, and status are required.",
        });
        return false;
      }
    }

    if (index === 1) {
      if (form.venueMode === "UNIVERSITY_POINT") {
        if (!form.locationId) {
          campusToast.error({
            title: "Select a map point",
            description: "Choose the campus location where the event will happen.",
          });
          return false;
        }
      } else if (
        !form.venue?.trim() ||
        !isFiniteCoordinate(form.latitude) ||
        !isFiniteCoordinate(form.longitude)
      ) {
        campusToast.error({
          title: "Verify the outside venue",
          description:
            "Enter the venue name plus latitude and longitude so directions can work.",
        });
        return false;
      }
    }

    if (index === 2) {
      const startsAt = form.startsAt ? new Date(form.startsAt) : null;
      const endsAt = form.endsAt ? new Date(form.endsAt) : null;

      if (
        !startsAt ||
        !endsAt ||
        Number.isNaN(startsAt.getTime()) ||
        Number.isNaN(endsAt.getTime()) ||
        endsAt <= startsAt
      ) {
        campusToast.error({
          title: "Check the event schedule",
          description: "Start and end dates are required, and end must be later.",
        });
        return false;
      }
    }

    return true;
  }

  function goNext() {
    if (validateStep(step)) {
      setStep((current) => Math.min(current + 1, steps.length - 1));
    }
  }

  function submitEvent() {
    if (step < steps.length - 1) {
      goNext();
      return;
    }
    if (validateStep(step)) onSubmit();
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        submitEvent();
      }}
    >
      <MultiStepProgress
        activeIndex={step}
        className="mb-8"
        maxClickableIndex={step}
        steps={steps.map((item) => ({
          label: item.title,
          icon: FiArrowRight,
        }))}
        onStepClick={setStep}
      />
      <div className="rounded-lg border border-border bg-background p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {currentStep.title}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {currentStep.description}
        </p>
      </div>

      {step === 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          {beforeFields}
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Title</span>
            <CampusInput
              required
              placeholder={typePlaceholders.events.title}
              value={form.title}
              onChange={(event) => onFieldChange("title", event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Category</span>
            <Select
              value={form.category ?? "SOCIAL"}
              onValueChange={(value) => onFieldChange("category", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose category" />
              </SelectTrigger>
              <SelectContent>
                {selectOptionsWithCurrent(
                  categoryOptions.events ?? ["SOCIAL"],
                  form.category,
                ).map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Status</span>
            <Select
              value={form.status ?? "DRAFT"}
              onValueChange={(value) => onFieldChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose status" />
              </SelectTrigger>
              <SelectContent>
                {selectOptionsWithCurrent(statusOptions.events, form.status).map(
                  (option) => (
                    <SelectItem key={option} value={option}>
                      {option.replaceAll("_", " ")}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Description</span>
            <CampusTextarea
              placeholder={typePlaceholders.events.description}
              value={form.description ?? ""}
              onChange={(event) =>
                onFieldChange("description", event.target.value)
              }
            />
          </label>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Venue Type</span>
            <Select
              value={form.venueMode ?? "OUTSIDE"}
              onValueChange={(value) => {
                const venueMode =
                  value as NonNullable<PlatformContentInput["venueMode"]>;

                onFieldChange("venueMode", venueMode);
                if (venueMode === "UNIVERSITY_POINT") {
                  onFieldChange("venue", "");
                  onFieldChange("latitude", null);
                  onFieldChange("longitude", null);
                } else {
                  onFieldChange("locationId", "");
                  onFieldChange("locationName", "");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose venue type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNIVERSITY_POINT">
                  University map point
                </SelectItem>
                <SelectItem value="OUTSIDE">Outside university</SelectItem>
              </SelectContent>
            </Select>
          </label>

          {form.venueMode === "UNIVERSITY_POINT" ? (
            <>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium">
                  University Location Point
                </span>
                <Select
                  value={form.locationId ?? ""}
                  onValueChange={(value) => {
                    const selected = mapLocations.find(
                      (location) => location.id === value,
                    );

                    onFieldChange("locationId", value);
                    onFieldChange("locationName", selected?.name ?? "");
                    onFieldChange("venue", selected?.name ?? "");
                    onFieldChange("latitude", selected?.latitude ?? null);
                    onFieldChange("longitude", selected?.longitude ?? null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a university map point" />
                  </SelectTrigger>
                  <SelectContent>
                    {mapLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              {mapLocations.length === 0 ? (
                <p className="text-xs text-muted-foreground md:col-span-2">
                  No active map points are available for the selected university
                  yet.
                </p>
              ) : null}
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FiMapPin className="h-4 w-4" aria-hidden="true" />
                  Map Preview
                </div>
                <OpenStreetMap
                  className="h-72 overflow-hidden rounded-lg border border-border"
                  locations={mapPreviewLocations}
                  selectedLocationId={form.locationId ?? undefined}
                  routeDestinationId={form.locationId ?? undefined}
                  onSelectLocation={(locationId) => {
                    const selected = mapLocations.find(
                      (location) => location.id === locationId,
                    );

                    onFieldChange("locationId", locationId);
                    onFieldChange("locationName", selected?.name ?? "");
                    onFieldChange("venue", selected?.name ?? "");
                    onFieldChange("latitude", selected?.latitude ?? null);
                    onFieldChange("longitude", selected?.longitude ?? null);
                  }}
                />
                {selectedLocation ? (
                  <p className="text-xs text-muted-foreground">
                    Previewing {selectedLocation.name}.
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium">Outside Venue</span>
                <CampusInput
                  placeholder={typePlaceholders.events.venue}
                  value={form.venue ?? ""}
                  onChange={(event) => onFieldChange("venue", event.target.value)}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Latitude</span>
                <CampusInput
                  placeholder="e.g. -6.7704"
                  type="number"
                  step="any"
                  value={form.latitude ?? ""}
                  onChange={(event) =>
                    onFieldChange(
                      "latitude",
                      event.target.value ? Number(event.target.value) : null,
                    )
                  }
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Longitude</span>
                <CampusInput
                  placeholder="e.g. 39.2410"
                  type="number"
                  step="any"
                  value={form.longitude ?? ""}
                  onChange={(event) =>
                    onFieldChange(
                      "longitude",
                      event.target.value ? Number(event.target.value) : null,
                    )
                  }
                />
              </label>
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FiMapPin className="h-4 w-4" aria-hidden="true" />
                  Map Preview
                </div>
                <OpenStreetMap
                  className="h-72 overflow-hidden rounded-lg border border-border"
                  locations={[]}
                  editableMarker={outsideMarker}
                  editableMarkerLabel={form.venue?.trim() || "Outside venue"}
                  onEditableMarkerChange={(coordinates) => {
                    onFieldChange("latitude", coordinates.lat);
                    onFieldChange("longitude", coordinates.lng);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Enter coordinates to preview the outside venue, then drag the
                  pin if it needs adjustment.
                </p>
              </div>
            </>
          )}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Start Date</span>
            <CampusInput
              type="datetime-local"
              value={form.startsAt ?? ""}
              onChange={(event) => onFieldChange("startsAt", event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">End Date</span>
            <CampusInput
              type="datetime-local"
              value={form.endsAt ?? ""}
              onChange={(event) => onFieldChange("endsAt", event.target.value)}
            />
          </label>
          <div className="rounded-lg border border-border bg-background p-4 md:col-span-2">
            <p className="text-sm font-semibold">{form.title || "Untitled event"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {form.venue || "No venue selected"} ·{" "}
              {form.status?.replaceAll("_", " ") ?? "DRAFT"}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="secondary"
          disabled={step === 0 || isSubmitting}
          onClick={() => setStep((current) => Math.max(current - 1, 0))}
        >
          <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        {step === steps.length - 1 ? (
          <Button className="w-full sm:w-auto" disabled={isSubmitting} type="submit">
            {submitLabel}
          </Button>
        ) : (
          <Button className="w-full sm:w-auto" type="button" onClick={goNext}>
            Next
            <FiArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </form>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function defaultForm(
  universities: PlatformContentUniversity[],
  type: PlatformContentType = "announcements",
): PlatformContentInput {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    type,
    universityId: universities[0]?.id ?? "",
    title: "",
    description: "",
    category: defaultCategories[type],
    status: defaultStatuses[type],
    startsAt: new Date().toISOString().slice(0, 16),
    endsAt: tomorrow.toISOString().slice(0, 16),
    venue: "",
    venueMode: "OUTSIDE",
    locationId: "",
    locationName: "",
    latitude: type === "events" ? null : 0,
    longitude: type === "events" ? null : 0,
    options: ["Yes", "No"],
    visibility: "UNIVERSITY",
    collegeIds: [],
    departmentIds: [],
    customAudience: [],
    allowMultipleSelection: false,
    anonymous: true,
  };
}

async function parseApiResponse<T>(response: Response) {
  const payload = (await response.json()) as {
    data: T | null;
    error: { message: string } | null;
  };

  if (!response.ok || payload.error || !payload.data) {
    throw new Error(payload.error?.message ?? "Request failed.");
  }

  return payload.data;
}

export function PlatformContentManagement({
  initialItems,
  universities,
  colleges = [],
  departments = [],
  mapLocations = [],
  initialType = "all",
  lockType = false,
}: PlatformContentManagementProps) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<PlatformContentType | "all">(initialType);
  const [universityId, setUniversityId] = useState("all");
  const [view, setView] = useState<ViewMode>("list");
  const [form, setForm] = useState<PlatformContentInput>(() =>
    defaultForm(
      universities,
      initialType === "all" ? "announcements" : initialType,
    ),
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformContentItem | null>(null);
  const [deleting, setDeleting] = useState<PlatformContentItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const suggestionsReadOnly = lockType && initialType === "suggestions";

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    return items.filter((item) => {
      const matchesType = type === "all" || item.type === type;
      const matchesUniversity =
        universityId === "all" || item.universityId === universityId;
      const matchesQuery =
        !normalized ||
        [
          item.title,
          item.universityName,
          item.category,
          item.status,
          item.description,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return matchesType && matchesUniversity && matchesQuery;
    });
  }, [items, query, type, universityId]);

  function openEdit(item: PlatformContentItem) {
    setEditing(item);
    setForm({
      ...defaultForm(universities, item.type),
      type: item.type,
      universityId: item.universityId,
      title: item.title,
      description: item.description,
      category: item.category,
      status: item.status,
      venue: typeof item.metadata.venue === "string" ? item.metadata.venue : "",
      venueMode: item.metadata.locationId ? "UNIVERSITY_POINT" : "OUTSIDE",
      locationId:
        typeof item.metadata.locationId === "string"
          ? item.metadata.locationId
          : "",
      locationName:
        typeof item.metadata.locationName === "string"
          ? item.metadata.locationName
          : "",
      latitude:
        typeof item.metadata.latitude === "number"
          ? item.metadata.latitude
          : null,
      longitude:
        typeof item.metadata.longitude === "number"
          ? item.metadata.longitude
          : null,
      startsAt: item.startsAt?.slice(0, 16) ?? "",
      endsAt:
        typeof item.metadata.endDate === "string"
          ? item.metadata.endDate.slice(0, 16)
          : "",
      options: stringArray(item.metadata.options),
      visibility:
        (item.metadata.visibility as PlatformContentInput["visibility"]) ??
        "UNIVERSITY",
      collegeIds: stringArray(item.metadata.collegeIds),
      departmentIds: stringArray(item.metadata.departmentIds),
      customAudience: stringArray(item.metadata.customAudience),
      allowMultipleSelection: Boolean(item.metadata.allowMultipleSelection),
      anonymous:
        typeof item.metadata.anonymous === "boolean"
          ? item.metadata.anonymous
          : true,
    });
  }

  const columns: DataTableColumn<PlatformContentItem>[] = [
    {
      key: "title",
      header: "Record",
      cell: (item) => (
        <div>
          <p className="font-semibold">{item.title}</p>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {item.description || "No description"}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (item) => labelForType(item.type),
    },
    { key: "universityName", header: "University" },
    { key: "category", header: "Category" },
    { key: "status", header: "Status" },
    {
      key: "startsAt",
      header: "Date",
      cell: (item) => formatDate(item.startsAt ?? item.createdAt),
    },
    ...(suggestionsReadOnly
      ? []
      : [
          {
            key: "actions",
            header: "Actions",
            className: "w-32 text-right",
            cell: (item) => (
              <div className="flex justify-end gap-2">
                <Button
                  size="icon"
                  type="button"
                  variant="ghost"
                  onClick={() => openEdit(item)}
                >
                  <FiEdit className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button
                  size="icon"
                  type="button"
                  variant="ghost"
                  onClick={() => setDeleting(item)}
                >
                  <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            ),
          } satisfies DataTableColumn<PlatformContentItem>,
        ]),
  ];

  function updateForm<K extends keyof PlatformContentInput>(
    key: K,
    value: PlatformContentInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateFormType(value: PlatformContentType) {
    setForm((current) => ({
      ...defaultForm(universities, value),
      universityId: current.universityId,
      type: value,
      title: current.title,
      description: current.description,
      category: current.category || "GENERAL",
    }));
  }

  const activeContentLabel = singularLabelForType(form.type);
  const placeholders = typePlaceholders[form.type];
  const createButtonLabel =
    lockType && initialType !== "all"
      ? `Create ${singularLabelForType(initialType)}`
      : "Create";
  const pollColleges = useMemo(
    () => colleges.filter((college) => college.universityId === form.universityId),
    [colleges, form.universityId],
  );
  const pollDepartments = useMemo(
    () =>
      departments.filter(
        (department) => department.universityId === form.universityId,
      ),
    [departments, form.universityId],
  );
  const universityMapLocations = useMemo(
    () =>
      mapLocations.filter(
        (location) => location.universityId === form.universityId,
      ),
    [mapLocations, form.universityId],
  );

  function submitForm() {
    startTransition(async () => {
      try {
        const response = await fetch(
          editing
            ? `/api/super-admin/platform-content/${editing.type}/${editing.id}`
            : "/api/super-admin/platform-content",
          {
            method: editing ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(form),
          },
        );
        const data = await parseApiResponse<{ item: PlatformContentItem }>(
          response,
        );

        setItems((current) =>
          editing
            ? current.map((item) => (item.id === data.item.id ? data.item : item))
            : [data.item, ...current],
        );
        setCreateOpen(false);
        setEditing(null);
        setForm(
          defaultForm(
            universities,
            initialType === "all" ? "announcements" : initialType,
          ),
        );
        campusToast.success({
          title: editing ? "Content Updated" : "Content Created",
          description: "The platform content record has been saved.",
        });
      } catch (error) {
        campusToast.error({
          title: "Content Not Saved",
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      }
    });
  }

  function submitPollForm(values: SharedPollFormValues) {
    const payload = pollValuesToPlatformInput(form, values);

    startTransition(async () => {
      try {
        const response = await fetch(
          editing
            ? `/api/super-admin/platform-content/${editing.type}/${editing.id}`
            : "/api/super-admin/platform-content",
          {
            method: editing ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          },
        );
        const data = await parseApiResponse<{ item: PlatformContentItem }>(
          response,
        );

        setItems((current) =>
          editing
            ? current.map((item) => (item.id === data.item.id ? data.item : item))
            : [data.item, ...current],
        );
        setCreateOpen(false);
        setEditing(null);
        setForm(
          defaultForm(
            universities,
            initialType === "all" ? "announcements" : initialType,
          ),
        );
        campusToast.success({
          title: editing ? "Poll Updated" : "Poll Created",
          description: "The poll record has been saved.",
        });
      } catch (error) {
        campusToast.error({
          title: "Poll Not Saved",
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      }
    });
  }

  function deleteItem() {
    if (!deleting) return;

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/super-admin/platform-content/${deleting.type}/${deleting.id}`,
          {
            method: "DELETE",
            credentials: "include",
          },
        );
        await parseApiResponse<{ id: string; type: string }>(response);
        setItems((current) => current.filter((item) => item.id !== deleting.id));
        setDeleting(null);
        campusToast.success({
          title: "Content Deleted",
          description: "The record has been removed from active platform content.",
        });
      } catch (error) {
        campusToast.error({
          title: "Content Not Deleted",
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      }
    });
  }

  return (
    <section className="space-y-6">
      <div
        className={
          suggestionsReadOnly
            ? "grid gap-3 rounded-lg border border-border bg-surface p-4 lg:grid-cols-[minmax(0,1fr)_280px_auto]"
            : lockType
              ? "grid gap-3 rounded-lg border border-border bg-surface p-4 lg:grid-cols-[minmax(0,1fr)_280px_auto_auto]"
              : "grid gap-3 rounded-lg border border-border bg-surface p-4 lg:grid-cols-[minmax(0,1fr)_220px_260px_auto_auto]"
        }
      >
        <label className="relative">
          <span className="sr-only">Search platform content</span>
          <FiSearch
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <CampusInput
            className="pl-9"
            placeholder={
              lockType && initialType !== "all"
                ? `Search ${labelForType(initialType).toLowerCase()}`
                : "Search platform content"
            }
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {!lockType ? (
          <Select
            value={type}
            onValueChange={(value) =>
              setType(value as PlatformContentType | "all")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Select value={universityId} onValueChange={setUniversityId}>
          <SelectTrigger>
            <SelectValue placeholder="University" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Universities</SelectItem>
            {universities.map((university) => (
              <SelectItem key={university.id} value={university.id}>
                {university.name}
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
        {!suggestionsReadOnly ? (
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setForm(
                defaultForm(
                  universities,
                  initialType === "all" ? "announcements" : initialType,
                ),
              );
              setCreateOpen(true);
            }}
          >
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            {createButtonLabel}
          </Button>
        ) : null}
      </div>

      {view === "list" ? (
        <CampusDataTable
          columns={columns}
          data={filtered}
          getRowId={(item) => item.id}
          empty={
            <Empty
              filterName={query || labelForType(type)}
              icon={FiFilter}
              title="No platform content"
              description="Records from universities will appear here once they are created."
            />
          }
        />
      ) : filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="rounded-lg border border-border bg-surface p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    {labelForType(item.type)}
                  </p>
                  <h2 className="mt-2 line-clamp-2 text-base font-semibold text-foreground">
                    {item.title}
                  </h2>
                </div>
                {!suggestionsReadOnly ? (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      type="button"
                      variant="ghost"
                      onClick={() => openEdit(item)}
                    >
                      <FiEdit className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      size="icon"
                      type="button"
                      variant="ghost"
                      onClick={() => setDeleting(item)}
                    >
                      <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                ) : null}
              </div>
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                {item.description || "No description"}
              </p>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    University
                  </dt>
                  <dd className="mt-1 text-foreground">{item.universityName}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    Category
                  </dt>
                  <dd className="mt-1 text-foreground">{item.category}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    Status
                  </dt>
                  <dd className="mt-1 text-foreground">{item.status}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    Date
                  </dt>
                  <dd className="mt-1 text-foreground">
                    {formatDate(item.startsAt ?? item.createdAt)}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-6">
          <Empty
            filterName={query || labelForType(type)}
            icon={FiFilter}
            title="No platform content"
            description="Records from universities will appear here once they are created."
          />
        </div>
      )}

      <Modal
        open={createOpen || Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditing(null);
          }
        }}
        title={`${editing ? "Edit" : "Create"} ${activeContentLabel}`}
        description={`${activeContentLabel} records are platform-wide and can target any university.`}
      >
        {form.type === "polls" ? (
          <PollForm
            key={`${editing?.id ?? "new"}-${form.universityId}`}
            initialValues={pollFormInitialValues(form)}
            collegeOptions={pollColleges}
            departmentOptions={pollDepartments}
            isSubmitting={isPending}
            submitLabel={editing ? "Save Poll" : "Create Poll"}
            onSubmit={submitPollForm}
            beforeFields={
              <>
                {!lockType ? (
                  <label className="space-y-2">
                    <span className="text-sm font-medium">Type</span>
                    <Select
                      value={form.type}
                      disabled={Boolean(editing)}
                      onValueChange={(value) =>
                        updateFormType(value as PlatformContentType)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {createTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                ) : null}
                <label
                  className={`space-y-2 ${lockType ? "md:col-span-2" : ""}`}
                >
                  <span className="text-sm font-medium">University</span>
                  <Select
                    value={form.universityId}
                    disabled={Boolean(editing)}
                    onValueChange={(value) => updateForm("universityId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose university" />
                    </SelectTrigger>
                    <SelectContent>
                      {universities.map((university) => (
                        <SelectItem key={university.id} value={university.id}>
                          {university.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </>
            }
          />
        ) : form.type === "events" ? (
          <EventForm
            key={`${editing?.id ?? "new"}-${form.universityId}`}
            form={form}
            mapLocations={universityMapLocations}
            isSubmitting={isPending}
            submitLabel={editing ? "Save Event" : "Create Event"}
            onFieldChange={updateForm}
            onSubmit={submitForm}
            beforeFields={
              <>
                {!lockType ? (
                  <label className="space-y-2">
                    <span className="text-sm font-medium">Type</span>
                    <Select
                      value={form.type}
                      disabled={Boolean(editing)}
                      onValueChange={(value) =>
                        updateFormType(value as PlatformContentType)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {createTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                ) : null}
                <label
                  className={`space-y-2 ${lockType ? "md:col-span-2" : ""}`}
                >
                  <span className="text-sm font-medium">University</span>
                  <Select
                    value={form.universityId}
                    disabled={Boolean(editing)}
                    onValueChange={(value) => updateForm("universityId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose university" />
                    </SelectTrigger>
                    <SelectContent>
                      {universities.map((university) => (
                        <SelectItem key={university.id} value={university.id}>
                          {university.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </>
            }
          />
        ) : (
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            submitForm();
          }}
        >
          <div className="grid gap-5 md:grid-cols-2">
            {!lockType ? (
              <label className="space-y-2">
                <span className="text-sm font-medium">Type</span>
                <Select
                  value={form.type}
                  disabled={Boolean(editing)}
                  onValueChange={(value) =>
                    updateFormType(value as PlatformContentType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {createTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            ) : null}
            <label
              className={`space-y-2 ${lockType ? "md:col-span-2" : ""}`}
            >
              <span className="text-sm font-medium">University</span>
              <Select
                value={form.universityId}
                disabled={Boolean(editing)}
                onValueChange={(value) => updateForm("universityId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose university" />
                </SelectTrigger>
                <SelectContent>
                  {universities.map((university) => (
                    <SelectItem key={university.id} value={university.id}>
                      {university.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <label
              className={`space-y-2 ${shouldShowCategory(form.type) ? "" : "md:col-span-2"}`}
            >
              <span className="text-sm font-medium">
                {form.type === "map-locations" ||
                form.type === "forums" ||
                form.type === "committees"
                  ? "Name"
                  : "Title"}
              </span>
              <CampusInput
                required
                placeholder={placeholders.title}
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
              />
            </label>
            {shouldShowCategory(form.type) ? (
              <label className="space-y-2">
                <span className="text-sm font-medium">Category</span>
                <Select
                  value={form.category ?? ""}
                  onValueChange={(value) => updateForm("category", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectOptionsWithCurrent(
                      categoryOptions[form.type] ?? ["GENERAL"],
                      form.category,
                    ).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            ) : null}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <label
              className={`space-y-2 ${shouldShowVenue(form.type) ? "" : "md:col-span-2"}`}
            >
              <span className="text-sm font-medium">Status</span>
              <Select
                value={form.status ?? ""}
                onValueChange={(value) => updateForm("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose status" />
                </SelectTrigger>
                <SelectContent>
                  {selectOptionsWithCurrent(
                    statusOptions[form.type],
                    form.status,
                  ).map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            {shouldShowVenue(form.type) ? (
              <label className="space-y-2">
                <span className="text-sm font-medium">Venue Type</span>
                <Select
                  value={form.venueMode ?? "OUTSIDE"}
                  onValueChange={(value) => {
                    const venueMode =
                      value as NonNullable<PlatformContentInput["venueMode"]>;

                    updateForm("venueMode", venueMode);
                    if (venueMode === "UNIVERSITY_POINT") {
                      updateForm("venue", "");
                    } else {
                      updateForm("locationId", "");
                      updateForm("locationName", "");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose venue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNIVERSITY_POINT">
                      University map point
                    </SelectItem>
                    <SelectItem value="OUTSIDE">Outside university</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            ) : null}
          </div>
          {shouldShowVenue(form.type) ? (
            form.venueMode === "UNIVERSITY_POINT" ? (
              <div className="space-y-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">
                    University Location Point
                  </span>
                  <Select
                    value={form.locationId ?? ""}
                    onValueChange={(value) => {
                      const selected = universityMapLocations.find(
                        (location) => location.id === value,
                      );

                      updateForm("locationId", value);
                      updateForm("locationName", selected?.name ?? "");
                      updateForm("venue", selected?.name ?? "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a university map point" />
                    </SelectTrigger>
                    <SelectContent>
                      {universityMapLocations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                {universityMapLocations.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No active map points are available for the selected university
                    yet.
                  </p>
                ) : null}
              </div>
            ) : (
              <label className="space-y-2">
                <span className="text-sm font-medium">Outside Venue</span>
                <CampusInput
                  placeholder={placeholders.venue}
                  value={form.venue ?? ""}
                  onChange={(event) => updateForm("venue", event.target.value)}
                />
              </label>
            )
          ) : null}
          <label className="space-y-2">
            <span className="text-sm font-medium">Description</span>
            <CampusTextarea
              placeholder={placeholders.description}
              value={form.description ?? ""}
              onChange={(event) => updateForm("description", event.target.value)}
            />
          </label>
          {shouldShowSchedule(form.type) ? (
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium">Start Date</span>
                <CampusInput
                  type="datetime-local"
                  value={form.startsAt ?? ""}
                  onChange={(event) =>
                    updateForm("startsAt", event.target.value)
                  }
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">End Date</span>
                <CampusInput
                  type="datetime-local"
                  value={form.endsAt ?? ""}
                  onChange={(event) => updateForm("endsAt", event.target.value)}
                />
              </label>
            </div>
          ) : null}
          {shouldShowCoordinates(form.type) ? (
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium">Latitude</span>
                <CampusInput
                  placeholder="e.g. -6.7704"
                  type="number"
                  step="any"
                  value={String(form.latitude ?? 0)}
                  onChange={(event) =>
                    updateForm("latitude", Number(event.target.value))
                  }
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Longitude</span>
                <CampusInput
                  placeholder="e.g. 39.2410"
                  type="number"
                  step="any"
                  value={String(form.longitude ?? 0)}
                  onChange={(event) =>
                    updateForm("longitude", Number(event.target.value))
                  }
                />
              </label>
            </div>
          ) : null}
          <Button className="w-full" disabled={isPending} type="submit">
            {editing ? "Save Changes" : `Create ${activeContentLabel}`}
          </Button>
        </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete platform content"
        description="This removes the record from active platform content across the platform."
        confirmLabel="Delete"
        onConfirm={deleteItem}
      />
    </section>
  );
}
