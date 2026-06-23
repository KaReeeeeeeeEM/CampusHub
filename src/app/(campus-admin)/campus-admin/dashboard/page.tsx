import Link from "next/link";
import {
  FiBookOpen,
  FiCheckCircle,
  FiCircle,
  FiLayers,
  FiInbox,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SquareBarChartPanel,
  SquareDonutChartPanel,
  SquareGoalsPanel,
} from "@/components/dashboard/square-dashboard-widgets";
import { CampusAdminPageHeader } from "@/features/campus-admin/components/campus-admin-page-header";
import {
  getCampusAdminDashboard,
} from "@/features/campus-admin/lib/campus-admin-service";
import { listAlmanacEvents } from "@/features/almanac/lib/almanac-service";

const statCards = [
  { key: "collegesCount", label: "Colleges", icon: FiBookOpen },
  { key: "departmentsCount", label: "Departments", icon: FiLayers },
  {
    key: "representativesCount",
    label: "Representatives",
    icon: FiUserCheck,
  },
  { key: "teachersCount", label: "Teachers", icon: FiUsers },
  { key: "studentsCount", label: "Students", icon: FiUsers },
] as const;

function EmptyDashboardPanel({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <div className="dashboard-card flex min-h-[18rem] flex-col items-center justify-center rounded-xl border border-border bg-surface p-6 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
        <FiInbox className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <Button asChild className="mt-5" variant="secondary">
        <Link href={href}>{action}</Link>
      </Button>
    </div>
  );
}

export default async function CampusAdminDashboardPage() {
  const [dashboard, almanacEvents] = await Promise.all([
    getCampusAdminDashboard(),
    listAlmanacEvents({}),
  ]);

  return (
    <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
      <CampusAdminPageHeader
        eyebrow="University operations"
        title="Campus Admin Dashboard"
        description="Build the university organizational structure required for representatives, teachers, onboarding, and future modules."
        action={
          <Button asChild>
            <Link href="/campus-admin/colleges">Manage Colleges</Link>
          </Button>
        }
      />

      {!dashboard.hasColleges ? (
        <Card className="mt-8 border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle>Start by creating the first college.</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Colleges are the foundation for departments and representative
              invitations. Create a college before inviting representatives or
              creating departments.
            </p>
            <Button asChild className="mt-5">
              <Link href="/campus-admin/colleges">Open Colleges</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card key={stat.key} className="dashboard-card min-h-[104px]">
              <CardContent className="flex h-full flex-col justify-between p-4">
                <div className="flex items-start justify-between gap-4">
                  <span className="dashboard-icon-tile flex h-9 w-9 items-center justify-center">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                    live
                  </span>
                </div>
                <div className="mt-5">
                  <p className="text-xl font-semibold">
                    {dashboard.stats[stat.key]}
                  </p>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_1fr_0.9fr]">
        <SquareBarChartPanel
          title="Campus Activity"
          subtitle="Content and experience records created over the last six months."
          data={dashboard.charts.activity}
          primaryLabel="Content"
          secondaryLabel="Experience"
        />
        <SquareDonutChartPanel
          title="Structure Distribution"
          subtitle="Live academic and people records for this university."
          data={dashboard.charts.distribution}
        />
        <SquareGoalsPanel
          title="Readiness Goals"
          subtitle="Setup progress based on records already configured."
          goals={dashboard.charts.readinessGoals}
        />
      </section>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Onboarding Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {dashboard.checklist.map((item) => {
              const Icon = item.complete ? FiCheckCircle : FiCircle;

              return (
                <Link
                  key={item.label}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
                  href={item.href}
                >
                  <Icon
                    className={
                      item.complete
                        ? "h-5 w-5 text-primary"
                        : "h-5 w-5 text-muted-foreground"
                    }
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>University Engagement Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  label: "Almanac events",
                  value: dashboard.engagement.almanacEventsCount,
                },
                {
                  label: "Campus locations",
                  value: dashboard.engagement.mapLocationsCount,
                },
                {
                  label: "Marketplace shops",
                  value: dashboard.engagement.shopsCount,
                },
                {
                  label: "Showcase projects",
                  value: dashboard.engagement.projectsCount,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <p className="text-2xl font-semibold">{item.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Almanac Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {almanacEvents.length > 0 ? (
              almanacEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className="rounded-md border border-border bg-background p-3"
                >
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.startDate
                      ? new Date(event.startDate).toLocaleDateString()
                      : "Date not set"}{" "}
                    · {event.eventType}
                  </p>
                </div>
              ))
            ) : (
              <EmptyDashboardPanel
                title="No almanac events yet"
                description="Create academic dates to populate this dashboard section."
                href="/campus-admin/almanac"
                action="Open Almanac"
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyDashboardPanel
              title="No recent activity yet"
              description="Real audit and activity feed events will appear here after campus actions occur."
              href="/campus-admin/colleges"
              action="Start Setup"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              ["Create College", "/campus-admin/colleges"],
              ["Add Department", "/campus-admin/departments"],
              ["Invite Teacher", "/campus-admin/teachers"],
              ["Add Map Point", "/campus-admin/maps"],
            ].map(([label, href]) => (
              <Button key={label} asChild variant="secondary">
                <Link href={href}>{label}</Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
