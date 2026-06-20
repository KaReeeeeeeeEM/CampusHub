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
import Image from "next/image";
import { useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import type { IconType } from "react-icons";
import {
  FiAward,
  FiBell,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiEye,
  FiFileText,
  FiGrid,
  FiHeart,
  FiList,
  FiMapPin,
  FiMessageCircle,
  FiMoreVertical,
  FiNavigation,
  FiPlus,
  FiSearch,
  FiShare2,
  FiStar,
  FiTrendingUp,
  FiTrash2,
  FiUserCheck,
  FiUserPlus,
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
  CampusViewToggle,
  CampusInput,
  CampusTextarea,
  campusToast,
} from "@/components/campushub";
import { Drawer } from "@/components/shared/drawer";
import { Empty } from "@/components/shared/empty";
import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  alumniDirectory,
  alumniEvents,
  alumniForumTopics,
  alumniNotifications,
  alumniOpportunities,
  alumniProjects,
  alumniStats,
  alumniStudents,
  mentorshipItems,
  mockAlumniProfile,
  universityUpdates,
} from "@/features/alumni-portal/lib/mock-data";
import { cn } from "@/lib/utils";

const ALL_VALUE = "all";

type AlumniMember = (typeof alumniDirectory)[number];
type AlumniStudent = (typeof alumniStudents)[number];
type AlumniProject = (typeof alumniProjects)[number];
type AlumniEvent = (typeof alumniEvents)[number];
type AlumniOpportunity = (typeof alumniOpportunities)[number];
type AlumniForumTopic = (typeof alumniForumTopics)[number];
type AlumniNotification = (typeof alumniNotifications)[number];
type ChartView = "bar" | "line" | "area";
type AlumniEventsViewMode = "cards" | "list" | "calendar";

const chartViewLabels: Record<ChartView, string> = {
  bar: "Bar chart",
  line: "Line chart",
  area: "Area chart",
};

const alumniEventsViewOptions = [
  { value: "cards", label: "Card view", icon: FiGrid },
  { value: "list", label: "List view", icon: FiList },
  { value: "calendar", label: "Calendar view", icon: FiCalendar },
] satisfies Array<{
  value: AlumniEventsViewMode;
  label: string;
  icon: IconType;
}>;

const alumniEngagementChartData = [
  { label: "Jan", community: 420, mentorship: 88, opportunities: 18 },
  { label: "Feb", community: 510, mentorship: 96, opportunities: 22 },
  { label: "Mar", community: 610, mentorship: 112, opportunities: 28 },
  { label: "Apr", community: 760, mentorship: 130, opportunities: 33 },
  { label: "May", community: 840, mentorship: 148, opportunities: 42 },
  { label: "Jun", community: 930, mentorship: 162, opportunities: 48 },
];

const showcaseAnalyticsChartData = [
  { label: "Jan", views: 1840, stars: 126, matches: 8 },
  { label: "Feb", views: 2320, stars: 168, matches: 11 },
  { label: "Mar", views: 2680, stars: 214, matches: 14 },
  { label: "Apr", views: 3040, stars: 238, matches: 18 },
  { label: "May", views: 3360, stars: 251, matches: 23 },
  { label: "Jun", views: 3770, stars: 252, matches: 31 },
];

const showcaseDepartmentDemand = [
  { label: "Computer Science", views: 8240, matches: 14 },
  { label: "Information Systems", views: 4980, matches: 9 },
  { label: "Agricultural Engineering", views: 3790, matches: 8 },
];

const mentorMatchActivity = [
  {
    student: "Aisha Mrema",
    project: "AfyaTrack AI",
    signal: "Health AI validation",
    matches: 14,
    response: "86%",
  },
  {
    student: "Brian Macha",
    project: "Smart Almanac Engine",
    signal: "Product discovery",
    matches: 9,
    response: "74%",
  },
  {
    student: "Rehema Kileo",
    project: "AgriSense Lab",
    signal: "Research commercialization",
    matches: 8,
    response: "68%",
  },
];

const opportunitySchema = z.object({
  title: z.string().min(3, "Enter an opportunity title."),
  type: z.string().min(1, "Choose an opportunity type."),
  company: z.string().min(2, "Enter the organization."),
  deadline: z.string().min(2, "Enter the deadline."),
  audience: z.string().min(2, "Enter the target audience."),
  description: z.string().min(10, "Describe the opportunity."),
});

type OpportunityFormValues = z.infer<typeof opportunitySchema>;

function PageShell({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
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
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: IconType;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="min-h-32">
      <CardContent className="flex h-full flex-col justify-between p-5">
        <div className="flex items-center justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {detail}
          </span>
        </div>
        <div>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AvatarBadge({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary",
        className,
      )}
    >
      {initials}
    </span>
  );
}

function StatusBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary",
        className,
      )}
    >
      {children}
    </span>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full max-w-md", className)}>
      <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <CampusInput
        className="pl-9"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder: string;
  options: string[];
}) {
  const labelText = label ?? placeholder;
  const allLabel = `All ${labelText.toLowerCase()}`;

  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {labelText}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{allLabel}</SelectItem>
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

function SectionCard({
  title,
  description,
  children,
  action,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function ChartViewMenu({
  value,
  onChange,
  label = "Switch chart view",
}: {
  value: ChartView;
  onChange: (value: ChartView) => void;
  label?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={label}
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

function AlumniEngagementChart({ view }: { view: ChartView }) {
  const commonProps = {
    data: alumniEngagementChartData,
    margin: { top: 12, right: 24, left: -12, bottom: 0 },
  };

  if (view === "line") {
    return (
      <LineChart {...commonProps}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="4 5" vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line type="monotone" dataKey="community" stroke="var(--chart-primary)" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="mentorship" stroke="var(--chart-secondary)" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="opportunities" stroke="var(--chart-tertiary)" strokeWidth={3} dot={false} />
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
        <Area type="monotone" dataKey="community" stroke="var(--chart-primary)" fill="var(--chart-primary)" fillOpacity={0.18} strokeWidth={2.5} />
        <Area type="monotone" dataKey="mentorship" stroke="var(--chart-secondary)" fill="var(--chart-secondary)" fillOpacity={0.14} strokeWidth={2.5} />
        <Area type="monotone" dataKey="opportunities" stroke="var(--chart-tertiary)" fill="var(--chart-tertiary)" fillOpacity={0.14} strokeWidth={2.5} />
      </AreaChart>
    );
  }

  return (
    <BarChart {...commonProps} barCategoryGap="18%" barGap={8}>
      <CartesianGrid stroke="var(--border)" strokeDasharray="4 5" vertical={false} />
      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
      <Tooltip />
      <Bar dataKey="community" fill="var(--chart-primary)" radius={[7, 7, 0, 0]} />
      <Bar dataKey="mentorship" fill="var(--chart-secondary)" radius={[7, 7, 0, 0]} />
      <Bar dataKey="opportunities" fill="var(--chart-tertiary)" radius={[7, 7, 0, 0]} />
    </BarChart>
  );
}

function ShowcaseAnalyticsChart({ view }: { view: ChartView }) {
  const commonProps = {
    data: showcaseAnalyticsChartData,
    margin: { top: 12, right: 24, left: -12, bottom: 0 },
  };

  if (view === "line") {
    return (
      <LineChart {...commonProps}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="4 5" vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line type="monotone" dataKey="views" stroke="var(--chart-primary)" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="stars" stroke="var(--chart-secondary)" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="matches" stroke="var(--chart-tertiary)" strokeWidth={3} dot={false} />
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
        <Area type="monotone" dataKey="views" stroke="var(--chart-primary)" fill="var(--chart-primary)" fillOpacity={0.18} strokeWidth={2.5} />
        <Area type="monotone" dataKey="stars" stroke="var(--chart-secondary)" fill="var(--chart-secondary)" fillOpacity={0.14} strokeWidth={2.5} />
        <Area type="monotone" dataKey="matches" stroke="var(--chart-tertiary)" fill="var(--chart-tertiary)" fillOpacity={0.14} strokeWidth={2.5} />
      </AreaChart>
    );
  }

  return (
    <BarChart {...commonProps} barCategoryGap="18%" barGap={8}>
      <CartesianGrid stroke="var(--border)" strokeDasharray="4 5" vertical={false} />
      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
      <Tooltip />
      <Bar dataKey="views" fill="var(--chart-primary)" radius={[7, 7, 0, 0]} />
      <Bar dataKey="stars" fill="var(--chart-secondary)" radius={[7, 7, 0, 0]} />
      <Bar dataKey="matches" fill="var(--chart-tertiary)" radius={[7, 7, 0, 0]} />
    </BarChart>
  );
}

function ChartLegend({
  items,
}: {
  items: { label: string; className: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", item.className)} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function ProjectStarsChart({ projects }: { projects: AlumniProject[] }) {
  const data = projects.map((item) => ({
    label: item.title,
    stars: item.stars,
    views: item.views,
  }));

  return (
    <BarChart
      data={data}
      margin={{ top: 8, right: 20, left: -8, bottom: 0 }}
      barCategoryGap="26%"
    >
      <CartesianGrid stroke="var(--border)" strokeDasharray="4 5" vertical={false} />
      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
      <Tooltip />
      <Bar dataKey="stars" fill="var(--chart-secondary)" radius={[7, 7, 0, 0]} />
    </BarChart>
  );
}

function DepartmentDemandChart() {
  return (
    <BarChart
      data={showcaseDepartmentDemand}
      layout="vertical"
      margin={{ top: 8, right: 24, left: 42, bottom: 0 }}
      barCategoryGap="24%"
    >
      <CartesianGrid stroke="var(--border)" strokeDasharray="4 5" horizontal={false} />
      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
      <YAxis
        dataKey="label"
        type="category"
        axisLine={false}
        tickLine={false}
        tick={{ fontSize: 11 }}
        width={118}
      />
      <Tooltip />
      <Bar dataKey="views" fill="var(--chart-primary)" radius={[0, 7, 7, 0]} />
      <Bar dataKey="matches" fill="var(--chart-tertiary)" radius={[0, 7, 7, 0]} />
    </BarChart>
  );
}

function ProgressRow({
  label,
  value,
  detail,
  percent,
}: {
  label: string;
  value: string;
  detail: string;
  percent: number;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-primary">
          {value}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
        <span
          className="block h-full rounded-full bg-primary"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}

function matchesQuery(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase());
}

function unique(values: string[]) {
  return Array.from(new Set(values)).sort();
}

function getAlumniEventIsoDate(date: string) {
  const parsed = new Date(`${date} 00:00:00`);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatAlumniEventDate(date: string) {
  return new Date(`${date} 00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isSameAlumniEventDay(date: string, isoDate: string) {
  return getAlumniEventIsoDate(date) === isoDate;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function DrawerDetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: IconType;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <div className="mt-1 break-words text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

function AlumniMemberDrawer({
  member,
  onClose,
}: {
  member: AlumniMember | null;
  onClose: () => void;
}) {
  return (
    <Drawer open={Boolean(member)} title={member?.name ?? ""} onOpenChange={onClose}>
      {member ? (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <AvatarBadge initials={member.initials} className="h-16 w-16 text-lg" />
            <div>
              <h2 className="text-xl font-semibold">{member.name}</h2>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
          </div>
          <div className="space-y-3">
            <DrawerDetailRow icon={FiCalendar} label="Graduation Year" value={member.graduationYear} />
            <DrawerDetailRow icon={FiUsers} label="Department" value={member.department} />
            <DrawerDetailRow icon={FiBriefcase} label="Company" value={member.company} />
            <DrawerDetailRow icon={FiUserCheck} label="Position" value={member.position} />
            <DrawerDetailRow icon={FiMapPin} label="Location" value={member.location} />
            <DrawerDetailRow icon={FiTrendingUp} label="Industry" value={member.industry} />
            <DrawerDetailRow
              icon={FiCheckCircle}
              label="Status"
              value={<StatusBadge>{member.status}</StatusBadge>}
            />
          </div>
          <Button
            className="w-full"
            type="button"
            onClick={() =>
              campusToast.success({
                title: "Connection Requested",
                description: `${member.name} will receive your alumni connection request.`,
              })
            }
          >
            <FiUserCheck className="h-4 w-4" />
            Connect
          </Button>
        </div>
      ) : null}
    </Drawer>
  );
}

function StudentDrawer({
  student,
  onClose,
}: {
  student: AlumniStudent | null;
  onClose: () => void;
}) {
  return (
    <Drawer open={Boolean(student)} title={student?.name ?? ""} onOpenChange={onClose}>
      {student ? (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <AvatarBadge initials={student.initials} className="h-16 w-16 text-lg" />
            <div>
              <h2 className="text-xl font-semibold">{student.name}</h2>
              <p className="text-sm text-muted-foreground">
                {student.department} · {student.year}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <DrawerDetailRow icon={FiFileText} label="Projects" value={student.projects} />
            <DrawerDetailRow icon={FiAward} label="XP" value={`${student.xp} XP`} />
            <DrawerDetailRow icon={FiNavigation} label="Portfolio" value={student.portfolio} />
            <DrawerDetailRow icon={FiCheckCircle} label="Status" value={student.status} />
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Skills & Badges</h3>
            <div className="flex flex-wrap gap-2">
              {[...student.skills, ...student.badges].map((item) => (
                <StatusBadge key={item}>{item}</StatusBadge>
              ))}
            </div>
          </div>
          <Button
            className="w-full"
            type="button"
            onClick={() =>
              campusToast.success({
                title: "Mentorship Offered",
                description: `Your mentorship offer was sent to ${student.name}.`,
              })
            }
          >
            <FiHeart className="h-4 w-4" />
            Offer Mentorship
          </Button>
        </div>
      ) : null}
    </Drawer>
  );
}

function ProjectDrawer({
  project,
  onClose,
}: {
  project: AlumniProject | null;
  onClose: () => void;
}) {
  return (
    <Drawer open={Boolean(project)} title={project?.title ?? ""} onOpenChange={onClose}>
      {project ? (
        <div className="space-y-5">
          <div className="relative h-56 w-full overflow-hidden rounded-xl">
            <Image
              alt={project.title}
              className="object-cover"
              fill
              sizes="(min-width: 768px) 640px, 100vw"
              src={project.image}
            />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{project.title}</h2>
            <p className="text-sm text-muted-foreground">
              {project.owner} · {project.department}
            </p>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {project.description}
          </p>
          <div className="space-y-3">
            <DrawerDetailRow icon={FiEye} label="Views" value={project.views.toLocaleString()} />
            <DrawerDetailRow icon={FiStar} label="Stars" value={project.stars.toLocaleString()} />
            <DrawerDetailRow icon={FiCheckCircle} label="Status" value={project.status} />
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Related Documents</h3>
            {project.documents.map((document) => (
              <div
                key={document}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm"
              >
                <FiFileText className="h-4 w-4 text-primary" />
                {document}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

function EventDrawer({
  event,
  onClose,
}: {
  event: AlumniEvent | null;
  onClose: () => void;
}) {
  return (
    <Drawer open={Boolean(event)} title={event?.title ?? ""} onOpenChange={onClose}>
      {event ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FiMapPin className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Location
                </p>
                <h3 className="mt-1 text-base font-semibold text-foreground">{event.venue}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Check the venue or open directions before arriving.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="secondary" size="sm" className="w-full text-xs">
                <FiNavigation className="h-3.5 w-3.5" aria-hidden="true" />
                Directions
              </Button>
              <Button type="button" variant="secondary" size="sm" className="w-full text-xs">
                <FiMapPin className="h-3.5 w-3.5" aria-hidden="true" />
                Campus Map
              </Button>
            </div>
          </div>
          <DrawerDetailRow icon={FiFileText} label="Category" value={event.category} />
          <DrawerDetailRow icon={FiCalendar} label="Date" value={event.date} />
          <DrawerDetailRow icon={FiUsers} label="Expected Attendees" value={event.attendees} />
          <p className="rounded-lg border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
            {event.description}
          </p>
          <Button
            className="w-full"
            type="button"
            onClick={() =>
              campusToast.success({
                title: "Event RSVP Submitted",
                description: `You RSVP'd for ${event.title}.`,
              })
            }
          >
            RSVP
          </Button>
        </div>
      ) : null}
    </Drawer>
  );
}

function OpportunityDrawer({
  opportunity,
  onClose,
}: {
  opportunity: AlumniOpportunity | null;
  onClose: () => void;
}) {
  return (
    <Drawer
      open={Boolean(opportunity)}
      title={opportunity?.title ?? ""}
      onOpenChange={onClose}
    >
      {opportunity ? (
        <div className="space-y-4">
          <DrawerDetailRow icon={FiFileText} label="Type" value={opportunity.type} />
          <DrawerDetailRow icon={FiBriefcase} label="Company" value={opportunity.company} />
          <DrawerDetailRow icon={FiUsers} label="Audience" value={opportunity.audience} />
          <DrawerDetailRow icon={FiCalendar} label="Deadline" value={opportunity.deadline} />
          <p className="rounded-lg border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
            {opportunity.description}
          </p>
          <Button
            className="w-full"
            type="button"
            onClick={() =>
              campusToast.success({
                title: "Opportunity Shared",
                description: `${opportunity.title} was shared with your alumni circle.`,
              })
            }
          >
            <FiShare2 className="h-4 w-4" />
            Share Opportunity
          </Button>
        </div>
      ) : null}
    </Drawer>
  );
}

function connectWithAlumni(member: AlumniMember) {
  campusToast.success({
    title: "Follow Request Sent",
    description: `${member.name} will receive your alumni connection request.`,
  });
}

function CommunityActions({
  member,
  onView,
}: {
  member: AlumniMember;
  onView: (member: AlumniMember) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        type="button"
        size="icon"
        aria-label={`Connect with ${member.name}`}
        onClick={() => connectWithAlumni(member)}
      >
        <FiPlus className="h-4 w-4" aria-hidden="true" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={`Open actions for ${member.name}`}
          >
            <FiMoreVertical className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onView(member)}>
            <FiEye className="h-4 w-4" aria-hidden="true" />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => connectWithAlumni(member)}>
            <FiUserPlus className="h-4 w-4" aria-hidden="true" />
            Connect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function CommunityIconFact({
  icon: Icon,
  children,
}: {
  icon: IconType;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}

function CommunityProfileTile({
  member,
  index,
  onView,
}: {
  member: AlumniMember;
  index: number;
  onView: (member: AlumniMember) => void;
}) {
  return (
    <article className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <AvatarBadge initials={member.initials} className="h-12 w-12" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-foreground">{member.name}</h3>
              <StatusBadge>{member.status}</StatusBadge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{member.position}</p>
          </div>
        </div>
        <CommunityActions member={member} onView={onView} />
      </div>

      <div className="mt-5 space-y-3">
        <div className="grid gap-2">
          <CommunityIconFact icon={FiBriefcase}>{member.company}</CommunityIconFact>
          <CommunityIconFact icon={FiTrendingUp}>
            {member.industry} - Class of {member.graduationYear}
          </CommunityIconFact>
          <CommunityIconFact icon={FiMapPin}>{member.location}</CommunityIconFact>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Recommended because your mentorship interests overlap with{" "}
          {index % 2 === 0 ? member.department : member.industry}.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs text-primary">
            {member.department}
          </span>
          <span className="rounded-md bg-surface-muted px-2.5 py-1 text-xs text-muted-foreground">
            {member.industry}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4">
          <CommunityIconFact icon={FiUsers}>{18 + index * 4} mutuals</CommunityIconFact>
          <CommunityIconFact icon={FiMessageCircle}>{42 + index * 7} posts</CommunityIconFact>
          <CommunityIconFact icon={FiUserCheck}>
            {index % 2 === 0 ? "Mentor available" : "Open mentor"}
          </CommunityIconFact>
        </div>
      </div>
    </article>
  );
}

function CommunityProfileRow({
  member,
  index,
  onView,
}: {
  member: AlumniMember;
  index: number;
  onView: (member: AlumniMember) => void;
}) {
  return (
    <article className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <AvatarBadge initials={member.initials} className="h-12 w-12" />
          <div className="min-w-0 space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-foreground">{member.name}</h3>
                <StatusBadge>{member.status}</StatusBadge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{member.position}</p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <CommunityIconFact icon={FiBriefcase}>{member.company}</CommunityIconFact>
              <CommunityIconFact icon={FiTrendingUp}>
                {member.industry} - Class of {member.graduationYear}
              </CommunityIconFact>
              <CommunityIconFact icon={FiMapPin}>{member.location}</CommunityIconFact>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Recommended because your mentorship interests overlap with{" "}
              {index % 2 === 0 ? member.department : member.industry}.
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <CommunityIconFact icon={FiUsers}>{18 + index * 4} mutuals</CommunityIconFact>
              <CommunityIconFact icon={FiMessageCircle}>{42 + index * 7} posts</CommunityIconFact>
              <CommunityIconFact icon={FiUserCheck}>
                {index % 2 === 0 ? "Mentor available" : "Open mentor"}
              </CommunityIconFact>
            </div>
          </div>
        </div>
        <CommunityActions member={member} onView={onView} />
      </div>
    </article>
  );
}

function ProjectCard({
  project,
  onView,
}: {
  project: AlumniProject;
  onView: (project: AlumniProject) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="relative h-44 w-full overflow-hidden">
        <Image
          alt={project.title}
          className="object-cover"
          fill
          sizes="(min-width: 768px) 360px, 100vw"
          src={project.image}
        />
      </div>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground">{project.title}</h3>
            <p className="text-sm text-muted-foreground">
              {project.owner} · {project.category}
            </p>
          </div>
          <StatusBadge>{project.status}</StatusBadge>
        </div>
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
          {project.description}
        </p>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <FiEye className="h-4 w-4" /> {project.views.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1">
            <FiStar className="h-4 w-4 text-achievement" /> {project.stars}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" onClick={() => onView(project)}>
            <FiEye className="h-4 w-4" />
            View
          </Button>
          <Button
            type="button"
            onClick={() =>
              campusToast.success({
                title: "Project Starred",
                description: `${project.title} was added to your starred projects.`,
              })
            }
          >
            <FiStar className="h-4 w-4" />
            Star
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StudentCard({
  student,
  onView,
}: {
  student: AlumniStudent;
  onView: (student: AlumniStudent) => void;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="space-y-3">
          <div className="flex min-w-0 items-center gap-3">
            <AvatarBadge initials={student.initials} className="shrink-0" />
            <div className="min-w-0">
              <h3 className="text-lg font-semibold leading-tight text-foreground">
                {student.name}
              </h3>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                {student.department} - {student.year}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge>{student.status}</StatusBadge>
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              {student.xp} XP
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {student.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-md bg-surface-muted px-2.5 py-1 text-xs text-muted-foreground"
            >
              {skill}
            </span>
          ))}
        </div>
        <div className="mt-auto pt-4">
          <Button type="button" className="w-full" onClick={() => onView(student)}>
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AlumniDashboardView() {
  const [project, setProject] = useState<AlumniProject | null>(null);
  const [student, setStudent] = useState<AlumniStudent | null>(null);
  const [chartView, setChartView] = useState<ChartView>("bar");

  return (
    <PageShell
      eyebrow="Alumni Network"
      title={`Welcome back, ${mockAlumniProfile.name.split(" ")[0]}.`}
      description="Stay connected to your university, mentor promising students, discover projects, and share opportunities with the CampusHub ecosystem."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {alumniStats.map((stat, index) => (
          <MetricCard
            key={stat.label}
            icon={[FiUsers, FiUserCheck, FiBriefcase, FiStar][index]}
            label={stat.label}
            value={stat.value}
            detail={stat.change}
          />
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start gap-4">
          <ChartViewMenu value={chartView} onChange={setChartView} />
          <div className="space-y-1">
            <CardTitle>Alumni Engagement Trends</CardTitle>
            <CardDescription>
              Community growth, mentorship matches, and shared opportunities.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-5 pt-0 sm:px-4">
          <div className="w-full min-w-0">
            <ResponsiveContainer width="100%" height={360} minWidth={0}>
              <AlumniEngagementChart view={chartView} />
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <SectionCard
          title="Recommended Students"
          description="Students whose work matches your mentorship and industry interests."
        >
          <div className="grid gap-3 lg:grid-cols-3">
            {alumniStudents.map((item) => (
              <StudentCard key={item.id} student={item} onView={setStudent} />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Mentorship Requests" description="Requests awaiting alumni action.">
          <div className="space-y-3">
            {mentorshipItems
              .filter((item) => item.status !== "History")
              .map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{item.student}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{item.focus}</p>
                    </div>
                    <StatusBadge>{item.status}</StatusBadge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{item.progress}</p>
                  {item.status === "Request" ? (
                    <Button
                      className="mt-4 w-full"
                      type="button"
                      onClick={() =>
                        campusToast.success({
                          title: "Mentorship Accepted",
                          description: `${item.student} has been added to your mentorship list.`,
                        })
                      }
                    >
                      Accept Request
                    </Button>
                  ) : null}
                </div>
              ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard title="Trending Projects" className="xl:col-span-2">
          <div className="grid gap-3 md:grid-cols-3">
            {alumniProjects.map((item) => (
              <ProjectCard key={item.id} project={item} onView={setProject} />
            ))}
          </div>
        </SectionCard>
        <SectionCard title="University Updates">
          <div className="space-y-3">
            {universityUpdates.map((update) => (
              <div
                key={update}
                className="rounded-lg border border-border bg-background p-4 text-sm leading-6 text-muted-foreground"
              >
                {update}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <ProjectDrawer project={project} onClose={() => setProject(null)} />
      <StudentDrawer student={student} onClose={() => setStudent(null)} />
    </PageShell>
  );
}

export function AlumniCommunityView() {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState(ALL_VALUE);
  const [year, setYear] = useState(ALL_VALUE);
  const [industry, setIndustry] = useState(ALL_VALUE);
  const [location, setLocation] = useState(ALL_VALUE);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [member, setMember] = useState<AlumniMember | null>(null);

  const filtered = useMemo(
    () =>
      alumniDirectory.filter((item) => {
        const haystack = `${item.name} ${item.email} ${item.company} ${item.position}`;
        return (
          (!query || matchesQuery(haystack, query)) &&
          (department === ALL_VALUE || item.department === department) &&
          (year === ALL_VALUE || item.graduationYear === year) &&
          (industry === ALL_VALUE || item.industry === industry) &&
          (location === ALL_VALUE || item.location === location)
        );
      }),
    [department, industry, location, query, year],
  );

  return (
    <PageShell
      eyebrow="Alumni Community"
      title="Discover alumni worth following."
      description="Explore recommended alumni, mentor profiles, and professional circles in a richer grid view."
    >
      <Card className="bg-surface">
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Search
              </span>
              <SearchBox
                value={query}
                onChange={setQuery}
                placeholder="Search alumni, companies, roles"
                className="max-w-3xl"
              />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Layout
              </span>
              <div className="flex rounded-full bg-surface-muted p-1">
                {[
                  { key: "grid", label: "Grid", icon: FiGrid },
                  { key: "list", label: "List", icon: FiList },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.key}
                      type="button"
                      size="sm"
                      variant={layout === item.key ? "default" : "ghost"}
                      className="rounded-full"
                      onClick={() => setLayout(item.key as "grid" | "list")}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FilterSelect
              value={department}
              onChange={setDepartment}
              label="Department"
              placeholder="Department"
              options={unique(alumniDirectory.map((item) => item.department))}
            />
            <FilterSelect
              value={year}
              onChange={setYear}
              label="Graduation Year"
              placeholder="Graduation year"
              options={unique(alumniDirectory.map((item) => item.graduationYear))}
            />
            <FilterSelect
              value={industry}
              onChange={setIndustry}
              label="Industry"
              placeholder="Industry"
              options={unique(alumniDirectory.map((item) => item.industry))}
            />
            <FilterSelect
              value={location}
              onChange={setLocation}
              label="Location"
              placeholder="Location"
              options={unique(alumniDirectory.map((item) => item.location))}
            />
          </div>
        </CardContent>
      </Card>
      <div className="min-h-[18rem] overflow-y-auto pr-1 lg:max-h-[calc(100vh-25rem)]">
        {filtered.length && layout === "grid" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item, index) => (
              <CommunityProfileTile
                key={item.id}
                member={item}
                index={index}
                onView={setMember}
              />
            ))}
          </div>
        ) : filtered.length ? (
          <div className="space-y-3">
            {filtered.map((item, index) => (
              <CommunityProfileRow key={item.id} member={item} index={index} onView={setMember} />
            ))}
          </div>
        ) : (
          <Empty filterName={query || "selected alumni filters"} />
        )}
      </div>
      <AlumniMemberDrawer member={member} onClose={() => setMember(null)} />
    </PageShell>
  );
}

export function AlumniMentorshipView() {
  const [activeTab, setActiveTab] = useState("My Mentorships");
  const [student, setStudent] = useState<AlumniStudent | null>(null);
  const tabs = [
    "My Mentorships",
    "Mentorship Requests",
    "Available Students",
    "Mentorship History",
    "Mentorship Analytics",
  ];
  const visibleMentorships =
    activeTab === "Mentorship History"
      ? mentorshipItems.filter((item) => item.status === "History")
      : activeTab === "Mentorship Requests"
        ? mentorshipItems.filter((item) => item.status === "Request")
        : mentorshipItems.filter((item) => item.status !== "History");

  return (
    <PageShell
      eyebrow="Mentorship"
      title="Guide student growth."
      description="Manage active mentorships, review requests, and discover students looking for industry guidance."
    >
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab}
            type="button"
            variant={activeTab === tab ? "default" : "secondary"}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>

      {activeTab === "Available Students" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {alumniStudents.map((item) => (
            <StudentCard key={item.id} student={item} onView={setStudent} />
          ))}
        </div>
      ) : activeTab === "Mentorship Analytics" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard icon={FiUserCheck} label="Active mentorships" value="12" detail="+3 new" />
          <MetricCard icon={FiCalendar} label="Sessions completed" value="48" detail="92% attended" />
          <MetricCard icon={FiAward} label="Student outcomes" value="9" detail="projects shipped" />
        </div>
      ) : visibleMentorships.length ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {visibleMentorships.map((item, index) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="flex h-full flex-col gap-5 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <AvatarBadge
                      initials={getInitials(item.student)}
                      className="h-12 w-12"
                    />
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-foreground">
                        {item.student}
                      </h3>
                      <p className="truncate text-sm text-muted-foreground">
                        {item.focus}
                      </p>
                    </div>
                  </div>
                  <StatusBadge>{item.status}</StatusBadge>
                </div>
                <div className="rounded-lg border border-border bg-surface-muted p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Next session
                  </p>
                  <p className="mt-2 font-semibold text-foreground">
                    {item.nextSession}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {item.progress}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span>Mentorship progress</span>
                    <span>{item.status === "Request" ? "12%" : item.status === "History" ? "100%" : `${62 + index * 8}%`}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{
                        width:
                          item.status === "Request"
                            ? "12%"
                            : item.status === "History"
                              ? "100%"
                              : `${Math.min(92, 62 + index * 8)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      campusToast.info({
                        title: "Mentorship Opened",
                        description: `${item.student}'s mentorship details are ready to review.`,
                      })
                    }
                  >
                    <FiEye className="h-4 w-4" />
                    View
                  </Button>
                  <Button
                    type="button"
                    onClick={() =>
                      campusToast.success({
                        title:
                          item.status === "Request"
                            ? "Mentorship Accepted"
                            : "Session Scheduled",
                        description: `${item.student} has been notified.`,
                      })
                    }
                  >
                    {item.status === "Request" ? "Accept" : "Schedule"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Empty filterName={activeTab} />
      )}

      <StudentDrawer student={student} onClose={() => setStudent(null)} />
    </PageShell>
  );
}

export function AlumniStudentsView() {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState(ALL_VALUE);
  const [student, setStudent] = useState<AlumniStudent | null>(null);
  const filtered = alumniStudents.filter((item) => {
    const haystack = `${item.name} ${item.department} ${item.skills.join(" ")} ${item.badges.join(" ")}`;
    return (
      (!query || matchesQuery(haystack, query)) &&
      (department === ALL_VALUE || item.department === department)
    );
  });

  return (
    <PageShell
      eyebrow="Student Discovery"
      title="Discover talented students."
      description="Find students with strong portfolios, achievements, and mentorship potential."
    >
      <Card>
        <CardContent className="flex flex-col gap-3 p-5 md:flex-row">
          <SearchBox value={query} onChange={setQuery} placeholder="Search students, skills, badges" />
          <FilterSelect
            value={department}
            onChange={setDepartment}
            placeholder="Department"
            options={unique(alumniStudents.map((item) => item.department))}
          />
        </CardContent>
      </Card>
      {filtered.length ? (
        <div className="grid gap-4 md:grid-cols-3">
          {filtered.map((item) => (
            <StudentCard key={item.id} student={item} onView={setStudent} />
          ))}
        </div>
      ) : (
        <Empty filterName={query || department} />
      )}
      <StudentDrawer student={student} onClose={() => setStudent(null)} />
    </PageShell>
  );
}

export function AlumniShowcaseView() {
  const [project, setProject] = useState<AlumniProject | null>(null);
  const [activeTab, setActiveTab] = useState("Trending");
  const [chartView, setChartView] = useState<ChartView>("area");
  const tabs = ["Trending", "Most Viewed", "Most Starred", "Top Innovators", "Analytics"];
  const sortedProjects = [...alumniProjects].sort((a, b) =>
    activeTab === "Most Viewed" ? b.views - a.views : b.stars - a.stars,
  );
  const maxProjectViews = Math.max(...alumniProjects.map((item) => item.views));
  const maxDepartmentViews = Math.max(
    ...showcaseDepartmentDemand.map((item) => item.views),
  );

  return (
    <PageShell
      eyebrow="Showcase"
      title="Explore student innovation."
      description="Discover projects, research, startups, and creators with alumni mentorship potential."
    >
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab}
            type="button"
            variant={activeTab === tab ? "default" : "secondary"}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>

      {activeTab === "Analytics" ? (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={FiEye} label="Project Views" value="17,010" detail="+14%" />
            <MetricCard icon={FiStar} label="Stars" value="1,249" detail="+82" />
            <MetricCard icon={FiUsers} label="Creators" value="96" detail="18 featured" />
            <MetricCard icon={FiTrendingUp} label="Mentor Matches" value="31" detail="+9" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
            <Card>
              <CardHeader className="flex flex-row items-start gap-4">
                <ChartViewMenu
                  value={chartView}
                  onChange={setChartView}
                  label="Switch showcase analytics chart"
                />
                <div className="space-y-1">
                  <CardTitle>Showcase Engagement</CardTitle>
                  <CardDescription>
                    Views, stars, and mentor matches across the semester.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-5 pt-0 sm:px-4">
                <div className="mb-4 px-3">
                  <ChartLegend
                    items={[
                      { label: "Views", className: "bg-[var(--chart-primary)]" },
                      { label: "Stars", className: "bg-[var(--chart-secondary)]" },
                      { label: "Mentor matches", className: "bg-[var(--chart-tertiary)]" },
                    ]}
                  />
                </div>
                <div className="w-full min-w-0">
                  <ResponsiveContainer width="100%" height={340} minWidth={0}>
                    <ShowcaseAnalyticsChart view={chartView} />
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <SectionCard
              title="Mentor Match Activity"
              description="Students generating the strongest alumni follow-up."
            >
              <div className="space-y-3">
                {mentorMatchActivity.map((item) => (
                  <div
                    key={item.project}
                    className="rounded-lg border border-border bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-foreground">
                          {item.student}
                        </h3>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {item.project}
                        </p>
                      </div>
                      <StatusBadge>{item.matches} matches</StatusBadge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <DetailRow label="Signal" value={item.signal} />
                      <DetailRow label="Response" value={item.response} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <SectionCard
              title="Top Project Conversion"
              description="View volume compared with alumni stars."
            >
              <div className="mb-5 h-56 min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <ProjectStarsChart projects={alumniProjects} />
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {alumniProjects.map((item) => (
                  <ProgressRow
                    key={item.id}
                    label={item.title}
                    value={`${Math.round((item.stars / item.views) * 100)}% starred`}
                    detail={`${item.views.toLocaleString()} views - ${item.stars.toLocaleString()} stars`}
                    percent={(item.views / maxProjectViews) * 100}
                  />
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Department Demand"
              description="Where alumni attention is concentrated."
            >
              <div className="mb-4">
                <ChartLegend
                  items={[
                    { label: "Project views", className: "bg-[var(--chart-primary)]" },
                    { label: "Mentor matches", className: "bg-[var(--chart-tertiary)]" },
                  ]}
                />
              </div>
              <div className="mb-5 h-56 min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <DepartmentDemandChart />
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {showcaseDepartmentDemand.map((item) => (
                  <ProgressRow
                    key={item.label}
                    label={item.label}
                    value={`${item.matches} matches`}
                    detail={`${item.views.toLocaleString()} project views`}
                    percent={(item.views / maxDepartmentViews) * 100}
                  />
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      ) : activeTab === "Top Innovators" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {alumniStudents.map((item) => (
            <StudentCard key={item.id} student={item} onView={() => null} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {sortedProjects.map((item) => (
            <ProjectCard key={item.id} project={item} onView={setProject} />
          ))}
        </div>
      )}
      <ProjectDrawer project={project} onClose={() => setProject(null)} />
    </PageShell>
  );
}

export function AlumniEventsView() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL_VALUE);
  const [view, setView] = useState<AlumniEventsViewMode>("cards");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [event, setEvent] = useState<AlumniEvent | null>(null);
  const filtered = useMemo(
    () =>
      alumniEvents.filter((item) => {
        const haystack = `${item.title} ${item.category} ${item.venue} ${item.description}`;

        return (
          (!query || matchesQuery(haystack, query)) &&
          (category === ALL_VALUE || item.category === category)
        );
      }),
    [category, query],
  );
  const calendarEvents = useMemo<FullCalendarEventInput[]>(
    () =>
      filtered.map((item) => ({
        id: item.id,
        title: item.title,
        start: getAlumniEventIsoDate(item.date),
        allDay: true,
        extendedProps: {
          category: item.category,
          venue: item.venue,
          attendees: item.attendees,
        },
        classNames: [
          item.category === "Career"
            ? "campushub-calendar-event-exam"
            : item.category === "Reunion"
              ? "campushub-calendar-event-deadline"
              : "campushub-calendar-event-default",
        ],
      })),
    [filtered],
  );
  const selectedDateEvents = selectedDate
    ? filtered.filter((item) => isSameAlumniEventDay(item.date, selectedDate))
    : [];

  function openCalendarDate(arg: DateClickArg) {
    setSelectedDate(arg.dateStr);
  }

  function openCalendarEvent(arg: EventClickArg) {
    const selected = filtered.find((item) => item.id === arg.event.id);
    if (selected) {
      setEvent(selected);
    }
  }

  const emptyState = (
    <Empty
      className="min-h-[22rem]"
      filterName={query || category}
      title={query || category !== ALL_VALUE ? "No matching events" : "No events available"}
      description={
        query || category !== ALL_VALUE
          ? "Try another search term or event category."
          : "Alumni events will appear here once they are published."
      }
    />
  );

  return (
    <PageShell
      eyebrow="Events"
      title="Stay close to the campus community."
      description="Join networking events, reunions, workshops, career programs, and university gatherings."
    >
      <Card className="bg-surface">
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid flex-1 gap-4 md:grid-cols-[minmax(0,1fr)_18rem]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Search
                </span>
                <SearchBox
                  value={query}
                  onChange={setQuery}
                  placeholder="Search events, venues, topics"
                  className="max-w-none"
                />
              </label>
              <FilterSelect
                value={category}
                onChange={setCategory}
                label="Event Category"
                placeholder="Event category"
                options={unique(alumniEvents.map((item) => item.category))}
              />
            </div>
            <div className="flex items-end">
              <CampusViewToggle
                value={view}
                options={alumniEventsViewOptions}
                onValueChange={setView}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
            <span>{filtered.length} events</span>
            <span>{filtered.reduce((total, item) => total + item.attendees, 0).toLocaleString()} expected attendees</span>
            <span>{unique(filtered.map((item) => item.category)).length} categories</span>
          </div>
        </CardContent>
      </Card>

      {filtered.length ? (
        view === "calendar" ? (
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
        ) : view === "list" ? (
          <div className="space-y-3">
            {filtered.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 flex-1 gap-4">
                    <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <span className="text-xs font-semibold uppercase">
                        {formatAlumniEventDate(item.date).split(" ")[0]}
                      </span>
                      <span className="text-xl font-semibold leading-none">
                        {formatAlumniEventDate(item.date).split(" ")[1]?.replace(",", "")}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        <StatusBadge>{item.category}</StatusBadge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <FiMapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                          {item.venue}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <FiUsers className="h-4 w-4 text-primary" aria-hidden="true" />
                          {item.attendees.toLocaleString()} expected attendees
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button type="button" className="w-full lg:w-auto" onClick={() => setEvent(item)}>
                    <FiEye className="h-4 w-4" aria-hidden="true" />
                    View Event
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <Card key={item.id} className="flex h-full flex-col">
                <CardContent className="flex h-full flex-col gap-5 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <StatusBadge>{item.category}</StatusBadge>
                    <span className="text-sm text-muted-foreground">
                      {formatAlumniEventDate(item.date)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <div className="mt-auto grid gap-3 rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <FiMapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                      {item.venue}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <FiUsers className="h-4 w-4 text-primary" aria-hidden="true" />
                      {item.attendees.toLocaleString()} expected attendees
                    </span>
                  </div>
                  <Button type="button" className="w-full" onClick={() => setEvent(item)}>
                    <FiEye className="h-4 w-4" aria-hidden="true" />
                    View Event
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        emptyState
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
        description="Alumni events scheduled for this date."
        className="max-w-xl"
      >
        {selectedDate ? (
          <div className="space-y-3">
            {selectedDateEvents.length ? (
              selectedDateEvents.map((item) => (
                <button
                  key={item.id}
                  className="w-full rounded-lg border border-border bg-background p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  type="button"
                  onClick={() => setEvent(item)}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                    {item.category}
                  </p>
                  <h3 className="mt-2 text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.venue} - {item.attendees.toLocaleString()} expected
                  </p>
                </button>
              ))
            ) : (
              <Empty
                className="border-0 bg-transparent p-0"
                title="No events on this date"
                description="There are no matching alumni events scheduled for this date."
              />
            )}
          </div>
        ) : null}
      </Drawer>
      <EventDrawer event={event} onClose={() => setEvent(null)} />
    </PageShell>
  );
}

function CreateOpportunityModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      title: "Product Design Internship",
      type: "Internship",
      company: mockAlumniProfile.company,
      deadline: "Jul 10, 2026",
      audience: "Final year students",
      description: "Share the opportunity scope, requirements, and application steps.",
    },
  });

  function onSubmit(values: OpportunityFormValues) {
    campusToast.success({
      title: "Opportunity Shared",
      description: `${values.title} is ready to be shared with students.`,
    });
    onOpenChange(false);
  }

  return (
    <Modal
      description="Share jobs, internships, scholarships, competitions, or funding opportunities with the university ecosystem."
      open={open}
      title="Create Opportunity"
      onOpenChange={onOpenChange}
    >
      <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            Opportunity Title
            <CampusInput {...form.register("title")} placeholder="Product Design Internship" />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Type
            <Select
              value={form.watch("type")}
              onValueChange={(value) => form.setValue("type", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {["Job", "Internship", "Scholarship", "Funding", "Competition"].map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-2 text-sm font-medium">
            Organization
            <CampusInput {...form.register("company")} placeholder="Kijani Labs" />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Deadline
            <CampusInput {...form.register("deadline")} placeholder="Jul 10, 2026" />
          </label>
          <label className="space-y-2 text-sm font-medium md:col-span-2">
            Audience
            <CampusInput {...form.register("audience")} placeholder="Final year students" />
          </label>
          <label className="space-y-2 text-sm font-medium md:col-span-2">
            Description
            <CampusTextarea
              className="min-h-36"
              {...form.register("description")}
              placeholder="Describe the opportunity, requirements, and next steps."
            />
          </label>
        </div>
        <Button className="w-full" type="submit">
          <FiPlus className="h-4 w-4" />
          Share Opportunity
        </Button>
      </form>
    </Modal>
  );
}

export function AlumniOpportunitiesView() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState(ALL_VALUE);
  const [opportunity, setOpportunity] = useState<AlumniOpportunity | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const filtered = useMemo(
    () =>
      alumniOpportunities.filter((item) => {
        const haystack = `${item.title} ${item.type} ${item.company} ${item.audience} ${item.description}`;
        return (
          (!query || matchesQuery(haystack, query)) &&
          (type === ALL_VALUE || item.type === type)
        );
      }),
    [query, type],
  );

  return (
    <PageShell
      eyebrow="Opportunities"
      title="Share meaningful pathways."
      description="Publish jobs, internships, funding, scholarships, and competitions for students and recent graduates."
      action={
        <Button type="button" onClick={() => setModalOpen(true)}>
          <FiPlus className="h-4 w-4" />
          Create Opportunity
        </Button>
      }
    >
      <Card className="bg-surface">
        <CardContent className="space-y-5 p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Search
              </span>
              <SearchBox
                value={query}
                onChange={setQuery}
                placeholder="Search title, company, audience"
                className="max-w-none"
              />
            </label>
            <FilterSelect
              value={type}
              onChange={setType}
              label="Opportunity Type"
              placeholder="Opportunity type"
              options={unique(alumniOpportunities.map((item) => item.type))}
            />
          </div>
          <div className="flex flex-wrap gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
            <span>{filtered.length} opportunities</span>
            <span>{unique(filtered.map((item) => item.type)).length} types</span>
            <span>{unique(filtered.map((item) => item.company)).length} organizations</span>
          </div>
        </CardContent>
      </Card>
      {filtered.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item.id} className="flex h-full flex-col">
              <CardContent className="flex h-full flex-col gap-5 p-5">
                <div className="flex items-start justify-between gap-3">
                  <StatusBadge>{item.type}</StatusBadge>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {item.deadline}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.company}
                  </p>
                </div>
                <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
                <div className="mt-auto grid gap-3 rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <FiUsers className="h-4 w-4 text-primary" aria-hidden="true" />
                    {item.audience}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <FiCalendar className="h-4 w-4 text-primary" aria-hidden="true" />
                    Apply by {item.deadline}
                  </span>
                </div>
                <Button
                  className="w-full"
                  type="button"
                  onClick={() => setOpportunity(item)}
                >
                  <FiEye className="h-4 w-4" aria-hidden="true" />
                  View Opportunity
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Empty filterName={query || type} />
      )}
      <CreateOpportunityModal open={modalOpen} onOpenChange={setModalOpen} />
      <OpportunityDrawer opportunity={opportunity} onClose={() => setOpportunity(null)} />
    </PageShell>
  );
}

export function AlumniForumView() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL_VALUE);
  const [topic, setTopic] = useState<AlumniForumTopic | null>(null);
  const filtered = alumniForumTopics.filter((item) => {
    const haystack = `${item.title} ${item.category} ${item.author} ${item.summary}`;
    return (
      (!query || matchesQuery(haystack, query)) &&
      (category === ALL_VALUE || item.category === category)
    );
  });

  return (
    <PageShell
      eyebrow="Forum"
      title="Alumni conversations."
      description="Join career advice, mentorship, community, and industry discussions with alumni and campus stakeholders."
    >
      <Card>
        <CardContent className="flex flex-col gap-3 p-5 md:flex-row">
          <SearchBox value={query} onChange={setQuery} placeholder="Search discussions" />
          <FilterSelect
            value={category}
            onChange={setCategory}
            placeholder="Category"
            options={unique(alumniForumTopics.map((item) => item.category))}
          />
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        <div className="space-y-3">
          {filtered.length ? (
            filtered.map((item) => (
              <Card key={item.id}>
                <CardContent className="space-y-4 p-5">
                  <StatusBadge>{item.category}</StatusBadge>
                  <div>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.summary}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <span>{item.author}</span>
                    <span>
                      {item.replies} replies · {item.views} views
                    </span>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => setTopic(item)}>
                    View Discussion
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <Empty filterName={query || category} />
          )}
        </div>
        <SectionCard title="Trending Discussions">
          <div className="space-y-2">
            {alumniForumTopics.map((item) => (
              <Button
                key={item.id}
                className="h-auto justify-start whitespace-normal rounded-lg p-3 text-left"
                type="button"
                variant="secondary"
                onClick={() => setTopic(item)}
              >
                {item.title}
              </Button>
            ))}
          </div>
        </SectionCard>
      </div>
      <Drawer open={Boolean(topic)} title={topic?.title ?? ""} onOpenChange={() => setTopic(null)}>
        {topic ? (
          <div className="space-y-4">
            <StatusBadge>{topic.category}</StatusBadge>
            <p className="text-sm leading-6 text-muted-foreground">{topic.summary}</p>
            <div className="space-y-3">
              <DrawerDetailRow icon={FiUsers} label="Replies" value={topic.replies} />
              <DrawerDetailRow icon={FiEye} label="Views" value={topic.views} />
            </div>
            <Button
              className="w-full"
              type="button"
              onClick={() =>
                campusToast.success({
                  title: "Discussion Followed",
                  description: `You will receive updates for ${topic.title}.`,
                })
              }
            >
              Follow Discussion
            </Button>
          </div>
        ) : null}
      </Drawer>
    </PageShell>
  );
}

export function AlumniProfileView() {
  return (
    <PageShell
      eyebrow="Profile"
      title="Professional alumni profile."
      description="Maintain your professional identity, mentorship availability, education history, and community contribution record."
    >
      <div className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
        <Card>
          <CardContent className="space-y-5 p-5">
            <div className="flex items-center gap-4">
              <AvatarBadge initials="FL" className="h-16 w-16 text-lg" />
              <div>
                <h2 className="text-xl font-semibold">{mockAlumniProfile.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {mockAlumniProfile.position} · {mockAlumniProfile.company}
                </p>
              </div>
            </div>
            <div className="grid gap-3">
              <DetailRow label="Email" value={mockAlumniProfile.email} />
              <DetailRow label="Graduation Year" value={mockAlumniProfile.graduationYear} />
              <DetailRow label="Department" value={mockAlumniProfile.department} />
              <DetailRow label="Industry" value={mockAlumniProfile.industry} />
              <DetailRow label="Location" value={mockAlumniProfile.location} />
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <SectionCard title="Mentorship Statistics">
            <div className="grid gap-3 md:grid-cols-3">
              <DetailRow label="Students Mentored" value="18" />
              <DetailRow label="Active Sessions" value="6" />
              <DetailRow label="Projects Reviewed" value="24" />
            </div>
          </SectionCard>
          <SectionCard title="Skills & Achievements">
            <div className="flex flex-wrap gap-2">
              {[
                "Product Strategy",
                "Education Technology",
                "Mentorship",
                "Startup Advisory",
                "Community Builder",
              ].map((item) => (
                <StatusBadge key={item}>{item}</StatusBadge>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Community Contributions">
            <div className="space-y-3">
              {universityUpdates.map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}

export function AlumniNotificationsView() {
  const [category, setCategory] = useState(ALL_VALUE);
  const [notifications, setNotifications] = useState(alumniNotifications);
  const filtered = notifications.filter(
    (item) => category === ALL_VALUE || item.category === category,
  );
  const categories = unique(alumniNotifications.map((item) => item.category));
  const viewNotification = (item: AlumniNotification) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === item.id ? { ...notification, unread: false } : notification,
      ),
    );
    campusToast.info({
      title: item.title,
      description: item.description,
    });
  };
  const markNotificationRead = (id: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, unread: false } : notification,
      ),
    );
  };
  const clearNotification = (id: string) => {
    setNotifications((current) =>
      current.filter((notification) => notification.id !== id),
    );
  };

  return (
    <PageShell
      eyebrow="Notifications"
      title="Alumni updates."
      description="Track mentorship, opportunities, community, showcase, and event activity."
      action={
        <div className="flex gap-2">
          <Button
            size="sm"
            type="button"
            variant="secondary"
            onClick={() =>
              setNotifications((items) =>
                items.map((item) => ({ ...item, unread: false })),
              )
            }
          >
            Mark read
          </Button>
          <Button size="sm" type="button" variant="secondary" onClick={() => setNotifications([])}>
            Clear all
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[18rem_1fr]">
        <Card className="h-fit xl:sticky xl:top-24">
          <CardContent className="space-y-2 p-4">
            <Button
              className={cn(
                "h-auto w-full justify-between rounded-lg px-3 py-2 text-left text-sm",
                category === ALL_VALUE && "bg-primary/10 text-primary",
              )}
              type="button"
              variant="ghost"
              onClick={() => setCategory(ALL_VALUE)}
            >
              All <span>{notifications.length}</span>
            </Button>
            {categories.map((item) => (
              <Button
                key={item}
                className={cn(
                  "h-auto w-full justify-between rounded-lg px-3 py-2 text-left text-sm",
                  category === item && "bg-primary/10 text-primary",
                )}
                type="button"
                variant="ghost"
                onClick={() => setCategory(item)}
              >
                {item}
                <span>{notifications.filter((notification) => notification.category === item).length}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-3">
          {filtered.length ? (
            filtered.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex gap-4 p-5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FiBell className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge>{item.category}</StatusBadge>
                      {item.unread ? <StatusBadge>Unread</StatusBadge> : null}
                    </div>
                    <h3 className="mt-3 font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    <p className="mt-3 text-xs text-muted-foreground">{item.date}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-label={`Open actions for ${item.title}`}
                        className="h-9 w-9 shrink-0 p-0"
                        type="button"
                        variant="ghost"
                      >
                        <FiMoreVertical className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => viewNotification(item)}>
                        <FiEye className="h-4 w-4" aria-hidden="true" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!item.unread}
                        onClick={() => markNotificationRead(item.id)}
                      >
                        <FiCheckCircle className="h-4 w-4" aria-hidden="true" />
                        Mark as read
                      </DropdownMenuItem>
                      <DropdownMenuItem destructive onClick={() => clearNotification(item.id)}>
                        <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                        Clear
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))
          ) : (
            <Empty filterName={category === ALL_VALUE ? "notifications" : category} />
          )}
        </div>
      </div>
    </PageShell>
  );
}
