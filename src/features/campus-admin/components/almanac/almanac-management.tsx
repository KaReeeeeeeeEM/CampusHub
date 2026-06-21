"use client";

import type {
  EventClickArg,
  EventInput as FullCalendarEventInput,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, {
  type DateClickArg,
} from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEdit,
  FiEye,
  FiGrid,
  FiList,
  FiLoader,
  FiPlus,
  FiSearch,
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

const eventTypes = [
  "SEMESTER_START",
  "SEMESTER_END",
  "REGISTRATION",
  "EXAMINATION",
  "GRADUATION",
  "ORIENTATION",
  "HOLIDAY",
  "WORKSHOP",
  "GENERAL",
] as const;
const statuses = ["ACTIVE", "ARCHIVED", "CANCELLED"] as const;
const visibilityOptions = [
  "ALL_USERS",
  "STUDENTS",
  "TEACHERS",
  "SPECIFIC_COLLEGES",
] as const;
const deadlineTypes = [
  "GENERAL",
  "REGISTRATION",
  "PAYMENT",
  "SUBMISSION",
  "EXAMINATION",
] as const;
const academicYearOptions = [
  "2025/2026",
  "2026/2027",
  "2027/2028",
  "2028/2029",
  "2029/2030",
] as const;
const semesterOptions = [
  "Semester 1",
  "Semester 2",
  "Semester 3",
  "Trimester 1",
  "Trimester 2",
  "Trimester 3",
  "Annual",
] as const;

export type AlmanacEvent = {
  id: string;
  almanacId?: string | null;
  title: string;
  description: string | null;
  eventType: string;
  startDate: string | null;
  endDate: string | null;
  isAllDay: boolean;
  isDeadline?: boolean;
  deadlineType?: string | null;
  visibility: string;
  color: string;
  status: string;
};

export type CampusAdminAlmanac = {
  id: string;
  universityId: string;
  title: string;
  description: string | null;
  academicYear: string | null;
  semester: string | null;
  status: string;
  eventCount: number;
  deadlineCount: number;
  createdAt: string | null;
  updatedAt: string | null;
  events: AlmanacEvent[];
};

const almanacSchema = z.object({
  title: z.string().min(3, "Title is required."),
  academicYear: z.string().min(4, "Academic year is required."),
  semester: z.string().min(2, "Semester is required."),
  description: z.string().min(10, "Description is required."),
  status: z.enum(["ACTIVE", "ARCHIVED"]),
});

const eventSchema = z.object({
  title: z.string().min(2, "Title is required."),
  type: z.enum(eventTypes),
  entryKind: z.enum(["EVENT", "DEADLINE"]),
  deadlineType: z.enum(deadlineTypes),
  date: z.string().min(1, "Start date is required."),
  endDate: z.string().optional(),
  audience: z.enum(visibilityOptions),
  status: z.enum(statuses),
  description: z.string().min(10, "Description is required."),
});

type AlmanacInput = z.infer<typeof almanacSchema>;
type EventInput = z.infer<typeof eventSchema>;
type AlmanacViewMode = "calendar" | "timeline" | "cards" | "list";

const viewOptions = [
  { value: "calendar", label: "Calendar view", icon: FiCalendar },
  { value: "timeline", label: "Timeline view", icon: FiClock },
  { value: "cards", label: "Card view", icon: FiGrid },
  { value: "list", label: "List view", icon: FiList },
] satisfies Array<{
  value: AlmanacViewMode;
  label: string;
  icon: typeof FiList;
}>;

function getEventDate(event: AlmanacEvent) {
  return event.startDate ?? event.endDate ?? "";
}

function periodLabel(almanac: CampusAdminAlmanac) {
  return [almanac.academicYear, almanac.semester].filter(Boolean).join(" · ");
}

function eventDateLabel(event: AlmanacEvent) {
  const start = getEventDate(event);
  if (!start) return "Date not set";

  const startLabel = new Date(start).toLocaleDateString();
  if (!event.endDate || event.endDate.slice(0, 10) === start.slice(0, 10)) {
    return startLabel;
  }

  return `${startLabel} - ${new Date(event.endDate).toLocaleDateString()}`;
}

function sameCalendarDay(a: string, b: string) {
  return a.slice(0, 10) === b.slice(0, 10);
}

function normalizeEvent(event: AlmanacEvent): AlmanacEvent {
  return {
    ...event,
    description: event.description ?? "",
    endDate: event.endDate ?? event.startDate,
    isDeadline: Boolean(event.isDeadline),
    deadlineType: event.deadlineType ?? null,
  };
}

function normalizeAlmanac(almanac: CampusAdminAlmanac): CampusAdminAlmanac {
  const events = almanac.events.map(normalizeEvent);

  return {
    ...almanac,
    description: almanac.description ?? "",
    events,
    eventCount: events.length,
    deadlineCount: events.filter((event) => event.isDeadline).length,
  };
}

function applyActiveAlmanac(
  current: CampusAdminAlmanac[],
  activeAlmanac: CampusAdminAlmanac,
) {
  return current.map((almanac) =>
    almanac.id === activeAlmanac.id
      ? normalizeAlmanac(activeAlmanac)
      : almanac.status === "ACTIVE"
        ? { ...almanac, status: "ARCHIVED" }
        : almanac,
  );
}

function getAlmanacPayload(values: AlmanacInput) {
  return {
    title: values.title,
    academicYear: values.academicYear,
    semester: values.semester,
    description: values.description,
    status: values.status,
  };
}

function getEventPayload(values: EventInput, almanac: CampusAdminAlmanac) {
  const endDate = values.endDate || values.date;

  return {
    title: values.title,
    description: values.description,
    eventType: values.type,
    startDate: values.date,
    endDate,
    isAllDay: true,
    visibility: values.audience,
    status: values.status,
    academicYear: almanac.academicYear,
    semester: almanac.semester,
    isDeadline: values.entryKind === "DEADLINE",
    deadlineType: values.entryKind === "DEADLINE" ? values.deadlineType : null,
  };
}

async function readApiData<T>(response: Response) {
  const payload = (await response.json()) as { data?: T; error?: { message?: string } };

  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "The request could not be completed.");
  }

  return payload.data;
}

function AlmanacShellForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (values: AlmanacInput) => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AlmanacInput>({
    resolver: zodResolver(almanacSchema),
    defaultValues: {
      title: "",
      academicYear: "2026/2027",
      semester: "Semester 1",
      description: "",
      status: "ACTIVE",
    },
  });

  return (
    <form className="space-y-7" onSubmit={handleSubmit(onSubmit)}>
      <label className="block space-y-3">
        <span className="text-sm font-medium">Title</span>
        <CampusInput
          {...register("title")}
          invalid={Boolean(errors.title)}
          placeholder="e.g. 2026/2027 Academic Almanac"
        />
      </label>
      <div className="grid gap-6 md:grid-cols-2">
        <label className="block space-y-3">
          <span className="text-sm font-medium">Academic Year</span>
          <Select
            value={watch("academicYear")}
            onValueChange={(value) =>
              setValue("academicYear", value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger data-invalid={Boolean(errors.academicYear)}>
              <SelectValue placeholder="Select academic year" />
            </SelectTrigger>
            <SelectContent>
              {academicYearOptions.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="block space-y-3">
          <span className="text-sm font-medium">Semester</span>
          <Select
            value={watch("semester")}
            onValueChange={(value) =>
              setValue("semester", value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger data-invalid={Boolean(errors.semester)}>
              <SelectValue placeholder="Select semester" />
            </SelectTrigger>
            <SelectContent>
              {semesterOptions.map((semester) => (
                <SelectItem key={semester} value={semester}>
                  {semester}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>
      <label className="block space-y-3">
        <span className="text-sm font-medium">Status</span>
        <Select
          value={watch("status")}
          onValueChange={(value) =>
            setValue("status", value as AlmanacInput["status"], {
              shouldDirty: true,
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
            <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
          </SelectContent>
        </Select>
      </label>
      <label className="block space-y-3">
        <span className="text-sm font-medium">Description</span>
        <CampusTextarea
          {...register("description")}
          className="min-h-40"
          invalid={Boolean(errors.description)}
          placeholder="Describe the scope of this almanac."
        />
      </label>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        Create Almanac
      </Button>
    </form>
  );
}

function AlmanacEntryForm({
  event,
  onSubmit,
  isSubmitting,
  lockedDate,
}: {
  event?: AlmanacEvent;
  onSubmit: (values: EventInput) => void;
  isSubmitting: boolean;
  lockedDate?: string;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event?.title ?? "",
      type: (event?.eventType as EventInput["type"]) ?? "GENERAL",
      entryKind: event?.isDeadline ? "DEADLINE" : "EVENT",
      deadlineType: (event?.deadlineType as EventInput["deadlineType"]) ?? "GENERAL",
      date: lockedDate ?? (event ? getEventDate(event).slice(0, 10) : ""),
      endDate: event?.endDate?.slice(0, 10) ?? lockedDate ?? "",
      audience: (event?.visibility as EventInput["audience"]) ?? "ALL_USERS",
      status: (event?.status as EventInput["status"]) ?? "ACTIVE",
      description: event?.description ?? "",
    },
  });
  const entryKind = watch("entryKind");

  return (
    <form className="space-y-7" onSubmit={handleSubmit(onSubmit)}>
      <label className="block space-y-3">
        <span className="text-sm font-medium">Title</span>
        <CampusInput
          {...register("title")}
          invalid={Boolean(errors.title)}
          placeholder="e.g. Course registration closes"
        />
      </label>
      <div className="grid gap-6 md:grid-cols-2">
        <label className="block space-y-3">
          <span className="text-sm font-medium">Event Type</span>
          <Select
            value={watch("type")}
            onValueChange={(value) =>
              setValue("type", value as EventInput["type"], {
                shouldDirty: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {eventTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="block space-y-3">
          <span className="text-sm font-medium">Entry Kind</span>
          <Select
            value={entryKind}
            onValueChange={(value) =>
              setValue("entryKind", value as EventInput["entryKind"], {
                shouldDirty: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EVENT">Event</SelectItem>
              <SelectItem value="DEADLINE">Deadline</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </div>
      {entryKind === "DEADLINE" ? (
        <label className="block space-y-3">
          <span className="text-sm font-medium">Deadline Type</span>
          <Select
            value={watch("deadlineType")}
            onValueChange={(value) =>
              setValue("deadlineType", value as EventInput["deadlineType"], {
                shouldDirty: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {deadlineTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      ) : null}
      <div className="grid gap-6 md:grid-cols-2">
        <label className="block space-y-3">
          <span className="text-sm font-medium">Start Date</span>
          <CampusInput
            {...register("date")}
            type="date"
            disabled={Boolean(lockedDate)}
            invalid={Boolean(errors.date)}
          />
        </label>
        <label className="block space-y-3">
          <span className="text-sm font-medium">End Date</span>
          <CampusInput {...register("endDate")} type="date" />
        </label>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <label className="block space-y-3">
          <span className="text-sm font-medium">Visibility</span>
          <Select
            value={watch("audience")}
            onValueChange={(value) =>
              setValue("audience", value as EventInput["audience"], {
                shouldDirty: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {visibilityOptions.map((visibility) => (
                <SelectItem key={visibility} value={visibility}>
                  {visibility}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="block space-y-3">
          <span className="text-sm font-medium">Status</span>
          <Select
            value={watch("status")}
            onValueChange={(value) =>
              setValue("status", value as EventInput["status"], {
                shouldDirty: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>
      <label className="block space-y-3">
        <span className="text-sm font-medium">Description</span>
        <CampusTextarea
          {...register("description")}
          className="min-h-40"
          invalid={Boolean(errors.description)}
          placeholder="Add notes, instructions, or deadline details."
        />
      </label>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        {event ? "Save Changes" : "Add Almanac Entry"}
      </Button>
    </form>
  );
}

function AlmanacEventCard({
  event,
  onView,
  onEdit,
  onDelete,
}: {
  event: AlmanacEvent;
  onView: (event: AlmanacEvent) => void;
  onEdit: (event: AlmanacEvent) => void;
  onDelete: (event: AlmanacEvent) => void;
}) {
  return (
    <article className="group flex h-full flex-col rounded-xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FiCalendar className="h-4 w-4" aria-hidden="true" />
        </span>
        <AdminActionMenu
          items={[
            { label: "View", icon: FiEye, onSelect: () => onView(event) },
            { label: "Edit", icon: FiEdit, onSelect: () => onEdit(event) },
            {
              label: "Delete",
              icon: FiTrash2,
              destructive: true,
              onSelect: () => onDelete(event),
            },
          ]}
        />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
        {event.isDeadline ? "Deadline" : event.eventType.replaceAll("_", " ")}
      </p>
      <h3 className="mt-2 text-base font-semibold">{event.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
        {event.description}
      </p>
      <div className="mt-auto pt-5 text-sm text-muted-foreground">
        <p>{eventDateLabel(event)}</p>
        <p>{event.visibility}</p>
      </div>
    </article>
  );
}

export function AlmanacManagement({
  initialAlmanacs,
}: {
  initialAlmanacs: CampusAdminAlmanac[];
}) {
  const [almanacs, setAlmanacs] = useState(() =>
    initialAlmanacs.map(normalizeAlmanac),
  );
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<AlmanacViewMode>("calendar");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialAlmanacs[0]?.id ?? null,
  );
  const [step, setStep] = useState<"almanacs" | "detail">("almanacs");
  const [createOpen, setCreateOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewing, setViewing] = useState<AlmanacEvent | null>(null);
  const [editing, setEditing] = useState<AlmanacEvent | null>(null);
  const [deleting, setDeleting] = useState<AlmanacEvent | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedAlmanac =
    almanacs.find((almanac) => almanac.id === selectedId) ?? null;
  const normalizedQuery = query.toLowerCase().trim();
  const filteredAlmanacs = useMemo(() => {
    if (!normalizedQuery) return almanacs;
    return almanacs.filter((almanac) =>
      [almanac.title, almanac.academicYear, almanac.semester, almanac.description]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [almanacs, normalizedQuery]);
  const filteredEvents = useMemo(() => {
    const events = selectedAlmanac?.events ?? [];
    if (!normalizedQuery || step === "almanacs") return events;
    return events.filter((event) =>
      [event.title, event.eventType, event.visibility, event.status]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [normalizedQuery, selectedAlmanac?.events, step]);
  const calendarEvents = useMemo<FullCalendarEventInput[]>(
    () =>
      filteredEvents.map((event) => ({
        id: event.id,
        title: event.title,
        start: getEventDate(event).slice(0, 10),
        end: event.endDate?.slice(0, 10),
        allDay: true,
        extendedProps: {
          type: event.eventType,
          status: event.status,
          audience: event.visibility,
        },
        classNames: [
          event.status === "CANCELLED"
            ? "campushub-calendar-event-draft"
            : event.isDeadline || event.eventType === "REGISTRATION"
              ? "campushub-calendar-event-deadline"
              : event.eventType === "EXAMINATION"
                ? "campushub-calendar-event-exam"
                : "campushub-calendar-event-default",
        ],
      })),
    [filteredEvents],
  );
  const selectedDateEvents =
    selectedDate && selectedAlmanac
      ? selectedAlmanac.events.filter((event) =>
          sameCalendarDay(getEventDate(event), selectedDate),
        )
      : [];
  const timelineEvents = [...filteredEvents].sort(
    (a, b) =>
      new Date(getEventDate(a)).getTime() - new Date(getEventDate(b)).getTime(),
  );

  function openAlmanac(almanacId: string) {
    setSelectedId(almanacId);
    setStep("detail");
    setQuery("");
  }

  function openCalendarDate(arg: DateClickArg) {
    setSelectedDate(arg.dateStr);
  }

  function openCalendarEvent(arg: EventClickArg) {
    const event = selectedAlmanac?.events.find((item) => item.id === arg.event.id);
    if (event) setViewing(event);
  }

  function createAlmanac(values: AlmanacInput) {
    startTransition(async () => {
      try {
        const response = await fetch("/api/campus-admin/almanacs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(getAlmanacPayload(values)),
        });
        const data = await readApiData<{ almanac: CampusAdminAlmanac }>(response);
        const almanac = normalizeAlmanac(data.almanac);

        setAlmanacs((current) =>
          almanac.status === "ACTIVE"
            ? [almanac, ...applyActiveAlmanac(current, almanac)]
            : [almanac, ...current],
        );
        setSelectedId(almanac.id);
        setStep("detail");
        setCreateOpen(false);
        campusToast.success({
          title: "Almanac Created",
          description: "You can now add dated entries to this almanac.",
        });
      } catch (error) {
        campusToast.error({
          title: "Almanac Not Created",
          description:
            error instanceof Error ? error.message : "The almanac could not be saved.",
        });
      }
    });
  }

  function activateAlmanac(almanac: CampusAdminAlmanac) {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/campus-admin/almanacs/${almanac.id}`, {
          method: "PATCH",
        });
        const data = await readApiData<{ almanac: CampusAdminAlmanac }>(response);
        const activeAlmanac = normalizeAlmanac(data.almanac);

        setAlmanacs((current) => applyActiveAlmanac(current, activeAlmanac));
        setSelectedId(activeAlmanac.id);
        campusToast.success({
          title: "Active Almanac Updated",
          description: `${activeAlmanac.title} is now the active almanac.`,
        });
      } catch (error) {
        campusToast.error({
          title: "Almanac Not Activated",
          description:
            error instanceof Error
              ? error.message
              : "The almanac could not be activated.",
        });
      }
    });
  }

  function createEvent(values: EventInput) {
    if (!selectedAlmanac) return;

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/campus-admin/almanacs/${selectedAlmanac.id}/events`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(getEventPayload(values, selectedAlmanac)),
          },
        );
        const data = await readApiData<{ event: AlmanacEvent }>(response);
        const event = normalizeEvent(data.event);

        setAlmanacs((current) =>
          current.map((almanac) =>
            almanac.id === selectedAlmanac.id
              ? normalizeAlmanac({
                  ...almanac,
                  events: [...almanac.events, event],
                })
              : almanac,
          ),
        );
        setEntryOpen(false);
        setSelectedDate(null);
        campusToast.success({
          title: "Almanac Entry Added",
          description: "The entry has been saved on this almanac.",
        });
      } catch (error) {
        campusToast.error({
          title: "Entry Not Created",
          description:
            error instanceof Error ? error.message : "The entry could not be saved.",
        });
      }
    });
  }

  function updateEvent(values: EventInput) {
    if (!editing || !selectedAlmanac) return;
    startTransition(async () => {
      const response = await fetch(`/api/almanac/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getEventPayload(values, selectedAlmanac)),
      });

      if (!response.ok) {
        campusToast.error({
          title: "Event Not Updated",
          description: "The almanac entry could not be saved.",
        });
        return;
      }

      const payload = (await response.json()) as { data?: { event: AlmanacEvent } };
      const updatedEvent = normalizeEvent(payload.data?.event ?? editing);
      setAlmanacs((current) =>
        current.map((almanac) =>
          almanac.id === selectedAlmanac.id
            ? normalizeAlmanac({
                ...almanac,
                events: almanac.events.map((event) =>
                  event.id === editing.id ? updatedEvent : event,
                ),
              })
            : almanac,
        ),
      );
      setEditing(null);
      campusToast.success({
        title: "Almanac Entry Updated",
        description: "The academic calendar entry was updated.",
      });
    });
  }

  const almanacColumns: DataTableColumn<CampusAdminAlmanac>[] = [
    {
      key: "title",
      header: "Almanac",
      cell: (almanac) => (
        <div>
          <p className="font-semibold">{almanac.title}</p>
          <p className="text-sm text-muted-foreground">
            {almanac.description || "No description"}
          </p>
        </div>
      ),
    },
    { key: "academicYear", header: "Academic Year" },
    { key: "semester", header: "Semester" },
    { key: "eventCount", header: "Entries" },
    { key: "deadlineCount", header: "Deadlines" },
    { key: "status", header: "Status" },
    {
      key: "actions",
      header: "Actions",
      cell: (almanac) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => openAlmanac(almanac.id)}
          >
            Open
          </Button>
          <AdminActionMenu
            items={[
              {
                label:
                  almanac.status === "ACTIVE" ? "Already Active" : "Set Active",
                icon: FiCheckCircle,
                onSelect: () => {
                  if (almanac.status !== "ACTIVE") activateAlmanac(almanac);
                },
              },
            ]}
          />
        </div>
      ),
    },
  ];
  const eventColumns: DataTableColumn<AlmanacEvent>[] = [
    { key: "title", header: "Entry" },
    {
      key: "kind",
      header: "Kind",
      cell: (event) => (event.isDeadline ? "Deadline" : "Event"),
    },
    {
      key: "date",
      header: "Date",
      cell: eventDateLabel,
    },
    { key: "visibility", header: "Visibility" },
    { key: "status", header: "Status" },
    {
      key: "actions",
      header: "Actions",
      className: "w-16 text-right",
      cell: (event) => (
        <AdminActionMenu
          items={[
            { label: "View", icon: FiEye, onSelect: () => setViewing(event) },
            { label: "Edit", icon: FiEdit, onSelect: () => setEditing(event) },
            {
              label: "Delete",
              icon: FiTrash2,
              destructive: true,
              onSelect: () => setDeleting(event),
            },
          ]}
        />
      ),
    },
  ];

  function renderDetailView() {
    if (!selectedAlmanac) return null;

    if (viewMode === "calendar") {
      return (
        <section className="campushub-calendar rounded-xl border border-border bg-surface p-4">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={calendarEvents}
            dateClick={openCalendarDate}
            eventClick={openCalendarEvent}
            headerToolbar={{
              left: "prevYear,prev today next,nextYear",
              center: "title",
              right: "",
            }}
            buttonText={{ today: "Today" }}
            fixedWeekCount={false}
            height="auto"
            dayMaxEventRows={3}
            moreLinkClick="popover"
            selectable
            selectMirror
            firstDay={1}
          />
        </section>
      );
    }

    if (viewMode === "timeline") {
      return timelineEvents.length > 0 ? (
        <section className="rounded-xl border border-border bg-surface p-5">
          <div className="space-y-6">
            {timelineEvents.map((event) => (
              <div key={event.id} className="relative flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <FiCalendar className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="mt-2 h-full w-px bg-border" />
                </div>
                <button
                  className="flex-1 rounded-lg border border-border bg-background p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  type="button"
                  onClick={() => setViewing(event)}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                    {eventDateLabel(event)} · {event.isDeadline ? "Deadline" : "Event"}
                  </p>
                  <h3 className="mt-2 font-semibold">{event.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {event.description}
                  </p>
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          title="No timeline entries"
          description="Click a calendar date or use Add Entry to register one."
          className="mx-auto border-0 bg-transparent"
        />
      );
    }

    if (viewMode === "cards") {
      return filteredEvents.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredEvents.map((event) => (
            <AlmanacEventCard
              key={event.id}
              event={event}
              onView={setViewing}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No almanac cards"
          description="Click a calendar date or use Add Entry to register one."
          className="mx-auto border-0 bg-transparent"
        />
      );
    }

    return (
      <CampusDataTable
        columns={eventColumns}
        data={filteredEvents}
        getRowId={(event) => event.id}
        empty={
          <EmptyState
            title="No almanac entries"
            description="Click a calendar date or use Add Entry to register one."
            className="mx-auto border-0 bg-transparent"
          />
        }
      />
    );
  }

  return (
    <>
      <section className="mt-8 space-y-6">
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <FiSearch
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <CampusInput
              className="pl-11"
              placeholder={step === "almanacs" ? "Search almanacs" : "Search entries"}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {step === "almanacs" ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <FiPlus className="h-4 w-4" aria-hidden="true" />
              Create Almanac
            </Button>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <CampusViewToggle
                value={viewMode}
                options={viewOptions}
                onValueChange={setViewMode}
              />
              <Button type="button" onClick={() => setEntryOpen(true)}>
                <FiPlus className="h-4 w-4" aria-hidden="true" />
                Add Entry
              </Button>
            </div>
          )}
        </div>

        {step === "almanacs" ? (
          <div className="space-y-5">
            <CampusDataTable
              columns={almanacColumns}
              data={filteredAlmanacs}
              getRowId={(almanac) => almanac.id}
              empty={
                <EmptyState
                  title={query ? "No matching almanacs" : "No almanacs yet"}
                  description="Create an academic almanac before adding events and deadlines."
                  className="mx-auto border-0 bg-transparent"
                />
              }
            />
          </div>
        ) : null}

        {step === "detail" ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <Button type="button" variant="secondary" onClick={() => setStep("almanacs")}>
                    <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Almanacs
                  </Button>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                    {selectedAlmanac ? periodLabel(selectedAlmanac) : "Almanac"}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {selectedAlmanac?.title ?? "No almanac selected"}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Click a calendar date to add an entry, or switch to timeline, card, or list view.
                  </p>
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-2 lg:min-w-72">
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-xs uppercase text-muted-foreground">Entries</p>
                    <p className="mt-1 font-semibold">{selectedAlmanac?.eventCount ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-xs uppercase text-muted-foreground">Deadlines</p>
                    <p className="mt-1 font-semibold">{selectedAlmanac?.deadlineCount ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>
            {selectedAlmanac ? renderDetailView() : null}
          </div>
        ) : null}
      </section>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Almanac"
        description="Create the academic calendar shell before adding dated entries."
        className="max-w-3xl"
      >
        <AlmanacShellForm onSubmit={createAlmanac} isSubmitting={isPending} />
      </Modal>
      <Modal
        open={entryOpen}
        onOpenChange={setEntryOpen}
        title="Add Almanac Entry"
        description={selectedAlmanac?.title}
        className="max-w-3xl"
      >
        {selectedAlmanac ? (
          <AlmanacEntryForm onSubmit={createEvent} isSubmitting={isPending} />
        ) : null}
      </Modal>
      <Drawer
        open={Boolean(selectedDate)}
        onOpenChange={(open) => !open && setSelectedDate(null)}
        title={
          selectedDate
            ? new Date(selectedDate).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })
            : "Calendar date"
        }
        description="Review scheduled items or add a new almanac event for this date."
        className="max-w-xl"
      >
        {selectedDate ? (
          <div className="space-y-7">
            <div className="space-y-3">
              {selectedDateEvents.length > 0 ? (
                selectedDateEvents.map((event) => (
                  <button
                    key={event.id}
                    className="w-full rounded-lg border border-border bg-background p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                    type="button"
                    onClick={() => setViewing(event)}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                      {event.isDeadline ? "Deadline" : event.eventType.replaceAll("_", " ")}
                    </p>
                    <h3 className="mt-2 text-sm font-semibold">{event.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.visibility}
                    </p>
                  </button>
                ))
              ) : (
                <EmptyState
                  title="No events on this date"
                  description="Use the form below to schedule an academic date or activity."
                  className="border-0 bg-transparent p-0"
                />
              )}
            </div>
            <div className="border-t border-border pt-7">
              <AlmanacEntryForm
                lockedDate={selectedDate}
                onSubmit={createEvent}
                isSubmitting={isPending}
              />
            </div>
          </div>
        ) : null}
      </Drawer>
      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit Almanac Entry"
        className="max-w-3xl"
      >
        {editing ? (
          <AlmanacEntryForm
            event={editing}
            onSubmit={updateEvent}
            isSubmitting={isPending}
          />
        ) : null}
      </Modal>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.title ?? "Almanac entry"}
        description={viewing?.eventType.replaceAll("_", " ")}
      >
        {viewing ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                {viewing.isDeadline ? "Deadline" : "Event"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {eventDateLabel(viewing)}
              </p>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {viewing.description || "No description provided."}
            </p>
          </div>
        ) : null}
      </Drawer>
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete Almanac Entry"
        description={`Delete ${deleting?.title ?? "this entry"}?`}
        destructive
        onConfirm={() => {
          if (!deleting || !selectedAlmanac) return;

          startTransition(async () => {
            const response = await fetch(`/api/almanac/${deleting.id}`, {
              method: "DELETE",
            });

            if (!response.ok) {
              campusToast.error({
                title: "Entry Not Removed",
                description: "The almanac entry could not be removed.",
              });
              return;
            }

            setAlmanacs((current) =>
              current.map((almanac) =>
                almanac.id === selectedAlmanac.id
                  ? normalizeAlmanac({
                      ...almanac,
                      events: almanac.events.filter(
                        (event) => event.id !== deleting.id,
                      ),
                    })
                  : almanac,
              ),
            );
            setDeleting(null);
            campusToast.warning({
              title: "Almanac Entry Removed",
              description: "The almanac entry was removed.",
            });
          });
        }}
      />
    </>
  );
}
