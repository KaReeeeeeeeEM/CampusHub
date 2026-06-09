"use client";

import { ArrowRight, Clock3, MapPin } from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Skeleton } from "@/components/shared/skeleton";
import { Button } from "@/components/ui/button";
import {
  almanacHighlights,
  announcementHighlights,
  campusMapQuickAccess,
  futureModules,
  notifications,
  quickActions,
  studentProfile,
  upcomingEvents,
} from "@/features/student-dashboard/lib/mock-data";

function DashboardCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function StudentDashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-lg border border-border bg-surface p-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-4 h-10 w-3/4" />
        <Skeleton className="mt-4 h-4 w-1/2" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border border-border bg-surface p-6"
          >
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-5 h-4 w-full" />
            <Skeleton className="mt-3 h-4 w-4/5" />
            <Skeleton className="mt-6 h-10 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StudentDashboard() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setIsLoading(false), 450);
    return () => window.clearTimeout(timeout);
  }, []);

  if (isLoading) {
    return <StudentDashboardSkeleton />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-primary">
              Student dashboard
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal">
              Welcome back, {studentProfile.name}.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {studentProfile.university} · {studentProfile.college} ·{" "}
              {studentProfile.department} · {studentProfile.yearOfStudy}
            </p>
            <div className="mt-6 max-w-md">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Profile readiness</span>
                <span className="font-medium">
                  {studentProfile.completion}%
                </span>
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
            <p className="text-sm font-semibold">Today at a glance</p>
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

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <DashboardCard
          title="Announcement highlights"
          description="Important university and college updates."
          action={<Button variant="ghost">View all</Button>}
        >
          {announcementHighlights.length > 0 ? (
            <div className="grid gap-3">
              {announcementHighlights.map((announcement) => (
                <article
                  key={announcement.title}
                  className="rounded-md border border-border bg-background p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-primary/15 px-2 py-1 text-xs font-medium text-primary">
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
        </DashboardCard>

        <DashboardCard
          title="Notification center"
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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
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
        </DashboardCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <DashboardCard
          title="Upcoming events"
          description="Campus events to watch."
        >
          <div className="grid gap-3">
            {upcomingEvents.map((event) => (
              <article
                key={event.title}
                className="rounded-md border border-border bg-background p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-md bg-primary/15 px-2 py-1 text-xs font-medium text-primary">
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
        </DashboardCard>

        <DashboardCard
          title="Almanac highlights"
          description="Academic calendar signals."
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
        </DashboardCard>

        <DashboardCard
          title={campusMapQuickAccess.title}
          description={campusMapQuickAccess.description}
          action={<Button variant="ghost">Open map</Button>}
        >
          <div className="rounded-lg border border-border bg-background p-5">
            <div className="flex h-16 items-center justify-center rounded-md border border-dashed border-border bg-surface text-primary">
              <campusMapQuickAccess.icon
                className="h-7 w-7"
                aria-hidden="true"
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
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
        </DashboardCard>
      </div>

      <DashboardCard
        title="Quick actions"
        description="Common student workflows."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <Button
                key={action.label}
                className="h-auto flex-col items-start rounded-lg border border-border bg-background p-4 text-left text-foreground hover:border-primary hover:bg-background"
                variant="secondary"
                type="button"
              >
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <p className="mt-4 text-sm font-semibold">{action.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {action.description}
                </p>
              </Button>
            );
          })}
        </div>
      </DashboardCard>

      <DashboardCard
        title="Future modules"
        description="These student modules are planned for later CampusHub releases."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {futureModules.map((module) => {
            const Icon = module.icon;

            return (
              <article
                key={module.title}
                className="rounded-lg border border-dashed border-border bg-background p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted-foreground">
                    Coming Soon
                  </span>
                </div>
                <h3 className="mt-5 text-base font-semibold">{module.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {module.description}
                </p>
                <Button className="mt-5" disabled variant="secondary">
                  Coming Soon
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </article>
            );
          })}
        </div>
      </DashboardCard>

      <div className="rounded-lg border border-border bg-surface">
        <LoadingState label="Background sync ready for future student modules" />
      </div>
    </div>
  );
}
