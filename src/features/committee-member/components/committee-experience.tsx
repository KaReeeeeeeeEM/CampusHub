// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
"use client";


import type {
  EventClickArg,
  EventInput as FullCalendarEventInput,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import FullCalendar from "@fullcalendar/react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiBell,
  FiCalendar,
  FiCheckCircle,
  FiCheckSquare,
  FiCornerUpLeft,
  FiCpu,
  FiEye,
  FiLoader,
  FiMessageSquare,
  FiMoreVertical,
  FiPlus,
  FiSearch,
  FiSend,
  FiThumbsDown,
  FiThumbsUp,
  FiTrendingUp,
  FiTrash2,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import { z } from "zod";

import {
  CampusCheckbox,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";

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
    href: "/student/forum",
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

function CommitteeShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full max-w-none px-4 py-6 sm:px-6", className)}>
      {children}
    </div>
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
    <label className="block space-y-3">
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

export function StudentCommitteeWorkspace() {
  return <CommitteeTasksView />;
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
              <div
                key={item.id}
                className="rounded-md border border-border p-3"
              >
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
              <div
                key={event.id}
                className="rounded-md border border-border p-3"
              >
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
              <div
                key={topic.id}
                className="rounded-md border border-border p-3"
              >
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
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <label className="block space-y-3">
        <span className="text-sm font-medium">Title</span>
        <CampusInput
          {...register("title")}
          invalid={Boolean(formState.errors.title)}
          placeholder="Weekly technology committee update"
        />
      </label>
      <label className="block space-y-3">
        <span className="text-sm font-medium">Audience</span>
        <CampusInput
          {...register("audience")}
          invalid={Boolean(formState.errors.audience)}
          placeholder="Technology clubs, all CoICT students"
        />
      </label>
      <SelectField
        label="Status"
        value={watch("status")}
        options={["Draft", "Published", "Archived"] as const}
        onValueChange={(value) => setValue("status", value)}
      />
      <label className="block space-y-3">
        <span className="text-sm font-medium">Body</span>
        <CampusTextarea
          {...register("body")}
          invalid={Boolean(formState.errors.body)}
          placeholder="Write the announcement details and next steps."
        />
      </label>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        {announcement ? "Save Announcement" : "Create Announcement"}
      </Button>
    </form>
  );
}

export function CommitteeAnnouncementsView() {
  const [announcements, setAnnouncements] = useState(
    mockCommitteeAnnouncements,
  );
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [viewing, setViewing] = useState<CommitteeAnnouncement | null>(null);
  const [editing, setEditing] = useState<CommitteeAnnouncement | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      announcements.filter((item) => {
        const normalizedQuery = query.trim().toLowerCase();
        const queryMatch =
          !normalizedQuery ||
          [item.title, item.audience, item.body]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        const statusMatch =
          status === "All" ||
          item.status.toLowerCase() === status.toLowerCase();
        return queryMatch && statusMatch;
      }),
    [announcements, query, status],
  );
  const calendarEvents = useMemo<FullCalendarEventInput[]>(
    () =>
      filtered.map((announcement) => ({
        id: announcement.id,
        title: announcement.title,
        date: announcement.date,
        extendedProps: {
          status: announcement.status,
          audience: announcement.audience,
        },
      })),
    [filtered],
  );

  function openCalendarAnnouncement(arg: EventClickArg) {
    const announcement = announcements.find((item) => item.id === arg.event.id);
    if (announcement) {
      setViewing(announcement);
    }
  }

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
        <div className="grid auto-rows-fr gap-4 md:grid-cols-2">
          {filtered.length > 0 ? (
            filtered.map((announcement) => (
              <Card
                key={announcement.id}
                className="h-full transition-transform hover:-translate-y-1 hover:border-primary/40"
              >
                <CardContent className="flex h-full flex-col p-5 pb-4">
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
                  <div className="mt-auto flex items-center justify-between gap-3 pt-5">
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
            ))
          ) : (
            <EmptyState
              className="md:col-span-2"
              title="No announcements found"
              description={`No data for the filter "${query.trim() || status}". Try another search or status.`}
            />
          )}
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Announcement Calendar</CardTitle>
            <p className="text-sm text-muted-foreground">
              Click a calendar item to view announcement details.
            </p>
          </CardHeader>
          <CardContent className="campushub-calendar">
            <FullCalendar
              plugins={[dayGridPlugin]}
              initialView="dayGridMonth"
              events={calendarEvents}
              eventClick={openCalendarAnnouncement}
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
              firstDay={1}
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
            placeholder="Student developer workshop"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Venue</span>
          <CampusInput
            {...register("venue")}
            invalid={Boolean(formState.errors.venue)}
            placeholder="Innovation Hub"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Date</span>
          <CampusInput
            {...register("date")}
            type="date"
            invalid={Boolean(formState.errors.date)}
            placeholder="Select event date"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Time</span>
          <CampusInput
            {...register("time")}
            invalid={Boolean(formState.errors.time)}
            placeholder="10:00 AM"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Attendees</span>
          <CampusInput
            {...register("attendees")}
            type="number"
            invalid={Boolean(formState.errors.attendees)}
            placeholder="120"
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
            placeholder="Describe the event purpose, audience, and logistics."
          />
        </label>
      </div>
      <Button className="w-full" disabled={isSubmitting} type="submit">
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

type CommitteeForumReaction = {
  likes: number;
  dislikes: number;
  userReaction: "like" | "dislike" | null;
};

type CommitteeForumComment = {
  id: string;
  author: string;
  role: string;
  time: string;
  body: string;
  replyTo?: {
    author: string;
    excerpt: string;
  };
};

type CommitteeForumMember = {
  name: string;
  role: string;
  initials: string;
  interactions: number;
};

const initialCommitteeForumComments: Record<string, CommitteeForumComment[]> = {
  "topic-lab-hours": [
    {
      id: "committee-comment-labs-1",
      author: committeeProfile.name,
      role: committeeProfile.role,
      time: "10:18 AM",
      body: "I will compile the request and confirm which labs can safely remain open after normal hours.",
    },
    {
      id: "committee-comment-labs-2",
      author: "Neema Sanga",
      role: "Class Representative",
      time: "10:44 AM",
      body: "Final-year teams can submit their preferred access windows so the committee has clear demand data.",
    },
  ],
  "topic-open-source": [
    {
      id: "committee-comment-open-source-1",
      author: committeeProfile.name,
      role: committeeProfile.role,
      time: "9:10 AM",
      body: "We can start with beginner-friendly issues every Wednesday evening and pair new contributors with mentors.",
    },
    {
      id: "committee-comment-open-source-2",
      author: "Faith Joseph",
      role: "Computer Science · Year 2",
      time: "Now",
      body: "Could we include a short Git workflow session before assigning issues?",
    },
  ],
  "topic-wifi": [
    {
      id: "committee-comment-wifi-1",
      author: "Daniel Rweikiza",
      role: "Final Year Student",
      time: "2:30 PM",
      body: "The corridor near Lab 4 drops frequently during afternoon practical sessions.",
    },
  ],
};

function getCommitteeForumInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function createCommitteeForumMember(
  name: string,
  role: string,
  interactions = 1,
): CommitteeForumMember {
  return {
    name,
    role,
    initials: getCommitteeForumInitials(name),
    interactions,
  };
}

function getCommitteeForumMemberProfile(name: string, role: string) {
  return createCommitteeForumMember(name, role || "Committee participant");
}

function mergeCommitteeForumMember(
  members: Map<string, CommitteeForumMember>,
  name: string,
  role: string,
) {
  const existing = members.get(name);
  if (existing) {
    members.set(name, {
      ...existing,
      role: existing.role || role,
      interactions: existing.interactions + 1,
    });
    return;
  }

  members.set(name, createCommitteeForumMember(name, role));
}

function getInitialCommitteeForumReactions() {
  return Object.fromEntries(
    mockCommitteeTopics.map((topic) => [
      topic.id,
      {
        likes: Math.max(6, Math.round(topic.views / 14)),
        dislikes: Math.max(1, Math.round(topic.views / 120)),
        userReaction: null,
      },
    ]),
  ) as Record<string, CommitteeForumReaction>;
}

function CommitteeForumMemberButton({
  member,
  onOpenProfile,
  className,
}: {
  member: CommitteeForumMember;
  onOpenProfile: (member: CommitteeForumMember) => void;
  className?: string;
}) {
  return (
    <Button
      className={cn("h-auto w-full justify-start gap-3 p-2", className)}
      type="button"
      variant="ghost"
      onClick={() => onOpenProfile(member)}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {member.initials}
      </span>
      <span className="min-w-0 text-left">
        <span className="block truncate text-sm font-medium">{member.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {member.role}
        </span>
      </span>
    </Button>
  );
}

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
          placeholder="Best tools for final-year projects"
        />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium">Summary</span>
        <CampusTextarea
          {...register("summary")}
          invalid={Boolean(formState.errors.summary)}
          placeholder="Summarize the discussion topic and expected contribution."
        />
      </label>
      <Button className="w-full" disabled={isSubmitting} type="submit">
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
  const [selectedTopicId, setSelectedTopicId] = useState(
    mockCommitteeTopics[0]?.id ?? "",
  );
  const [reactions, setReactions] = useState(
    getInitialCommitteeForumReactions,
  );
  const [comments, setComments] = useState<
    Record<string, CommitteeForumComment[]>
  >(initialCommitteeForumComments);
  const [commentDraft, setCommentDraft] = useState("");
  const [replyingTo, setReplyingTo] =
    useState<CommitteeForumComment | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] =
    useState<CommitteeForumMember | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationMember, setNotificationMember] =
    useState<CommitteeForumMember | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return topics;

    return topics.filter((topic) =>
      [topic.title, topic.summary, committeeCategory]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, topics]);

  const selectedTopic =
    topics.find((topic) => topic.id === selectedTopicId) ?? filtered[0] ?? null;
  const selectedComments = selectedTopic ? comments[selectedTopic.id] ?? [] : [];
  const selectedReaction = selectedTopic
    ? reactions[selectedTopic.id] ?? {
        likes: 0,
        dislikes: 0,
        userReaction: null,
      }
    : null;
  const engagedMembers = useMemo(() => {
    if (!selectedTopic) return [];

    const members = new Map<string, CommitteeForumMember>();
    mergeCommitteeForumMember(
      members,
      committeeProfile.name,
      committeeProfile.role,
    );
    selectedComments.forEach((comment) => {
      mergeCommitteeForumMember(members, comment.author, comment.role);
    });

    return Array.from(members.values());
  }, [selectedComments, selectedTopic]);
  const visibleEngagedMembers = engagedMembers.slice(0, 5);
  const hiddenEngagedMembersCount = Math.max(0, engagedMembers.length - 5);

  function openProfile(member: CommitteeForumMember) {
    setSelectedProfile(member);
    setProfileOpen(true);
  }

  function openNotifications(member: CommitteeForumMember) {
    setNotificationMember(member);
    setNotificationOpen(true);
  }

  function createTopic(values: TopicInput) {
    startTransition(() => {
      const id = `topic-${Date.now()}`;
      setTopics((current) => [
        {
          id,
          replies: 0,
          views: 0,
          pinned: false,
          trending: false,
          createdAt: "2026-06-10",
          ...values,
        },
        ...current,
      ]);
      setSelectedTopicId(id);
      setComments((current) => ({ ...current, [id]: [] }));
      setReactions((current) => ({
        ...current,
        [id]: { likes: 0, dislikes: 0, userReaction: null },
      }));
      setCreateOpen(false);
      campusToast.success({
        title: "Forum Topic Created",
        description: "Technology discussion topic was created.",
      });
    });
  }

  function reactToTopic(topic: CommitteeTopic, reaction: "like" | "dislike") {
    setReactions((current) => {
      const existing = current[topic.id] ?? {
        likes: 0,
        dislikes: 0,
        userReaction: null,
      };
      const next = { ...existing };

      if (existing.userReaction === reaction) {
        next[reaction === "like" ? "likes" : "dislikes"] = Math.max(
          0,
          next[reaction === "like" ? "likes" : "dislikes"] - 1,
        );
        next.userReaction = null;
      } else {
        if (existing.userReaction) {
          next[existing.userReaction === "like" ? "likes" : "dislikes"] =
            Math.max(
              0,
              next[existing.userReaction === "like" ? "likes" : "dislikes"] - 1,
            );
        }
        next[reaction === "like" ? "likes" : "dislikes"] += 1;
        next.userReaction = reaction;
      }

      return { ...current, [topic.id]: next };
    });
  }

  function postComment() {
    if (!selectedTopic || !commentDraft.trim()) return;

    const nextComment: CommitteeForumComment = {
      id: `committee-comment-${Date.now()}`,
      author: committeeProfile.name,
      role: committeeProfile.role,
      time: "Now",
      body: commentDraft.trim(),
      replyTo: replyingTo
        ? {
            author: replyingTo.author,
            excerpt: replyingTo.body.slice(0, 120),
          }
        : undefined,
    };

    setComments((current) => ({
      ...current,
      [selectedTopic.id]: [...(current[selectedTopic.id] ?? []), nextComment],
    }));
    setTopics((current) =>
      current.map((topic) =>
        topic.id === selectedTopic.id
          ? { ...topic, replies: topic.replies + 1 }
          : topic,
      ),
    );
    setCommentDraft("");
    setReplyingTo(null);
    campusToast.success({
      title: "Comment Posted",
      description: "Your committee reply has been added to the discussion.",
    });
  }

  function unsendComment(comment: CommitteeForumComment) {
    if (!selectedTopic || comment.author !== committeeProfile.name) return;

    setComments((current) => ({
      ...current,
      [selectedTopic.id]: (current[selectedTopic.id] ?? []).filter(
        (item) => item.id !== comment.id,
      ),
    }));
    setTopics((current) =>
      current.map((topic) =>
        topic.id === selectedTopic.id
          ? { ...topic, replies: Math.max(0, topic.replies - 1) }
          : topic,
      ),
    );
    campusToast.warning({
      title: "Message Unsent",
      description: "Your forum message has been removed from this discussion.",
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
        <SearchBar
          query={query}
          setQuery={setQuery}
          placeholder="Search topics"
        />
      </div>
      <section className="mt-6 grid h-[calc(100dvh-18rem)] min-h-[34rem] overflow-hidden rounded-xl border border-border bg-surface lg:grid-cols-[300px_minmax(0,1fr)_340px]">
        <aside className="min-h-0 overflow-y-auto border-b border-border bg-surface-muted/40 p-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Topics</p>
              <p className="text-xs text-muted-foreground">
                {filtered.length} discussions
              </p>
            </div>
            <StatusPill>
              {topics.filter((topic) => topic.trending).length} trending
            </StatusPill>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Pinned", "Trending", "Technology", "Support"].map((label) => (
              <Button
                key={label}
                className="h-8 rounded-full"
                size="sm"
                type="button"
                variant="secondary"
                onClick={() => setQuery(label)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="mt-5 space-y-2">
            {filtered.slice(0, 8).map((topic) => (
              <Button
                key={topic.id}
                className={cn(
                  "h-auto w-full justify-start rounded-lg border border-transparent p-3 text-left",
                  selectedTopic?.id === topic.id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "bg-background text-foreground hover:border-primary/30",
                )}
                type="button"
                variant="ghost"
                onClick={() => setSelectedTopicId(topic.id)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {topic.title}
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {topic.replies} replies · {committeeCategory}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </aside>

        <div className="min-h-0 overflow-hidden border-b border-border lg:border-b-0 lg:border-r">
          {filtered.length > 0 && selectedTopic ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-border p-5">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedTopic.pinned ? <StatusPill>Pinned</StatusPill> : null}
                  {selectedTopic.trending ? (
                    <StatusPill>Trending</StatusPill>
                  ) : null}
                  <StatusPill>{committeeCategory}</StatusPill>
                </div>
                <h2 className="mt-4 text-xl font-semibold">
                  {selectedTopic.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {selectedTopic.summary}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{committeeProfile.name}</span>
                  <span>{formatDate(selectedTopic.createdAt)}</span>
                  <span>{selectedTopic.views} views</span>
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                <div className="flex items-start gap-3">
                  <Button
                    aria-label={`View ${committeeProfile.name}'s profile`}
                    className="h-10 w-10 shrink-0 rounded-full bg-primary/15 p-0 text-sm font-semibold text-primary hover:bg-primary/20"
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      openProfile(
                        getCommitteeForumMemberProfile(
                          committeeProfile.name,
                          committeeProfile.role,
                        ),
                      )
                    }
                  >
                    {getCommitteeForumInitials(committeeProfile.name)}
                  </Button>
                  <div className="max-w-2xl rounded-2xl bg-surface-muted p-4">
                    <Button
                      className="h-auto p-0 text-sm font-semibold hover:text-primary"
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        openProfile(
                          getCommitteeForumMemberProfile(
                            committeeProfile.name,
                            committeeProfile.role,
                          ),
                        )
                      }
                    >
                      {committeeProfile.name}
                    </Button>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {selectedTopic.summary}
                    </p>
                  </div>
                </div>
                {selectedComments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-3">
                    <Button
                      aria-label={`View ${comment.author}'s profile`}
                      className="h-10 w-10 shrink-0 rounded-full bg-background p-0 text-sm font-semibold"
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        openProfile(
                          getCommitteeForumMemberProfile(
                            comment.author,
                            comment.role,
                          ),
                        )
                      }
                    >
                      {getCommitteeForumInitials(comment.author)}
                    </Button>
                    <div className="group relative max-w-2xl rounded-2xl border border-border bg-background p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            className="h-auto p-0 text-sm font-semibold hover:text-primary"
                            type="button"
                            variant="ghost"
                            onClick={() =>
                              openProfile(
                                getCommitteeForumMemberProfile(
                                  comment.author,
                                  comment.role,
                                ),
                              )
                            }
                          >
                            {comment.author}
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            {comment.role} · {comment.time}
                          </span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-label="Message actions"
                              className="h-8 w-8"
                              size="icon"
                              type="button"
                              variant="ghost"
                            >
                              <FiMoreVertical
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setReplyingTo(comment);
                                setCommentDraft(`@${comment.author} `);
                              }}
                            >
                              <FiCornerUpLeft
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                              Reply
                            </DropdownMenuItem>
                            {comment.author === committeeProfile.name ? (
                              <DropdownMenuItem
                                destructive
                                onClick={() => unsendComment(comment)}
                              >
                                <FiTrash2
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                                Unsend
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {comment.replyTo ? (
                        <div className="mt-3 rounded-lg border border-border bg-surface-muted p-3 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Replying to {comment.replyTo.author}
                          </span>
                          <p className="mt-1 line-clamp-2">
                            {comment.replyTo.excerpt}
                          </p>
                        </div>
                      ) : null}
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {comment.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-4">
                {replyingTo ? (
                  <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
                    <span className="truncate">
                      Replying to{" "}
                      <span className="font-medium text-foreground">
                        {replyingTo.author}
                      </span>
                    </span>
                    <Button
                      className="h-7 px-2"
                      size="sm"
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setReplyingTo(null);
                        setCommentDraft("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <CampusTextarea
                    className="min-h-11 flex-1"
                    placeholder="Write a committee reply..."
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                  />
                  <Button
                    className="sm:self-end"
                    disabled={!commentDraft.trim()}
                    type="button"
                    onClick={postComment}
                  >
                    <FiSend className="h-4 w-4" aria-hidden="true" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              No committee discussions match this search.
            </div>
          )}
        </div>

        <aside className="min-h-0 space-y-4 overflow-y-auto bg-surface-muted/30 p-5">
          {selectedTopic && selectedReaction ? (
            <>
              <div>
                <p className="text-sm font-semibold">Discussion Detail</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {committeeCategory}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-semibold">Description</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {selectedTopic.summary}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Replies</p>
                  <p className="mt-1 text-lg font-semibold">
                    {selectedTopic.replies}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Views</p>
                  <p className="mt-1 text-lg font-semibold">
                    {selectedTopic.views}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-semibold">React</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={
                      selectedReaction.userReaction === "like"
                        ? "default"
                        : "secondary"
                    }
                    onClick={() => reactToTopic(selectedTopic, "like")}
                  >
                    <FiThumbsUp className="h-4 w-4" aria-hidden="true" />
                    {selectedReaction.likes}
                  </Button>
                  <Button
                    type="button"
                    variant={
                      selectedReaction.userReaction === "dislike"
                        ? "default"
                        : "secondary"
                    }
                    onClick={() => reactToTopic(selectedTopic, "dislike")}
                  >
                    <FiThumbsDown className="h-4 w-4" aria-hidden="true" />
                    {selectedReaction.dislikes}
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Members Engaged</p>
                  {hiddenEngagedMembersCount > 0 ? (
                    <Button
                      className="h-8 px-2 text-xs"
                      type="button"
                      variant="ghost"
                      onClick={() => setMembersOpen(true)}
                    >
                      View all
                    </Button>
                  ) : null}
                </div>
                <div className="mt-3 space-y-3">
                  {visibleEngagedMembers.map((member) => (
                    <CommitteeForumMemberButton
                      key={member.name}
                      member={member}
                      onOpenProfile={openProfile}
                    />
                  ))}
                  {hiddenEngagedMembersCount > 0 ? (
                    <Button
                      className="h-9 w-full justify-start text-xs text-muted-foreground"
                      type="button"
                      variant="ghost"
                      onClick={() => setMembersOpen(true)}
                    >
                      +{hiddenEngagedMembersCount} more
                    </Button>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </aside>
      </section>
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Topic"
        description="Create a technology forum discussion."
        className="max-w-5xl"
      >
        <TopicForm onSubmit={createTopic} isSubmitting={isPending} />
      </Modal>
      <Drawer
        open={membersOpen}
        onOpenChange={setMembersOpen}
        title="Members Engaged"
        description="Students and leaders who interacted with this committee discussion."
      >
        <div className="space-y-2">
          {engagedMembers.map((member) => (
            <div
              key={member.name}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-2"
            >
              <CommitteeForumMemberButton
                member={member}
                onOpenProfile={(nextMember) => {
                  setMembersOpen(false);
                  openProfile(nextMember);
                }}
              />
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                {member.interactions}
              </span>
            </div>
          ))}
        </div>
      </Drawer>
      <Drawer
        open={profileOpen}
        onOpenChange={setProfileOpen}
        title={selectedProfile?.name ?? "Profile"}
        description={selectedProfile?.role}
      >
        {selectedProfile ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-background p-5">
              <div className="flex items-start gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                  {selectedProfile.initials}
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-semibold">
                    {selectedProfile.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedProfile.role}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Active CampusHub member contributing to committee
                    discussions, technical support, and college collaboration.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  onClick={() =>
                    campusToast.success({
                      title: "Following",
                      description: `You are now following ${selectedProfile.name}.`,
                    })
                  }
                >
                  Follow
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => openNotifications(selectedProfile)}
                >
                  <FiBell className="h-4 w-4" aria-hidden="true" />
                  Notify
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs text-muted-foreground">Interactions</p>
                <p className="mt-1 text-lg font-semibold">
                  {selectedProfile.interactions}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="mt-1 text-lg font-semibold">Active</p>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>
      <Modal
        open={notificationOpen}
        onOpenChange={setNotificationOpen}
        title="Notification Preferences"
        description={
          notificationMember
            ? `Choose what to receive from ${notificationMember.name}.`
            : undefined
        }
        footer={
          <Button
            type="button"
            onClick={() => {
              setNotificationOpen(false);
              campusToast.info({
                title: "Preferences Saved",
                description: notificationMember
                  ? `Notification preferences for ${notificationMember.name} were updated.`
                  : "Notification preferences were updated.",
              });
            }}
          >
            Save Preferences
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            "New forum posts",
            "Replies to discussions",
            "Committee updates",
            "Event activity",
          ].map((option) => (
            <div
              key={option}
              className="flex items-center gap-3 rounded-xl border border-border bg-background p-4"
            >
              <CampusCheckbox defaultChecked />
              <span className="text-sm font-medium">{option}</span>
            </div>
          ))}
        </div>
      </Modal>
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
