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
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiAward,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClipboard,
  FiClock,
  FiCornerUpLeft,
  FiEye,
  FiGrid,
  FiList,
  FiLoader,
  FiMapPin,
  FiMessageSquare,
  FiMoreVertical,
  FiNavigation,
  FiPieChart,
  FiPlus,
  FiSearch,
  FiSend,
  FiStar,
  FiTarget,
  FiThumbsDown,
  FiThumbsUp,
  FiTrash2,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { z } from "zod";

import {
  CardSkeleton,
  CampusCheckbox,
  CampusDataTable,
  CampusInput,
  CampusTextarea,
  CampusViewToggle,
  campusToast,
} from "@/components/campushub";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer } from "@/components/motion/stagger-container";
import { OpenStreetMap } from "@/components/maps/open-street-map";
import { Drawer } from "@/components/shared/drawer";
import { Empty } from "@/components/shared/empty";
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
  isLegacyStudentLeadershipRoleKey,
  isStudentLeadershipPosition,
} from "@/features/authorization/roles";
import { useAuth } from "@/features/auth/auth-provider";
import {
  mockAnnouncements as mockLeadershipAnnouncements,
  mockCommitteeMembers,
  mockEvents as mockLeadershipEvents,
  mockPolls,
  mockStudentInvitations,
  mockStudents,
  mockSuggestions as mockLeadershipSuggestions,
  type Poll,
} from "@/features/representative/lib/mock-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import {
  showcaseBadges,
  showcaseProfile,
} from "@/features/showcase/lib/mock-data";
import {
  announcementCategories,
  mockAlmanacItems,
  mockAnnouncements,
  mockCampusLocations,
  mockEvents,
  mockForumTopics,
  mockNotifications,
  mockStudentProfile,
  mockSuggestions,
  type AlmanacItem,
  type CampusLocation,
  type ForumTopic,
  type StudentAnnouncement,
  type StudentEvent,
  type StudentNotification,
  type StudentSuggestion,
} from "@/features/student-portal/lib/mock-data";
import type { DataTableColumn } from "@/components/shared/data-table";
import { cn } from "@/lib/utils";

function toFiniteNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getSafeShowcaseProfile() {
  const currentXp = toFiniteNumber(showcaseProfile.currentXp ?? showcaseProfile.xp);
  const nextLevelXp = Math.max(
    toFiniteNumber(showcaseProfile.nextLevelXp, 0),
    currentXp,
  );
  const featuredProjects = Array.isArray(showcaseProfile.featuredProjects)
    ? showcaseProfile.featuredProjects
    : [];
  const topProject = showcaseProfile.topProject ?? featuredProjects[0] ?? null;

  return {
    level: toFiniteNumber(showcaseProfile.level),
    currentXp,
    nextLevelXp,
    xpRemaining: Math.max(nextLevelXp - currentXp, 0),
    progressPercent:
      nextLevelXp > 0 ? Math.min((currentXp / nextLevelXp) * 100, 100) : 0,
    featuredProjects,
    topProject,
  };
}

const dashboardStatCards: {
  label: string;
  value: string;
  icon: IconType;
  trend: string;
  tone: string;
}[] = [
  {
    label: "Upcoming Events",
    value: "0",
    icon: FiCalendar,
    trend: "0",
    tone: "bg-blue-500/10 text-blue-500",
  },
  {
    label: "Saved Updates",
    value: "0",
    icon: FiBell,
    trend: "0%",
    tone: "bg-rose-500/10 text-rose-500",
  },
  {
    label: "Active Forums",
    value: "0",
    icon: FiMessageSquare,
    trend: "0%",
    tone: "bg-amber-500/10 text-amber-500",
  },
  {
    label: "Profile Score",
    value: "0%",
    icon: FiAward,
    trend: "0%",
    tone: "bg-violet-500/10 text-violet-500",
  },
  {
    label: "Campus Services",
    value: "0",
    icon: FiMapPin,
    trend: "0",
    tone: "bg-emerald-500/10 text-emerald-500",
  },
];

const engagementCategories = [
  { name: "Academic", value: 0, color: "var(--chart-tertiary)" },
  { name: "Events", value: 0, color: "var(--chart-secondary)" },
  { name: "Forum", value: 0, color: "var(--chart-primary)" },
  { name: "Support", value: 0, color: "var(--chart-accent)" },
];

const engagementOverviewMetrics = [
  { label: "Academic", value: 0, color: "var(--primary)" },
  { label: "Events", value: 0, color: "var(--chart-accent)" },
  { label: "Forum", value: 0, color: "var(--chart-secondary)" },
  { label: "Support", value: 0, color: "var(--chart-tertiary)" },
];

const weeklyGoals = [
  {
    label: "Events Joined",
    value: 0,
    detail: "0 of 0 this week",
    color: "var(--chart-accent)",
  },
  {
    label: "Forum Activity",
    value: 0,
    detail: "0 of 0 discussions",
    color: "var(--chart-secondary)",
  },
  {
    label: "Profile Growth",
    value: 0,
    detail: "0% complete",
    color: "var(--chart-tertiary)",
  },
];

const recentCampusItems: Array<{
  icon: string;
  title: string;
  meta: string;
}> = [];

const campusPlanRows = [
  {
    day: "Mon",
    dots: [],
    progress: "0/0",
  },
  {
    day: "Tue",
    dots: [],
    progress: "0/0",
  },
  {
    day: "Wed",
    dots: [],
    progress: "0/0",
  },
  {
    day: "Thu",
    dots: [],
    progress: "0/0",
  },
  {
    day: "Fri",
    dots: [],
    progress: "0/0",
  },
];

type DashboardInterval = "7d" | "14d" | "30d" | "semester";

const dashboardIntervalOptions: Array<{
  value: DashboardInterval;
  label: string;
  chartPoints: number;
  multiplier: number;
}> = [
  { value: "7d", label: "Last 7 days", chartPoints: 7, multiplier: 1 },
  { value: "14d", label: "Last 14 days", chartPoints: 14, multiplier: 1.8 },
  { value: "30d", label: "Last 30 days", chartPoints: 10, multiplier: 3.6 },
  { value: "semester", label: "This semester", chartPoints: 12, multiplier: 9 },
];

const dashboardIntervalMap = Object.fromEntries(
  dashboardIntervalOptions.map((option) => [option.value, option]),
) as Record<DashboardInterval, (typeof dashboardIntervalOptions)[number]>;

function formatCompactNumber(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }

  return value.toLocaleString();
}

function buildDashboardData(interval: DashboardInterval) {
  const config = dashboardIntervalMap[interval];
  const chartData = Array.from({ length: config.chartPoints }, (_, index) => {
    const seed = index + 1;

    return {
      day: interval === "semester" ? `W${seed}` : String(seed).padStart(2, "0"),
      events: 0,
      updates: 0,
    };
  });
  const eventsTotal = chartData.reduce((total, item) => total + item.events, 0);
  const updatesTotal = chartData.reduce(
    (total, item) => total + item.updates,
    0,
  );
  const profileScore = mockStudentProfile.completion ?? 0;

  return {
    intervalLabel: config.label,
    statCards: [
      {
        ...dashboardStatCards[0],
        value: formatCompactNumber(eventsTotal),
        trend: "0",
      },
      {
        ...dashboardStatCards[1],
        value: formatCompactNumber(updatesTotal),
        trend: "0%",
      },
      {
        ...dashboardStatCards[2],
        value: "0",
        trend: "0%",
      },
      {
        ...dashboardStatCards[3],
        value: `${profileScore}%`,
        trend: "0%",
      },
      {
        ...dashboardStatCards[4],
        value: "0",
        trend: "0",
      },
    ],
    chartData,
    activityTotals: {
      events: eventsTotal,
      updates: updatesTotal,
    },
    engagementMetrics: engagementOverviewMetrics,
    engagementCategories,
    weeklyGoals,
  };
}

const leadershipStatCards: {
  label: string;
  value: string;
  icon: IconType;
  href: string;
}[] = [
  {
    label: "Students Joined",
    value: mockStudents
      .filter((student) => student.status === "ACTIVE")
      .length.toLocaleString(),
    icon: FiUsers,
    href: "/student/leadership/committee",
  },
  {
    label: "Active Invitation Links",
    value: mockStudentInvitations
      .filter((invitation) => invitation.status === "ACTIVE")
      .length.toString(),
    icon: FiSend,
    href: "/student/leadership/invitations",
  },
  {
    label: "Upcoming College Events",
    value: mockLeadershipEvents
      .filter((event) => event.status === "UPCOMING")
      .length.toString(),
    icon: FiCalendar,
    href: "/student/leadership/events",
  },
  {
    label: "Pending Suggestions",
    value: mockLeadershipSuggestions
      .filter((suggestion) => suggestion.status === "PENDING")
      .length.toString(),
    icon: FiClipboard,
    href: "/student/leadership/suggestions",
  },
  {
    label: "Active Polls",
    value: mockPolls
      .filter((poll) => poll.status === "ACTIVE")
      .length.toString(),
    icon: FiPieChart,
    href: "/student/leadership/polls",
  },
  {
    label: "Committee Members",
    value: mockCommitteeMembers.length.toString(),
    icon: FiUsers,
    href: "/student/leadership/committee",
  },
];

const quickAccessCards: {
  label: string;
  href: string;
  icon: IconType;
}[] = [
  { label: "Campus Map", href: "/student/map", icon: FiMapPin },
  { label: "Academic Almanac", href: "/student/almanac", icon: FiBookOpen },
  { label: "Notifications", href: "/student/notifications", icon: FiBell },
];

function hasLeadershipPosition(
  positions: string[] | undefined,
  roles: string[] | undefined,
  position: "REPRESENTATIVE" | "COMMITTEE_MEMBER",
) {
  const explicit = positions?.filter(isStudentLeadershipPosition) ?? [];
  const legacy =
    roles
      ?.filter(isLegacyStudentLeadershipRoleKey)
      .filter(isStudentLeadershipPosition) ?? [];

  return Array.from(new Set([...explicit, ...legacy])).includes(position);
}

type OwnershipFilter = "all" | "mine" | "other";

const ownershipFilters = [
  { value: "all", label: "All" },
  { value: "mine", label: "Mine" },
  { value: "other", label: "Other" },
] satisfies Array<{ value: OwnershipFilter; label: string }>;

function getCurrentUserName(user: ReturnType<typeof useAuth>["user"]) {
  return (
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    mockStudentProfile.name
  );
}

function canCreateStudentContent(user: ReturnType<typeof useAuth>["user"]) {
  return (
    hasLeadershipPosition(
      user?.studentLeadershipPositions,
      user?.roles,
      "REPRESENTATIVE",
    ) ||
    hasLeadershipPosition(
      user?.studentLeadershipPositions,
      user?.roles,
      "COMMITTEE_MEMBER",
    )
  );
}

function matchesOwnership(
  item: Record<string, unknown>,
  ownership: OwnershipFilter,
  currentUserName: string,
) {
  if (ownership === "all") return true;
  const createdBy = String(item.createdBy ?? item.author ?? "");
  return ownership === "mine"
    ? createdBy === currentUserName
    : createdBy !== currentUserName;
}

function OwnershipTabs({
  value,
  onValueChange,
}: {
  value: OwnershipFilter;
  onValueChange: (value: OwnershipFilter) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {ownershipFilters.map((item) => (
        <Button
          key={item.value}
          type="button"
          variant={value === item.value ? "default" : "secondary"}
          onClick={() => onValueChange(item.value)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}

const createAnnouncementSchema = z.object({
  title: z.string().min(2, "Title is required."),
  category: z.enum(announcementCategories),
  audience: z.string().min(2, "Audience is required."),
  body: z.string().min(10, "Announcement body is required."),
});

type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

function CreateAnnouncementForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (values: CreateAnnouncementInput) => void;
  isSubmitting: boolean;
}) {
  const { register, handleSubmit, watch, setValue, formState } = useForm<
    z.input<typeof createAnnouncementSchema>,
    unknown,
    CreateAnnouncementInput
  >({
    resolver: zodResolver(createAnnouncementSchema),
    defaultValues: {
      title: "",
      category: "General",
      audience: "All Students",
      body: "",
    },
  });

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <label className="block space-y-2">
        <span className="text-sm font-medium">Title</span>
        <CampusInput
          {...register("title")}
          invalid={Boolean(formState.errors.title)}
          placeholder="Announcement title"
        />
      </label>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Category</span>
          <Select
            value={watch("category")}
            onValueChange={(value) =>
              setValue("category", value as CreateAnnouncementInput["category"])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {announcementCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Audience</span>
          <CampusInput
            {...register("audience")}
            invalid={Boolean(formState.errors.audience)}
            placeholder="All Students"
          />
        </label>
      </div>
      <label className="block space-y-2">
        <span className="text-sm font-medium">Body</span>
        <CampusTextarea
          {...register("body")}
          invalid={Boolean(formState.errors.body)}
          placeholder="Write the announcement body."
        />
      </label>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        Create Announcement
      </Button>
    </form>
  );
}

const createEventSchema = z.object({
  title: z.string().min(2, "Event title is required."),
  category: z.string().min(2, "Category is required."),
  venue: z.string().min(2, "Venue is required."),
  date: z.string().min(1, "Date is required."),
  time: z.string().min(1, "Time is required."),
  expectedAttendees: z.coerce.number().int().min(0),
  description: z.string().min(10, "Description is required."),
});

type CreateEventInput = z.infer<typeof createEventSchema>;

function CreateEventForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (values: CreateEventInput) => void;
  isSubmitting: boolean;
}) {
  const { register, handleSubmit, formState } = useForm<
    z.input<typeof createEventSchema>,
    unknown,
    CreateEventInput
  >({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      category: "General",
      venue: "",
      date: "",
      time: "",
      expectedAttendees: 0,
      description: "",
    },
  });

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Title</span>
          <CampusInput
            {...register("title")}
            invalid={Boolean(formState.errors.title)}
            placeholder="Event title"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Category</span>
          <CampusInput
            {...register("category")}
            invalid={Boolean(formState.errors.category)}
            placeholder="Workshop"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Venue</span>
          <CampusInput
            {...register("venue")}
            invalid={Boolean(formState.errors.venue)}
            placeholder="Main Hall"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Date</span>
          <CampusInput
            {...register("date")}
            type="date"
            invalid={Boolean(formState.errors.date)}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Time</span>
          <CampusInput
            {...register("time")}
            placeholder="10:00 AM"
            invalid={Boolean(formState.errors.time)}
          />
        </label>
        <label className="block space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Expected Attendees</span>
          <CampusInput
            {...register("expectedAttendees")}
            type="number"
            invalid={Boolean(formState.errors.expectedAttendees)}
          />
        </label>
      </div>
      <label className="block space-y-2">
        <span className="text-sm font-medium">Description</span>
        <CampusTextarea
          {...register("description")}
          invalid={Boolean(formState.errors.description)}
          placeholder="Describe the event."
        />
      </label>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        Create Event
      </Button>
    </form>
  );
}

const createPollSchema = z.object({
  title: z.string().min(2, "Title is required."),
  question: z.string().min(5, "Question is required."),
  category: z.string().min(2, "Category is required."),
  audience: z.string().min(2, "Audience is required."),
  endDate: z.string().min(1, "End date is required."),
  description: z.string().min(10, "Description is required."),
  options: z.string().min(3, "Add at least two options."),
});

type CreatePollInput = z.infer<typeof createPollSchema>;

function CreatePollForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (values: CreatePollInput) => void;
  isSubmitting: boolean;
}) {
  const { register, handleSubmit, formState } = useForm<
    z.input<typeof createPollSchema>,
    unknown,
    CreatePollInput
  >({
    resolver: zodResolver(createPollSchema),
    defaultValues: {
      title: "",
      question: "",
      category: "General",
      audience: "All Students",
      endDate: "",
      description: "",
      options: "Yes\nNo",
    },
  });

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Title</span>
          <CampusInput
            {...register("title")}
            invalid={Boolean(formState.errors.title)}
            placeholder="Poll title"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">End Date</span>
          <CampusInput
            {...register("endDate")}
            type="date"
            invalid={Boolean(formState.errors.endDate)}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Category</span>
          <CampusInput
            {...register("category")}
            invalid={Boolean(formState.errors.category)}
            placeholder="General"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Audience</span>
          <CampusInput
            {...register("audience")}
            invalid={Boolean(formState.errors.audience)}
            placeholder="All Students"
          />
        </label>
      </div>
      <label className="block space-y-2">
        <span className="text-sm font-medium">Question</span>
        <CampusInput
          {...register("question")}
          invalid={Boolean(formState.errors.question)}
          placeholder="What should students vote on?"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium">Description</span>
        <CampusTextarea
          {...register("description")}
          invalid={Boolean(formState.errors.description)}
          placeholder="Explain the context for the poll."
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium">Options</span>
        <CampusTextarea
          {...register("options")}
          invalid={Boolean(formState.errors.options)}
          placeholder={"Yes\nNo"}
        />
      </label>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        Create Poll
      </Button>
    </form>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function daysUntil(value: string) {
  const now = new Date("2026-06-13T00:00:00");
  const target = new Date(`${value}T00:00:00`);
  return Math.max(
    0,
    Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function formatTimeRemaining(value: string, status?: string) {
  if (status === "CLOSED") return "Closed";
  const days = daysUntil(value);
  if (days === 0) return "Ends today";
  if (days === 1) return "Ends tomorrow";
  return `Ends in ${days} days`;
}

function formatResultVisibility(value: Poll["resultsVisibility"]) {
  const labels: Record<Poll["resultsVisibility"], string> = {
    ALWAYS_VISIBLE: "Always visible",
    AFTER_VOTING: "Visible after voting",
    AFTER_ENDS: "Visible after poll ends",
    HIDDEN: "Hidden",
  };

  return labels[value];
}

function getPollTotalVotes(poll: Poll) {
  return Object.values(poll.optionVotes).reduce((total, value) => total + value, 0);
}

function getPollOptionPercent(poll: Poll, option: string) {
  const total = getPollTotalVotes(poll) || poll.responses || 1;
  return Math.round(((poll.optionVotes[option] ?? 0) / total) * 100);
}

function getWinningOption(poll: Poll) {
  return poll.options.reduce((winner, option) => {
    const winnerVotes = poll.optionVotes[winner] ?? 0;
    const optionVotes = poll.optionVotes[option] ?? 0;
    return optionVotes > winnerVotes ? option : winner;
  }, poll.options[0] ?? "");
}

function canShowPollResults(poll: Poll, hasVoted = false) {
  if (poll.resultsVisibility === "ALWAYS_VISIBLE") return true;
  if (poll.resultsVisibility === "AFTER_VOTING") return hasVoted;
  if (poll.resultsVisibility === "AFTER_ENDS") return poll.status === "CLOSED";
  return false;
}

function getEmptyFilterName(query: string, filter?: string) {
  const normalizedFilter = filter && filter !== "All" ? filter : "";
  const normalizedQuery = query.trim();

  return normalizedFilter || normalizedQuery || undefined;
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-md border border-border bg-surface-muted px-2 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function StudentPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <FadeIn>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground md:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </FadeIn>
  );
}

function StudentShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
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

function AnnouncementDetails({
  announcement,
}: {
  announcement: StudentAnnouncement;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill>{announcement.category}</StatusPill>
        <StatusPill>{announcement.audience}</StatusPill>
        {announcement.pinned ? <StatusPill>Pinned</StatusPill> : null}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        {announcement.body}
      </p>
      <div className="rounded-lg border border-border bg-surface-muted p-4 text-sm">
        Published {formatDate(announcement.date)}
      </div>
    </div>
  );
}

type AnnouncementViewMode = "grid" | "list";

const announcementViewOptions = [
  { value: "grid", label: "Grid view", icon: FiGrid },
  { value: "list", label: "List view", icon: FiList },
] satisfies Array<{
  value: AnnouncementViewMode;
  label: string;
  icon: typeof FiGrid;
}>;

const announcementGroupLabels = [
  "Today",
  "This Week",
  "Last Week",
  "Last Month",
  "Older",
] as const;

type AnnouncementGroupLabel = (typeof announcementGroupLabels)[number];

function getAnnouncementGroup(date: string): AnnouncementGroupLabel {
  const now = new Date("2026-06-12T00:00:00");
  const announcementDate = new Date(`${date}T00:00:00`);
  const diffDays = Math.floor(
    (now.getTime() - announcementDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 0) return "Today";
  if (diffDays <= 7) return "This Week";
  if (diffDays <= 14) return "Last Week";
  if (diffDays <= 45) return "Last Month";
  return "Older";
}

function AnnouncementCard({
  announcement,
  onView,
}: {
  announcement: StudentAnnouncement;
  onView: (announcement: StudentAnnouncement) => void;
}) {
  return (
    <Card className="flex h-full min-h-64 flex-col transition-transform duration-300 hover:-translate-y-1 hover:border-primary/40">
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <StatusPill>{announcement.category}</StatusPill>
          {announcement.pinned ? <StatusPill>Pinned</StatusPill> : null}
        </div>
        <h2 className="mt-5 text-lg font-semibold">{announcement.title}</h2>
        <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">
          {announcement.body}
        </p>
        <div className="mt-auto flex items-center justify-between pt-5">
          <span className="text-xs text-muted-foreground">
            {formatDate(announcement.date)}
          </span>
          <Button type="button" variant="secondary" onClick={() => onView(announcement)}>
            <FiEye className="h-4 w-4" aria-hidden="true" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AnnouncementList({
  groups,
  onView,
}: {
  groups: Record<AnnouncementGroupLabel, StudentAnnouncement[]>;
  onView: (announcement: StudentAnnouncement) => void;
}) {
  return (
    <div className="mt-6 space-y-6">
      {announcementGroupLabels.map((label) => {
        const items = groups[label];
        if (!items.length) return null;

        return (
          <section key={label} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {label}
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              {items.map((announcement, index) => (
                <div
                  key={announcement.id}
                  className={cn(
                    "flex flex-col gap-3 p-4 transition-colors hover:bg-surface-muted/70 sm:flex-row sm:items-center sm:justify-between",
                    index > 0 && "border-t border-border",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill>{announcement.category}</StatusPill>
                      {announcement.pinned ? <StatusPill>Pinned</StatusPill> : null}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(announcement.date)}
                      </span>
                    </div>
                    <h2 className="mt-2 truncate text-sm font-semibold">
                      {announcement.title}
                    </h2>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {announcement.body}
                    </p>
                  </div>
                  <Button
                    className="shrink-0"
                    type="button"
                    variant="secondary"
                    onClick={() => onView(announcement)}
                  >
                    <FiEye className="h-4 w-4" aria-hidden="true" />
                    View
                  </Button>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function EventDetails({ event }: { event: StudentEvent }) {
  return (
    <div className="space-y-5">
      <div className="relative aspect-video overflow-hidden rounded-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={event.banner} alt="" className="h-full w-full object-cover" />
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        {event.description}
      </p>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FiMapPin className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Event location
            </p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">{event.venue}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Use the campus map to find the venue and plan your route before the event starts.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="secondary" className="w-full">
            <FiNavigation className="h-4 w-4" aria-hidden="true" />
            Open Directions
          </Button>
          <Button type="button" variant="secondary" className="w-full">
            <FiMapPin className="h-4 w-4" aria-hidden="true" />
            View on Campus Map
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["Category", event.category],
          ["Date", formatDate(event.date)],
          ["Time", event.time],
          ["Expected Attendees", event.expectedAttendees.toLocaleString()],
          ["Status", event.status],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-border p-3">
            <p className="text-xs uppercase tracking-normal text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>
      <Button
        className="w-full"
        type="button"
        onClick={() =>
          campusToast.success({
            title: "RSVP Saved",
            description: "Your event RSVP has been recorded for preview.",
          })
        }
      >
        RSVP to Event
      </Button>
    </div>
  );
}

function DashboardKpiCard({
  label,
  value,
  icon: Icon,
  trend,
  tone,
}: {
  label: string;
  value: string;
  icon: IconType;
  trend: string;
  tone: string;
}) {
  return (
    <Card className="dashboard-card min-h-[104px]">
      <CardContent className="flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md",
              tone,
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="rounded-full bg-success/10 px-2 py-1 text-xs font-semibold text-success">
            {trend}
          </span>
        </div>
        <div className="mt-5">
          <p className="text-xl font-semibold tracking-normal">{value}</p>
          <p className="text-xs font-medium text-muted-foreground sm:text-sm">
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPanel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("dashboard-card", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 p-4 pb-0">
        <div>
          <CardTitle className="text-base leading-tight">{title}</CardTitle>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

function ChartFrame({
  children,
  className = "h-64",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={className}>
      {mounted ? (
        children
      ) : (
        <div className="h-full w-full rounded-lg bg-surface-muted" />
      )}
    </div>
  );
}

function GoalRing({
  label,
  value,
  detail,
  color,
}: {
  label: string;
  value: number;
  detail: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <ChartFrame className="h-16 w-16">
        <ResponsiveContainer
          height="100%"
          minHeight={1}
          minWidth={1}
          width="100%"
        >
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="72%"
            outerRadius="100%"
            data={[{ value, fill: color }]}
            startAngle={90}
            endAngle={-270}
          >
            <RadialBar dataKey="value" cornerRadius={12} background />
          </RadialBarChart>
        </ResponsiveContainer>
      </ChartFrame>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <span className="ml-auto text-sm font-semibold">{value}%</span>
    </div>
  );
}

export function StudentDashboardView() {
  const { user } = useAuth();
  const [selectedInterval, setSelectedInterval] =
    useState<DashboardInterval>("7d");
  const [isIntervalLoading, setIsIntervalLoading] = useState(false);
  const canManageLeadership = hasLeadershipPosition(
    user?.studentLeadershipPositions,
    user?.roles,
    "REPRESENTATIVE",
  );
  const firstName = user?.name?.split(" ")[0] ?? "Student";
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
    [],
  );
  const dashboardData = useMemo(
    () => buildDashboardData(selectedInterval),
    [selectedInterval],
  );

  useEffect(() => {
    if (!isIntervalLoading) return;

    const timeout = window.setTimeout(() => {
      setIsIntervalLoading(false);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [isIntervalLoading, selectedInterval]);

  function changeInterval(value: string) {
    setSelectedInterval(value as DashboardInterval);
    setIsIntervalLoading(true);
  }

  return (
    <StudentShell>
      <FadeIn>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xl font-semibold">Good morning, {firstName}</p>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {todayLabel}
            </p>
          </div>
          <Select value={selectedInterval} onValueChange={changeInterval}>
            <SelectTrigger className="h-11 w-full gap-3 rounded-lg bg-surface sm:w-48">
              <FiCalendar className="h-4 w-4" aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dashboardIntervalOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FadeIn>

      <StaggerContainer className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {isIntervalLoading
          ? dashboardData.statCards.map((stat) => (
              <CardSkeleton key={stat.label} />
            ))
          : dashboardData.statCards.map((stat) => (
              <DashboardKpiCard key={stat.label} {...stat} />
            ))}
      </StaggerContainer>

      <section
        className={cn(
          "mt-5 grid items-stretch gap-4 xl:grid-cols-3",
          isIntervalLoading && "pointer-events-none opacity-70",
        )}
        aria-busy={isIntervalLoading}
      >
        <DashboardPanel
          title="Campus Activity"
          subtitle={`Events joined and updates saved over ${dashboardData.intervalLabel.toLowerCase()}`}
          action={
            <div className="hidden gap-5 text-sm font-semibold sm:flex">
              <span>{dashboardData.activityTotals.events}</span>
              <span>{dashboardData.activityTotals.updates}</span>
            </div>
          }
          className="h-full"
        >
          <ChartFrame>
            <ResponsiveContainer
              height="100%"
              minHeight={1}
              minWidth={1}
              width="100%"
            >
              <BarChart data={dashboardData.chartData} barGap={8}>
                <XAxis
                  axisLine={false}
                  dataKey="day"
                  tickLine={false}
                  tick={{ fill: "currentColor", fontSize: 12 }}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "rgba(79, 70, 229, 0.08)" }}
                  contentStyle={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: "var(--surface)",
                    color: "var(--foreground)",
                  }}
                />
                <Bar
                  dataKey="events"
                  fill="var(--chart-tertiary)"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="updates"
                  fill="var(--chart-secondary)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
          <div className="mt-4 flex justify-center gap-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-[var(--chart-tertiary)]" />
              Events
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-[var(--chart-secondary)]" />
              Updates
            </span>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Engagement Overview"
          subtitle="Average participation across campus services"
          className="h-full"
        >
          <div className="rounded-lg bg-surface-muted p-4">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
                <FiZap className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-2xl font-semibold">0</p>
                <p className="text-xs font-medium text-muted-foreground">
                  avg. activity score
                </p>
              </div>
              <span className="ml-auto text-sm font-medium">0 - 0</span>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {dashboardData.engagementMetrics.map(({ label, value, color }) => (
              <div key={label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{label}</span>
                  <span className="text-muted-foreground">{value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${value}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Recent Updates"
          subtitle="Fresh activity from your campus"
          action={
            <Button asChild size="sm" variant="ghost">
              <Link href="/student/notifications">View all</Link>
            </Button>
          }
          className="h-full"
        >
          {recentCampusItems.length > 0 ? (
            <div className="space-y-5">
              {recentCampusItems.map((item) => (
                <Link
                  key={item.title}
                  className="group flex items-center gap-4 rounded-lg p-2 transition-colors hover:bg-surface-muted"
                  href="/student/notifications"
                >
                  <span className="text-2xl" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold group-hover:text-primary">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-xs font-medium text-muted-foreground">
                      {item.meta}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No recent updates"
              description="Fresh activity from your campus will appear here."
            />
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Active Polls"
          subtitle="Vote on current campus decisions"
          action={
            <Button asChild size="sm" variant="ghost">
              <Link href="/student/polls">View polls</Link>
            </Button>
          }
          className="h-full"
        >
          <div className="space-y-3">
            {mockPolls
              .filter((poll) => poll.status === "ACTIVE")
              .slice(0, 2)
              .map((poll) => (
                <div
                  key={poll.id}
                  className="rounded-lg border border-border bg-surface-muted p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <FiPieChart className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold">
                        {poll.question}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {poll.category} · {poll.responses.toLocaleString()} responses
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatTimeRemaining(poll.endDate)}
                    </span>
                    <Button asChild size="sm">
                      <Link href="/student/polls">Vote</Link>
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Campus Plan"
          subtitle="Today and this week"
          action={
            <Button asChild size="sm" variant="ghost">
              <Link href="/student/almanac">Full plan</Link>
            </Button>
          }
          className="h-full"
        >
          <div className="rounded-lg bg-surface-muted p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Today
            </p>
            <div className="mt-3 grid gap-2">
              {mockAlmanacItems.slice(0, 3).map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-md bg-surface px-3 py-2 text-sm font-medium"
                >
                  <span
                    className="mr-2 inline-block h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        dashboardData.engagementCategories[index % 4].color,
                    }}
                  />
                  {item.title}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {campusPlanRows.map((row) => (
              <div
                key={row.day}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-muted"
              >
                <span className="w-9 text-sm font-medium">{row.day}</span>
                <span className="ml-auto flex items-center gap-1">
                  {row.dots.map((dot, index) => (
                    <span
                      key={`${row.day}-${dot}-${index}`}
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: dot }}
                    />
                  ))}
                </span>
                <span className="w-8 text-right text-sm text-muted-foreground">
                  {row.progress}
                </span>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Activity by Category"
          subtitle="Distribution across campus areas"
          className="h-full"
        >
          <ChartFrame>
            <ResponsiveContainer
              height="100%"
              minHeight={1}
              minWidth={1}
              width="100%"
            >
              <PieChart>
                <Pie
                  data={dashboardData.engagementCategories}
                  dataKey="value"
                  innerRadius={58}
                  outerRadius={92}
                >
                  {dashboardData.engagementCategories.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: "var(--surface)",
                    color: "var(--foreground)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartFrame>
          <div className="mt-2 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            {dashboardData.engagementCategories.map((item) => (
              <span key={item.name} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.name} {item.value}
              </span>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Campus Goals"
          subtitle={`Track your rhythm for ${dashboardData.intervalLabel.toLowerCase()}`}
          className="h-full"
        >
          <div className="space-y-5">
            {dashboardData.weeklyGoals.map((goal) => (
              <GoalRing key={goal.label} {...goal} />
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Poll Participation"
          subtitle="Responses from active campus polls"
          action={
            <Button asChild size="sm" variant="ghost">
              <Link href="/student/polls">Open polls</Link>
            </Button>
          }
          className="h-full"
        >
          <ChartFrame className="h-44">
            <ResponsiveContainer
              height="100%"
              minHeight={1}
              minWidth={1}
              width="100%"
            >
              <BarChart
                data={mockPolls
                  .filter((poll) => poll.status === "ACTIVE")
                  .slice(0, 4)
                  .map((poll) => ({
                    name: poll.category.replace("Student Welfare", "Welfare"),
                    responses: poll.responses,
                  }))}
              >
                <XAxis
                  axisLine={false}
                  dataKey="name"
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "var(--surface-muted)" }}
                  contentStyle={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: "var(--surface)",
                    color: "var(--foreground)",
                  }}
                />
                <Bar
                  dataKey="responses"
                  fill="var(--primary)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
          <div className="mt-3 space-y-2">
            {mockPolls
              .filter((poll) => poll.status === "ACTIVE")
              .slice(0, 2)
              .map((poll) => (
                <div
                  key={poll.id}
                  className="flex items-center justify-between gap-3 rounded-md bg-surface-muted px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate font-medium">
                    {poll.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {poll.responses.toLocaleString()} votes
                  </span>
                </div>
              ))}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Feedback Signals"
          subtitle="Suggestion health by current status"
          className="h-full"
        >
          <div className="space-y-4">
            {[
              {
                label: "Pending",
                value: mockSuggestions.filter(
                  (suggestion) => suggestion.status === "Pending",
                ).length,
                color: "var(--chart-accent)",
              },
              {
                label: "Under Review",
                value: mockSuggestions.filter(
                  (suggestion) => suggestion.status === "Under Review",
                ).length,
                color: "var(--primary)",
              },
              {
                label: "Resolved",
                value: mockSuggestions.filter(
                  (suggestion) => suggestion.status === "Resolved",
                ).length,
                color: "var(--chart-tertiary)",
              },
            ].map((signal) => {
              const total = Math.max(mockSuggestions.length, 1);
              const percentage = Math.round((signal.value / total) * 100);

              return (
                <div key={signal.label}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{signal.label}</span>
                    <span className="text-muted-foreground">
                      {signal.value} item{signal.value === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: signal.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 rounded-lg bg-surface-muted p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Next review
            </p>
            <p className="mt-2 text-sm font-medium">
              Welfare and academic suggestions need representative follow-up.
            </p>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Recent Activity"
          subtitle="No activity in this period"
          className="xl:col-span-3"
          action={
            <span className="text-xs text-muted-foreground">0 events</span>
          }
        >
          <div className="flex h-20 items-center justify-center rounded-lg bg-surface-muted text-sm text-muted-foreground">
            No activity in this period
          </div>
        </DashboardPanel>
      </section>

      {canManageLeadership ? (
        <DashboardPanel
          title="Leadership Workspace"
          subtitle="College operations for student leaders"
          action={
            <Button asChild variant="secondary">
              <Link href="/student/leadership/committee">
                <FiUsers className="h-4 w-4" aria-hidden="true" />
                Manage
              </Link>
            </Button>
          }
          className="mt-4"
        >
          <StaggerContainer className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {leadershipStatCards.map(({ label, value, icon: Icon, href }) => (
              <Link
                key={label}
                className="group rounded-lg border border-border bg-surface-muted p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                href={href}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="mt-5 text-2xl font-semibold">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </Link>
            ))}
          </StaggerContainer>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg bg-surface-muted p-4">
              <p className="text-sm font-semibold">College updates</p>
              <div className="mt-4 space-y-3">
                {mockLeadershipAnnouncements.slice(0, 2).map((item) => (
                  <Link
                    key={item.id}
                    className="block rounded-md bg-surface p-3 text-sm transition-colors hover:text-primary"
                    href="/student/leadership/announcements"
                  >
                    <span className="font-medium">{item.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {item.category} · {item.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="rounded-lg bg-surface-muted p-4">
              <p className="text-sm font-semibold">Pending feedback</p>
              <div className="mt-4 space-y-3">
                {mockLeadershipSuggestions.slice(0, 2).map((item) => (
                  <Link
                    key={item.id}
                    className="block rounded-md bg-surface p-3 text-sm transition-colors hover:text-primary"
                    href="/student/leadership/suggestions"
                  >
                    <span className="font-medium">{item.subject}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {item.category} · {item.status.replaceAll("_", " ")}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </DashboardPanel>
      ) : null}
    </StudentShell>
  );
}

export function LegacyStudentDashboardView() {
  const { user } = useAuth();
  const canManageLeadership = hasLeadershipPosition(
    user?.studentLeadershipPositions,
    user?.roles,
    "REPRESENTATIVE",
  );

  return (
    <StudentShell>
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <FadeIn>
            <p className="text-xl font-semibold">Good evening, Faith</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Wednesday, June 10
            </p>
          </FadeIn>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="secondary">
              <Link href="/student/suggestions">Track Suggestions</Link>
            </Button>
            <Button asChild>
              <Link href="/student/events">Explore Events</Link>
            </Button>
          </div>
        </div>
      </section>

      <StaggerContainer className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStatCards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="min-h-40">
            <CardContent className="flex h-full flex-col justify-between p-5">
              <div className="flex items-start justify-between gap-4">
                <span className="dashboard-icon-tile flex h-11 w-11 items-center justify-center">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="dashboard-pill px-2.5 py-1 text-xs">live</span>
              </div>
              <div className="mt-7">
                <p className="text-3xl font-semibold">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
                <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                  Updated from today&apos;s campus activity
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </StaggerContainer>

      {canManageLeadership ? (
        <section className="dashboard-panel mt-6 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-normal text-primary">
                Leadership
              </p>
              <h2 className="mt-1 text-2xl font-semibold">
                College operations at a glance.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Monitor student enrollment, committee coordination, college
                communication, events, feedback, and polls from the same student
                portal.
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href="/student/leadership/committee">
                <FiUsers className="h-4 w-4" aria-hidden="true" />
                Manage Leadership
              </Link>
            </Button>
          </div>

          <StaggerContainer className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {leadershipStatCards.map(({ label, value, icon: Icon, href }) => (
              <Link
                key={label}
                className="dashboard-card group rounded-lg border border-border bg-surface p-5"
                href={href}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="mt-2 text-3xl font-semibold">{value}</p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </StaggerContainer>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="dashboard-panel p-4">
              <p className="text-sm font-semibold">Recent college updates</p>
              <div className="mt-4 space-y-3">
                {mockLeadershipAnnouncements.slice(0, 2).map((item) => (
                  <Link
                    key={item.id}
                    className="block rounded-md border border-border bg-surface-muted p-3 text-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
                    href="/student/leadership/announcements"
                  >
                    <span className="font-medium">{item.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {item.category} · {item.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="dashboard-panel p-4">
              <p className="text-sm font-semibold">Pending feedback</p>
              <div className="mt-4 space-y-3">
                {mockLeadershipSuggestions.slice(0, 2).map((item) => (
                  <Link
                    key={item.id}
                    className="block rounded-md border border-border bg-surface-muted p-3 text-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
                    href="/student/leadership/suggestions"
                  >
                    <span className="font-medium">{item.subject}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {item.category} · {item.status.replaceAll("_", " ")}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Today’s Feed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ...mockAnnouncements.slice(0, 2).map((item) => ({
                icon: FiBell,
                title: item.title,
                meta: `${item.category} · ${formatDate(item.date)}`,
                href: "/student/announcements",
              })),
              ...mockForumTopics.slice(0, 2).map((item) => ({
                icon: FiMessageSquare,
                title: item.title,
                meta: `${item.replies} replies · ${item.category}`,
                href: "/student/forum",
              })),
              ...mockSuggestions.slice(0, 1).map((item) => ({
                icon: FiZap,
                title: item.subject,
                meta: `Suggestion ${item.status}`,
                href: "/student/suggestions",
              })),
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  className="group flex items-start gap-3 rounded-lg border border-border bg-surface-muted p-4 transition-all hover:border-primary/50 hover:bg-primary/5"
                  href={item.href}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium group-hover:text-primary">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {item.meta}
                    </span>
                  </span>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockEvents.map((event) => (
              <Link
                key={event.id}
                className="block rounded-lg border border-border bg-surface-muted p-4 transition-colors hover:border-primary/50"
                href="/student/events"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(event.date)} · {event.venue}
                    </p>
                  </div>
                  <StatusPill>{daysUntil(event.date)}d</StatusPill>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Today’s Almanac</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockAlmanacItems.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-border bg-surface-muted p-4"
              >
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(item.date)} · {item.time}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {quickAccessCards.map(({ label, href, icon: Icon }) => (
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
        <Card>
          <CardHeader>
            <CardTitle>Campus Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ["CoICT active students", "2,435"],
              ["Upcoming activities", "12"],
              ["Open discussions", "38"],
              ["Resolved suggestions", "64%"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-muted p-3"
              >
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </StudentShell>
  );
}

export function AnnouncementsPageView() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState(mockAnnouncements);
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<(typeof announcementCategories)[number]>("All");
  const [ownership, setOwnership] = useState<OwnershipFilter>("all");
  const [view, setView] = useState<AnnouncementViewMode>("grid");
  const [viewing, setViewing] = useState<StudentAnnouncement | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const currentUserName = getCurrentUserName(user);
  const canCreate = canCreateStudentContent(user);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const selectedCategory = category.trim().toLowerCase();

    return announcements.filter((announcement) => {
      const categoryMatch =
        selectedCategory === "all" ||
        String(announcement.category).toLowerCase() === selectedCategory;
      const queryMatch =
        !normalized ||
        [
          announcement.title,
          announcement.category,
          announcement.audience,
          announcement.body,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      return (
        categoryMatch &&
        queryMatch &&
        matchesOwnership(announcement, ownership, currentUserName)
      );
    });
  }, [announcements, category, currentUserName, ownership, query]);

  const groupedAnnouncements = useMemo(() => {
    const groups = announcementGroupLabels.reduce(
      (acc, label) => {
        acc[label] = [];
        return acc;
      },
      {} as Record<AnnouncementGroupLabel, StudentAnnouncement[]>,
    );

    filtered.forEach((announcement) => {
      groups[getAnnouncementGroup(announcement.date)].push(announcement);
    });

    return groups;
  }, [filtered]);

  function changeCategory(nextCategory: (typeof announcementCategories)[number]) {
    setCategory(nextCategory);
  }

  function createAnnouncement(values: CreateAnnouncementInput) {
    startTransition(() => {
      setAnnouncements((current) => [
        {
          id: `announcement-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          pinned: false,
          createdBy: currentUserName,
          ...values,
        },
        ...current,
      ]);
      setCreateOpen(false);
      setOwnership("mine");
      campusToast.success({
        title: "Announcement Created",
        description: "The announcement was added to this page.",
      });
    });
  }

  return (
    <StudentShell>
      <StudentPageHeader
        eyebrow="Announcements"
        title="Campus updates that matter."
        description="Browse official academic, welfare, sports, media, and technology announcements from your university and college."
        action={
          canCreate ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <FiPlus className="h-4 w-4" aria-hidden="true" />
              Create Announcement
            </Button>
          ) : null
        }
      />
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar query={query} setQuery={setQuery} placeholder="Search announcements" />
        <CampusViewToggle
          value={view}
          options={announcementViewOptions}
          onValueChange={setView}
        />
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {announcementCategories.map((item) => (
          <Button
            key={item}
            type="button"
            variant={category === item ? "default" : "secondary"}
            onClick={() => changeCategory(item)}
          >
            {item}
          </Button>
        ))}
      </div>
      {canCreate ? (
        <div className="mt-4">
          <OwnershipTabs value={ownership} onValueChange={setOwnership} />
        </div>
      ) : null}
      {filtered.length > 0 && view === "grid" ? (
        <div
          key={`announcements-grid-${category}-${query.trim() || "all"}-${filtered.length}`}
          className="mt-6 grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {filtered.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onView={setViewing}
            />
          ))}
        </div>
      ) : null}
      {filtered.length > 0 && view === "list" ? (
        <AnnouncementList groups={groupedAnnouncements} onView={setViewing} />
      ) : null}
      {filtered.length === 0 ? (
        <Empty
          className="mt-6 min-h-[24rem]"
          filterName={getEmptyFilterName(query, category)}
          title={
            category === "All" && !query.trim()
              ? "No announcements available"
              : undefined
          }
          description={
            category === "All" && !query.trim()
              ? "Announcements from your university and college will appear here."
              : "Try a different category or clear your search to view more announcements."
          }
        />
      ) : null}
      <Modal
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.title ?? "Announcement"}
        description={viewing?.category}
        className="max-w-2xl"
      >
        {viewing ? <AnnouncementDetails announcement={viewing} /> : null}
      </Modal>
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Announcement"
        description="Publish an announcement directly from this page."
        className="max-w-2xl"
      >
        <CreateAnnouncementForm
          onSubmit={createAnnouncement}
          isSubmitting={isPending}
        />
      </Modal>
    </StudentShell>
  );
}

type StudentEventsViewMode = "cards" | "calendar";

const studentEventsViewOptions = [
  { value: "cards", label: "Card view", icon: FiGrid },
  { value: "calendar", label: "Calendar view", icon: FiCalendar },
] satisfies Array<{
  value: StudentEventsViewMode;
  label: string;
  icon: typeof FiGrid;
}>;

export function EventsPageView() {
  const { user } = useAuth();
  const [events, setEvents] = useState(mockEvents);
  const [query, setQuery] = useState("");
  const [ownership, setOwnership] = useState<OwnershipFilter>("all");
  const [view, setView] = useState<StudentEventsViewMode>("cards");
  const [viewing, setViewing] = useState<StudentEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const currentUserName = getCurrentUserName(user);
  const canCreate = canCreateStudentContent(user);

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    return events.filter((event) => {
      const queryMatch =
        !normalized ||
        [event.title, event.category, event.venue, event.description]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return (
        queryMatch && matchesOwnership(event, ownership, currentUserName)
      );
    });
  }, [currentUserName, events, ownership, query]);
  const calendarEvents = useMemo<FullCalendarEventInput[]>(
    () =>
      filtered.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.date.slice(0, 10),
        allDay: true,
        extendedProps: {
          category: event.category,
          venue: event.venue,
          time: event.time,
        },
        classNames: [
          event.status === "Almost Full"
            ? "campushub-calendar-event-deadline"
            : event.status === "Registered"
              ? "campushub-calendar-event-exam"
              : "campushub-calendar-event-default",
        ],
      })),
    [filtered],
  );
  const selectedDateEvents = selectedDate
    ? events.filter((event) => event.date.slice(0, 10) === selectedDate)
    : [];

  function openCalendarDate(arg: DateClickArg) {
    setSelectedDate(arg.dateStr);
  }

  function openCalendarEvent(arg: EventClickArg) {
    const event = events.find((item) => item.id === arg.event.id);
    if (event) {
      setViewing(event);
    }
  }

  function createEvent(values: CreateEventInput) {
    startTransition(() => {
      setEvents((current) => [
        {
          id: `event-${Date.now()}`,
          status: "Upcoming",
          createdBy: currentUserName,
          ...values,
        },
        ...current,
      ]);
      setCreateOpen(false);
      setOwnership("mine");
      campusToast.success({
        title: "Event Created",
        description: "The event was added to this page.",
      });
    });
  }

  return (
    <StudentShell>
      <StudentPageHeader
        eyebrow="Events"
        title="Find your next campus moment."
        description="Discover workshops, hackathons, conferences, sports, clubs, and social activities across campus."
        action={
          canCreate ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <FiPlus className="h-4 w-4" aria-hidden="true" />
              Create Event
            </Button>
          ) : null
        }
      />
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar
          query={query}
          setQuery={setQuery}
          placeholder="Search events"
        />
        <CampusViewToggle
          value={view}
          options={studentEventsViewOptions}
          onValueChange={setView}
        />
      </div>
      {canCreate && tab !== "my-votes" ? (
        <div className="mt-4">
          <OwnershipTabs value={ownership} onValueChange={setOwnership} />
        </div>
      ) : null}
      {view === "cards" ? (
        filtered.length > 0 ? (
          <StaggerContainer className="mt-6 grid gap-5 lg:grid-cols-3">
            {filtered.map((event) => (
              <Card
                key={event.id}
                className="overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:border-primary/40"
              >
                <div className="relative h-44">
                  {event.banner ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={event.banner}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                      <FiCalendar className="h-10 w-10" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <StatusPill>{event.category}</StatusPill>
                    <StatusPill>{daysUntil(event.date)} days</StatusPill>
                  </div>
                  <h2 className="mt-4 text-lg font-semibold">{event.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatDate(event.date)} · {event.time}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {event.venue}
                  </p>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">
                      {event.expectedAttendees.toLocaleString()} expected
                    </span>
                    <Button type="button" onClick={() => setViewing(event)}>
                      <FiEye className="h-4 w-4" aria-hidden="true" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </StaggerContainer>
        ) : (
          <Empty
            className="mt-6 min-h-[22rem]"
            filterName={getEmptyFilterName(query)}
            title={!query.trim() ? "No events available" : undefined}
            description={
              !query.trim()
                ? "Campus events will appear here once they are published."
                : "Try another search term to view more campus events."
            }
          />
        )
      ) : calendarEvents.length > 0 ? (
        <section className="campushub-calendar mt-6 rounded-xl border border-border bg-surface p-4">
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
      ) : (
        <Empty
          className="mt-6 min-h-[22rem]"
          filterName={getEmptyFilterName(query)}
          title={!query.trim() ? "No calendar events available" : undefined}
          description={
            !query.trim()
              ? "Campus events will appear on the calendar once they are published."
              : "Try another search term to view more calendar events."
          }
        />
      )}
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
            : "Event date"
        }
        description="Campus events scheduled for this date."
        className="max-w-xl"
      >
        {selectedDate ? (
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
                    {event.category}
                  </p>
                  <h3 className="mt-2 text-sm font-semibold">{event.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.time} · {event.venue}
                  </p>
                </button>
              ))
            ) : (
              <EmptyState
                title="No events on this date"
                description="There are no matching campus events scheduled for this date."
                className="border-0 bg-transparent p-0"
              />
            )}
          </div>
        ) : null}
      </Drawer>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.title ?? "Event"}
        description={viewing?.category}
        className="max-w-xl"
      >
        {viewing ? <EventDetails event={viewing} /> : null}
      </Drawer>
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Event"
        description="Publish an event directly from this page."
        className="max-w-2xl"
      >
        <CreateEventForm onSubmit={createEvent} isSubmitting={isPending} />
      </Modal>
    </StudentShell>
  );
}

type StudentAlmanacViewMode = "calendar" | "timeline" | "cards" | "table";

const studentAlmanacViewOptions = [
  { value: "calendar", label: "Calendar view", icon: FiCalendar },
  { value: "timeline", label: "Timeline view", icon: FiClock },
  { value: "cards", label: "Card view", icon: FiGrid },
  { value: "table", label: "Table view", icon: FiList },
] satisfies Array<{
  value: StudentAlmanacViewMode;
  label: string;
  icon: typeof FiCalendar;
}>;

function isSameAlmanacDay(a: string, b: string) {
  return a.slice(0, 10) === b.slice(0, 10);
}

export function AlmanacPageView() {
  const [view, setView] = useState<StudentAlmanacViewMode>("calendar");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewing, setViewing] = useState<AlmanacItem | null>(null);
  const almanacTypes = [
    "All",
    ...Array.from(new Set(mockAlmanacItems.map((item) => item.type))),
  ];
  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();

    return mockAlmanacItems.filter((item) => {
      const typeMatch = typeFilter === "All" || item.type === typeFilter;
      const queryMatch =
        !normalized ||
        [item.title, item.type, item.location, item.description]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return typeMatch && queryMatch;
    });
  }, [query, typeFilter]);
  const timelineItems = [...filtered].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const calendarEvents = useMemo<FullCalendarEventInput[]>(
    () =>
      filtered.map((item) => ({
        id: item.id,
        title: item.title,
        start: item.date.slice(0, 10),
        allDay: true,
        extendedProps: {
          type: item.type,
          time: item.time,
          location: item.location,
        },
        classNames: [
          item.type === "Deadline"
            ? "campushub-calendar-event-deadline"
            : item.type === "Exam"
              ? "campushub-calendar-event-exam"
              : "campushub-calendar-event-default",
        ],
      })),
    [filtered],
  );
  const selectedDateItems = selectedDate
    ? mockAlmanacItems.filter((item) =>
        isSameAlmanacDay(item.date, selectedDate),
      )
    : [];
  const deadlines = mockAlmanacItems.filter((item) => item.type === "Deadline");
  const exams = mockAlmanacItems.filter((item) => item.type === "Exam");

  function openCalendarDate(arg: DateClickArg) {
    setSelectedDate(arg.dateStr);
  }

  function openCalendarEvent(arg: EventClickArg) {
    const item = mockAlmanacItems.find((event) => event.id === arg.event.id);
    if (item) {
      setViewing(item);
    }
  }

  const columns: DataTableColumn<AlmanacItem>[] = [
    { key: "title", header: "Activity" },
    { key: "type", header: "Type" },
    {
      key: "date",
      header: "Date",
      cell: (item) => formatDate(item.date),
    },
    { key: "time", header: "Time" },
    { key: "location", header: "Location" },
    {
      key: "actions",
      header: "Actions",
      className: "w-20 text-right",
      cell: (item) => (
        <Button
          size="sm"
          type="button"
          variant="secondary"
          onClick={() => setViewing(item)}
        >
          <FiEye className="h-4 w-4" aria-hidden="true" />
          View
        </Button>
      ),
    },
  ];

  return (
    <StudentShell>
      <StudentPageHeader
        eyebrow="Academic Almanac"
        title="Your semester timeline."
        description="Track academic activities, registration milestones, exams, and deadlines in one place."
      />
      <div className="mt-8 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-80">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <CampusInput
              className="pl-9"
              placeholder="Search almanac"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-52">
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
        <CampusViewToggle
          value={view}
          options={studentAlmanacViewOptions}
          onValueChange={setView}
        />
      </div>

      {view === "calendar" ? (
        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
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
                  filterName={getEmptyFilterName(query, typeFilter)}
                  title={
                    typeFilter === "All" && !query.trim()
                      ? "No almanac items available"
                      : undefined
                  }
                  description={
                    typeFilter === "All" && !query.trim()
                      ? "Academic activities will appear here once they are published."
                      : "Try another type filter or clear your search to view more almanac items."
                  }
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
                {deadlines.map((item) => (
                  <button
                    key={item.id}
                    className="w-full rounded-md border border-border p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                    type="button"
                    onClick={() => setViewing(item)}
                  >
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(item.date)}
                    </p>
                  </button>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Exams</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {exams.map((item) => (
                  <button
                    key={item.id}
                    className="w-full rounded-md border border-border p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                    type="button"
                    onClick={() => setViewing(item)}
                  >
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(item.date)}
                    </p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      ) : view === "timeline" ? (
        <section className="mt-6 rounded-xl border border-border bg-surface p-5">
          {timelineItems.length > 0 ? (
            <div className="space-y-6">
              {timelineItems.map((item, index) => (
                <div key={item.id} className="relative flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                    <span className="mt-2 h-full w-px bg-border" />
                  </div>
                  <button
                    className="flex-1 rounded-lg border border-border bg-background p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                    type="button"
                    onClick={() => setViewing(item)}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                      {formatDate(item.date)} · {item.type}
                    </p>
                    <h3 className="mt-2 font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.time} · {item.location}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              className="border-0 bg-transparent"
              filterName={getEmptyFilterName(query, typeFilter)}
              title={
                typeFilter === "All" && !query.trim()
                  ? "No almanac items available"
                  : undefined
              }
              description={
                typeFilter === "All" && !query.trim()
                  ? "Academic activities will appear here once they are published."
                  : "Try another type filter or clear your search to view more almanac items."
              }
            />
          )}
        </section>
      ) : view === "cards" ? (
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <StatusPill>{item.type}</StatusPill>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.date)}
                    </span>
                  </div>
                  <h2 className="mt-4 font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.time} · {item.location}
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                  <div className="mt-auto pt-5">
                    <Button
                      className="w-full"
                      type="button"
                      variant="secondary"
                      onClick={() => setViewing(item)}
                    >
                      <FiEye className="h-4 w-4" aria-hidden="true" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Empty
              className="border-0 bg-transparent md:col-span-2 xl:col-span-3"
              filterName={getEmptyFilterName(query, typeFilter)}
              title={
                typeFilter === "All" && !query.trim()
                  ? "No almanac items available"
                  : undefined
              }
              description={
                typeFilter === "All" && !query.trim()
                  ? "Academic activities will appear here once they are published."
                  : "Try another type filter or clear your search to view more almanac items."
              }
            />
          )}
        </section>
      ) : (
        <section className="mt-6">
          <CampusDataTable
            columns={columns}
            data={filtered}
            getRowId={(item) => item.id}
            empty={
              <Empty
                className="border-0 bg-transparent"
                filterName={getEmptyFilterName(query, typeFilter)}
                title={
                  typeFilter === "All" && !query.trim()
                    ? "No almanac items available"
                    : undefined
                }
                description={
                  typeFilter === "All" && !query.trim()
                    ? "Academic activities will appear here once they are published."
                    : "Try another type filter or clear your search to view more almanac items."
                }
              />
            }
          />
        </section>
      )}

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
                  onClick={() => setViewing(item)}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                    {item.type}
                  </p>
                  <h3 className="mt-2 text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.time} · {item.location}
                  </p>
                </button>
              ))
            ) : (
              <EmptyState
                title="No activities on this date"
                description="There are no published almanac items for this date."
                className="border-0 bg-transparent p-0"
              />
            )}
          </div>
        ) : null}
      </Drawer>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.title ?? "Almanac item"}
        description={viewing?.type}
        className="max-w-xl"
      >
        {viewing ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {viewing.description}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Date", formatDate(viewing.date)],
                ["Time", viewing.time],
                ["Location", viewing.location],
                ["Type", viewing.type],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-md border border-border p-3"
                >
                  <p className="text-xs uppercase text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Drawer>
    </StudentShell>
  );
}

export function MapPageView() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [viewing, setViewing] = useState<CampusLocation | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState(
    mockCampusLocations[0]?.id ?? "",
  );
  const [startingPoint, setStartingPoint] = useState("Current location");
  const [routeDestinationId, setRouteDestinationId] = useState(
    mockCampusLocations[0]?.id ?? "",
  );
  const categories = [
    "All",
    ...Array.from(new Set(mockCampusLocations.map((item) => item.category))),
  ];
  const startingPoints = [
    "Current location",
    "Main Gate",
    "Student Center",
    "CoICT Entrance",
    "Main Library",
  ];
  const filtered = mockCampusLocations.filter((location) => {
    const categoryMatch = category === "All" || location.category === category;
    const queryMatch =
      !query ||
      [location.name, location.category, location.code]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase());
    return categoryMatch && queryMatch;
  });
  const selectedLocation =
    mockCampusLocations.find(
      (location) => location.id === selectedLocationId,
    ) ??
    mockCampusLocations[0] ??
    null;
  const routeDestination =
    mockCampusLocations.find(
      (location) => location.id === routeDestinationId,
    ) ?? selectedLocation;
  const hasCampusLocations = mockCampusLocations.length > 0;

  return (
    <StudentShell>
      <StudentPageHeader
        eyebrow="Campus Map"
        title="Find places faster."
        description="Search key campus locations, student services, lecture halls, hostels, dining spaces, and medical facilities."
      />
      <section className="mt-6 h-[calc(100dvh-15rem)] min-h-[46rem] overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid h-full lg:grid-cols-[22rem_1fr] xl:grid-cols-[25rem_1fr]">
          <aside className="min-h-0 overflow-y-auto border-b border-border bg-background/55 p-4 lg:border-b-0 lg:border-r">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <CampusInput
                className="pl-9"
                placeholder="Search campus places"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {categories.map((item) => (
                <Button
                  key={item}
                  size="sm"
                  type="button"
                  variant={category === item ? "default" : "secondary"}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {filtered.length > 0 ? (
                filtered.map((location) => {
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
                          {location.category} · {location.distance}
                        </span>
                      </span>
                    </Button>
                  );
                })
              ) : (
                <Empty
                  className="border-0 bg-transparent"
                  filterName={getEmptyFilterName(query, category)}
                  title={
                    category === "All" && !query.trim()
                      ? "No locations available"
                      : undefined
                  }
                  description={
                    category === "All" && !query.trim()
                      ? "Campus locations will appear here once they are published."
                      : "Try another category or clear your search to view more locations."
                  }
                />
              )}
            </div>
          </aside>
          <div className="grid min-h-0 lg:grid-cols-[1fr_22rem]">
            <div className="relative min-h-[34rem] overflow-hidden lg:min-h-0">
              <OpenStreetMap
                className="absolute inset-0 z-0"
                locations={mockCampusLocations}
                routeDestinationId={routeDestinationId}
                selectedLocationId={selectedLocationId}
                onSelectLocation={(locationId) => {
                  setSelectedLocationId(locationId);
                  setRouteDestinationId(locationId);
                }}
              />
            </div>
            <aside className="min-h-0 overflow-y-auto border-t border-border bg-background/55 p-6 lg:border-l lg:border-t-0 xl:p-8">
              {selectedLocation ? (
                <div className="space-y-6">
                  <div>
                    <StatusPill>{selectedLocation.category}</StatusPill>
                    <h2 className="mt-3 text-lg font-semibold">
                      {selectedLocation.name}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {selectedLocation.description}
                    </p>
                  </div>
                  <div className="grid gap-3">
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs uppercase text-muted-foreground">
                        Code
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {selectedLocation.code}
                      </p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs uppercase text-muted-foreground">
                        Distance
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {selectedLocation.distance}
                      </p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs uppercase text-muted-foreground">
                        Open Now
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {selectedLocation.openNow ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    type="button"
                    variant="secondary"
                    onClick={() => setViewing(selectedLocation)}
                  >
                    <FiNavigation className="h-4 w-4" aria-hidden="true" />
                    View Details
                  </Button>
                </div>
              ) : null}
              <div
                className={cn(
                  selectedLocation ? "mt-8 border-t border-border pt-8" : "",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FiTarget className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Navigate</p>
                    <p className="text-xs text-muted-foreground">
                      Choose a start and destination.
                    </p>
                  </div>
                </div>
                <div className="mt-7 space-y-7">
                  <label className="block space-y-3">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      Start
                    </span>
                    <Select
                      value={startingPoint}
                      onValueChange={setStartingPoint}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {startingPoints.map((point) => (
                          <SelectItem key={point} value={point}>
                            {point}
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
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockCampusLocations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <div className="rounded-lg border border-border bg-surface p-5">
                    <p className="text-sm font-semibold">Route preview</p>
                    {hasCampusLocations ? (
                      <>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {startingPoint} to{" "}
                          <span className="font-medium text-foreground">
                            {routeDestination?.name ?? "destination"}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Estimated campus walk:{" "}
                          {routeDestination?.distance ?? "unavailable"}.
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Publish campus locations from the campus admin map
                        manager before student navigation can be used.
                      </p>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    disabled={!hasCampusLocations}
                    type="button"
                    onClick={() =>
                      campusToast.info({
                        title: "Navigation Preview",
                        description: `Route from ${startingPoint} to ${
                          routeDestination?.name ?? "selected destination"
                        } is ready for map integration.`,
                      })
                    }
                  >
                    <FiNavigation className="h-4 w-4" />
                    Navigate
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.name ?? "Location"}
        description={viewing?.category}
        className="max-w-xl"
      >
        {viewing ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {viewing.description}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Code", viewing.code],
                ["Distance", viewing.distance],
                ["Open Now", viewing.openNow ? "Yes" : "No"],
                ["Category", viewing.category],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-md border border-border p-3"
                >
                  <p className="text-xs uppercase text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Drawer>
    </StudentShell>
  );
}

const topicSchema = z.object({
  title: z.string().min(5, "Topic title is required."),
  category: z.string().min(2, "Category is required."),
  summary: z.string().min(10, "Summary is required."),
});

type TopicInput = z.infer<typeof topicSchema>;

type ForumReaction = {
  likes: number;
  dislikes: number;
  userReaction: "like" | "dislike" | null;
};

type ForumComment = {
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

type ForumMember = {
  name: string;
  role: string;
  initials: string;
  interactions: number;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function createForumMember(
  name: string,
  role: string,
  interactions = 1,
): ForumMember {
  return {
    name,
    role,
    initials: getInitials(name),
    interactions,
  };
}

function getForumMemberProfile(name: string, role: string) {
  return createForumMember(name, role || "CampusHub member");
}

function mergeForumMember(
  members: Map<string, ForumMember>,
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

  members.set(name, createForumMember(name, role));
}

function ForumMemberButton({
  member,
  onOpenProfile,
  className,
}: {
  member: ForumMember;
  onOpenProfile: (member: ForumMember) => void;
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

const initialForumComments: Record<string, ForumComment[]> = {
  "forum-labs": [
    {
      id: "comment-labs-1",
      author: "Neema Sanga",
      role: "Class Representative",
      time: "11:25 AM",
      body: "I can collect a list of students who need late access and present it to the lab coordinator this Friday.",
    },
    {
      id: "comment-labs-2",
      author: "Daniel Rweikiza",
      role: "Year 3 Student",
      time: "11:42 AM",
      body: "This would help final-year project teams a lot, especially during prototype testing weeks.",
    },
  ],
  "forum-open-source": [
    {
      id: "comment-open-source-1",
      author: "Brian Massawe",
      role: "Technology Club",
      time: "9:10 AM",
      body: "We can start with beginner-friendly issues every Wednesday evening and pair new contributors with mentors.",
    },
  ],
  "forum-cafeteria": [
    {
      id: "comment-cafeteria-1",
      author: "Lina Ally",
      role: "Student",
      time: "1:15 PM",
      body: "The small food court near the library has consistent portions and fair prices during lunch hours.",
    },
  ],
};

function getInitialForumReactions() {
  return Object.fromEntries(
    mockForumTopics.map((topic) => [
      topic.id,
      {
        likes: Math.max(8, Math.round(topic.views / 12)),
        dislikes: Math.max(1, Math.round(topic.views / 96)),
        userReaction: null,
      },
    ]),
  ) as Record<string, ForumReaction>;
}

function CreateTopicForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (values: TopicInput) => void;
  isSubmitting: boolean;
}) {
  const { register, handleSubmit, setValue, watch, formState } = useForm<
    z.input<typeof topicSchema>,
    unknown,
    TopicInput
  >({
    resolver: zodResolver(topicSchema),
    defaultValues: { title: "", category: "", summary: "" },
  });
  const selectedCategory = watch("category");
  const forumCategories = [
    "Academic",
    "Technology",
    "Campus Life",
    "Student Welfare",
    "Clubs",
    "Questions",
  ];

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <label className="block space-y-3">
        <span className="block text-sm font-medium">Topic</span>
        <CampusInput
          {...register("title")}
          invalid={Boolean(formState.errors.title)}
          placeholder="Can computer labs stay open later?"
        />
      </label>
      <div className="space-y-3">
        <span className="block text-sm font-medium">Category</span>
        <Select
          value={selectedCategory}
          onValueChange={(value) =>
            setValue("category", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger
            className={cn(
              "w-full",
              formState.errors.category && "border-destructive",
            )}
          >
            <SelectValue placeholder="Select discussion category" />
          </SelectTrigger>
          <SelectContent>
            {forumCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <label className="block space-y-3">
        <span className="block text-sm font-medium">Summary</span>
        <CampusTextarea
          {...register("summary")}
          invalid={Boolean(formState.errors.summary)}
          placeholder="Describe the discussion clearly so students know how to engage."
        />
      </label>
      <Button className="w-full sm:w-auto" disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        Create Topic
      </Button>
    </form>
  );
}

export function ForumPageView() {
  const [topics, setTopics] = useState(mockForumTopics);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState(
    mockForumTopics[0]?.id ?? "",
  );
  const [reactions, setReactions] = useState(getInitialForumReactions);
  const [comments, setComments] =
    useState<Record<string, ForumComment[]>>(initialForumComments);
  const [commentDraft, setCommentDraft] = useState("");
  const [membersOpen, setMembersOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ForumMember | null>(
    null,
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationMember, setNotificationMember] =
    useState<ForumMember | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ForumComment | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return topics;

    return topics.filter((topic) =>
      [topic.title, topic.category, topic.author, topic.summary]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, topics]);

  const selectedTopic =
    topics.find((topic) => topic.id === selectedTopicId) ?? filtered[0] ?? null;
  const selectedComments = selectedTopic ? comments[selectedTopic.id] ?? [] : [];
  const selectedReaction = selectedTopic
    ? reactions[selectedTopic.id] ?? { likes: 0, dislikes: 0, userReaction: null }
    : null;
  const engagedMembers = useMemo(() => {
    if (!selectedTopic) return [];

    const members = new Map<string, ForumMember>();
    mergeForumMember(members, selectedTopic.author, "Topic author");
    selectedComments.forEach((comment) => {
      mergeForumMember(members, comment.author, comment.role);
    });

    return Array.from(members.values());
  }, [selectedComments, selectedTopic]);
  const visibleEngagedMembers = engagedMembers.slice(0, 5);
  const hiddenEngagedMembersCount = Math.max(0, engagedMembers.length - 5);

  function openProfile(member: ForumMember) {
    setSelectedProfile(member);
    setProfileOpen(true);
  }

  function openNotifications(member: ForumMember) {
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
          author: mockStudentProfile.name,
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
        title: "Topic Created",
        description: "Your forum topic is ready for discussion.",
      });
    });
  }

  function reactToTopic(topic: ForumTopic, reaction: "like" | "dislike") {
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

    const nextComment: ForumComment = {
      id: `comment-${Date.now()}`,
      author: mockStudentProfile.name,
      role: `${mockStudentProfile.department} · ${mockStudentProfile.year}`,
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
      description: "Your reply has been added to the discussion.",
    });
  }

  function unsendComment(comment: ForumComment) {
    if (!selectedTopic || comment.author !== mockStudentProfile.name) return;

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
    <StudentShell>
      <StudentPageHeader
        eyebrow="Forum"
        title="Campus conversations."
        description="Discuss academics, campus life, student support, technology, clubs, and ideas with your college community."
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
          placeholder="Search discussions"
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
            <StatusPill>{topics.filter((topic) => topic.trending).length} trending</StatusPill>
          </div>
          <div className="mt-4 space-y-2">
            {["Pinned", "Trending", "Academic", "Technology", "Campus Life"].map(
              (label) => (
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
              ),
            )}
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
                    {topic.replies} replies · {topic.category}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </aside>

        <div className="min-h-0 overflow-hidden border-b border-border lg:border-b-0 lg:border-r">
          {filtered.length > 0 ? (
            selectedTopic ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="border-b border-border p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedTopic.pinned ? <StatusPill>Pinned</StatusPill> : null}
                    {selectedTopic.trending ? <StatusPill>Trending</StatusPill> : null}
                    <StatusPill>{selectedTopic.category}</StatusPill>
                  </div>
                  <h2 className="mt-4 text-xl font-semibold">
                    {selectedTopic.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {selectedTopic.summary}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{selectedTopic.author}</span>
                    <span>{formatDate(selectedTopic.createdAt)}</span>
                    <span>{selectedTopic.views} views</span>
                  </div>
                </div>
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                  <div className="flex items-start gap-3">
                    <Button
                      aria-label={`View ${selectedTopic.author}'s profile`}
                      className="h-10 w-10 shrink-0 rounded-full bg-primary/15 p-0 text-sm font-semibold text-primary hover:bg-primary/20"
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        openProfile(
                          getForumMemberProfile(
                            selectedTopic.author,
                            "Topic author",
                          ),
                        )
                      }
                    >
                      {getInitials(selectedTopic.author)}
                    </Button>
                    <div className="max-w-2xl rounded-2xl bg-surface-muted p-4">
                      <Button
                        className="h-auto p-0 text-sm font-semibold hover:text-primary"
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          openProfile(
                            getForumMemberProfile(
                              selectedTopic.author,
                              "Topic author",
                            ),
                          )
                        }
                      >
                        {selectedTopic.author}
                      </Button>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {selectedTopic.summary} What do you think the best next
                        step should be for the student community?
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
                            getForumMemberProfile(comment.author, comment.role),
                          )
                        }
                      >
                        {getInitials(comment.author)}
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
                                  getForumMemberProfile(
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
                              {comment.author === mockStudentProfile.name ? (
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
                      placeholder="Write a comment..."
                      value={commentDraft}
                      onChange={(event) => setCommentDraft(event.target.value)}
                    />
                    <Button
                      className="sm:self-end"
                      type="button"
                      onClick={postComment}
                      disabled={!commentDraft.trim()}
                    >
                      <FiSend className="h-4 w-4" aria-hidden="true" />
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            ) : null
          ) : (
            <Empty
              className="min-h-full"
              filterName={getEmptyFilterName(query)}
              title={!query.trim() ? "No discussions available" : undefined}
              description={
                !query.trim()
                  ? "Forum discussions will appear here once they are created."
                  : "Try another search term to view more discussions."
              }
            />
          )}
        </div>

        <aside className="min-h-0 space-y-4 overflow-y-auto bg-surface-muted/30 p-5">
          {selectedTopic && selectedReaction ? (
            <>
              <div>
                <p className="text-sm font-semibold">Discussion Detail</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedTopic.category}
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
                    <ForumMemberButton
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
        description="Start a respectful college discussion."
      >
        <CreateTopicForm onSubmit={createTopic} isSubmitting={isPending} />
      </Modal>
      <Drawer
        open={membersOpen}
        onOpenChange={setMembersOpen}
        title="Members Engaged"
        description="Students and leaders who interacted with this discussion."
      >
        <div className="space-y-2">
          {engagedMembers.map((member) => (
            <div
              key={member.name}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-2"
            >
              <ForumMemberButton
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
                  <p className="text-lg font-semibold">{selectedProfile.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedProfile.role}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Active CampusHub member contributing to academic
                    conversations, student support, and college community
                    updates.
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
            "Project updates",
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
    </StudentShell>
  );
}

type StudentPollTab = "active" | "closed" | "my-votes";

const studentPollTabs: {
  value: StudentPollTab;
  label: string;
  icon: IconType;
}[] = [
  { value: "active", label: "Active Polls", icon: FiPieChart },
  { value: "closed", label: "Closed Polls", icon: FiCheckCircle },
  { value: "my-votes", label: "My Votes", icon: FiClipboard },
];

const mockStudentVotes = [
  {
    id: "vote-hackathon-theme",
    pollId: "poll-hackathon-theme",
    selectedOption: "Yes, this semester",
    votedAt: "2026-06-12",
  },
  {
    id: "vote-sports-kit",
    pollId: "poll-sports-kit",
    selectedOption: "Modern",
    votedAt: "2026-02-22",
  },
];

function PollResultBars({
  poll,
  compact = false,
}: {
  poll: Poll;
  compact?: boolean;
}) {
  return (
    <div className="space-y-3">
      {poll.options.map((option) => {
        const percent = getPollOptionPercent(poll, option);

        return (
          <div key={option}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{option}</span>
              <span className="text-muted-foreground">{percent}%</span>
            </div>
            <div className={cn("overflow-hidden rounded-full bg-surface-muted", compact ? "h-2" : "h-2.5")}>
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PollCard({
  poll,
  hasVoted,
  onVote,
  onView,
}: {
  poll: Poll;
  hasVoted: boolean;
  onVote: (poll: Poll) => void;
  onView: (poll: Poll) => void;
}) {
  const showResults = canShowPollResults(poll, hasVoted);
  const resultsBlockClassName =
    "mt-5 flex min-h-[12.5rem] flex-col justify-center rounded-lg border border-border bg-background p-4";

  return (
    <FadeIn className="h-full">
      <Card className="flex h-full flex-col transition duration-200 hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg">
        <CardContent className="flex h-full flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <StatusPill>{poll.category}</StatusPill>
              <StatusPill>{poll.visibility}</StatusPill>
            </div>
            <StatusPill>{formatTimeRemaining(poll.endDate, poll.status)}</StatusPill>
          </div>
          <h2 className="mt-5 text-lg font-semibold leading-snug">
            {poll.question}
          </h2>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {poll.description}
          </p>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <span>{poll.createdBy}</span>
            <span>{poll.responses.toLocaleString()} responses</span>
            <span>Audience: {poll.audience}</span>
            <span>{formatResultVisibility(poll.resultsVisibility)}</span>
            {poll.status === "CLOSED" ? (
              <span className="sm:col-span-2">
                Winning option: {getWinningOption(poll)}
              </span>
            ) : null}
          </div>
          {showResults ? (
            <div className={resultsBlockClassName}>
              <PollResultBars poll={poll} compact />
            </div>
          ) : (
            <div className={cn(resultsBlockClassName, "border-dashed text-sm text-muted-foreground")}>
              Results are {formatResultVisibility(poll.resultsVisibility).toLowerCase()}.
            </div>
          )}
          <div className="mt-auto grid gap-3 pt-5 sm:grid-cols-2">
            {poll.status === "ACTIVE" ? (
              <Button type="button" onClick={() => onVote(poll)}>
                Vote
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={() => onView(poll)}>
                View Results
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={() => onView(poll)}>
              <FiEye className="h-4 w-4" aria-hidden="true" />
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  );
}

function VotePollModal({
  poll,
  votedOption,
  onVote,
  onClose,
}: {
  poll: Poll | null;
  votedOption?: string;
  onVote: (poll: Poll, option: string) => void;
  onClose: () => void;
}) {
  const [selectedOption, setSelectedOption] = useState("");

  useEffect(() => {
    setSelectedOption(votedOption ?? "");
  }, [poll?.id, votedOption]);

  return (
    <Modal
      open={Boolean(poll)}
      onOpenChange={(open) => !open && onClose()}
      title={poll?.title ?? "Vote"}
      description={poll?.question}
      className="max-h-[90vh] max-w-5xl overflow-y-auto"
      footer={
        poll ? (
          <Button
            className="w-full"
            disabled={!selectedOption || Boolean(votedOption)}
            type="button"
            onClick={() => onVote(poll, selectedOption)}
          >
            {votedOption ? "Vote Submitted" : "Submit Vote"}
          </Button>
        ) : null
      }
    >
      {poll ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs uppercase text-muted-foreground">Category</p>
              <p className="mt-1 font-semibold">{poll.category}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs uppercase text-muted-foreground">Responses</p>
              <p className="mt-1 font-semibold">{poll.responses.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs uppercase text-muted-foreground">Time</p>
              <p className="mt-1 font-semibold">{formatTimeRemaining(poll.endDate)}</p>
            </div>
          </div>
          <div className="grid gap-3">
            {poll.options.map((option) => {
              const selected = selectedOption === option;

              return (
                <button
                  key={option}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border border-border bg-background p-4 text-left transition duration-200 hover:border-primary/50 hover:bg-primary/5",
                    selected && "scale-[1.01] border-primary bg-primary/10 text-primary",
                  )}
                  disabled={Boolean(votedOption)}
                  type="button"
                  onClick={() => setSelectedOption(option)}
                >
                  <span className="font-semibold">{option}</span>
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border border-border",
                      selected && "border-primary bg-primary text-primary-foreground",
                    )}
                  >
                    {selected ? <FiCheckCircle className="h-4 w-4" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
          {votedOption ? (
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm font-medium text-primary">
              Your vote was recorded for {votedOption}.
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

function PollDetailsDrawer({
  poll,
  hasVoted,
  onClose,
}: {
  poll: Poll | null;
  hasVoted: boolean;
  onClose: () => void;
}) {
  return (
    <Drawer
      open={Boolean(poll)}
      onOpenChange={(open) => !open && onClose()}
      title={poll?.title ?? "Poll"}
      description={poll?.question}
      className="max-w-2xl"
    >
      {poll ? (
        <div className="space-y-5">
          <p className="text-sm leading-6 text-muted-foreground">
            {poll.description}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Category", poll.category],
              ["Created By", poll.createdBy],
              ["Audience", poll.audience],
              ["End Date", formatDate(poll.endDate)],
              ["Responses", poll.responses.toLocaleString()],
              ["Results", formatResultVisibility(poll.resultsVisibility)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs uppercase text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-sm font-semibold">Rules</p>
            <div className="mt-3 space-y-2">
              {poll.rules.map((rule) => (
                <p key={rule} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FiCheckCircle className="h-4 w-4 text-primary" aria-hidden="true" />
                  {rule}
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-sm font-semibold">Results</p>
            <div className="mt-4">
              {canShowPollResults(poll, hasVoted) ? (
                <PollResultBars poll={poll} />
              ) : (
                <Empty
                  title="Results are not available yet"
                  description={`This poll is configured as ${formatResultVisibility(poll.resultsVisibility).toLowerCase()}.`}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

export function StudentPollsPageView({
  initialTab = "active",
}: {
  initialTab?: StudentPollTab;
}) {
  const { user } = useAuth();
  const [polls, setPolls] = useState(mockPolls);
  const [tab, setTab] = useState<StudentPollTab>(initialTab);
  const [query, setQuery] = useState("");
  const [ownership, setOwnership] = useState<OwnershipFilter>("all");
  const [viewing, setViewing] = useState<Poll | null>(null);
  const [voting, setVoting] = useState<Poll | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [votes, setVotes] = useState<Record<string, string>>(
    Object.fromEntries(
      mockStudentVotes.map((vote) => [vote.pollId, vote.selectedOption]),
    ),
  );
  const currentUserName = getCurrentUserName(user);
  const canCreate = canCreateStudentContent(user);

  const activePolls = polls.filter((poll) => poll.status === "ACTIVE");
  const closedPolls = polls.filter((poll) => poll.status === "CLOSED");
  const visiblePolls = tab === "closed" ? closedPolls : activePolls;
  const filteredPolls = visiblePolls.filter((poll) => {
    const normalized = query.toLowerCase().trim();
    const queryMatch =
      !normalized ||
      [poll.title, poll.question, poll.category, poll.createdBy]
        .join(" ")
        .toLowerCase()
        .includes(normalized);

    return (
      queryMatch && matchesOwnership(poll, ownership, currentUserName)
    );
  });
  const voteRows = mockStudentVotes
    .map((vote) => ({
      ...vote,
      poll: polls.find((poll) => poll.id === vote.pollId),
    }))
    .filter((vote) => {
      if (!vote.poll) return false;
      const normalized = query.toLowerCase().trim();
      if (!normalized) return true;
      return [
        vote.poll.title,
        vote.poll.question,
        vote.poll.category,
        vote.selectedOption,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });

  function submitVote(poll: Poll, option: string) {
    setVotes((current) => ({ ...current, [poll.id]: option }));
    setVoting(null);
    campusToast.success({
      title: "Vote Submitted",
      description: "Your poll response has been recorded.",
      });
  }

  function createPoll(values: CreatePollInput) {
    const parsedOptions = values.options
      .split(/\n|,/)
      .map((option) => option.trim())
      .filter(Boolean);
    const uniqueOptions = Array.from(new Set(parsedOptions));
    const options = uniqueOptions.length >= 2 ? uniqueOptions : ["Yes", "No"];

    startTransition(() => {
      setPolls((current) => [
        {
          id: `poll-${Date.now()}`,
          title: values.title,
          question: values.question,
          category: values.category,
          audience: values.audience,
          description: values.description,
          createdBy: currentUserName,
          createdAt: new Date().toISOString().slice(0, 10),
          endDate: values.endDate,
          status: "ACTIVE",
          responses: 0,
          participationRate: 0,
          options,
          optionVotes: Object.fromEntries(options.map((option) => [option, 0])),
          resultsVisibility: "AFTER_VOTING",
          rules: [
            "One vote per student",
            "Votes are anonymous",
            "Results show after voting",
          ],
          votesOverTime: [],
          departmentParticipation: [],
          yearParticipation: [],
        },
        ...current,
      ]);
      setCreateOpen(false);
      setTab("active");
      setOwnership("mine");
      campusToast.success({
        title: "Poll Created",
        description: "The poll was added to this page.",
      });
    });
  }

  return (
    <StudentShell>
      <StudentPageHeader
        eyebrow="Polls"
        title="Shape campus decisions."
        description="Vote on active student polls, review closed poll outcomes, and track your participation history."
        action={
          canCreate ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <FiPlus className="h-4 w-4" aria-hidden="true" />
              Create Poll
            </Button>
          ) : null
        }
      />
      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar query={query} setQuery={setQuery} placeholder="Search polls" />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {studentPollTabs.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.value}
                type="button"
                variant={tab === item.value ? "default" : "secondary"}
                onClick={() => setTab(item.value)}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </div>
      {canCreate ? (
        <div className="mt-4">
          <OwnershipTabs value={ownership} onValueChange={setOwnership} />
        </div>
      ) : null}

      {tab === "active" || tab === "closed" ? (
        filteredPolls.length > 0 ? (
          <StaggerContainer
            key={`polls-${tab}-${query.trim() || "all"}-${filteredPolls.length}`}
            className="mt-6 grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {filteredPolls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                hasVoted={Boolean(votes[poll.id])}
                onVote={setVoting}
                onView={setViewing}
              />
            ))}
          </StaggerContainer>
        ) : (
          <Empty
            className="mt-6 min-h-[28rem] rounded-xl border border-border bg-surface"
            filterName={getEmptyFilterName(query, tab === "active" ? "Active Polls" : "Closed Polls")}
            title="No polls found"
            description="Polls matching your current filters will appear here."
          />
        )
      ) : null}

      {tab === "my-votes" ? (
        voteRows.length > 0 ? (
          <div className="mt-6 space-y-3">
            {voteRows.map(({ id, poll, selectedOption, votedAt }) =>
              poll ? (
                <Card key={id}>
                  <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <StatusPill>{poll.category}</StatusPill>
                      <h2 className="mt-3 font-semibold">{poll.question}</h2>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Selected: {selectedOption} · Voted {formatDate(votedAt)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <StatusPill>{poll.status}</StatusPill>
                      <StatusPill>{formatResultVisibility(poll.resultsVisibility)}</StatusPill>
                    </div>
                  </CardContent>
                </Card>
              ) : null,
            )}
          </div>
        ) : (
          <Empty
            className="mt-6 min-h-[28rem] rounded-xl border border-border bg-surface"
            filterName={getEmptyFilterName(query, "My Votes")}
            title="No votes yet"
            description="Your submitted poll votes matching this view will appear here."
          />
        )
      ) : null}

      <VotePollModal
        poll={voting}
        votedOption={voting ? votes[voting.id] : undefined}
        onVote={submitVote}
        onClose={() => setVoting(null)}
      />
      <PollDetailsDrawer
        poll={viewing}
        hasVoted={viewing ? Boolean(votes[viewing.id]) : false}
        onClose={() => setViewing(null)}
      />
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Poll"
        description="Publish a poll directly from this page."
        className="max-w-2xl"
      >
        <CreatePollForm onSubmit={createPoll} isSubmitting={isPending} />
      </Modal>
    </StudentShell>
  );
}

const suggestionSchema = z.object({
  subject: z.string().min(5, "Subject is required."),
  category: z.string().min(2, "Category is required."),
  anonymous: z.enum(["Yes", "No"]),
  description: z.string().min(10, "Description is required."),
});

type SuggestionInput = z.infer<typeof suggestionSchema>;

function CreateSuggestionForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (values: SuggestionInput) => void;
  isSubmitting: boolean;
}) {
  const { register, handleSubmit, watch, setValue, formState } = useForm<
    z.input<typeof suggestionSchema>,
    unknown,
    SuggestionInput
  >({
    resolver: zodResolver(suggestionSchema),
    defaultValues: {
      subject: "",
      category: "",
      anonymous: "No",
      description: "",
    },
  });

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <label className="block space-y-3">
        <span className="text-sm font-medium">Subject</span>
        <CampusInput
          placeholder="Short summary of your suggestion"
          {...register("subject")}
          invalid={Boolean(formState.errors.subject)}
        />
      </label>
      <label className="block space-y-3">
        <span className="text-sm font-medium">Category</span>
        <CampusInput
          placeholder="Academic, welfare, technology, or services"
          {...register("category")}
          invalid={Boolean(formState.errors.category)}
        />
      </label>
      <label className="block space-y-3">
        <span className="text-sm font-medium">Anonymous</span>
        <Select
          value={watch("anonymous")}
          onValueChange={(value) =>
            setValue("anonymous", value as SuggestionInput["anonymous"])
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="No">No</SelectItem>
            <SelectItem value="Yes">Yes</SelectItem>
          </SelectContent>
        </Select>
      </label>
      <label className="block space-y-3">
        <span className="text-sm font-medium">Description</span>
        <CampusTextarea
          placeholder="Explain the issue, who it affects, and the change you want to see."
          {...register("description")}
          invalid={Boolean(formState.errors.description)}
        />
      </label>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        Submit Suggestion
      </Button>
    </form>
  );
}

export function SuggestionsPageView() {
  const [suggestions, setSuggestions] = useState(mockSuggestions);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<StudentSuggestion | null>(null);
  const [isPending, startTransition] = useTransition();

  function createSuggestion(values: SuggestionInput) {
    startTransition(() => {
      setSuggestions((current) => [
        {
          id: `suggestion-${Date.now()}`,
          status: "Pending",
          submittedAt: "2026-06-10",
          response: "Awaiting representative review.",
          anonymous: values.anonymous === "Yes",
          subject: values.subject,
          category: values.category,
          description: values.description,
        },
        ...current,
      ]);
      setCreateOpen(false);
      campusToast.success({
        title: "Suggestion Submitted",
        description: "Your suggestion is now visible in your tracking list.",
      });
    });
  }

  const columns: DataTableColumn<StudentSuggestion>[] = [
    { key: "subject", header: "Subject" },
    { key: "category", header: "Category" },
    {
      key: "anonymous",
      header: "Anonymous",
      cell: (suggestion) => (suggestion.anonymous ? "Yes" : "No"),
    },
    {
      key: "status",
      header: "Status",
      cell: (suggestion) => <StatusPill>{suggestion.status}</StatusPill>,
    },
    {
      key: "submittedAt",
      header: "Submitted",
      cell: (suggestion) => formatDate(suggestion.submittedAt),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-20 text-right",
      cell: (suggestion) => (
        <Button
          size="sm"
          type="button"
          variant="secondary"
          onClick={() => setViewing(suggestion)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <StudentShell>
      <StudentPageHeader
        eyebrow="Suggestions"
        title="Make campus better."
        description="Submit feedback, track progress, and see how your representative team responds."
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            Create Suggestion
          </Button>
        }
      />
      <section className="mt-8 grid gap-4 md:grid-cols-4">
        {["Pending", "Under Review", "Resolved", "Rejected"].map((status) => (
          <Card key={status}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{status}</p>
              <p className="mt-2 text-3xl font-semibold">
                {suggestions.filter((item) => item.status === status).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
      <div className="mt-6">
        <CampusDataTable
          columns={columns}
          data={suggestions}
          getRowId={(suggestion) => suggestion.id}
          empty={
            <Empty
              title="No suggestions yet"
              description="Submit your first campus suggestion."
              className="border-0 bg-transparent"
            />
          }
        />
      </div>
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Suggestion"
        description="Share structured feedback with your representative team."
      >
        <CreateSuggestionForm
          onSubmit={createSuggestion}
          isSubmitting={isPending}
        />
      </Modal>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.subject ?? "Suggestion"}
        description={viewing?.category}
        className="max-w-xl"
      >
        {viewing ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {viewing.description}
            </p>
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-sm font-medium">University Response</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {viewing.response}
              </p>
            </div>
          </div>
        ) : null}
      </Drawer>
    </StudentShell>
  );
}

export function ProfilePageView() {
  const safeShowcaseProfile = getSafeShowcaseProfile();

  return (
    <StudentShell>
      <StudentPageHeader
        eyebrow="Profile"
        title="Your academic identity."
        description="Manage personal information, academic context, skills, interests, achievements, and future career readiness modules."
      />
      <section className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr]">
        <aside className="grid h-fit gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-primary text-2xl font-semibold text-primary-foreground">
                FJ
              </div>
              <h2 className="mt-5 text-xl font-semibold">
                {mockStudentProfile.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {mockStudentProfile.email}
              </p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${mockStudentProfile.completion}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Profile {mockStudentProfile.completion}% complete
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Showcase Identity</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FiZap className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Level {safeShowcaseProfile.level}
                  </span>
                </div>
                <p className="mt-4 text-2xl font-semibold">
                  {safeShowcaseProfile.currentXp.toLocaleString()} XP
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${safeShowcaseProfile.progressPercent}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {safeShowcaseProfile.xpRemaining.toLocaleString()} XP to next level
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs uppercase text-muted-foreground">
                  Top Project
                </p>
                {safeShowcaseProfile.topProject ? (
                  <>
                    <p className="mt-2 text-base font-semibold">
                      {safeShowcaseProfile.topProject.name ?? "Untitled project"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {safeShowcaseProfile.topProject.shortDescription ??
                        "No project summary has been added yet."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <FiEye className="h-3.5 w-3.5" aria-hidden="true" />
                        {toFiniteNumber(
                          safeShowcaseProfile.topProject.views,
                        ).toLocaleString()}{" "}
                        views
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FiStar
                          className="h-3.5 w-3.5 text-amber-500"
                          aria-hidden="true"
                        />
                        {toFiniteNumber(safeShowcaseProfile.topProject.stars)} stars
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    No showcase project has been published yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Badges</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {showcaseBadges.length > 0 ? (
                showcaseBadges.slice(0, 4).map((badge, index) => (
                  <div
                    key={badge.id ?? `badge-${index}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2 text-sm">
                      <FiAward
                        className="h-4 w-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <span className="truncate">
                        {badge.name ?? "CampusHub badge"}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {badge.status ?? "Locked"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                  No badges earned yet.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Featured Projects</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {safeShowcaseProfile.featuredProjects.length > 0 ? (
                safeShowcaseProfile.featuredProjects.map((project, index) => (
                  <div
                    key={project.id ?? `featured-project-${index}`}
                    className="rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <p className="truncate text-sm font-medium">
                      {project.name ?? "Untitled project"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {project.category ?? "Showcase"} ·{" "}
                      {project.status ?? "Draft"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                  No featured projects yet.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
        <div className="grid gap-6">
          {[
            {
              title: "Academic Information",
              items: [
                ["University", mockStudentProfile.university],
                ["College", mockStudentProfile.college],
                ["Department", mockStudentProfile.department],
                ["Year", mockStudentProfile.year],
              ],
            },
            {
              title: "Skills",
              items: mockStudentProfile.skills.map((item) => ["Skill", item]),
            },
            {
              title: "Interests",
              items: mockStudentProfile.interests.map((item) => [
                "Interest",
                item,
              ]),
            },
            {
              title: "Achievements",
              items: mockStudentProfile.achievements.map((item) => [
                "Achievement",
                item,
              ]),
            },
          ].map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {section.items.map(([label, value]) => (
                  <div
                    key={`${label}-${value}`}
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
          ))}
          <Card>
            <CardHeader>
              <CardTitle>Future Modules</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {["CV Builder", "Portfolio", "Opportunities"].map((module) => (
                <div
                  key={module}
                  className="rounded-lg border border-dashed border-border bg-background p-5"
                >
                  <FiAward
                    className="h-5 w-5 text-primary"
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 font-semibold">{module}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Coming Soon
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </StudentShell>
  );
}

export function NotificationsPageView() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const groups = [
    "Announcement",
    "Event",
    "Forum Activity",
    "Poll",
    "Suggestion Update",
    "System",
  ];
  const unreadCount = notifications.filter(
    (notification) => notification.unread,
  ).length;
  const viewNotification = (notification: StudentNotification) => {
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
    <StudentShell>
      <StudentPageHeader
        eyebrow="Notifications"
        title="Everything that needs attention."
        description="Review announcements, event updates, forum activity, suggestion progress, and system notifications."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              disabled={unreadCount === 0}
              type="button"
              variant="secondary"
              onClick={() =>
                setNotifications((current) =>
                  current.map((notification) => ({
                    ...notification,
                    unread: false,
                  })),
                )
              }
            >
              <FiCheckCircle className="h-4 w-4" aria-hidden="true" />
              Mark all read
            </Button>
            <Button
              disabled={notifications.length === 0}
              type="button"
              variant="secondary"
              onClick={() => setNotifications([])}
            >
              <FiTrash2 className="h-4 w-4" aria-hidden="true" />
              Clear all
            </Button>
          </div>
        }
      />
      <section className="mt-8 grid items-start gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit self-start">
          <CardContent className="space-y-2 p-3">
            <div className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium">
              <span>Unread</span>
              <span className="text-muted-foreground">{unreadCount}</span>
            </div>
            {groups.map((group) => (
              <div
                key={group}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm"
              >
                <span>{group}</span>
                <span className="text-muted-foreground">
                  {
                    notifications.filter(
                      (notification) => notification.type === group,
                    ).length
                  }
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="min-h-[22rem] space-y-3">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
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
              title="No notifications available"
              description="New announcements, event updates, forum activity, and system alerts will appear here."
            />
          )}
        </div>
      </section>
    </StudentShell>
  );
}

function NotificationCard({
  notification,
  onView,
  onMarkRead,
  onClear,
}: {
  notification: StudentNotification;
  onView: (notification: StudentNotification) => void;
  onMarkRead: (id: string) => void;
  onClear: (id: string) => void;
}) {
  return (
    <Card className={notification.unread ? "border-primary/40" : undefined}>
      <CardContent className="flex items-start gap-4 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FiBell className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill>{notification.type}</StatusPill>
            {notification.unread ? <StatusPill>Unread</StatusPill> : null}
          </div>
          <h2 className="mt-3 font-semibold">{notification.title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {notification.description}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            {notification.time}
          </p>
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
      </CardContent>
    </Card>
  );
}
