import Link from "next/link";
import {
  FiBookOpen,
  FiCheckCircle,
  FiCircle,
  FiLayers,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampusAdminPageHeader } from "@/features/campus-admin/components/campus-admin-page-header";
import {
  mockAlmanacEvents,
  mockColleges,
  mockDepartments,
  mockRepresentatives,
  mockTeachers,
} from "@/features/campus-admin/lib/mock-data";

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

export default async function CampusAdminDashboardPage() {
  const dashboard = {
    stats: {
      collegesCount: mockColleges.length,
      departmentsCount: mockDepartments.length,
      representativesCount: mockRepresentatives.length,
      teachersCount: mockTeachers.length,
      studentsCount: 18342,
    },
    checklist: [
      {
        label: "Create First College",
        complete: mockColleges.length > 0,
        href: "/campus-admin/colleges",
      },
      {
        label: "Create First Department",
        complete: mockDepartments.length > 0,
        href: "/campus-admin/departments",
      },
      {
        label: "Create First Representative",
        complete: mockRepresentatives.length > 0,
        href: "/campus-admin/representatives",
      },
      {
        label: "Create First Teacher",
        complete: mockTeachers.length > 0,
        href: "/campus-admin/teachers",
      },
    ],
    hasColleges: mockColleges.length > 0,
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card key={stat.key}>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-2 text-3xl font-semibold">
                    {dashboard.stats[stat.key]}
                  </p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </CardContent>
            </Card>
          );
        })}
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
                        ? "h-5 w-5 text-success"
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
          <CardContent className="space-y-4">
            {[
              ["College coverage", 92],
              ["Department readiness", 78],
              ["Teacher onboarding", 64],
              ["Representative activation", 86],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Almanac Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockAlmanacEvents.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className="rounded-md border border-border bg-background p-3"
              >
                <p className="text-sm font-medium">{event.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(event.date).toLocaleDateString()} · {event.type}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "College of ICT updated its representative roster.",
              "Department of Computer Science added two teacher invitations.",
              "Main Library map point was reviewed for accuracy.",
              "Semester II registration date was published.",
            ].map((activity) => (
              <div
                key={activity}
                className="rounded-md border border-border bg-background p-3 text-sm text-muted-foreground"
              >
                {activity}
              </div>
            ))}
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
