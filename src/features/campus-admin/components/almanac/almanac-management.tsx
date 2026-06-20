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
  FiCalendar,
  FiClock,
  FiEdit,
  FiEye,
  FiGrid,
  FiImage,
  FiList,
  FiLoader,
  FiPlus,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";
import { z } from "zod";

import {
  CampusDataTable,
  CampusFileUpload,
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

type AlmanacEvent = {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  startDate: string | null;
  endDate: string | null;
  isAllDay: boolean;
  visibility: string;
  color: string;
  status: string;
  image?: string | null;
};

const eventSchema = z.object({
  title: z.string().min(2, "Title is required."),
  type: z.enum(eventTypes),
  date: z.string().min(1, "Date is required."),
  audience: z.enum(visibilityOptions),
  status: z.enum(statuses),
  description: z.string().min(10, "Description is required."),
  image: z.string().optional(),
});

type EventInput = z.infer<typeof eventSchema>;

function getEventDate(event: AlmanacEvent) {
  return event.startDate ?? event.endDate ?? "";
}

function getEventPayload(values: EventInput) {
  return {
    title: values.title,
    description: values.description,
    eventType: values.type,
    startDate: values.date,
    endDate: values.date,
    isAllDay: true,
    visibility: values.audience,
    status: values.status,
  };
}

function normalizeEvent(event: AlmanacEvent): AlmanacEvent {
  return {
    ...event,
    description: event.description ?? "",
    endDate: event.endDate ?? event.startDate,
  };
}

function AlmanacForm({
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
      date: lockedDate ?? (event ? getEventDate(event).slice(0, 10) : ""),
      audience: (event?.visibility as EventInput["audience"]) ?? "ALL_USERS",
      status: (event?.status as EventInput["status"]) ?? "ACTIVE",
      description: event?.description ?? "",
      image: event?.image ?? "",
    },
  });
  const image = watch("image");

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Title</span>
          <CampusInput
            {...register("title")}
            invalid={Boolean(errors.title)}
            placeholder="Semester registration deadline"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Type</span>
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
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Date</span>
          <CampusInput
            {...register("date")}
            type="date"
            invalid={Boolean(errors.date)}
            placeholder="Select event date"
            disabled={Boolean(lockedDate)}
          />
        </label>
        <label className="space-y-2">
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
        <label className="space-y-2">
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
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Description</span>
          <CampusTextarea
            {...register("description")}
            invalid={Boolean(errors.description)}
            placeholder="Describe the date, deadline, or academic activity."
          />
        </label>
        <CampusFileUpload
          className="md:col-span-2"
          label="Event Image"
          value={image}
          error={errors.image?.message}
          onValueChange={(value) =>
            setValue("image", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </div>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        {event ? "Save Changes" : "Create Event"}
      </Button>
    </form>
  );
}

type AlmanacViewMode = "table" | "cards" | "calendar" | "timeline";

const viewOptions = [
  { value: "table", label: "Table view", icon: FiList },
  { value: "cards", label: "Card view", icon: FiGrid },
  { value: "calendar", label: "Calendar view", icon: FiCalendar },
  { value: "timeline", label: "Timeline view", icon: FiClock },
] satisfies Array<{
  value: AlmanacViewMode;
  label: string;
  icon: typeof FiList;
}>;

function sameCalendarDay(a: string, b: string) {
  return a.slice(0, 10) === b.slice(0, 10);
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
          {event.image ? (
            <FiImage className="h-4 w-4" aria-hidden="true" />
          ) : (
            <FiCalendar className="h-4 w-4" aria-hidden="true" />
          )}
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
        {event.eventType}
      </p>
      <h3 className="mt-2 text-base font-semibold">{event.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
        {event.description}
      </p>
      <div className="mt-auto pt-5 text-sm text-muted-foreground">
        <p>{new Date(getEventDate(event)).toLocaleDateString()}</p>
        <p>{event.visibility}</p>
      </div>
    </article>
  );
}

export function AlmanacManagement({
  initialEvents,
}: {
  initialEvents: AlmanacEvent[];
}) {
  const [events, setEvents] = useState(() => initialEvents.map(normalizeEvent));
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<AlmanacViewMode>("table");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewing, setViewing] = useState<AlmanacEvent | null>(null);
  const [editing, setEditing] = useState<AlmanacEvent | null>(null);
  const [deleting, setDeleting] = useState<AlmanacEvent | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return events;
    return events.filter((event) =>
      [event.title, event.eventType, event.visibility, event.status]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [events, query]);

  const calendarEvents = useMemo<FullCalendarEventInput[]>(
    () =>
      filtered.map((event) => ({
        id: event.id,
        title: event.title,
        start: getEventDate(event).slice(0, 10),
        allDay: true,
        extendedProps: {
          type: event.eventType,
          status: event.status,
          audience: event.visibility,
        },
        classNames: [
          event.status === "CANCELLED"
            ? "campushub-calendar-event-draft"
            : event.eventType === "REGISTRATION"
              ? "campushub-calendar-event-deadline"
              : event.eventType === "EXAMINATION"
                ? "campushub-calendar-event-exam"
                : "campushub-calendar-event-default",
        ],
      })),
    [filtered],
  );
  const selectedDateEvents = selectedDate
    ? events.filter((event) => sameCalendarDay(getEventDate(event), selectedDate))
    : [];
  const timelineEvents = [...filtered].sort(
    (a, b) => new Date(getEventDate(a)).getTime() - new Date(getEventDate(b)).getTime(),
  );

  function openCalendarDate(arg: DateClickArg) {
    setSelectedDate(arg.dateStr);
  }

  function openCalendarEvent(arg: EventClickArg) {
    const event = events.find((item) => item.id === arg.event.id);
    if (event) {
      setViewing(event);
    }
  }

  function createEvent(values: EventInput) {
    startTransition(async () => {
      const response = await fetch("/api/almanac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getEventPayload(values)),
      });

      if (!response.ok) {
        campusToast.error({
          title: "Event Not Created",
          description: "The almanac event could not be saved.",
        });
        return;
      }

      const event = normalizeEvent(await response.json());
      setEvents((current) => [event, ...current]);
      setCreateOpen(false);
      campusToast.success({
        title: "Almanac Event Created",
        description: "The academic calendar event was saved.",
      });
    });
  }

  function updateEvent(values: EventInput) {
    if (!editing) return;
    startTransition(async () => {
      const response = await fetch(`/api/almanac/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getEventPayload(values)),
      });

      if (!response.ok) {
        campusToast.error({
          title: "Event Not Updated",
          description: "The almanac event could not be saved.",
        });
        return;
      }

      const updatedEvent = normalizeEvent(await response.json());
      setEvents((current) =>
        current.map((event) =>
          event.id === editing.id ? updatedEvent : event,
        ),
      );
      setEditing(null);
      campusToast.success({
        title: "Almanac Event Updated",
        description: "The academic calendar event was updated.",
      });
    });
  }

  const columns: DataTableColumn<AlmanacEvent>[] = [
    { key: "title", header: "Event" },
    { key: "type", header: "Type" },
    {
      key: "date",
      header: "Date",
      cell: (event) => new Date(getEventDate(event)).toLocaleDateString(),
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

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <CampusInput
            className="pl-9"
            placeholder="Search almanac"
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
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <FiPlus className="h-4 w-4" />
            Create Event
          </Button>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <section className="campushub-calendar mt-5 rounded-xl border border-border bg-surface p-4">
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
            buttonText={{
              today: "Today",
            }}
            fixedWeekCount={false}
            height="auto"
            dayMaxEventRows={3}
            moreLinkClick="popover"
            selectable
            selectMirror
            firstDay={1}
          />
        </section>
      ) : viewMode === "timeline" ? (
        <section className="mt-5 rounded-xl border border-border bg-surface p-5">
          {timelineEvents.length > 0 ? (
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
                      {new Date(getEventDate(event)).toLocaleDateString()} ·{" "}
                      {event.eventType}
                    </p>
                    <h3 className="mt-2 font-semibold">{event.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {event.description}
                    </p>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title={query ? "No matching events" : "No timeline events"}
              description="Create academic dates to populate the event timeline."
              className="mx-auto border-0 bg-transparent"
            />
          )}
        </section>
      ) : viewMode === "cards" ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.length > 0 ? (
            filtered.map((event) => (
              <AlmanacEventCard
                key={event.id}
                event={event}
                onView={setViewing}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            ))
          ) : (
            <EmptyState
              title={query ? "No matching events" : "No almanac events"}
              description="Create academic dates, deadlines, and calendar events."
              className="mx-auto border-0 bg-transparent md:col-span-2 xl:col-span-3"
            />
          )}
        </div>
      ) : (
        <div className="mt-5">
          <CampusDataTable
            columns={columns}
            data={filtered}
            getRowId={(event) => event.id}
            empty={
              <EmptyState
                title={query ? "No matching events" : "No almanac events"}
                description="Create academic dates, deadlines, and calendar events."
                className="mx-auto border-0 bg-transparent"
              />
            }
          />
        </div>
      )}

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Almanac Event"
      >
        <AlmanacForm onSubmit={createEvent} isSubmitting={isPending} />
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
          <div className="space-y-6">
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
                      {event.eventType}
                    </p>
                    <h3 className="mt-2 text-sm font-semibold">
                      {event.title}
                    </h3>
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
            <div className="border-t border-border pt-6">
              <AlmanacForm
                lockedDate={selectedDate}
                onSubmit={(values) => {
                  createEvent(values);
                  setSelectedDate(null);
                }}
                isSubmitting={isPending}
              />
            </div>
          </div>
        ) : null}
      </Drawer>
      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit Almanac Event"
      >
        {editing ? (
          <AlmanacForm
            event={editing}
            onSubmit={updateEvent}
            isSubmitting={isPending}
          />
        ) : null}
      </Modal>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.title ?? "Almanac event"}
      >
        {viewing ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {viewing.description}
          </p>
        ) : null}
      </Drawer>
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete Almanac Event"
        description={`Delete ${deleting?.title ?? "this event"}?`}
        destructive
        onConfirm={() => {
          if (deleting) {
            startTransition(async () => {
              const response = await fetch(`/api/almanac/${deleting.id}`, {
                method: "DELETE",
              });

              if (!response.ok) {
                campusToast.error({
                  title: "Event Not Removed",
                  description: "The almanac event could not be removed.",
                });
                return;
              }

              setEvents((current) =>
                current.filter((event) => event.id !== deleting.id),
              );
              setDeleting(null);
              campusToast.warning({
                title: "Almanac Event Removed",
                description: "The almanac event was removed.",
              });
            });
          }
        }}
      />
    </>
  );
}
