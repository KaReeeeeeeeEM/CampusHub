import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  Clock3,
  MapPin,
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { DashboardWidget } from "@/features/student-dashboard/components/dashboard-widget";
import {
  almanacHighlights,
  announcementHighlights,
  campusMapQuickAccess,
  notifications,
  quickActions,
  studentProfile,
  upcomingEvents,
} from "@/features/student-dashboard/lib/mock-data";

export function WelcomeWidget() {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="grid gap-6 p-6 lg:grid-cols-[1.25fr_0.75fr] lg:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-primary">
            Student dashboard
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-normal">
            Welcome back, {studentProfile.name}.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {studentProfile.university} · {studentProfile.college} ·{" "}
            {studentProfile.department} · {studentProfile.yearOfStudy}
          </p>
          <div className="mt-6 max-w-md">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Profile readiness</span>
              <span className="font-medium">{studentProfile.completion}%</span>
            </div>
            <div className="h-2 rounded-full bg-border">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${studentProfile.completion}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm font-semibold">Today</p>
          <div className="mt-4 grid gap-3">
            <div className="flex items-center justify-between rounded-md bg-surface px-3 py-2 text-sm">
              <span className="text-muted-foreground">Announcements</span>
              <span className="font-medium">
                {announcementHighlights.length}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-surface px-3 py-2 text-sm">
              <span className="text-muted-foreground">Upcoming events</span>
              <span className="font-medium">{upcomingEvents.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-surface px-3 py-2 text-sm">
              <span className="text-muted-foreground">Notifications</span>
              <span className="font-medium">{notifications.length}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AnnouncementHighlightsWidget() {
  return (
    <DashboardWidget
      title="Announcement highlights"
      description="Important university and college updates."
      action={
        <Button asChild size="sm" variant="ghost">
          <Link href="/student/announcements">View all</Link>
        </Button>
      }
    >
      {announcementHighlights.length > 0 ? (
        <div className="grid gap-3">
          {announcementHighlights.map((announcement) => (
            <article
              key={announcement.title}
              className="rounded-md border border-border bg-background p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  {announcement.priority}
                </span>
                <span className="text-xs text-muted-foreground">
                  {announcement.source} · {announcement.time}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold">
                {announcement.title}
              </h3>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No announcements"
          description="New highlights from your university will appear here."
        />
      )}
    </DashboardWidget>
  );
}

export function UpcomingEventsWidget() {
  return (
    <DashboardWidget
      title="Upcoming events"
      description="Campus events to watch."
      action={
        <Button asChild size="sm" variant="ghost">
          <Link href="/student/events">View all</Link>
        </Button>
      }
    >
      <div className="grid gap-3">
        {upcomingEvents.map((event) => (
          <article
            key={event.title}
            className="rounded-md border border-border bg-background p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                {event.category}
              </span>
              <span className="text-xs text-muted-foreground">
                {event.date}
              </span>
            </div>
            <h3 className="mt-3 text-sm font-semibold">{event.title}</h3>
            <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {event.location}
            </p>
          </article>
        ))}
      </div>
    </DashboardWidget>
  );
}

export function AlmanacHighlightsWidget() {
  return (
    <DashboardWidget
      title="Almanac highlights"
      description="Academic calendar signals."
      action={
        <Button asChild size="sm" variant="ghost">
          <Link href="/student/almanac">Open</Link>
        </Button>
      }
    >
      <div className="grid gap-3">
        {almanacHighlights.map((item) => (
          <article
            key={item.title}
            className="rounded-md border border-border bg-background p-4"
          >
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {item.date}
            </p>
            <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </DashboardWidget>
  );
}

export function CampusMapPreviewWidget() {
  const Icon = campusMapQuickAccess.icon;

  return (
    <DashboardWidget
      title={campusMapQuickAccess.title}
      description={campusMapQuickAccess.description}
      action={
        <Button asChild size="sm" variant="ghost">
          <Link href="/student/campus-map">Open map</Link>
        </Button>
      }
    >
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="grid min-h-44 place-items-center bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:28px_28px] p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-surface text-primary shadow-sm">
            <Icon className="h-7 w-7" aria-hidden="true" />
          </div>
        </div>
        <div className="border-t border-border p-4">
          <p className="text-sm font-medium">Quick landmarks</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {campusMapQuickAccess.landmarks.map((landmark) => (
              <span
                key={landmark}
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted-foreground"
              >
                {landmark}
              </span>
            ))}
          </div>
        </div>
      </div>
    </DashboardWidget>
  );
}

export function NotificationFeedWidget() {
  return (
    <DashboardWidget
      title="Notification feed"
      description="Personalized alerts and campus activity."
    >
      {notifications.length > 0 ? (
        <div className="grid gap-3">
          {notifications.map((notification) => {
            const Icon = notification.icon;

            return (
              <article
                key={notification.title}
                className="flex gap-3 rounded-md border border-border bg-background p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">
                    {notification.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {notification.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No notifications"
          description="You are all caught up for now."
        />
      )}
    </DashboardWidget>
  );
}

export function QuickActionsWidget() {
  return (
    <DashboardWidget title="Quick actions" description="Common student paths.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;

          return (
            <Button
              key={action.label}
              asChild
              className="h-auto justify-start rounded-lg border border-border bg-background p-4 text-left text-foreground hover:border-primary hover:bg-background"
              variant="secondary"
            >
              <Link href={action.href}>
                <span className="flex w-full items-start justify-between gap-4">
                  <span>
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    <span className="mt-4 block text-sm font-semibold">
                      {action.label}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {action.description}
                    </span>
                  </span>
                  <ArrowRight
                    className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </Button>
          );
        })}
      </div>
    </DashboardWidget>
  );
}

export function DashboardSyncStatusWidget() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-5 py-4 text-sm shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <BellRing className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <p className="font-medium">Dashboard composition ready</p>
          <p className="text-xs text-muted-foreground">
            Mock data widgets can be replaced by module services later.
          </p>
        </div>
      </div>
      <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
        <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
        Future module sync
      </div>
    </div>
  );
}
