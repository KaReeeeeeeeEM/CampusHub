"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiBell,
  FiCalendar,
  FiCheckCircle,
  FiCheckSquare,
  FiCpu,
  FiEdit,
  FiEye,
  FiLoader,
  FiMessageSquare,
  FiPlus,
  FiSearch,
  FiTrendingUp,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import { z } from "zod";

import {
  CampusDataTable,
  CampusInput,
  CampusTextarea,
  campusToast,
} from "@/components/campushub";
import { StaggerContainer } from "@/components/motion/stagger-container";
import { Drawer } from "@/components/shared/drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import { AdminActionMenu } from "@/features/administration/components/admin-action-menu";
import { CommitteePageHeader } from "@/features/committee-member/components/committee-page-header";
import {
  committeeCategory,
  committeeProfile,
  mockCommitteeAnnouncements,
  mockCommitteeEvents,
  mockCommitteeTasks,
  mockCommitteeTopics,
  type CommitteeAnnouncement,
  type CommitteeEvent,
  type CommitteeTask,
  type CommitteeTopic,
} from "@/features/committee-member/lib/mock-data";
import type { DataTableColumn } from "@/components/shared/data-table";

const dashboardStats: {
  label: string;
  value: string;
  icon: IconType;
}[] = [
  { label: "Assigned Category", value: "Technology", icon: FiCpu },
  { label: "Active Tasks", value: "0", icon: FiCheckSquare },
  { label: "Upcoming Events", value: "0", icon: FiCalendar },
  { label: "Forum Activity", value: "89", icon: FiMessageSquare },
];

const quickActions: {
  label: string;
  href: string;
  icon: IconType;
}[] = [
  {
    label: "Create Announcement",
    href: "/student/my-committee/announcements",
    icon: FiBell,
  },
  {
    label: "Create Event",
    href: "/student/my-committee/events",
    icon: FiCalendar,
  },
  {
    label: "Start Topic",
    href: "/student/my-committee/discussions",
    icon: FiMessageSquare,
  },
  {
    label: "Update Tasks",
    href: "/student/my-committee/tasks",
    icon: FiCheckSquare,
  },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function CommitteeShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {children}
    </main>
  );
}

function SearchBar({
  query,
  setQuery,
  placeholder,
}: {
  query: string;
  setQuery: (query: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:max-w-sm">
      <FiSearch
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <CampusInput
        className="pl-9"
        placeholder={placeholder}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onValueChange: (value: T) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <Select value={value} onValueChange={(next) => onValueChange(next as T)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

export function CommitteeDashboardView() {
  const activeTasks = mockCommitteeTasks.filter(
    (task) => task.status !== "Completed",
  ).length;
  const upcomingEvents = mockCommitteeEvents.filter(
    (event) => event.status === "Upcoming",
  );
  const statCards = dashboardStats.map((stat) =>
    stat.label === "Active Tasks"
      ? { ...stat, value: String(activeTasks) }
      : stat.label === "Upcoming Events"
        ? { ...stat, value: String(upcomingEvents.length) }
        : stat,
  );

  return (
    <CommitteeShell>
      <section className="overflow-hidden rounded-lg border border-border bg-surface p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <FiCpu className="h-4 w-4" aria-hidden="true" />
              {committeeCategory}
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-normal">
              Focused tools for your committee work.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              Manage technology announcements, events, forum discussions, and
              assigned tasks for the College of ICT.
            </p>
          </div>
          <Button asChild>
            <Link href="/student/my-committee/tasks">Review Tasks</Link>
          </Button>
        </div>
      </section>

      <StaggerContainer className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <Card
            key={label}
            className="transition-transform duration-300 hover:-translate-y-1 hover:border-primary/40"
          >
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            </CardContent>
          </Card>
        ))}
      </StaggerContainer>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity Feed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "Hackathon announcement was published to technology clubs.",
              "Two students replied to the lab hours forum discussion.",
              "Applied AI Workshop reached 220 expected attendees.",
              "Hackathon volunteer task is overdue.",
            ].map((item) => (
              <div
                key={item}
                className="flex gap-3 rounded-lg border border-border bg-background p-4 text-sm"
              >
                <FiCheckCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {quickActions.map(({ label, href, icon: Icon }) => (
              <Button
                key={label}
                asChild
                className="justify-start"
                variant="secondary"
              >
                <Link href={href}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Recent Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockCommitteeAnnouncements.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-md border border-border p-3">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.status} · {formatDate(item.date)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="rounded-md border border-border p-3">
                <p className="text-sm font-medium">{event.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(event.date)} · {event.venue}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Forum Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockCommitteeTopics.slice(0, 3).map((topic) => (
              <div key={topic.id} className="rounded-md border border-border p-3">
                <p className="text-sm font-medium">{topic.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {topic.replies} replies · {topic.views} views
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </CommitteeShell>
  );
}

const announcementSchema = z.object({
  title: z.string().min(3, "Title is required."),
  audience: z.string().min(2, "Audience is required."),
  status: z.enum(["Draft", "Published", "Archived"]),
  body: z.string().min(10, "Body is required."),
});

type AnnouncementInput = z.infer<typeof announcementSchema>;

function AnnouncementForm({
  announcement,
  onSubmit,
  isSubmitting,
}: {
  announcement?: CommitteeAnnouncement;
  onSubmit: (values: AnnouncementInput) => void;
  isSubmitting: boolean;
}) {
  const { register, handleSubmit, watch, setValue, formState } = useForm<
    z.input<typeof announcementSchema>,
    unknown,
    AnnouncementInput
  >({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: announcement?.title ?? "",
      audience: announcement?.audience ?? "Technology clubs",
      status: announcement?.status ?? "Draft",
      body: announcement?.body ?? "",
    },
  });

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <label className="space-y-2">
        <span className="text-sm font-medium">Title</span>
        <CampusInput
          {...register("title")}
          invalid={Boolean(formState.errors.title)}
        />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium">Audience</span>
        <CampusInput
          {...register("audience")}
          invalid={Boolean(formState.errors.audience)}
        />
      </label>
      <SelectField
        label="Status"
        value={watch("status")}
        options={["Draft", "Published", "Archived"] as const}
        onValueChange={(value) => setValue("status", value)}
      />
      <label className="space-y-2">
        <span className="text-sm font-medium">Body</span>
        <CampusTextarea
          {...register("body")}
          invalid={Boolean(formState.errors.body)}
        />
      </label>
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        {announcement ? "Save Announcement" : "Create Announcement"}
      </Button>
    </form>
  );
}

export function CommitteeAnnouncementsView() {
  const [announcements, setAnnouncements] = useState(mockCommitteeAnnouncements);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [viewing, setViewing] = useState<CommitteeAnnouncement | null>(null);
  const [editing, setEditing] = useState<CommitteeAnnouncement | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = announcements.filter((item) => {
    const queryMatch =
      !query ||
      [item.title, item.audience, item.body]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase());
    const statusMatch = status === "All" || item.status === status;
    return queryMatch && statusMatch;
  });

  function createAnnouncement(values: AnnouncementInput) {
    startTransition(() => {
      setAnnouncements((current) => [
        {
          id: `announcement-${Date.now()}`,
          date: "2026-06-10",
          ...values,
        },
        ...current,
      ]);
      setCreateOpen(false);
      campusToast.success({
        title: "Announcement Created",
        description: "Technology announcement was saved successfully.",
      });
    });
  }

  function updateAnnouncement(values: AnnouncementInput) {
    if (!editing) return;
    setAnnouncements((current) =>
      current.map((item) =>
        item.id === editing.id ? { ...item, ...values } : item,
      ),
    );
    setEditing(null);
    campusToast.success({
      title: "Announcement Updated",
      description: "Technology announcement was updated.",
    });
  }

  return (
    <CommitteeShell>
      <CommitteePageHeader
        eyebrow={committeeCategory}
        title="Announcements"
        description="Create and manage technology-related announcements for students in your assigned category."
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            Create Announcement
          </Button>
        }
      />
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar
          query={query}
          setQuery={setQuery}
          placeholder="Search announcements"
        />
        <div className="flex gap-2">
          {["All", "Draft", "Published", "Archived"].map((item) => (
            <Button
              key={item}
              type="button"
              variant={status === item ? "default" : "secondary"}
              onClick={() => setStatus(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>
      <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_420px]">
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((announcement) => (
            <Card
              key={announcement.id}
              className="transition-transform hover:-translate-y-1 hover:border-primary/40"
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <StatusPill>{announcement.status}</StatusPill>
                  <StatusPill>{committeeCategory}</StatusPill>
                </div>
                <h2 className="mt-4 text-lg font-semibold">
                  {announcement.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {announcement.body}
                </p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(announcement.date)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setViewing(announcement)}
                    >
                      View
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setEditing(announcement)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Announcement Table</CardTitle>
          </CardHeader>
          <CardContent>
            <CampusDataTable
              columns={[
                { key: "title", header: "Title" },
                { key: "status", header: "Status" },
                {
                  key: "actions",
                  header: "Actions",
                  className: "w-16 text-right",
                  cell: (announcement) => (
                    <AdminActionMenu
                      items={[
                        {
                          label: "View",
                          icon: FiEye,
                          onSelect: () => setViewing(announcement),
                        },
                        {
                          label: "Edit",
                          icon: FiEdit,
                          onSelect: () => setEditing(announcement),
                        },
                      ]}
                    />
                  ),
                },
              ]}
              data={filtered}
              getRowId={(announcement) => announcement.id}
              empty={
                <EmptyState
                  title="No announcements"
                  description="Create your first technology announcement."
                  className="mx-auto border-0 bg-transparent"
                />
              }
            />
          </CardContent>
        </Card>
      </section>
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Announcement"
        description="Publish or draft a technology committee announcement."
      >
        <AnnouncementForm
          onSubmit={createAnnouncement}
          isSubmitting={isPending}
        />
      </Modal>
      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit Announcement"
        description="Update announcement details."
      >
        {editing ? (
          <AnnouncementForm
            key={editing.id}
            announcement={editing}
            onSubmit={updateAnnouncement}
            isSubmitting={isPending}
          />
        ) : null}
      </Modal>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.title ?? "Announcement"}
        description={committeeCategory}
        className="max-w-xl"
      >
        {viewing ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {viewing.body}
            </p>
            <StatusPill>{viewing.audience}</StatusPill>
          </div>
        ) : null}
      </Drawer>
    </CommitteeShell>
  );
}

const eventSchema = z.object({
  title: z.string().min(3, "Event title is required."),
  venue: z.string().min(2, "Venue is required."),
  date: z.string().min(1, "Date is required."),
  time: z.string().min(1, "Time is required."),
  attendees: z.coerce.number().int().min(0),
  status: z.enum(["Upcoming", "Completed", "Cancelled"]),
  description: z.string().min(10, "Description is required."),
});

type EventInput = z.infer<typeof eventSchema>;

function EventForm({
  event,
  onSubmit,
  isSubmitting,
}: {
  event?: CommitteeEvent;
  onSubmit: (values: EventInput) => void;
  isSubmitting: boolean;
}) {
  const { register, handleSubmit, watch, setValue, formState } = useForm<
    z.input<typeof eventSchema>,
    unknown,
    EventInput
  >({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event?.title ?? "",
      venue: event?.venue ?? "",
      date: event?.date ?? "",
      time: event?.time ?? "",
      attendees: event?.attendees ?? 0,
      status: event?.status ?? "Upcoming",
      description: event?.description ?? "",
    },
  });

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">Title</span>
          <CampusInput
            {...register("title")}
            invalid={Boolean(formState.errors.title)}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Venue</span>
          <CampusInput
            {...register("venue")}
            invalid={Boolean(formState.errors.venue)}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Date</span>
          <CampusInput
            {...register("date")}
            type="date"
            invalid={Boolean(formState.errors.date)}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Time</span>
          <CampusInput
            {...register("time")}
            invalid={Boolean(formState.errors.time)}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Attendees</span>
          <CampusInput
            {...register("attendees")}
            type="number"
            invalid={Boolean(formState.errors.attendees)}
          />
        </label>
        <SelectField
          label="Status"
          value={watch("status")}
          options={["Upcoming", "Completed", "Cancelled"] as const}
          onValueChange={(value) => setValue("status", value)}
        />
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Description</span>
          <CampusTextarea
            {...register("description")}
            invalid={Boolean(formState.errors.description)}
          />
        </label>
      </div>
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        {event ? "Save Event" : "Create Event"}
      </Button>
    </form>
  );
}

export function CommitteeEventsView() {
  const [events, setEvents] = useState(mockCommitteeEvents);
  const [view, setView] = useState<"upcoming" | "past" | "calendar">(
    "upcoming",
  );
  const [viewing, setViewing] = useState<CommitteeEvent | null>(null);
  const [editing, setEditing] = useState<CommitteeEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered =
    view === "upcoming"
      ? events.filter((event) => event.status === "Upcoming")
      : view === "past"
        ? events.filter((event) => event.status !== "Upcoming")
        : events;

  function createEvent(values: EventInput) {
    startTransition(() => {
      setEvents((current) => [
        { id: `event-${Date.now()}`, ...values },
        ...current,
      ]);
      setCreateOpen(false);
      campusToast.success({
        title: "Event Created",
        description: "Technology committee event was created.",
      });
    });
  }

  function updateEvent(values: EventInput) {
    if (!editing) return;
    setEvents((current) =>
      current.map((event) =>
        event.id === editing.id ? { ...event, ...values } : event,
      ),
    );
    setEditing(null);
    campusToast.success({
      title: "Event Updated",
      description: "Technology event details were updated.",
    });
  }

  return (
    <CommitteeShell>
      <CommitteePageHeader
        eyebrow={committeeCategory}
        title="Events"
        description="Plan workshops, hackathons, clinics, and technology activities for students."
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            Create Event
          </Button>
        }
      />
      <div className="mt-8 flex gap-2">
        {["upcoming", "past", "calendar"].map((item) => (
          <Button
            key={item}
            type="button"
            variant={view === item ? "default" : "secondary"}
            onClick={() => setView(item as typeof view)}
          >
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </Button>
        ))}
      </div>
      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((event) => (
          <Card
            key={event.id}
            className="transition-transform hover:-translate-y-1 hover:border-primary/40"
          >
            <CardContent className="p-5">
              <StatusPill>{event.status}</StatusPill>
              <h2 className="mt-4 text-lg font-semibold">{event.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatDate(event.date)} · {event.time}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {event.venue}
              </p>
              <div className="mt-5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {event.attendees} attendees
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setViewing(event)}
                  >
                    View
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditing(event)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Event"
        description="Create a technology committee event."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        <EventForm onSubmit={createEvent} isSubmitting={isPending} />
      </Modal>
      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit Event"
        description="Update event details."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        {editing ? (
          <EventForm
            key={editing.id}
            event={editing}
            onSubmit={updateEvent}
            isSubmitting={isPending}
          />
        ) : null}
      </Modal>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.title ?? "Event"}
        description={committeeCategory}
        className="max-w-xl"
      >
        {viewing ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {viewing.description}
            </p>
            <StatusPill>{viewing.venue}</StatusPill>
          </div>
        ) : null}
      </Drawer>
    </CommitteeShell>
  );
}

const topicSchema = z.object({
  title: z.string().min(5, "Topic title is required."),
  summary: z.string().min(10, "Summary is required."),
});

type TopicInput = z.infer<typeof topicSchema>;

function TopicForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (values: TopicInput) => void;
  isSubmitting: boolean;
}) {
  const { register, handleSubmit, formState } = useForm<
    z.input<typeof topicSchema>,
    unknown,
    TopicInput
  >({
    resolver: zodResolver(topicSchema),
    defaultValues: { title: "", summary: "" },
  });

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <label className="space-y-2">
        <span className="text-sm font-medium">Topic</span>
        <CampusInput
          {...register("title")}
          invalid={Boolean(formState.errors.title)}
        />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium">Summary</span>
        <CampusTextarea
          {...register("summary")}
          invalid={Boolean(formState.errors.summary)}
        />
      </label>
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        Create Topic
      </Button>
    </form>
  );
}

export function CommitteeForumView() {
  const [topics, setTopics] = useState(mockCommitteeTopics);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<CommitteeTopic | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = topics.filter((topic) =>
    [topic.title, topic.summary]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  function createTopic(values: TopicInput) {
    startTransition(() => {
      setTopics((current) => [
        {
          id: `topic-${Date.now()}`,
          replies: 0,
          views: 0,
          pinned: false,
          trending: false,
          createdAt: "2026-06-10",
          ...values,
        },
        ...current,
      ]);
      setCreateOpen(false);
      campusToast.success({
        title: "Forum Topic Created",
        description: "Technology discussion topic was created.",
      });
    });
  }

  return (
    <CommitteeShell>
      <CommitteePageHeader
        eyebrow={committeeCategory}
        title="Forum"
        description="Moderate technology-related discussions and support student collaboration."
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            Create Topic
          </Button>
        }
      />
      <div className="mt-8">
        <SearchBar query={query} setQuery={setQuery} placeholder="Search topics" />
      </div>
      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {filtered.map((topic) => (
            <Card key={topic.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap gap-2">
                  {topic.pinned ? <StatusPill>Pinned</StatusPill> : null}
                  {topic.trending ? <StatusPill>Trending</StatusPill> : null}
                  <StatusPill>{committeeCategory}</StatusPill>
                </div>
                <h2 className="mt-4 text-lg font-semibold">{topic.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {topic.summary}
                </p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {topic.replies} replies · {topic.views} views
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setViewing(topic)}
                  >
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Trending Topics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topics
              .filter((topic) => topic.trending)
              .map((topic) => (
                <Button
                  key={topic.id}
                  className="h-auto w-full justify-start border border-border bg-background p-3 text-left"
                  type="button"
                  variant="secondary"
                  onClick={() => setViewing(topic)}
                >
                  {topic.title}
                </Button>
              ))}
          </CardContent>
        </Card>
      </section>
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Topic"
        description="Create a technology forum discussion."
      >
        <TopicForm onSubmit={createTopic} isSubmitting={isPending} />
      </Modal>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.title ?? "Forum topic"}
        description={committeeCategory}
        className="max-w-xl"
      >
        {viewing ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {viewing.summary}
            </p>
            <div className="flex gap-2">
              <StatusPill>{viewing.replies} replies</StatusPill>
              <StatusPill>{viewing.views} views</StatusPill>
            </div>
          </div>
        ) : null}
      </Drawer>
    </CommitteeShell>
  );
}

export function CommitteeTasksView() {
  const [tasks, setTasks] = useState(mockCommitteeTasks);
  const [viewing, setViewing] = useState<CommitteeTask | null>(null);

  function updateTask(task: CommitteeTask, status: CommitteeTask["status"]) {
    setTasks((current) =>
      current.map((item) => (item.id === task.id ? { ...item, status } : item)),
    );
    campusToast.success({
      title: "Task Updated",
      description: `${task.task} is now ${status}.`,
    });
  }

  const columns: DataTableColumn<CommitteeTask>[] = [
    { key: "task", header: "Task" },
    { key: "priority", header: "Priority" },
    {
      key: "dueDate",
      header: "Due Date",
      cell: (task) => formatDate(task.dueDate),
    },
    {
      key: "status",
      header: "Status",
      cell: (task) => <StatusPill>{task.status}</StatusPill>,
    },
    { key: "assignedBy", header: "Assigned By" },
    {
      key: "actions",
      header: "Actions",
      className: "w-16 text-right",
      cell: (task) => (
        <AdminActionMenu
          items={[
            { label: "View", icon: FiEye, onSelect: () => setViewing(task) },
            {
              label: "Mark In Progress",
              icon: FiTrendingUp,
              onSelect: () => updateTask(task, "In Progress"),
            },
            {
              label: "Mark Completed",
              icon: FiCheckCircle,
              onSelect: () => updateTask(task, "Completed"),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <CommitteeShell>
      <CommitteePageHeader
        eyebrow={committeeCategory}
        title="Tasks"
        description="Track assigned technology committee work and update task progress."
      />
      <section className="mt-8 grid gap-4 md:grid-cols-4">
        {["Pending", "In Progress", "Completed", "Overdue"].map((status) => (
          <Card key={status}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{status}</p>
              <p className="mt-2 text-3xl font-semibold">
                {tasks.filter((task) => task.status === status).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
      <div className="mt-6">
        <CampusDataTable
          columns={columns}
          data={tasks}
          getRowId={(task) => task.id}
          empty={
            <EmptyState
              title="No tasks"
              description="Assigned committee activities will appear here."
              className="mx-auto border-0 bg-transparent"
            />
          }
        />
      </div>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.task ?? "Task"}
        description={viewing?.assignedBy}
        className="max-w-xl"
      >
        {viewing ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {viewing.notes}
            </p>
            <div className="flex gap-2">
              <StatusPill>{viewing.priority}</StatusPill>
              <StatusPill>{viewing.status}</StatusPill>
              <StatusPill>{formatDate(viewing.dueDate)}</StatusPill>
            </div>
          </div>
        ) : null}
      </Drawer>
    </CommitteeShell>
  );
}

export function CommitteeProfileView() {
  return (
    <CommitteeShell>
      <CommitteePageHeader
        eyebrow="Profile"
        title="Committee member profile"
        description="Your committee identity, assigned role, achievements, and contribution summary."
      />
      <section className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit">
          <CardContent className="p-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-primary text-2xl font-semibold text-primary-foreground">
              BM
            </div>
            <h2 className="mt-5 text-xl font-semibold">
              {committeeProfile.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {committeeProfile.email}
            </p>
            <div className="mt-5 inline-flex rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
              {committeeProfile.category}
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {[
                ["Name", committeeProfile.name],
                ["Email", committeeProfile.email],
                ["Phone", committeeProfile.phone],
                ["Role", committeeProfile.role],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <p className="text-xs uppercase text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-medium">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Committee Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {[
                ["Category", committeeProfile.category],
                ["College", committeeProfile.college],
                ["University", committeeProfile.university],
                ["Scope", "Technology activities only"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <p className="text-xs uppercase text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-medium">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {committeeProfile.achievements.map((achievement) => (
                <div
                  key={achievement}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <p className="text-sm font-medium">{achievement}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Activity Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              {committeeProfile.activitySummary.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 text-2xl font-semibold">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </CommitteeShell>
  );
}
