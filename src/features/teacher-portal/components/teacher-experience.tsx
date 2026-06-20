// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
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
import Link from "next/link";
import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import type { IconType } from "react-icons";
import {
  FiAward,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEye,
  FiExternalLink,
  FiFileText,
  FiFilter,
  FiGrid,
  FiList,
  FiMapPin,
  FiMoreVertical,
  FiNavigation,
  FiPieChart,
  FiPlus,
  FiSave,
  FiSearch,
  FiSend,
  FiStar,
  FiTrendingUp,
  FiTrash2,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { z } from "zod";

import {
  CampusInput,
  CampusTextarea,
  campusToast,
} from "@/components/campushub";
import type { DataTableColumn } from "@/components/shared/data-table";
import { DataTable } from "@/components/shared/data-table";
import { Drawer } from "@/components/shared/drawer";
import { Empty } from "@/components/shared/empty";
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
import {
  mockTeacherProfile,
  teacherAlmanacItems,
  teacherAnnouncements,
  teacherEvents,
  teacherForumTopics,
  teacherNotifications,
  teacherPolls,
  teacherProjects,
  teacherStats,
  teacherStudents,
  type TeacherAlmanacItem,
  type TeacherAnnouncement,
  type TeacherEvent,
  type TeacherForumTopic,
  type TeacherNotification,
  type TeacherPoll,
  type TeacherProject,
  type TeacherStudent,
} from "@/features/teacher-portal/lib/mock-data";
import { cn } from "@/lib/utils";

const announcementCategories = [
  "All",
  "Academic",
  "Technology",
  "Research",
  "Sports",
  "Student Welfare",
  "University News",
];

const almanacModes = [
  { key: "calendar", label: "Calendar", icon: FiCalendar },
  { key: "timeline", label: "Timeline", icon: FiClock },
  { key: "exams", label: "Exams", icon: FiBookOpen },
  { key: "deadlines", label: "Deadlines", icon: FiCheckCircle },
] as const;

const pollModes = [
  { key: "active", label: "Active Polls", icon: FiPieChart },
  { key: "closed", label: "Closed Polls", icon: FiCheckCircle },
  { key: "votes", label: "My Votes", icon: FiAward },
] as const;

const showcaseModes = [
  { key: "overview", label: "Overview", icon: FiTrendingUp },
  { key: "projects", label: "Projects", icon: FiStar },
  { key: "talent", label: "Top Talent", icon: FiUsers },
  { key: "reviewed", label: "Reviewed", icon: FiSave },
] as const;

type AlmanacMode = (typeof almanacModes)[number]["key"];
type PollMode = (typeof pollModes)[number]["key"];
type ShowcaseMode = (typeof showcaseModes)[number]["key"];
type ChartView = "bar" | "line" | "area";

const chartViewLabels: Record<ChartView, string> = {
  bar: "Bar chart",
  line: "Line chart",
  area: "Area chart",
};

const teacherActivityChartData = [
  { label: "Jan", students: 96, projects: 18, events: 4 },
  { label: "Feb", students: 108, projects: 22, events: 5 },
  { label: "Mar", students: 118, projects: 26, events: 6 },
  { label: "Apr", students: 132, projects: 29, events: 7 },
  { label: "May", students: 148, projects: 32, events: 9 },
  { label: "Jun", students: 164, projects: 38, events: 10 },
];

const replySchema = z.object({
  reply: z.string().min(6, "Write a meaningful reply."),
});

const profileSchema = z.object({
  office: z.string().min(3),
  interests: z.string().min(3),
});

const teacherEventSchema = z.object({
  title: z.string().min(3, "Event title is required."),
  category: z.string().min(2, "Select a category."),
  date: z.string().min(1, "Select a date."),
  time: z.string().min(1, "Select a time."),
  venue: z.string().min(3, "Venue is required."),
  audience: z.string().min(3, "Audience is required."),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1."),
  description: z.string().min(12, "Add a useful event description."),
});

const teacherPollSchema = z.object({
  question: z.string().min(8, "Poll question is required."),
  category: z.string().min(2, "Select a category."),
  audience: z.string().min(3, "Audience is required."),
  endDate: z.string().min(1, "Select an end date."),
  visibility: z.string().min(2, "Select result visibility."),
  description: z.string().min(10, "Add a short poll description."),
});

const teacherAnnouncementSchema = z.object({
  title: z.string().min(6, "Announcement title is required."),
  category: z.string().min(2, "Select a category."),
  summary: z.string().min(16, "Write a clear announcement message."),
  attachments: z.array(
    z.object({
      type: z.enum(["link", "media"]),
      label: z.string().optional(),
      url: z.string().optional(),
    }),
  ),
});

type ReplyFormValues = z.infer<typeof replySchema>;
type ProfileFormValues = z.infer<typeof profileSchema>;
type TeacherEventFormValues = z.infer<typeof teacherEventSchema>;
type TeacherPollFormValues = z.infer<typeof teacherPollSchema>;
type TeacherAnnouncementFormValues = z.infer<typeof teacherAnnouncementSchema>;

function matchesQuery(values: Array<string | number>, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return values.some((value) => String(value).toLowerCase().includes(normalized));
}

function numberFormat(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getTeacherAlmanacIsoDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date.slice(0, 10);

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isSameTeacherAlmanacDay(itemDate: string, selectedDate: string) {
  return getTeacherAlmanacIsoDate(itemDate) === selectedDate.slice(0, 10);
}

function formatTeacherAnnouncementDate(date = new Date()) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            {eyebrow}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  trend: string;
  icon: IconType;
}) {
  return (
    <Card className="min-h-32 p-4 transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <span className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {trend}
        </span>
      </div>
      <div className="mt-6">
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

function FilterChips({
  items,
  active,
  onChange,
}: {
  items: string[];
  active: string;
  onChange: (item: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Button
          key={item}
          type="button"
          size="sm"
          variant={active === item ? "default" : "secondary"}
          onClick={() => onChange(item)}
        >
          {item}
        </Button>
      ))}
    </div>
  );
}

function ViewTabs<T extends string>({
  items,
  active,
  onChange,
}: {
  items: ReadonlyArray<{ key: T; label: string; icon: IconType }>;
  active: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-full bg-surface-muted p-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Button
            key={item.key}
            type="button"
            size="sm"
            variant={active === item.key ? "default" : "ghost"}
            className="rounded-full"
            onClick={() => onChange(item.key)}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Button>
        );
      })}
    </div>
  );
}

function ChartViewMenu({
  value,
  onChange,
}: {
  value: ChartView;
  onChange: (value: ChartView) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Switch chart view"
          className="h-9 w-9 p-0"
          type="button"
          variant="secondary"
        >
          <FiMoreVertical className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {(Object.keys(chartViewLabels) as ChartView[]).map((view) => (
          <DropdownMenuItem key={view} onClick={() => onChange(view)}>
            {value === view ? (
              <FiCheckCircle className="h-4 w-4 text-primary" aria-hidden="true" />
            ) : (
              <span className="h-4 w-4" aria-hidden="true" />
            )}
            {chartViewLabels[view]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TeacherActivityChart({ view }: { view: ChartView }) {
  const commonProps = {
    data: teacherActivityChartData,
    margin: { top: 12, right: 24, left: -12, bottom: 0 },
  };

  if (view === "line") {
    return (
      <LineChart {...commonProps}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="4 5" vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line type="monotone" dataKey="students" stroke="var(--chart-primary)" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="projects" stroke="var(--chart-secondary)" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="events" stroke="var(--chart-tertiary)" strokeWidth={3} dot={false} />
      </LineChart>
    );
  }

  if (view === "area") {
    return (
      <AreaChart {...commonProps}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="4 5" vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Area type="monotone" dataKey="students" stroke="var(--chart-primary)" fill="var(--chart-primary)" fillOpacity={0.18} strokeWidth={2.5} />
        <Area type="monotone" dataKey="projects" stroke="var(--chart-secondary)" fill="var(--chart-secondary)" fillOpacity={0.14} strokeWidth={2.5} />
        <Area type="monotone" dataKey="events" stroke="var(--chart-tertiary)" fill="var(--chart-tertiary)" fillOpacity={0.14} strokeWidth={2.5} />
      </AreaChart>
    );
  }

  return (
    <BarChart {...commonProps} barCategoryGap="18%" barGap={8}>
      <CartesianGrid stroke="var(--border)" strokeDasharray="4 5" vertical={false} />
      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
      <Tooltip />
      <Bar dataKey="students" fill="var(--chart-primary)" radius={[7, 7, 0, 0]} />
      <Bar dataKey="projects" fill="var(--chart-secondary)" radius={[7, 7, 0, 0]} />
      <Bar dataKey="events" fill="var(--chart-tertiary)" radius={[7, 7, 0, 0]} />
    </BarChart>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full max-w-md">
      <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <CampusInput
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}

function Avatar({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary",
        className,
      )}
    >
      {label}
    </span>
  );
}

function ImageBlock({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("bg-cover bg-center", className)}
      style={{ backgroundImage: `url(${src})` }}
    />
  );
}

function AnnouncementCard({
  announcement,
  onView,
}: {
  announcement: TeacherAnnouncement;
  onView: (announcement: TeacherAnnouncement) => void;
}) {
  return (
    <Card className="flex min-h-64 flex-col p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-md bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {announcement.category}
        </span>
        {announcement.pinned ? (
          <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            Pinned
          </span>
        ) : null}
      </div>
      <div className="mt-6 flex-1 space-y-3">
        <h3 className="text-lg font-semibold text-foreground">
          {announcement.title}
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">
          {announcement.summary}
        </p>
        <div className="inline-flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs font-medium text-muted-foreground">
          <FiUsers className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          {announcement.audience}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{announcement.date}</span>
        <Button type="button" variant="secondary" onClick={() => onView(announcement)}>
          <FiEye className="h-4 w-4" />
          View
        </Button>
      </div>
    </Card>
  );
}

function EventCard({
  event,
  onView,
}: {
  event: TeacherEvent;
  onView: (event: TeacherEvent) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <ImageBlock src={event.banner} className="h-44 w-full" />
      <div className="flex min-h-72 flex-col p-5">
        <div className="flex items-center justify-between">
          <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {event.category}
          </span>
          <span className="rounded-md bg-surface-muted px-2.5 py-1 text-xs text-muted-foreground">
            {event.status}
          </span>
        </div>
        <div className="mt-5 flex-1 space-y-3">
          <h3 className="text-lg font-semibold text-foreground">{event.title}</h3>
          <p className="text-sm leading-6 text-muted-foreground">
            {event.description}
          </p>
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <span className="flex items-center gap-2">
              <FiCalendar className="h-4 w-4 text-primary" />
              {event.date}
            </span>
            <span className="flex items-center gap-2">
              <FiUsers className="h-4 w-4 text-primary" />
              {event.attendees} attending
            </span>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button
            type="button"
            onClick={() =>
              campusToast.success({
                title: "RSVP Submitted",
                description: `${event.title} has been added to your teacher schedule.`,
              })
            }
          >
            RSVP
          </Button>
          <Button type="button" variant="secondary" onClick={() => onView(event)}>
            <FiEye className="h-4 w-4" />
            Details
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ProjectCard({
  project,
  onView,
}: {
  project: TeacherProject;
  onView: (project: TeacherProject) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <ImageBlock src={project.image} className="h-48 w-full" />
        <Button
          aria-label="Star project"
          className="absolute right-3 top-3 rounded-full"
          size="icon"
          type="button"
          variant="secondary"
          onClick={() =>
            campusToast.success({
              title: "Project Starred",
              description: `${project.name} has been added to your starred projects.`,
            })
          }
        >
          <FiStar className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex min-h-80 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground">{project.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {project.owner} · {project.department}
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {project.status}
          </span>
        </div>
        <p className="mt-4 flex-1 text-sm leading-6 text-muted-foreground">
          {project.summary}
        </p>
        <div className="mt-5 flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <FiEye className="h-4 w-4" />
            {numberFormat(project.views)}
          </span>
          <span className="flex items-center gap-2">
            <FiStar className="h-4 w-4 text-amber-500" />
            {numberFormat(project.stars)}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button type="button" variant="secondary" onClick={() => onView(project)}>
            <FiEye className="h-4 w-4" />
            View Project
          </Button>
          <Button
            type="button"
            onClick={() =>
              campusToast.success({
                title: "Project Marked for Review",
                description: `${project.name} was added to your teacher review queue.`,
              })
            }
          >
            <FiFileText className="h-4 w-4" />
            Review
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ProjectListPanel({
  title,
  description,
  projects,
  onView,
}: {
  title: string;
  description: string;
  projects: TeacherProject[];
  onView: (project: TeacherProject) => void;
}) {
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {projects.length} projects
        </span>
      </div>
      <div className="space-y-3">
        {projects.map((project, index) => (
          <button
            key={project.id}
            type="button"
            className="flex w-full items-center gap-4 rounded-lg bg-surface-muted p-3 text-left transition-colors hover:bg-surface-raised"
            onClick={() => onView(project)}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {index + 1}
            </span>
            <ImageBlock src={project.image} className="h-12 w-16 shrink-0 rounded-md" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-foreground">{project.name}</span>
              <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                {project.owner} · {project.category}
              </span>
            </span>
            <span className="hidden text-sm font-semibold text-primary sm:block">
              {numberFormat(project.stars)} stars
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function TeacherShowcaseCharts({ projects }: { projects: TeacherProject[] }) {
  const categoryData = Object.values(
    projects.reduce<
      Record<
        string,
        { category: string; projects: number; views: number; stars: number }
      >
    >((acc, project) => {
      acc[project.category] ??= {
        category: project.category,
        projects: 0,
        views: 0,
        stars: 0,
      };
      acc[project.category].projects += 1;
      acc[project.category].views += project.views;
      acc[project.category].stars += project.stars;
      return acc;
    }, {}),
  );
  const projectSignalData = projects.map((project) => ({
    name: project.name,
    views: project.views,
    stars: project.stars,
  }));

  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <Card>
        <CardHeader>
          <CardTitle>Showcase Engagement</CardTitle>
          <p className="text-sm text-muted-foreground">
            Views and stars across current student project categories.
          </p>
        </CardHeader>
        <CardContent className="px-2 pb-5 pt-0 sm:px-4">
          <ResponsiveContainer width="100%" height={320} minWidth={0}>
            <BarChart
              data={categoryData}
              margin={{ top: 12, right: 24, left: -12, bottom: 0 }}
              barCategoryGap="22%"
              barGap={8}
            >
              <CartesianGrid stroke="var(--border)" strokeDasharray="4 5" vertical={false} />
              <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="views" fill="var(--chart-primary)" radius={[7, 7, 0, 0]} />
              <Bar dataKey="stars" fill="var(--chart-secondary)" radius={[7, 7, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project Signal Trend</CardTitle>
          <p className="text-sm text-muted-foreground">
            Faculty-visible project attention by published work.
          </p>
        </CardHeader>
        <CardContent className="px-2 pb-5 pt-0 sm:px-4">
          <ResponsiveContainer width="100%" height={320} minWidth={0}>
            <AreaChart
              data={projectSignalData}
              margin={{ top: 12, right: 24, left: -12, bottom: 0 }}
            >
              <CartesianGrid stroke="var(--border)" strokeDasharray="4 5" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="views"
                stroke="var(--chart-primary)"
                fill="var(--chart-primary)"
                fillOpacity={0.18}
                strokeWidth={2.5}
              />
              <Area
                type="monotone"
                dataKey="stars"
                stroke="var(--chart-tertiary)"
                fill="var(--chart-tertiary)"
                fillOpacity={0.16}
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function TopTalentPanel() {
  const rankedStudents = teacherStudents
    .slice()
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 5);
  const topXp = Math.max(...rankedStudents.map((student) => student.xp));

  return (
    <div className="w-full">
      <Card className="p-5">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Talent Signals</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ranking strength based on XP, project count, status, and skill signals.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 px-0 pb-0">
          {rankedStudents.map((student, index) => (
            <div key={student.id} className="rounded-lg border border-border bg-surface-muted p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <Avatar label={student.photo} />
                  <div>
                    <p className="font-semibold text-foreground">{student.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {student.year} · {student.department}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {student.status}
                </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-background">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(18, (student.xp / topXp) * 100)}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{student.projects} projects</span>
                <span className="font-semibold text-primary">{numberFormat(student.xp)} XP</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {student.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md bg-background px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewedProjectsPanel({
  projects,
  onView,
}: {
  projects: TeacherProject[];
  onView: (project: TeacherProject) => void;
}) {
  const [query, setQuery] = useState("");
  const filteredProjects = projects.filter((project) =>
    [
      project.name,
      project.owner,
      project.category,
      project.department,
      project.status,
      project.summary,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const totalViews = projects.reduce((sum, project) => sum + project.views, 0);
  const totalStars = projects.reduce((sum, project) => sum + project.stars, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={FiEye}
          label="Reviewed reach"
          value={numberFormat(totalViews)}
          trend="views"
        />
        <MetricCard
          icon={FiStar}
          label="Saved interest"
          value={numberFormat(totalStars)}
          trend="stars"
        />
        <MetricCard
          icon={FiFileText}
          label="Review documents"
          value={numberFormat(projects.flatMap((project) => project.documents).length)}
          trend="docs"
        />
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-semibold text-foreground">Projects Reviewed</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Search and manage reviewed, saved, or follow-up project work.
            </p>
          </div>
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Search reviewed projects"
          />
        </div>

        {filteredProjects.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {filteredProjects.map((project, index) => (
              <div key={project.id} className="flex min-h-[28rem] flex-col overflow-hidden rounded-lg border border-border bg-surface">
                <ImageBlock src={project.image} className="h-36 w-full" />
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {project.status}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{project.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {project.owner} · {project.category}
                    </p>
                  </div>
                  <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {project.summary}
                  </p>
                  <div className="mt-auto grid gap-2 sm:grid-cols-2">
                    <Button type="button" variant="secondary" onClick={() => onView(project)}>
                      <FiEye className="h-4 w-4" />
                      View
                    </Button>
                    <Button
                      type="button"
                      onClick={() =>
                        campusToast.success({
                          title: "Follow-up Marked",
                          description: `${project.name} was marked for faculty follow-up.`,
                        })
                      }
                    >
                      <FiSave className="h-4 w-4" />
                      Follow up
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            className="mt-5"
            title="No reviewed projects found"
            description="Try another search term to find reviewed projects."
            filterName={query}
          />
        )}
      </Card>
    </div>
  );
}

function PollCard({
  poll,
  onView,
}: {
  poll: TeacherPoll;
  onView: (poll: TeacherPoll) => void;
}) {
  const [selected, setSelected] = useState("");
  const canVote = poll.status === "Active";

  return (
    <Card className="flex min-h-[30rem] flex-col p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md bg-surface-muted px-2.5 py-1 text-xs text-muted-foreground">
            {poll.category}
          </span>
          <span className="rounded-md bg-surface-muted px-2.5 py-1 text-xs text-muted-foreground">
            {poll.status}
          </span>
        </div>
        <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs text-primary">
          {poll.ends}
        </span>
      </div>
      <div className="mt-5 flex-1 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {poll.question}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {poll.description}
          </p>
        </div>
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <p>{poll.createdBy}</p>
          <p>{poll.responses} responses</p>
          <p>Results: {poll.visibility}</p>
        </div>
        {canVote ? (
          <div className="space-y-2">
            {poll.options.map((option) => (
              <Button
                key={option.label}
                type="button"
                variant={selected === option.label ? "default" : "secondary"}
                className="w-full justify-start"
                onClick={() => setSelected(option.label)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        ) : (
          <div className="space-y-3 rounded-lg bg-surface-muted p-4">
            {poll.options.map((option) => (
              <div key={option.label}>
                <div className="flex justify-between text-sm">
                  <span>{option.label}</span>
                  <span>{option.percent}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${option.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button
          type="button"
          disabled={canVote && !selected}
          onClick={() =>
            campusToast.success({
              title: canVote ? "Vote Submitted" : "Poll Saved",
              description: canVote
                ? `Your vote for "${selected}" was recorded.`
                : `${poll.question} has been saved.`,
            })
          }
        >
          {canVote ? "Vote" : "Save"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => onView(poll)}>
          <FiEye className="h-4 w-4" />
          Details
        </Button>
      </div>
    </Card>
  );
}

function DetailDrawer({
  title,
  subtitle,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Drawer title={title} open={open} onOpenChange={onOpenChange}>
      {subtitle ? <p className="mb-6 text-sm text-muted-foreground">{subtitle}</p> : null}
      {children}
    </Drawer>
  );
}

function TeacherEventForm({ onComplete }: { onComplete: () => void }) {
  const form = useForm<TeacherEventFormValues>({
    resolver: zodResolver(teacherEventSchema),
    defaultValues: {
      title: "Research methods clinic",
      category: "Research",
      date: "",
      time: "",
      venue: "CoICT Innovation Lab",
      audience: "Final year students",
      capacity: 80,
      description:
        "A practical clinic where teachers guide student teams through project scoping, research methods, and review expectations.",
    },
  });

  return (
    <form
      className="space-y-5"
      onSubmit={form.handleSubmit(() => {
        campusToast.success({
          title: "Event Created",
          description: "The academic event has been prepared locally for preview.",
        });
        onComplete();
      })}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Event Title
          <CampusInput placeholder="Research methods clinic" {...form.register("title")} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Category
          <Select
            value={form.watch("category")}
            onValueChange={(value) => form.setValue("category", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select event category" />
            </SelectTrigger>
            <SelectContent>
              {["Research", "Technology", "Career", "Academic", "Workshop"].map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Date
          <CampusInput type="date" {...form.register("date")} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Time
          <CampusInput type="time" {...form.register("time")} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Venue
          <CampusInput placeholder="CoICT Innovation Lab" {...form.register("venue")} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Capacity
          <CampusInput type="number" placeholder="80" {...form.register("capacity")} />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium text-foreground">
        Audience
        <CampusInput placeholder="Final year students" {...form.register("audience")} />
      </label>
      <label className="grid gap-2 text-sm font-medium text-foreground">
        Description
        <CampusTextarea
          rows={5}
          placeholder="Describe the event, expected participants, and teacher involvement."
          {...form.register("description")}
        />
      </label>
      <Button type="submit" className="w-full">
        <FiPlus className="h-4 w-4" />
        Create Event
      </Button>
    </form>
  );
}

function TeacherAnnouncementForm({
  audience,
  onCreate,
}: {
  audience: string;
  onCreate: (values: TeacherAnnouncementFormValues) => void;
}) {
  const form = useForm<TeacherAnnouncementFormValues>({
    resolver: zodResolver(teacherAnnouncementSchema),
    defaultValues: {
      title: "",
      category: "Academic",
      summary: "",
      attachments: [],
    },
  });
  const attachments = useFieldArray({
    control: form.control,
    name: "attachments",
  });

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onCreate)}>
      <label className="grid gap-2 text-sm font-medium text-foreground">
        Announcement Title
        <CampusInput
          placeholder="Project consultation schedule update"
          {...form.register("title")}
        />
      </label>
      <div className="grid gap-5 md:grid-cols-2 md:items-start">
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Category
          <Select
            value={form.watch("category")}
            onValueChange={(value) => form.setValue("category", value)}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select announcement category" />
            </SelectTrigger>
            <SelectContent>
              {announcementCategories
                .filter((item) => item !== "All")
                .map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Audience
          <CampusInput className="h-11" value={audience} readOnly />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium text-foreground">
        Message
        <CampusTextarea
          rows={5}
          placeholder="Write the update students in your department need to see."
          {...form.register("summary")}
        />
      </label>
      <div className="space-y-4 rounded-lg border border-border bg-surface-muted p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Attachments</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Add links, documents, images, or videos students can open for more details.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => attachments.append({ type: "link", label: "", url: "" })}
          >
            <FiPlus className="h-4 w-4" />
            {attachments.fields.length ? "Add Another Attachment" : "Add Attachment"}
          </Button>
        </div>
        {attachments.fields.length ? (
          <div className="space-y-3">
            {attachments.fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border border-border bg-background p-3">
                <div className="grid gap-3 lg:grid-cols-[10rem_1fr_1fr_auto] lg:items-end">
                  <label className="grid gap-2 text-sm font-medium text-foreground">
                    Type
                    <Select
                      value={form.watch(`attachments.${index}.type`)}
                      onValueChange={(value) =>
                        form.setValue(
                          `attachments.${index}.type`,
                          value as TeacherAnnouncementFormValues["attachments"][number]["type"],
                        )
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="link">Link</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-foreground">
                    Label
                    <CampusInput
                      placeholder="View full instructions"
                      {...form.register(`attachments.${index}.label`)}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-foreground">
                    URL
                    <CampusInput
                      placeholder="https://..."
                      {...form.register(`attachments.${index}.url`)}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label="Remove attachment"
                    onClick={() => attachments.remove(index)}
                  >
                    <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <Button type="submit" className="w-full">
        <FiSend className="h-4 w-4" />
        Create Announcement
      </Button>
    </form>
  );
}

function TeacherPollForm({ onComplete }: { onComplete: () => void }) {
  const [options, setOptions] = useState(["Yes, this semester", "Next semester"]);
  const form = useForm<TeacherPollFormValues>({
    resolver: zodResolver(teacherPollSchema),
    defaultValues: {
      question: "Which project review format works best for final-year teams?",
      category: "Academic",
      audience: "Final year students",
      endDate: "",
      visibility: "Visible after voting",
      description:
        "Collect structured feedback before teachers finalize the review and mentoring format.",
    },
  });

  function updateOption(index: number, value: string) {
    setOptions((current) => current.map((option, itemIndex) => (itemIndex === index ? value : option)));
  }

  return (
    <form
      className="space-y-5"
      onSubmit={form.handleSubmit(() => {
        const cleanOptions = options.map((option) => option.trim()).filter(Boolean);
        if (cleanOptions.length < 2) {
          campusToast.error({
            title: "Poll Needs Options",
            description: "Add at least two answer options before creating the poll.",
          });
          return;
        }
        campusToast.success({
          title: "Poll Created",
          description: "The teacher poll has been prepared locally for preview.",
        });
        onComplete();
      })}
    >
      <label className="grid gap-2 text-sm font-medium text-foreground">
        Poll Question
        <CampusInput
          placeholder="Which project review format works best?"
          {...form.register("question")}
        />
      </label>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Category
          <Select
            value={form.watch("category")}
            onValueChange={(value) => form.setValue("category", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select poll category" />
            </SelectTrigger>
            <SelectContent>
              {["Academic", "Research", "Technology", "Career", "Student Welfare"].map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Audience
          <CampusInput placeholder="Final year students" {...form.register("audience")} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          End Date
          <CampusInput type="date" {...form.register("endDate")} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Results Visibility
          <Select
            value={form.watch("visibility")}
            onValueChange={(value) => form.setValue("visibility", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select visibility" />
            </SelectTrigger>
            <SelectContent>
              {["Always visible", "Visible after voting", "Visible after poll ends", "Hidden"].map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Options</p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setOptions((current) => [...current, ""])}
          >
            <FiPlus className="h-4 w-4" />
            Add Option
          </Button>
        </div>
        <div className="space-y-3">
          {options.map((option, index) => (
            <CampusInput
              key={index}
              value={option}
              onChange={(event) => updateOption(index, event.target.value)}
              placeholder={`Option ${index + 1}`}
            />
          ))}
        </div>
      </div>
      <label className="grid gap-2 text-sm font-medium text-foreground">
        Description
        <CampusTextarea
          rows={4}
          placeholder="Explain what decision or feedback this poll supports."
          {...form.register("description")}
        />
      </label>
      <Button type="submit" className="w-full">
        <FiPlus className="h-4 w-4" />
        Create Poll
      </Button>
    </form>
  );
}

export function TeacherDashboardView() {
  const [selectedProject, setSelectedProject] = useState<TeacherProject | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TeacherEvent | null>(null);
  const [chartView, setChartView] = useState<ChartView>("bar");

  return (
    <PageShell
      eyebrow="Teacher Portal"
      title={`Good morning, ${mockTeacherProfile.name.split(" ")[1]}.`}
      description="Track academic activity, discover student talent, and stay connected to your university ecosystem."
      actions={
        <Button asChild>
          <Link href="/teacher/showcase">
            <FiStar className="h-4 w-4" />
            Discover Projects
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {teacherStats.map((stat, index) => (
          <MetricCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            trend={stat.trend}
            icon={[FiUsers, FiStar, FiCalendar, FiUser, FiPieChart][index]}
          />
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start gap-4">
          <ChartViewMenu value={chartView} onChange={setChartView} />
          <div className="space-y-1">
            <CardTitle>Academic Activity Trends</CardTitle>
            <p className="text-sm text-muted-foreground">
              Saved students, reviewed projects, and academic events over time.
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-5 pt-0 sm:px-4">
          <div className="w-full min-w-0">
            <ResponsiveContainer width="100%" height={360} minWidth={0}>
              <TeacherActivityChart view={chartView} />
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr_1fr]">
        <Card className="xl:row-span-2">
          <CardHeader>
            <CardTitle>Trending Student Projects</CardTitle>
            <p className="text-sm text-muted-foreground">
              Projects gaining attention from faculty and campus reviewers.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {teacherProjects.slice(0, 3).map((project) => (
              <button
                key={project.id}
                type="button"
                className="flex w-full items-center gap-4 rounded-lg bg-surface-muted p-3 text-left transition-colors hover:bg-surface-raised"
                onClick={() => setSelectedProject(project)}
              >
                <ImageBlock src={project.image} className="h-16 w-20 shrink-0 rounded-md" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground">
                    {project.name}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {project.owner} · {project.category}
                  </span>
                </span>
                <span className="text-sm font-semibold text-primary">
                  {project.stars} stars
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teacherAnnouncements.slice(0, 3).map((announcement) => (
              <div key={announcement.id} className="rounded-lg bg-surface-muted p-3">
                <p className="font-medium text-foreground">{announcement.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {announcement.category} · {announcement.date}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Academic Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teacherEvents.slice(0, 3).map((event) => (
              <button
                key={event.id}
                type="button"
                className="w-full rounded-lg bg-surface-muted p-3 text-left hover:bg-surface-raised"
                onClick={() => setSelectedEvent(event)}
              >
                <p className="font-medium text-foreground">{event.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {event.date} · {event.venue}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Innovators</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teacherStudents
              .slice()
              .sort((a, b) => b.xp - a.xp)
              .slice(0, 4)
              .map((student, index) => (
                <div key={student.id} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{student.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {numberFormat(student.xp)} XP
                    </p>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Polls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teacherPolls.slice(0, 2).map((poll) => (
              <div key={poll.id} className="rounded-lg bg-surface-muted p-3">
                <p className="font-medium text-foreground">{poll.question}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {poll.responses} responses · {poll.status}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Teacher Review Queue</CardTitle>
            <p className="text-sm text-muted-foreground">
              Student work and academic signals that need faculty attention.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {teacherProjects.slice(0, 2).map((project) => (
              <button
                key={project.id}
                type="button"
                className="rounded-lg bg-surface-muted p-3 text-left transition-colors hover:bg-surface-raised"
                onClick={() => setSelectedProject(project)}
              >
                <p className="font-medium text-foreground">{project.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {project.department} · {project.status}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <DetailDrawer
        title={selectedProject?.name ?? ""}
        subtitle={selectedProject?.owner}
        open={Boolean(selectedProject)}
        onOpenChange={(open) => !open && setSelectedProject(null)}
      >
        {selectedProject ? <ProjectDetails project={selectedProject} /> : null}
      </DetailDrawer>
      <DetailDrawer
        title={selectedEvent?.title ?? ""}
        subtitle={selectedEvent?.venue}
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      >
        {selectedEvent ? <EventDetails event={selectedEvent} /> : null}
      </DetailDrawer>
    </PageShell>
  );
}

export function TeacherAnnouncementsView() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [announcements, setAnnouncements] = useState(teacherAnnouncements);
  const [selected, setSelected] = useState<TeacherAnnouncement | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const departmentAudience = `Students in ${mockTeacherProfile.department}`;

  const filtered = useMemo(
    () =>
      announcements.filter(
        (announcement) =>
          (category === "All" || announcement.category === category) &&
          matchesQuery(
            [
              announcement.title,
              announcement.summary,
              announcement.category,
              announcement.audience,
            ],
            query,
          ),
      ),
    [announcements, category, query],
  );

  function createAnnouncement(values: TeacherAnnouncementFormValues) {
    const resolvedAttachments = values.attachments
      .map((attachment) => {
        const url = attachment.url?.trim();

        if (!url) return null;

        return {
          label: attachment.label?.trim() || "View more",
          url,
          type: attachment.type === "media" ? ("Media" as const) : ("Link" as const),
        };
      })
      .filter((attachment): attachment is NonNullable<typeof attachment> =>
        Boolean(attachment),
      );
    const announcement: TeacherAnnouncement = {
      id: `ann-${Date.now()}`,
      title: values.title,
      summary: values.summary,
      category: values.category,
      audience: departmentAudience,
      date: formatTeacherAnnouncementDate(),
      attachments: resolvedAttachments.length ? resolvedAttachments : undefined,
      pinned: true,
    };

    setAnnouncements((current) => [announcement, ...current]);
    setCreateOpen(false);
    campusToast.success({
      title: "Announcement Created",
      description: `Sent to ${departmentAudience.toLowerCase()}.`,
    });
  }

  return (
    <PageShell
      eyebrow="Announcements"
      title="Academic updates and university news."
      description="Stay aligned with academic notices, research updates, student welfare information, and university-wide communication."
      actions={
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <FiPlus className="h-4 w-4" />
          Create Announcement
        </Button>
      }
    >
      <div className="space-y-4">
        <SearchBox value={query} onChange={setQuery} placeholder="Search announcements" />
        <FilterChips items={announcementCategories} active={category} onChange={setCategory} />
      </div>
      {filtered.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onView={setSelected}
            />
          ))}
        </div>
      ) : (
        <Empty
          title="No announcements found"
          description={
            category === "All"
              ? "No announcements match your search."
              : `No data for the filter "${category}".`
          }
          icon={FiBell}
          filterName={category === "All" ? query : category}
        />
      )}
      <Modal
        title={selected?.title ?? ""}
        description={selected?.audience}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        {selected ? (
          <div className="space-y-5">
            <div className="rounded-lg bg-surface-muted p-5">
              <p className="text-sm leading-6 text-muted-foreground">
                {selected.summary}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile label="Category" value={selected.category} />
              <InfoTile label="Date" value={selected.date} />
              <InfoTile label="Audience" value={selected.audience} />
              <InfoTile label="Status" value={selected.pinned ? "Pinned" : "Published"} />
            </div>
            {selected.attachments?.length ? (
              <div className="space-y-3 rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Attachments
                </p>
                {selected.attachments.map((attachment) => (
                  <div key={`${attachment.type}-${attachment.url}`} className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {attachment.type === "Media" ? (
                        <FiDownload className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <FiExternalLink className="h-4 w-4" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {attachment.type}
                      </p>
                      <a
                        className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                        href={attachment.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {attachment.label}
                        <FiExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
      <Modal
        title="Create Announcement"
        description={`Publish an announcement to ${departmentAudience}.`}
        open={createOpen}
        onOpenChange={setCreateOpen}
      >
        <TeacherAnnouncementForm
          audience={departmentAudience}
          onCreate={createAnnouncement}
        />
      </Modal>
    </PageShell>
  );
}

export function TeacherAlmanacView() {
  const [mode, setMode] = useState<AlmanacMode>("calendar");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selected, setSelected] = useState<TeacherAlmanacItem | null>(null);
  const almanacTypes = [
    "All",
    ...Array.from(new Set(teacherAlmanacItems.map((item) => item.type))),
  ];
  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();

    return teacherAlmanacItems.filter((item) => {
      const typeMatch = typeFilter === "All" || item.type === typeFilter;
      const queryMatch =
        !normalized ||
        [item.title, item.type, item.venue, item.description]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return typeMatch && queryMatch;
    });
  }, [query, typeFilter]);
  const items =
    mode === "exams"
      ? filtered.filter((item) => item.type === "Exam")
      : mode === "deadlines"
        ? filtered.filter((item) => item.type === "Deadline")
        : filtered;
  const selectedDateItems = selectedDate
    ? filtered.filter((item) => isSameTeacherAlmanacDay(item.date, selectedDate))
    : [];

  return (
    <PageShell
      eyebrow="Academic Almanac"
      title="Calendar for academic rhythm."
      description="Follow exams, deadlines, university activities, and department events in one academic timeline."
      actions={<ViewTabs items={almanacModes} active={mode} onChange={setMode} />}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBox value={query} onChange={setQuery} placeholder="Search almanac" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {almanacTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {mode === "calendar" ? (
        <CalendarPanel
          items={items}
          onDateSelect={setSelectedDate}
          onSelect={setSelected}
        />
      ) : mode === "timeline" ? (
        <TimelinePanel items={items} onSelect={setSelected} />
      ) : items.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <AlmanacCard key={item.id} item={item} onSelect={setSelected} />
          ))}
        </div>
      ) : (
        <Empty
          title="No almanac items"
          description={`No data for the filter "${mode}".`}
          icon={FiCalendar}
          filterName={mode}
        />
      )}
      <Drawer
        open={Boolean(selectedDate)}
        onOpenChange={(open) => !open && setSelectedDate(null)}
        title={
          selectedDate
            ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })
            : "Calendar date"
        }
        description="Academic activities scheduled for this date."
        className="max-w-xl"
      >
        {selectedDate ? (
          <div className="space-y-3">
            {selectedDateItems.length > 0 ? (
              selectedDateItems.map((item) => (
                <button
                  key={item.id}
                  className="w-full rounded-lg border border-border bg-background p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  type="button"
                  onClick={() => setSelected(item)}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                    {item.type}
                  </p>
                  <h3 className="mt-2 text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.time} · {item.venue}
                  </p>
                </button>
              ))
            ) : (
              <Empty
                className="border-0 bg-transparent p-0"
                title="No activities on this date"
                description="There are no published teacher almanac items for this date."
              />
            )}
          </div>
        ) : null}
      </Drawer>
      <DetailDrawer
        title={selected?.title ?? ""}
        subtitle={selected?.type}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        {selected ? <AlmanacDetails item={selected} /> : null}
      </DetailDrawer>
    </PageShell>
  );
}

export function TeacherEventsView() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"cards" | "calendar">("cards");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selected, setSelected] = useState<TeacherEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const filtered = useMemo(
    () =>
      teacherEvents.filter((event) =>
        matchesQuery([event.title, event.category, event.venue, event.description], query),
      ),
    [query],
  );

  return (
    <PageShell
      eyebrow="Events"
      title="Faculty participation and campus activity."
      description="Review academic, career, research, and technology events where teachers can mentor, RSVP, and participate."
      actions={
        <>
          <ViewTabs
            items={[
              { key: "cards", label: "Cards", icon: FiFilter },
              { key: "calendar", label: "Calendar", icon: FiCalendar },
            ]}
            active={mode}
            onChange={setMode}
          />
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <FiPlus className="h-4 w-4" />
            Create Event
          </Button>
        </>
      }
    >
      <SearchBox value={query} onChange={setQuery} placeholder="Search events" />
      {filtered.length > 0 ? (
        mode === "calendar" ? (
          <EventCalendarPanel
            events={filtered}
            onDateSelect={setSelectedDate}
            onSelect={setSelected}
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((event) => (
              <EventCard key={event.id} event={event} onView={setSelected} />
            ))}
          </div>
        )
      ) : (
        <Empty
          title="No events found"
          description="No events match your current search."
          icon={FiCalendar}
          filterName={query}
        />
      )}
      <Drawer
        open={Boolean(selectedDate)}
        onOpenChange={(open) => !open && setSelectedDate(null)}
        title={
          selectedDate
            ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })
            : "Calendar date"
        }
        description="Teacher events scheduled for this date."
        className="max-w-xl"
      >
        {selectedDate ? (
          <div className="space-y-3">
            {filtered.filter((event) => isSameTeacherAlmanacDay(event.date, selectedDate)).length > 0 ? (
              filtered
                .filter((event) => isSameTeacherAlmanacDay(event.date, selectedDate))
                .map((event) => (
                  <button
                    key={event.id}
                    className="w-full rounded-lg border border-border bg-background p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                    type="button"
                    onClick={() => setSelected(event)}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                      {event.category}
                    </p>
                    <h3 className="mt-2 text-sm font-semibold">{event.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.time} · {event.venue}
                    </p>
                  </button>
                ))
            ) : (
              <Empty
                className="border-0 bg-transparent p-0"
                title="No events on this date"
                description="There are no matching teacher events for this date."
              />
            )}
          </div>
        ) : null}
      </Drawer>
      <DetailDrawer
        title={selected?.title ?? ""}
        subtitle={selected?.venue}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        {selected ? <EventDetails event={selected} /> : null}
      </DetailDrawer>
      <Modal
        title="Create Event"
        description="Prepare an academic event, seminar, clinic, or review session."
        open={createOpen}
        onOpenChange={setCreateOpen}
      >
        <TeacherEventForm onComplete={() => setCreateOpen(false)} />
      </Modal>
    </PageShell>
  );
}

export function TeacherShowcaseView() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [mode, setMode] = useState<ShowcaseMode>("overview");
  const [selected, setSelected] = useState<TeacherProject | null>(null);
  const categories = ["All", ...Array.from(new Set(teacherProjects.map((project) => project.category)))];
  const filtered = useMemo(
    () =>
      teacherProjects.filter(
        (project) =>
          (category === "All" || project.category === category) &&
          matchesQuery(
            [
              project.name,
              project.owner,
              project.department,
              project.category,
              project.summary,
            ],
            query,
          ),
      ),
    [category, query],
  );

  return (
    <PageShell
      eyebrow="Teacher Showcase"
      title="Discover student research, projects, and innovation."
      description="Use Showcase to identify strong students, review project quality, and support academic or employability pathways."
    >
      <ViewTabs items={showcaseModes} active={mode} onChange={setMode} />

      {mode === "overview" ? (
        <>
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            {[
              { label: "Trending Projects", value: "18", icon: FiTrendingUp },
              { label: "Student Creators", value: "74", icon: FiUsers },
              { label: "Projects Reviewed", value: "32", icon: FiEye },
              { label: "Research Docs", value: "48", icon: FiFileText },
              { label: "Saved Projects", value: "11", icon: FiSave },
            ].map((item) => (
              <MetricCard
                key={item.label}
                label={item.label}
                value={item.value}
                trend="live"
                icon={item.icon}
              />
            ))}
          </div>
          <TeacherShowcaseCharts projects={teacherProjects} />
          <div className="grid gap-5 xl:grid-cols-2">
            <ProjectListPanel
              title="Faculty Review Queue"
              description="Projects with strong academic or research potential."
              projects={teacherProjects.slice(0, 3)}
              onView={setSelected}
            />
            <ProjectListPanel
              title="Recently Published"
              description="New work teachers can review, save, or recommend."
              projects={teacherProjects.slice().reverse().slice(0, 3)}
              onView={setSelected}
            />
          </div>
        </>
      ) : null}

      {mode === "projects" ? (
        <>
          <div className="space-y-4">
            <SearchBox value={query} onChange={setQuery} placeholder="Search projects, creators, tags" />
            <FilterChips items={categories} active={category} onChange={setCategory} />
          </div>
          {filtered.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {filtered.map((project) => (
                <ProjectCard key={project.id} project={project} onView={setSelected} />
              ))}
            </div>
          ) : (
            <Empty
              title="No projects found"
              description={`No data for the filter "${category}".`}
              icon={FiStar}
              filterName={category === "All" ? query : category}
            />
          )}
        </>
      ) : null}

      {mode === "talent" ? <TopTalentPanel /> : null}

      {mode === "reviewed" ? (
        <ReviewedProjectsPanel projects={teacherProjects} onView={setSelected} />
      ) : null}

      <DetailDrawer
        title={selected?.name ?? ""}
        subtitle={selected?.owner}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        {selected ? <ProjectDetails project={selected} /> : null}
      </DetailDrawer>
    </PageShell>
  );
}

export function TeacherStudentsView() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [layout, setLayout] = useState<"grid" | "list">("list");
  const [selected, setSelected] = useState<TeacherStudent | null>(null);
  const filtered = useMemo(
    () =>
      teacherStudents.filter(
        (student) =>
          (status === "All" || student.status === status) &&
          matchesQuery(
            [student.name, student.department, student.year, student.skills.join(" ")],
            query,
          ),
      ),
    [query, status],
  );

  const columns: DataTableColumn<TeacherStudent>[] = [
    {
      key: "photo",
      header: "Photo",
      cell: (student) => <Avatar label={student.photo} />,
    },
    { key: "name", header: "Name" },
    { key: "department", header: "Department" },
    { key: "year", header: "Year" },
    { key: "projects", header: "Projects" },
    {
      key: "xp",
      header: "XP",
      cell: (student) => numberFormat(student.xp),
    },
    { key: "badges", header: "Badges" },
    {
      key: "status",
      header: "Status",
      cell: (student) => (
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {student.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (student) => (
        <Button type="button" size="sm" variant="secondary" onClick={() => setSelected(student)}>
          <FiEye className="h-4 w-4" />
          View
        </Button>
      ),
    },
  ];

  return (
    <PageShell
      eyebrow="Student Discovery"
      title="Find student talent and academic potential."
      description="Review student profiles, projects, XP, badges, and contribution signals across your academic ecosystem."
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <SearchBox value={query} onChange={setQuery} placeholder="Search students" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {["All", "Active", "On Track", "Needs Support"].map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ViewTabs
          items={[
            { key: "grid", label: "Grid", icon: FiGrid },
            { key: "list", label: "List", icon: FiList },
          ]}
          active={layout}
          onChange={setLayout}
        />
      </div>
      {layout === "list" ? (
        <DataTable
          columns={columns}
          data={filtered}
          getRowId={(student) => student.id}
          empty={
            <Empty
              title="No students found"
              description={`No data for the filter "${status}".`}
              icon={FiUsers}
              filterName={status === "All" ? query : status}
            />
          }
        />
      ) : filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((student, index) => (
            <article
              key={student.id}
              className="flex min-h-[240px] flex-col rounded-lg border border-border bg-surface p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar label={student.photo} className="h-12 w-12 text-base" />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-foreground">{student.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {student.year} - {student.department}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    #{index + 1}
                  </span>
                  <span className="rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">
                    {numberFormat(student.xp)} XP
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Badges
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">{student.badges}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {student.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md bg-surface-muted px-3 py-1 text-xs text-muted-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              <div className="mt-auto pt-6">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => setSelected(student)}
                >
                  <FiEye className="h-4 w-4" />
                  View
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="No students found"
          description={`No data for the filter "${status}".`}
          icon={FiUsers}
          filterName={status === "All" ? query : status}
        />
      )}
      <DetailDrawer
        title={selected?.name ?? ""}
        subtitle={selected?.department}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        {selected ? <StudentDetails student={selected} /> : null}
      </DetailDrawer>
    </PageShell>
  );
}

export function TeacherForumView() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(teacherForumTopics[0]?.id ?? "");
  const selected =
    teacherForumTopics.find((topic) => topic.id === selectedId) ?? teacherForumTopics[0];
  const filtered = useMemo(
    () =>
      teacherForumTopics.filter((topic) =>
        matchesQuery([topic.title, topic.category, topic.author, topic.summary], query),
      ),
    [query],
  );

  return (
    <PageShell
      eyebrow="Forum"
      title="Academic conversations."
      description="Join discussions with students and faculty on academic support, research practice, and student project growth."
      actions={
        <Button
          type="button"
          onClick={() =>
            campusToast.success({
              title: "Discussion Followed",
              description: "You will receive updates on this conversation.",
            })
          }
        >
          <FiBell className="h-4 w-4" />
          Follow Topic
        </Button>
      }
    >
      <SearchBox value={query} onChange={setQuery} placeholder="Search discussions" />
      <div className="grid min-h-[42rem] overflow-hidden rounded-lg border border-border bg-surface lg:grid-cols-[20rem_1fr_22rem]">
        <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">Topics</p>
              <p className="text-sm text-muted-foreground">
                {filtered.length} discussions
              </p>
            </div>
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs text-muted-foreground">
              {filtered.filter((topic) => topic.replies > 20).length} trending
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {filtered.map((topic) => (
              <button
                key={topic.id}
                type="button"
                className={cn(
                  "w-full rounded-lg p-3 text-left transition-colors",
                  selected?.id === topic.id
                    ? "bg-primary/10 text-primary"
                    : "bg-surface-muted hover:bg-surface-raised",
                )}
                onClick={() => setSelectedId(topic.id)}
              >
                <span className="line-clamp-1 font-semibold">{topic.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {topic.replies} replies · {topic.category}
                </span>
              </button>
            ))}
          </div>
        </div>
        {selected ? <DiscussionPanel topic={selected} /> : null}
        {selected ? <DiscussionSidebar topic={selected} /> : null}
      </div>
    </PageShell>
  );
}

export function TeacherPollsView() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<PollMode>("active");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<TeacherPoll | null>(null);
  const filtered = useMemo(() => {
    const byMode =
      mode === "active"
        ? teacherPolls.filter((poll) => poll.status === "Active")
        : mode === "closed"
          ? teacherPolls.filter((poll) => poll.status === "Closed")
          : teacherPolls.filter((poll) => poll.status === "Voted");
    return byMode.filter((poll) =>
      matchesQuery([poll.question, poll.description, poll.category, poll.createdBy], query),
    );
  }, [mode, query]);

  return (
    <PageShell
      eyebrow="Polls"
      title="Create and participate in academic decisions."
      description="Create teacher-led polls, vote in relevant polls, and review closed results from academic, career, and research conversations."
      actions={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ViewTabs items={pollModes} active={mode} onChange={setMode} />
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <FiPlus className="h-4 w-4" />
            Create Poll
          </Button>
        </div>
      }
    >
      <SearchBox value={query} onChange={setQuery} placeholder="Search polls" />
      {filtered.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((poll) => (
            <PollCard key={poll.id} poll={poll} onView={setSelected} />
          ))}
        </div>
      ) : (
        <Empty
          title="No polls found"
          description={`No data for the filter "${pollModes.find((item) => item.key === mode)?.label}".`}
          icon={FiPieChart}
          filterName={mode}
        />
      )}
      <DetailDrawer
        title={selected?.question ?? ""}
        subtitle={selected?.createdBy}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        {selected ? <PollDetails poll={selected} /> : null}
      </DetailDrawer>
      <Modal
        title="Create Poll"
        description="Collect structured academic feedback from students and stakeholders."
        open={createOpen}
        onOpenChange={setCreateOpen}
      >
        <TeacherPollForm onComplete={() => setCreateOpen(false)} />
      </Modal>
    </PageShell>
  );
}

export function TeacherProfileView() {
  const [editOpen, setEditOpen] = useState(false);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      office: mockTeacherProfile.office,
      interests: mockTeacherProfile.interests.join(", "),
    },
  });

  return (
    <PageShell
      eyebrow="Profile"
      title="Academic profile."
      description="Manage your teacher identity, academic interests, participation signals, and professional context."
      actions={
        <Button type="button" onClick={() => setEditOpen(true)}>
          <FiUser className="h-4 w-4" />
          Edit Profile
        </Button>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <Card className="p-6">
          <Avatar label={mockTeacherProfile.avatar} className="h-20 w-20 text-xl" />
          <h2 className="mt-5 text-2xl font-semibold text-foreground">
            {mockTeacherProfile.name}
          </h2>
          <p className="text-muted-foreground">{mockTeacherProfile.title}</p>
          <div className="mt-6 grid gap-3">
            <InfoTile label="Department" value={mockTeacherProfile.department} />
            <InfoTile label="College" value={mockTeacherProfile.college} />
            <InfoTile label="Office" value={mockTeacherProfile.office} />
            <InfoTile label="Email" value={mockTeacherProfile.email} />
          </div>
        </Card>
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Participation Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                ["Projects Reviewed", "32"],
                ["Students Saved", "148"],
                ["Polls Created", "7"],
                ["Events Hosted", "9"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-lg bg-surface-muted p-4">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-xl font-semibold text-foreground">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Academic Interests</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {mockTeacherProfile.interests.map((interest) => (
                <span
                  key={interest}
                  className="rounded-full bg-primary/10 px-3 py-1.5 text-sm text-primary"
                >
                  {interest}
                </span>
              ))}
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {["Research Mentor", "Project Reviewer", "Talent Scout"].map((item) => (
                <div key={item} className="rounded-lg bg-surface-muted p-4">
                  <FiAward className="h-5 w-5 text-primary" />
                  <p className="mt-3 font-semibold text-foreground">{item}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Earned through teacher participation and academic support.
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      <Modal
        title="Edit Profile"
        description="Update visible academic information."
        open={editOpen}
        onOpenChange={setEditOpen}
      >
        <form
          className="space-y-5"
          onSubmit={form.handleSubmit(() => {
            campusToast.success({
              title: "Profile Updated",
              description: "Your teacher profile changes have been saved locally.",
            });
            setEditOpen(false);
          })}
        >
          <label className="grid gap-2 text-sm font-medium text-foreground">
            Office
            <CampusInput placeholder="CoICT Block B, Office 214" {...form.register("office")} />
          </label>
          <label className="grid gap-2 text-sm font-medium text-foreground">
            Interests
            <CampusTextarea
              placeholder="Artificial Intelligence, Software Engineering, Research Methods"
              rows={5}
              {...form.register("interests")}
            />
          </label>
          <Button type="submit" className="w-full">
            Save Profile
          </Button>
        </form>
      </Modal>
    </PageShell>
  );
}

export function TeacherNotificationsView() {
  const [filter, setFilter] = useState("All");
  const [notifications, setNotifications] = useState(teacherNotifications);
  const categories = ["All", "Unread", ...Array.from(new Set(teacherNotifications.map((item) => item.type)))];
  const filtered = notifications.filter((notification) => {
    if (filter === "All") return true;
    if (filter === "Unread") return notification.unread;
    return notification.type === filter;
  });
  const viewNotification = (notification: TeacherNotification) => {
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, unread: false } : item,
      ),
    );
    campusToast.info({
      title: notification.title,
      description: notification.description,
    });
  };
  const markNotificationRead = (id: string) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, unread: false } : item)),
    );
  };
  const clearNotification = (id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  };

  return (
    <PageShell
      eyebrow="Notifications"
      title="Teacher notification center."
      description="Review academic notices, events, polls, forum activity, showcase updates, and university alerts."
      actions={
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              setNotifications((current) =>
                current.map((notification) => ({ ...notification, unread: false })),
              )
            }
          >
            Mark read
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setNotifications([])}
          >
            Clear all
          </Button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        <Card className="h-fit p-4 lg:sticky lg:top-24">
          <div className="space-y-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                  filter === category
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-surface-muted",
                )}
                onClick={() => setFilter(category)}
              >
                <span>{category}</span>
                <span>
                  {category === "All"
                    ? notifications.length
                    : category === "Unread"
                      ? notifications.filter((item) => item.unread).length
                      : notifications.filter((item) => item.type === category).length}
                </span>
              </button>
            ))}
          </div>
        </Card>
        <div className="max-h-[calc(100vh-14rem)] space-y-3 overflow-y-auto pr-1">
          {filtered.length > 0 ? (
            filtered.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onClear={clearNotification}
                onMarkRead={markNotificationRead}
                onView={viewNotification}
              />
            ))
          ) : (
            <Empty
              title="No notifications"
              description={`No data for the filter "${filter}".`}
              icon={FiBell}
              filterName={filter}
            />
          )}
        </div>
      </div>
    </PageShell>
  );
}

function InfoTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 font-semibold text-foreground">{value}</div>
    </div>
  );
}

function ProjectDetails({ project }: { project: TeacherProject }) {
  return (
    <div className="space-y-5">
      <ImageBlock src={project.image} className="h-56 rounded-lg" />
      <p className="text-sm leading-6 text-muted-foreground">{project.summary}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoTile label="Owner" value={project.owner} />
        <InfoTile label="Department" value={project.department} />
        <InfoTile label="Category" value={project.category} />
        <InfoTile label="Status" value={project.status} />
        <InfoTile label="Views" value={numberFormat(project.views)} />
        <InfoTile label="Stars" value={numberFormat(project.stars)} />
      </div>
      <div>
        <p className="mb-3 font-semibold text-foreground">Team Members</p>
        <div className="flex flex-wrap gap-2">
          {project.team.map((member) => (
            <span key={member} className="rounded-full bg-surface-muted px-3 py-1.5 text-sm">
              {member}
            </span>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 font-semibold text-foreground">Related Documents</p>
        <div className="space-y-2">
          {project.documents.map((document) => (
            <div key={document} className="flex items-center justify-between rounded-lg bg-surface-muted p-3">
              <span className="flex items-center gap-2">
                <FiFileText className="h-4 w-4 text-primary" />
                {document}
              </span>
              <Button size="sm" type="button" variant="secondary">
                <FiDownload className="h-4 w-4" />
                Open
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventDetails({ event }: { event: TeacherEvent }) {
  return (
    <div className="space-y-5">
      <ImageBlock src={event.banner} className="h-56 rounded-lg" />
      <p className="text-sm leading-6 text-muted-foreground">{event.description}</p>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FiMapPin className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Event location
            </p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">{event.venue}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Check the campus map before attending and use directions when moving between
              lecture blocks, labs, and event spaces.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="secondary" className="w-full">
            <FiNavigation className="h-4 w-4" />
            Open Directions
          </Button>
          <Button type="button" variant="secondary" className="w-full">
            <FiMapPin className="h-4 w-4" />
            View on Campus Map
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoTile label="Date" value={event.date} />
        <InfoTile label="Time" value={event.time} />
        <InfoTile label="Attendees" value={event.attendees} />
        <InfoTile label="Category" value={event.category} />
        <InfoTile label="Status" value={event.status} />
      </div>
    </div>
  );
}

function AlmanacDetails({ item }: { item: TeacherAlmanacItem }) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
      <div className="grid gap-3">
        <InfoTile label="Date" value={item.date} />
        <InfoTile label="Time" value={item.time} />
        <InfoTile label="Venue" value={item.venue} />
      </div>
    </div>
  );
}

function PollDetails({ poll }: { poll: TeacherPoll }) {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">{poll.description}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoTile label="Category" value={poll.category} />
        <InfoTile label="Created By" value={poll.createdBy} />
        <InfoTile label="Responses" value={poll.responses} />
        <InfoTile label="Visibility" value={poll.visibility} />
      </div>
      <div className="space-y-3 rounded-lg bg-surface-muted p-4">
        {poll.options.map((option) => (
          <div key={option.label}>
            <div className="flex justify-between text-sm">
              <span>{option.label}</span>
              <span>{option.percent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-primary" style={{ width: `${option.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentDetails({ student }: { student: TeacherStudent }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar label={student.photo} className="h-16 w-16 text-lg" />
        <div>
          <p className="text-xl font-semibold text-foreground">{student.name}</p>
          <p className="text-sm text-muted-foreground">{student.department}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoTile label="Year" value={student.year} />
        <InfoTile label="Projects" value={student.projects} />
        <InfoTile label="XP" value={numberFormat(student.xp)} />
        <InfoTile label="Status" value={student.status} />
      </div>
      <div>
        <p className="mb-3 font-semibold text-foreground">Skills</p>
        <div className="flex flex-wrap gap-2">
          {student.skills.map((skill) => (
            <span key={skill} className="rounded-full bg-primary/10 px-3 py-1.5 text-sm text-primary">
              {skill}
            </span>
          ))}
        </div>
      </div>
      <InfoTile label="Badges" value={student.badges} />
    </div>
  );
}

function AlmanacCard({
  item,
  onSelect,
}: {
  item: TeacherAlmanacItem;
  onSelect: (item: TeacherAlmanacItem) => void;
}) {
  return (
    <Card className="flex min-h-56 flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs text-primary">
          {item.type}
        </span>
        <span className="text-sm text-muted-foreground">{item.date}</span>
      </div>
      <div className="mt-5 flex-1">
        <h3 className="font-semibold text-foreground">{item.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {item.time} · {item.venue}
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {item.description}
        </p>
      </div>
      <Button type="button" variant="secondary" className="mt-5 w-full" onClick={() => onSelect(item)}>
        <FiEye className="h-4 w-4" />
        View Details
      </Button>
    </Card>
  );
}

function CalendarPanel({
  items,
  onDateSelect,
  onSelect,
}: {
  items: TeacherAlmanacItem[];
  onDateSelect: (date: string) => void;
  onSelect: (item: TeacherAlmanacItem) => void;
}) {
  const calendarEvents = useMemo<FullCalendarEventInput[]>(
    () =>
      items.map((item) => ({
        id: item.id,
        title: item.title,
        start: getTeacherAlmanacIsoDate(item.date),
        allDay: true,
        extendedProps: {
          type: item.type,
          time: item.time,
          venue: item.venue,
        },
        classNames: [
          item.type === "Deadline"
            ? "campushub-calendar-event-deadline"
            : item.type === "Exam"
              ? "campushub-calendar-event-exam"
              : "campushub-calendar-event-default",
        ],
      })),
    [items],
  );
  const deadlines = items.filter((item) => item.type === "Deadline");
  const exams = items.filter((item) => item.type === "Exam");

  function openCalendarDate(arg: DateClickArg) {
    onDateSelect(arg.dateStr);
  }

  function openCalendarEvent(arg: EventClickArg) {
    const item = items.find((event) => event.id === arg.event.id);
    if (item) {
      onSelect(item);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Calendar View</CardTitle>
        </CardHeader>
        <CardContent>
          {calendarEvents.length > 0 ? (
            <div className="campushub-calendar">
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
            </div>
          ) : (
            <Empty
              title="No almanac items available"
              description="Try another type filter or clear your search to view more almanac items."
            />
          )}
        </CardContent>
      </Card>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deadlines.length > 0 ? (
              deadlines.map((item) => (
                <button
                  key={item.id}
                  className="w-full rounded-md border border-border p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  type="button"
                  onClick={() => onSelect(item)}
                >
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.date} · {item.time}
                  </p>
                </button>
              ))
            ) : (
              <Empty
                className="border-0 bg-transparent p-0"
                title="No deadlines"
                description="No matching deadline items are visible."
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Exams</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {exams.length > 0 ? (
              exams.map((item) => (
                <button
                  key={item.id}
                  className="w-full rounded-md border border-border p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  type="button"
                  onClick={() => onSelect(item)}
                >
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.date} · {item.time}
                  </p>
                </button>
              ))
            ) : (
              <Empty
                className="border-0 bg-transparent p-0"
                title="No exams"
                description="No matching exam items are visible."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function EventCalendarPanel({
  events,
  onDateSelect,
  onSelect,
}: {
  events: TeacherEvent[];
  onDateSelect: (date: string) => void;
  onSelect: (event: TeacherEvent) => void;
}) {
  const calendarEvents = useMemo<FullCalendarEventInput[]>(
    () =>
      events.map((event) => ({
        id: event.id,
        title: event.title,
        start: getTeacherAlmanacIsoDate(event.date),
        allDay: true,
        extendedProps: {
          category: event.category,
          time: event.time,
          venue: event.venue,
          status: event.status,
        },
        classNames: [
          event.status === "Closed"
            ? "campushub-calendar-event-deadline"
            : event.status === "Joined"
              ? "campushub-calendar-event-exam"
              : "campushub-calendar-event-default",
        ],
      })),
    [events],
  );

  function openCalendarDate(arg: DateClickArg) {
    onDateSelect(arg.dateStr);
  }

  function openCalendarEvent(arg: EventClickArg) {
    const event = events.find((item) => item.id === arg.event.id);
    if (event) {
      onSelect(event);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Event Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          {calendarEvents.length > 0 ? (
            <div className="campushub-calendar">
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
            </div>
          ) : (
            <Empty
              title="No events available"
              description="Try another search to view more teacher events."
            />
          )}
        </CardContent>
      </Card>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {events
              .slice()
              .sort(
                (a, b) =>
                  new Date(a.date).getTime() - new Date(b.date).getTime(),
              )
              .slice(0, 5)
              .map((event) => (
                <button
                  key={event.id}
                  className="w-full rounded-md border border-border p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  type="button"
                  onClick={() => onSelect(event)}
                >
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.date} · {event.time}
                  </p>
                </button>
              ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function TimelinePanel({
  items,
  onSelect,
}: {
  items: TeacherAlmanacItem[];
  onSelect: (item: TeacherAlmanacItem) => void;
}) {
  return (
    <Card className="p-5">
      <div className="space-y-4">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className="grid w-full grid-cols-[2rem_1fr] gap-4 text-left"
            onClick={() => onSelect(item)}
          >
            <span className="relative flex justify-center">
              <span className="mt-1 h-3 w-3 rounded-full bg-primary" />
              {index < items.length - 1 ? (
                <span className="absolute top-5 h-full w-px bg-border" />
              ) : null}
            </span>
            <span className="rounded-lg bg-surface-muted p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                {item.date} · {item.type}
              </span>
              <span className="mt-2 block font-semibold text-foreground">{item.title}</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {item.time} · {item.venue}
              </span>
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function DiscussionPanel({ topic }: { topic: TeacherForumTopic }) {
  const form = useForm<ReplyFormValues>({
    resolver: zodResolver(replySchema),
    defaultValues: { reply: "" },
  });

  return (
    <div className="flex min-h-[42rem] flex-col">
      <div className="border-b border-border p-5">
        <span className="rounded-md bg-surface-muted px-2.5 py-1 text-xs text-muted-foreground">
          {topic.category}
        </span>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{topic.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{topic.summary}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          {topic.author} · {topic.date} · {topic.views} views
        </p>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {topic.comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar label={getInitials(comment.author)} className="h-9 w-9 shrink-0" />
            <div className="rounded-2xl bg-surface-muted p-4">
              <p className="font-semibold text-foreground">
                {comment.author}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {comment.role}
                </span>
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {comment.body}
              </p>
            </div>
          </div>
        ))}
      </div>
      <form
        className="flex gap-3 border-t border-border p-4"
        onSubmit={form.handleSubmit(() => {
          campusToast.success({
            title: "Reply Posted",
            description: "Your teacher reply has been added locally.",
          });
          form.reset();
        })}
      >
        <CampusTextarea
          rows={2}
          placeholder="Write a thoughtful reply..."
          className="min-h-20"
          {...form.register("reply")}
        />
        <Button type="submit" className="self-end">
          <FiSend className="h-4 w-4" />
          Send
        </Button>
      </form>
    </div>
  );
}

function DiscussionSidebar({ topic }: { topic: TeacherForumTopic }) {
  return (
    <aside className="space-y-4 border-t border-border p-5 lg:border-l lg:border-t-0">
      <div>
        <h3 className="font-semibold text-foreground">Discussion Detail</h3>
        <p className="text-sm text-muted-foreground">{topic.category}</p>
      </div>
      <InfoTile label="Replies" value={topic.replies} />
      <InfoTile label="Views" value={topic.views} />
      <Card className="p-4">
        <p className="font-semibold text-foreground">React</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" type="button">
            Like
          </Button>
          <Button variant="secondary" type="button">
            Follow
          </Button>
        </div>
      </Card>
    </aside>
  );
}

function NotificationCard({
  notification,
  onView,
  onMarkRead,
  onClear,
}: {
  notification: TeacherNotification;
  onView: (notification: TeacherNotification) => void;
  onMarkRead: (id: string) => void;
  onClear: (id: string) => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <span className="rounded-lg bg-primary/10 p-3 text-primary">
          <FiBell className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-surface-muted px-2.5 py-1 text-xs text-muted-foreground">
              {notification.type}
            </span>
            {notification.unread ? (
              <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs text-primary">
                Unread
              </span>
            ) : null}
          </div>
          <p className="mt-3 font-semibold text-foreground">{notification.title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {notification.description}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">{notification.time}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={`Open actions for ${notification.title}`}
              className="h-9 w-9 shrink-0 p-0"
              type="button"
              variant="ghost"
            >
              <FiMoreVertical className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(notification)}>
              <FiEye className="h-4 w-4" aria-hidden="true" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!notification.unread}
              onClick={() => onMarkRead(notification.id)}
            >
              <FiCheckCircle className="h-4 w-4" aria-hidden="true" />
              Mark as read
            </DropdownMenuItem>
            <DropdownMenuItem destructive onClick={() => onClear(notification.id)}>
              <FiTrash2 className="h-4 w-4" aria-hidden="true" />
              Clear
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
