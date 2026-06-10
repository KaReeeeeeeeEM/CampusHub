"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiCalendar,
  FiEdit,
  FiEye,
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
import type { AlmanacEvent } from "@/features/campus-admin/lib/mock-data";
import type { DataTableColumn } from "@/components/shared/data-table";

const eventTypes = [
  "Academic Date",
  "Deadline",
  "Event",
  "Examination",
] as const;
const statuses = ["UPCOMING", "PUBLISHED", "DRAFT"] as const;

const eventSchema = z.object({
  title: z.string().min(2, "Title is required."),
  type: z.enum(eventTypes),
  date: z.string().min(1, "Date is required."),
  audience: z.string().min(2, "Audience is required."),
  status: z.enum(statuses),
  description: z.string().min(10, "Description is required."),
});

type EventInput = z.infer<typeof eventSchema>;

function AlmanacForm({
  event,
  onSubmit,
  isSubmitting,
}: {
  event?: AlmanacEvent;
  onSubmit: (values: EventInput) => void;
  isSubmitting: boolean;
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
      type: event?.type ?? "Academic Date",
      date: event?.date ? event.date.slice(0, 10) : "",
      audience: event?.audience ?? "",
      status: event?.status ?? "DRAFT",
      description: event?.description ?? "",
    },
  });

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Title</span>
          <CampusInput {...register("title")} invalid={Boolean(errors.title)} />
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
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Audience</span>
          <CampusInput
            {...register("audience")}
            invalid={Boolean(errors.audience)}
          />
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
          />
        </label>
      </div>
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        {event ? "Save Changes" : "Create Event"}
      </Button>
    </form>
  );
}

export function AlmanacManagement({
  initialEvents,
}: {
  initialEvents: AlmanacEvent[];
}) {
  const [events, setEvents] = useState(initialEvents);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<AlmanacEvent | null>(null);
  const [editing, setEditing] = useState<AlmanacEvent | null>(null);
  const [deleting, setDeleting] = useState<AlmanacEvent | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return events;
    return events.filter((event) =>
      [event.title, event.type, event.audience, event.status]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [events, query]);

  function createEvent(values: EventInput) {
    startTransition(async () => {
      setEvents((current) => [
        { id: `event-${Date.now()}`, ...values },
        ...current,
      ]);
      setCreateOpen(false);
      campusToast.success({
        title: "Almanac Event Created",
        description: "The academic calendar event was created.",
      });
    });
  }

  function updateEvent(values: EventInput) {
    if (!editing) return;
    startTransition(async () => {
      setEvents((current) =>
        current.map((event) =>
          event.id === editing.id ? { ...event, ...values } : event,
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
      cell: (event) => new Date(event.date).toLocaleDateString(),
    },
    { key: "audience", header: "Audience" },
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
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setViewMode(viewMode === "table" ? "calendar" : "table")
            }
          >
            <FiCalendar className="h-4 w-4" />
            {viewMode === "table" ? "Calendar View" : "Table View"}
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <FiPlus className="h-4 w-4" />
            Create Event
          </Button>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {filtered.map((event) => (
            <Button
              key={event.id}
              className="h-auto flex-col items-start whitespace-normal rounded-lg border border-border bg-surface p-5 text-left text-foreground transition hover:-translate-y-1 hover:border-primary/50 hover:bg-surface"
              type="button"
              variant="secondary"
              onClick={() => setViewing(event)}
            >
              <p className="text-xs font-semibold uppercase text-primary">
                {event.type}
              </p>
              <h3 className="mt-2 font-semibold">{event.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {new Date(event.date).toLocaleDateString()} · {event.audience}
              </p>
            </Button>
          ))}
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
            setEvents((current) =>
              current.filter((event) => event.id !== deleting.id),
            );
            campusToast.warning({
              title: "Almanac Event Removed",
              description: "The mock almanac event was removed.",
            });
          }
        }}
      />
    </>
  );
}
