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

export default async function SuperAdminDashboardPage() {
  const dashboard = await getSuperAdminDashboard();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
    </main>
  );
}
