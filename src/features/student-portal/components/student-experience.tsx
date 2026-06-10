"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiAward,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiClipboard,
  FiEye,
  FiLoader,
  FiMapPin,
  FiMessageSquare,
  FiNavigation,
  FiPieChart,
  FiPlus,
  FiSearch,
  FiSend,
  FiUser,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import { z } from "zod";

import {
  CampusDataTable,
  CampusInput,
  CampusTextarea,
  campusToast,
} from "@/components/campushub";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer } from "@/components/motion/stagger-container";
import { Drawer } from "@/components/shared/drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/features/representative/lib/mock-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
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
  type CampusLocation,
  type ForumTopic,
  type StudentAnnouncement,
  type StudentEvent,
  type StudentNotification,
  type StudentSuggestion,
} from "@/features/student-portal/lib/mock-data";
import type { DataTableColumn } from "@/components/shared/data-table";

const dashboardStatCards: {
  label: string;
  value: string;
  icon: IconType;
}[] = [
  { label: "Events this week", value: "3", icon: FiCalendar },
  { label: "Unread updates", value: "2", icon: FiBell },
  { label: "Forum replies", value: "42", icon: FiMessageSquare },
  { label: "Campus services", value: "7", icon: FiMapPin },
];

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
    href: "/student/leadership/invitations",
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
    value: mockPolls.filter((poll) => poll.status === "ACTIVE").length.toString(),
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function daysUntil(value: string) {
  const now = new Date("2026-06-10T00:00:00");
  const target = new Date(`${value}T00:00:00`);
  return Math.max(
    0,
    Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
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
      <div className="rounded-lg border border-border bg-background p-4 text-sm">
        Published {formatDate(announcement.date)}
      </div>
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
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["Category", event.category],
          ["Date", formatDate(event.date)],
          ["Time", event.time],
          ["Venue", event.venue],
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

export function StudentDashboardView() {
  const { user } = useAuth();
  const canManageLeadership = hasLeadershipPosition(
    user?.studentLeadershipPositions,
    user?.roles,
    "REPRESENTATIVE",
  );

  return (
    <StudentShell>
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <FadeIn>
            <p className="text-sm font-semibold uppercase tracking-normal text-primary">
              Good morning, Faith
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-normal md:text-5xl">
              Your campus day, organized.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              See what matters today across academics, events, announcements,
              community discussions, and student feedback.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/student/events">Explore Events</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/student/suggestions">Track Suggestions</Link>
              </Button>
            </div>
          </FadeIn>
          <FadeIn delay={0.08}>
            <div className="rounded-lg border border-border bg-background p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Profile Completion
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {mockStudentProfile.completion}%
                  </p>
                </div>
                <span className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FiUser className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${mockStudentProfile.completion}%` }}
                />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Add social links and portfolio details to improve opportunities
                readiness.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      <StaggerContainer className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStatCards.map(({ label, value, icon: Icon }) => (
          <Card
            key={label}
            className="transition-transform duration-300 hover:-translate-y-1 hover:border-primary/40"
          >
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-3xl font-semibold">{value}</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            </CardContent>
          </Card>
        ))}
      </StaggerContainer>

      {canManageLeadership ? (
        <section className="mt-6 rounded-lg border border-border bg-surface p-5">
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
                className="group rounded-lg border border-border bg-background p-5 transition-all hover:-translate-y-1 hover:border-primary/50 hover:bg-primary/5 hover:shadow-md"
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
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-sm font-semibold">Recent college updates</p>
              <div className="mt-4 space-y-3">
                {mockLeadershipAnnouncements.slice(0, 2).map((item) => (
                  <Link
                    key={item.id}
                    className="block rounded-md border border-border p-3 text-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
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
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-sm font-semibold">Pending feedback</p>
              <div className="mt-4 space-y-3">
                {mockLeadershipSuggestions.slice(0, 2).map((item) => (
                  <Link
                    key={item.id}
                    className="block rounded-md border border-border p-3 text-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
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
                  className="group flex items-start gap-3 rounded-lg border border-border bg-background p-4 transition-all hover:border-primary/50 hover:bg-primary/5"
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
                className="block rounded-lg border border-border bg-background p-4 transition-colors hover:border-primary/50"
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
                className="rounded-lg border border-border bg-background p-4"
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
                className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
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
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<(typeof announcementCategories)[number]>("All");
  const [viewing, setViewing] = useState<StudentAnnouncement | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    return mockAnnouncements.filter((announcement) => {
      const categoryMatch =
        category === "All" || announcement.category === category;
      const queryMatch =
        !normalized ||
        [announcement.title, announcement.category, announcement.body]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      return categoryMatch && queryMatch;
    });
  }, [category, query]);

  return (
    <StudentShell>
      <StudentPageHeader
        eyebrow="Announcements"
        title="Campus updates that matter."
        description="Browse official academic, welfare, sports, media, and technology announcements from your university and college."
      />
      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar
          query={query}
          setQuery={setQuery}
          placeholder="Search announcements"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {announcementCategories.map((item) => (
            <Button
              key={item}
              type="button"
              variant={category === item ? "default" : "secondary"}
              onClick={() => setCategory(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>
      <StaggerContainer className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((announcement) => (
          <Card
            key={announcement.id}
            className="flex min-h-64 flex-col transition-transform duration-300 hover:-translate-y-1 hover:border-primary/40"
          >
            <CardContent className="flex flex-1 flex-col p-5">
              <div className="flex items-start justify-between gap-4">
                <StatusPill>{announcement.category}</StatusPill>
                {announcement.pinned ? <StatusPill>Pinned</StatusPill> : null}
              </div>
              <h2 className="mt-5 text-lg font-semibold">
                {announcement.title}
              </h2>
              <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">
                {announcement.body}
              </p>
              <div className="mt-auto flex items-center justify-between pt-5">
                <span className="text-xs text-muted-foreground">
                  {formatDate(announcement.date)}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setViewing(announcement)}
                >
                  <FiEye className="h-4 w-4" aria-hidden="true" />
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </StaggerContainer>
      {filtered.length === 0 ? (
        <EmptyState
          title="No announcements found"
          description="Try another search term or category."
          className="mt-8"
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
    </StudentShell>
  );
}

export function EventsPageView() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"cards" | "calendar">("cards");
  const [viewing, setViewing] = useState<StudentEvent | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return mockEvents;
    return mockEvents.filter((event) =>
      [event.title, event.category, event.venue, event.description]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query]);

  return (
    <StudentShell>
      <StudentPageHeader
        eyebrow="Events"
        title="Find your next campus moment."
        description="Discover workshops, hackathons, conferences, sports, clubs, and social activities across campus."
      />
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar query={query} setQuery={setQuery} placeholder="Search events" />
        <div className="flex gap-2">
          <Button
            type="button"
            variant={view === "cards" ? "default" : "secondary"}
            onClick={() => setView("cards")}
          >
            Cards
          </Button>
          <Button
            type="button"
            variant={view === "calendar" ? "default" : "secondary"}
            onClick={() => setView("calendar")}
          >
            Calendar
          </Button>
        </div>
      </div>
      {view === "cards" ? (
        <StaggerContainer className="mt-6 grid gap-5 lg:grid-cols-3">
          {filtered.map((event) => (
            <Card
              key={event.id}
              className="overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:border-primary/40"
            >
              <div className="relative h-44">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.banner}
                  alt=""
                  className="h-full w-full object-cover"
                />
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
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </StaggerContainer>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {filtered.map((event) => (
            <Button
              key={event.id}
              className="h-auto justify-start rounded-lg border border-border bg-surface p-5 text-left transition-colors hover:border-primary/50"
              type="button"
              variant="secondary"
              onClick={() => setViewing(event)}
            >
              <span className="block">
                <span className="block text-sm text-primary">
                  {formatDate(event.date)}
                </span>
                <span className="mt-3 block font-semibold">{event.title}</span>
                <span className="mt-2 block text-sm text-muted-foreground">
                  {event.time} · {event.venue}
                </span>
              </span>
            </Button>
          ))}
        </div>
      )}
      <Modal
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.title ?? "Event"}
        description={viewing?.category}
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        {viewing ? <EventDetails event={viewing} /> : null}
      </Modal>
    </StudentShell>
  );
}

export function AlmanacPageView() {
  const [view, setView] = useState<"calendar" | "timeline">("calendar");
  const deadlines = mockAlmanacItems.filter((item) => item.type === "Deadline");
  const exams = mockAlmanacItems.filter((item) => item.type === "Exam");

  return (
    <StudentShell>
      <StudentPageHeader
        eyebrow="Academic Almanac"
        title="Your semester timeline."
        description="Track academic activities, registration milestones, exams, and deadlines in one place."
      />
      <div className="mt-8 flex gap-2">
        <Button
          type="button"
          variant={view === "calendar" ? "default" : "secondary"}
          onClick={() => setView("calendar")}
        >
          Calendar View
        </Button>
        <Button
          type="button"
          variant={view === "timeline" ? "default" : "secondary"}
          onClick={() => setView("timeline")}
        >
          Timeline View
        </Button>
      </div>
      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>
              {view === "calendar" ? "Calendar View" : "Timeline View"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockAlmanacItems.map((item, index) => (
              <div
                key={item.id}
                className="flex gap-4 rounded-lg border border-border bg-background p-4"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {view === "timeline" ? index + 1 : new Date(item.date).getDate()}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{item.title}</h2>
                    <StatusPill>{item.type}</StatusPill>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(item.date)} · {item.time} · {item.location}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {deadlines.map((item) => (
                <div key={item.id} className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(item.date)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Exams</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {exams.map((item) => (
                <div key={item.id} className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(item.date)}
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

export function MapPageView() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [viewing, setViewing] = useState<CampusLocation | null>(null);
  const categories = [
    "All",
    ...Array.from(new Set(mockCampusLocations.map((item) => item.category))),
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

  return (
    <StudentShell>
      <StudentPageHeader
        eyebrow="Campus Map"
        title="Find places faster."
        description="Search key campus locations, student services, lecture halls, hostels, dining spaces, and medical facilities."
      />
      <section className="mt-8 overflow-hidden rounded-lg border border-border bg-surface">
        <div className="relative min-h-96 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:56px_56px] p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_40%,hsl(var(--primary)/0.18),transparent_34%)]" />
          <div className="relative grid gap-4 md:grid-cols-2">
            {mockCampusLocations.map((location, index) => (
              <Button
                key={location.id}
                className="h-auto justify-start rounded-lg border border-border bg-background/90 p-4 text-left backdrop-blur transition-transform hover:-translate-y-1 hover:border-primary/50"
                type="button"
                variant="secondary"
                onClick={() => setViewing(location)}
              >
                <span className="block w-full">
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <FiMapPin className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <StatusPill>{index + 1}</StatusPill>
                  </span>
                  <span className="mt-4 block font-semibold">
                    {location.name}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {location.category} · {location.distance}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </div>
      </section>
      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar query={query} setQuery={setQuery} placeholder="Search locations" />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <Button
              key={item}
              type="button"
              variant={category === item ? "default" : "secondary"}
              onClick={() => setCategory(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>
      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {filtered.map((location) => (
          <Card key={location.id}>
            <CardContent className="p-5">
              <StatusPill>{location.category}</StatusPill>
              <h2 className="mt-4 font-semibold">{location.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {location.code} · {location.distance}
              </p>
              <Button
                className="mt-5 w-full"
                type="button"
                variant="secondary"
                onClick={() => setViewing(location)}
              >
                <FiNavigation className="h-4 w-4" aria-hidden="true" />
                View Location
              </Button>
            </CardContent>
          </Card>
        ))}
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
                <div key={label} className="rounded-md border border-border p-3">
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

function CreateTopicForm({
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
    defaultValues: { title: "", category: "", summary: "" },
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
        <span className="text-sm font-medium">Category</span>
        <CampusInput
          {...register("category")}
          invalid={Boolean(formState.errors.category)}
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

export function ForumPageView() {
  const [topics, setTopics] = useState(mockForumTopics);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<ForumTopic | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = topics.filter((topic) =>
    [topic.title, topic.category, topic.author]
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
          author: mockStudentProfile.name,
          pinned: false,
          trending: false,
          createdAt: "2026-06-10",
          ...values,
        },
        ...current,
      ]);
      setCreateOpen(false);
      campusToast.success({
        title: "Topic Created",
        description: "Your forum topic is ready for discussion.",
      });
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
        <SearchBar query={query} setQuery={setQuery} placeholder="Search discussions" />
      </div>
      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {filtered.map((topic) => (
            <Card
              key={topic.id}
              className="transition-transform hover:-translate-y-1 hover:border-primary/40"
            >
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  {topic.pinned ? <StatusPill>Pinned</StatusPill> : null}
                  {topic.trending ? <StatusPill>Trending</StatusPill> : null}
                  <StatusPill>{topic.category}</StatusPill>
                </div>
                <h2 className="mt-4 text-lg font-semibold">{topic.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {topic.summary}
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {topic.author} · {formatDate(topic.createdAt)}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{topic.replies} replies</span>
                    <span>{topic.views} views</span>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setViewing(topic)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Trending Discussions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topics
              .filter((topic) => topic.trending)
              .map((topic) => (
                <Button
                  key={topic.id}
                  className="h-auto w-full justify-start rounded-md border border-border bg-background p-3 text-left text-sm transition-colors hover:border-primary/50"
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
        description="Start a respectful college discussion."
      >
        <CreateTopicForm onSubmit={createTopic} isSubmitting={isPending} />
      </Modal>
      <Modal
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.title ?? "Discussion"}
        description={viewing?.category}
        className="max-w-2xl"
      >
        {viewing ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              {viewing.summary}
            </p>
            <div className="flex gap-2">
              <StatusPill>{viewing.replies} replies</StatusPill>
              <StatusPill>{viewing.views} views</StatusPill>
            </div>
          </div>
        ) : null}
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
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <label className="space-y-2">
        <span className="text-sm font-medium">Subject</span>
        <CampusInput
          {...register("subject")}
          invalid={Boolean(formState.errors.subject)}
        />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium">Category</span>
        <CampusInput
          {...register("category")}
          invalid={Boolean(formState.errors.category)}
        />
      </label>
      <label className="space-y-2">
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
      <label className="space-y-2">
        <span className="text-sm font-medium">Description</span>
        <CampusTextarea
          {...register("description")}
          invalid={Boolean(formState.errors.description)}
        />
      </label>
      <Button disabled={isSubmitting} type="submit">
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
            <EmptyState
              title="No suggestions yet"
              description="Submit your first campus suggestion."
              className="mx-auto border-0 bg-transparent"
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
  return (
    <StudentShell>
      <StudentPageHeader
        eyebrow="Profile"
        title="Your academic identity."
        description="Manage personal information, academic context, skills, interests, achievements, and future career readiness modules."
      />
      <section className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit">
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
                  <FiAward className="h-5 w-5 text-primary" aria-hidden="true" />
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
  const groups = [
    "Announcement",
    "Event",
    "Forum Activity",
    "Suggestion Update",
    "System",
  ];

  return (
    <StudentShell>
      <StudentPageHeader
        eyebrow="Notifications"
        title="Everything that needs attention."
        description="Review announcements, event updates, forum activity, suggestion progress, and system notifications."
      />
      <section className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardContent className="space-y-2 p-3">
            {groups.map((group) => (
              <div
                key={group}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm"
              >
                <span>{group}</span>
                <span className="text-muted-foreground">
                  {
                    mockNotifications.filter(
                      (notification) => notification.type === group,
                    ).length
                  }
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-3">
          {mockNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
            />
          ))}
        </div>
      </section>
    </StudentShell>
  );
}

function NotificationCard({
  notification,
}: {
  notification: StudentNotification;
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
      </CardContent>
    </Card>
  );
}
