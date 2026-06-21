import Link from "next/link";
import {
  FiBookOpen,
  FiBriefcase,
  FiCheckCircle,
  FiCircle,
  FiInbox,
  FiShield,
  FiUsers,
} from "react-icons/fi";

import {
  SquareBarChartPanel,
  SquareDonutChartPanel,
  SquareGoalsPanel,
} from "@/components/dashboard/square-dashboard-widgets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SuperAdminPageHeader } from "@/features/super-admin/components/super-admin-page-header";
import { getSuperAdminDashboard } from "@/features/super-admin/lib/super-admin-service";

const statCards = [
  {
    key: "universitiesCount",
    label: "Universities",
    icon: FiBookOpen,
  },
  {
    key: "campusAdminCount",
    label: "Campus Admins",
    icon: FiShield,
  },
  {
    key: "studentsCount",
    label: "Students",
    icon: FiUsers,
  },
  {
    key: "employersCount",
    label: "Employers",
    icon: FiBriefcase,
  },
  {
    key: "pendingEmployerApplicationsCount",
    label: "Pending Applications",
    icon: FiInbox,
  },
] as const;

const platformActivity = [
  { label: "05", primary: 1, secondary: 2 },
  { label: "06", primary: 2, secondary: 1 },
  { label: "07", primary: 1, secondary: 4 },
  { label: "08", primary: 3, secondary: 2 },
  { label: "09", primary: 2, secondary: 3 },
  { label: "10", primary: 4, secondary: 2 },
  { label: "11", primary: 3, secondary: 5 },
];

const platformDistribution = [
  { name: "Universities", value: 4, color: "var(--chart-primary)" },
  { name: "Admins", value: 8, color: "var(--chart-secondary)" },
  { name: "Students", value: 24, color: "var(--chart-tertiary)" },
  { name: "Employers", value: 6, color: "var(--chart-accent)" },
];

const platformGoals = [
  {
    label: "University Setup",
    value: 80,
    detail: "First tenant workflow coverage",
    color: "var(--chart-primary)",
  },
  {
    label: "Admin Invitations",
    value: 65,
    detail: "Campus admins invited",
    color: "var(--chart-secondary)",
  },
  {
    label: "Employer Review",
    value: 45,
    detail: "Applications pending review",
    color: "var(--chart-accent)",
  },
];

export default async function SuperAdminDashboardPage() {
  const dashboard = await getSuperAdminDashboard();

  return (
    <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
      <SuperAdminPageHeader
        eyebrow="Platform operations"
        title="Super Admin Dashboard"
        description="Create the university tenant foundation, invite campus administrators, and monitor the first operational workflows."
        action={
          <Button asChild>
            <Link href="/super-admin/universities">Manage Universities</Link>
          </Button>
        }
      />

      {!dashboard.hasUniversities ? (
        <Card className="mt-8 border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle>Start by creating the first university.</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              CampusHub becomes operational once a university exists. After
              that, create a Campus Admin invitation tied to that university.
            </p>
            <Button asChild className="mt-5">
              <Link href="/super-admin/universities">Open Universities</Link>
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
                    active
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
          data={platformActivity}
          primaryLabel="Universities"
          secondaryLabel="Invitations"
          subtitle="Tenant setup and invitation activity over 7 days"
          title="Platform Activity"
        />
        <SquareDonutChartPanel
          data={platformDistribution}
          subtitle="Operational distribution across the platform"
          title="Platform Mix"
        />
        <SquareGoalsPanel
          goals={platformGoals}
          subtitle="Track launch readiness"
          title="Weekly Goals"
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
    </main>
  );
}
