import Link from "next/link";
import {
  FiArrowLeft,
  FiBarChart2,
  FiBookOpen,
  FiCalendar,
  FiFlag,
  FiGlobe,
  FiMail,
  FiMapPin,
  FiPieChart,
  FiPhone,
  FiShield,
  FiShoppingBag,
  FiStar,
  FiUsers,
} from "react-icons/fi";

import { Button } from "@/components/ui/button";
import type { SerializedUniversityProfile } from "@/features/super-admin/lib/super-admin-service";

function formatDate(value: string | null) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function StatusBadge({
  status,
}: {
  status: SerializedUniversityProfile["university"]["status"];
}) {
  const styles = {
    ACTIVE: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
    INACTIVE: "border-red-500/25 bg-red-500/10 text-red-400",
    PENDING: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  } satisfies Record<
    SerializedUniversityProfile["university"]["status"],
    string
  >;

  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-bold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-normal">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-medium">
          {value || "Not set"}
        </p>
      </div>
    </div>
  );
}

export function UniversityProfilePage({
  profile,
}: {
  profile: SerializedUniversityProfile;
}) {
  const { university, stats } = profile;
  const location =
    university.locationLatitude !== null && university.locationLongitude !== null
      ? `${university.locationLatitude.toFixed(6)}, ${university.locationLongitude.toFixed(6)}`
      : null;
  const explorationItems = [
    {
      label: "University",
      description: "Foundation profile, contact details, status, and location.",
      href: `/super-admin/universities/${university.id}`,
      icon: FiBookOpen,
      value: university.status,
    },
    {
      label: "Colleges",
      description: "Drill into colleges owned by this university.",
      href: `/super-admin/colleges?universityId=${university.id}`,
      icon: FiBookOpen,
      value: stats.colleges,
    },
    {
      label: "Departments",
      description: "Review departments through the college hierarchy.",
      href: `/super-admin/departments?universityId=${university.id}`,
      icon: FiGlobe,
      value: stats.departments,
    },
    {
      label: "Campus Admins",
      description: "Manage university-specific campus administrators.",
      href: `/super-admin/campus-admins?universityId=${university.id}`,
      icon: FiShield,
      value: stats.campusAdmins,
    },
    {
      label: "Students",
      description: "Review students scoped to this university.",
      href: `/super-admin/students?universityId=${university.id}`,
      icon: FiUsers,
      value: stats.students,
    },
    {
      label: "Events",
      description: "Explore university events and participation.",
      href: `/super-admin/events?universityId=${university.id}`,
      icon: FiCalendar,
      value: stats.events,
    },
    {
      label: "Projects",
      description: "Browse projects published by university members.",
      href: `/super-admin/projects?universityId=${university.id}`,
      icon: FiStar,
      value: stats.projects,
    },
    {
      label: "Marketplace",
      description: "Review shops, products, services, and order requests.",
      href: `/super-admin/marketplace?universityId=${university.id}`,
      icon: FiShoppingBag,
      value: stats.marketplace,
    },
    {
      label: "Governance",
      description: "Inspect committees and leadership governance activity.",
      href: `/super-admin/committees?universityId=${university.id}`,
      icon: FiFlag,
      value: stats.governance,
    },
    {
      label: "Reports",
      description: "Open reporting records scoped to this university.",
      href: `/super-admin/reports?universityId=${university.id}`,
      icon: FiBarChart2,
      value: stats.reports,
    },
    {
      label: "Analytics",
      description: "Review aggregated university activity and engagement.",
      href: `/super-admin/analytics?universityId=${university.id}`,
      icon: FiPieChart,
      value: stats.analytics,
    },
  ];

  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      <Button asChild variant="ghost" className="mb-5">
        <Link href="/super-admin/universities">
          <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
          Universities
        </Link>
      </Button>

      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="relative h-48 bg-surface-muted sm:h-60">
          {university.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={university.coverImage}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(135deg,rgba(196,90,5,0.32),rgba(2,132,199,0.18),rgba(15,23,42,0.1))]" />
          )}
        </div>

        <div className="px-5 py-6 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <span className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[1.5rem] border border-border bg-background text-primary shadow-lg">
                {university.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={university.logo}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FiBookOpen className="h-10 w-10" aria-hidden="true" />
                )}
              </span>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-normal">
                    {university.name}
                  </h1>
                  <StatusBadge status={university.status} />
                </div>
                <p className="mt-2 text-base text-muted-foreground">
                  {[university.shortName, university.country, university.region]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {university.description || "No university description has been added yet."}
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-3 lg:min-w-[420px]">
              <Metric label="Users" value={stats.users} />
              <Metric label="Colleges" value={stats.colleges} />
              <Metric label="Departments" value={stats.departments} />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        <InfoItem icon={FiShield} label="Campus Admins" value={`${stats.campusAdmins}`} />
        <InfoItem icon={FiUsers} label="Invitations" value={`${stats.invitations}`} />
        <InfoItem icon={FiBookOpen} label="Created" value={formatDate(university.createdAt)} />
      </section>

      <section className="mt-8">
        <div>
          <h2 className="text-lg font-semibold">Explore University</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Drill into this university through the platform hierarchy. These links keep
            institution-scoped work under the university context instead of duplicating
            disconnected management pages.
          </p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {explorationItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                className="group flex min-h-32 items-start gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-surface-muted"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-semibold">{item.label}</span>
                    <span className="rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold text-muted-foreground">
                      {typeof item.value === "number"
                        ? item.value.toLocaleString()
                        : item.value}
                    </span>
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="text-lg font-semibold">Contact Details</h2>
          <div className="mt-4 grid gap-3">
            <InfoItem icon={FiGlobe} label="Website" value={university.website} />
            <InfoItem icon={FiMail} label="Email" value={university.email} />
            <InfoItem icon={FiPhone} label="Phone" value={university.phone} />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Location</h2>
          <div className="mt-4 grid gap-3">
            <InfoItem icon={FiMapPin} label="Pinned Location" value={university.locationName} />
            <InfoItem icon={FiMapPin} label="Address" value={university.locationAddress} />
            <InfoItem icon={FiMapPin} label="Coordinates" value={location} />
          </div>
        </div>
      </section>

      {university.locationLatitude !== null &&
      university.locationLongitude !== null ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Map</h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
            <iframe
              title={`${university.name} map`}
              className="h-[420px] w-full"
              loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${university.locationLongitude - 0.01}%2C${university.locationLatitude - 0.01}%2C${university.locationLongitude + 0.01}%2C${university.locationLatitude + 0.01}&layer=mapnik&marker=${university.locationLatitude}%2C${university.locationLongitude}`}
            />
          </div>
        </section>
      ) : null}
    </main>
  );
}
