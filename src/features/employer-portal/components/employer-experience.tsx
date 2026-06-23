// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
"use client";


import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import type { IconType } from "react-icons";
import {
  FiBarChart2,
  FiBell,
  FiBookmark,
  FiBriefcase,
  FiCheckCircle,
  FiEdit,
  FiExternalLink,
  FiEye,
  FiFileText,
  FiGithub,
  FiGlobe,
  FiMail,
  FiMapPin,
  FiMoreVertical,
  FiPhone,
  FiPlus,
  FiSearch,
  FiStar,
  FiTarget,
  FiTrash2,
  FiUsers,
  FiVideo,
  FiX,
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
  CampusInput,
  CampusTextarea,
  campusToast,
} from "@/components/campushub";
import { HoverCard } from "@/components/motion/hover-card";
import { StaggerContainer } from "@/components/motion/stagger-container";
import { Empty } from "@/components/shared/empty";
import { LoadingState } from "@/components/shared/loading-state";
import { Modal } from "@/components/shared/modal";
import { Skeleton } from "@/components/shared/skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import {
  employerOpportunities,
  employerStats,
  opportunityTabs,
  type EmployerOpportunity,
  type EmployerProject,
  type EmployerStudent,
} from "@/features/employer-portal/lib/mock-data";
import { AccountProfilePage } from "@/features/account/components/account-profile-page";
import { NotificationTabs } from "@/features/notifications/components/notification-tabs";
import {
  deleteClientNotification,
  deleteClientNotifications,
  fetchClientNotifications,
  filterNotificationsByTab,
  getNotificationTabs,
  markAllClientNotificationsRead,
  markClientNotificationRead,
  type ClientNotification,
} from "@/features/notifications/lib/client-notification-utils";
import { formatCompactNumber } from "@/lib/number-format";
import { cn } from "@/lib/utils";

const ALL_VALUE = "all";
const EMPLOYER_INTEREST_PLACEHOLDER = "__select_recruitment_interest__";

const employerIndustryOptions = [
  "Education Technology",
  "Software Development",
  "Financial Services",
  "Telecommunications",
  "Healthcare",
  "Manufacturing",
  "Retail & E-commerce",
  "Energy",
  "Agriculture",
  "Logistics",
  "Consulting",
  "Non-profit",
  "Government",
  "Media & Creative",
  "Other",
];

const employerCompanySizeOptions = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5000+",
  "Other",
];

const employerLocationOptions = [
  "Tanzania",
  "Kenya",
  "Uganda",
  "Rwanda",
  "Burundi",
  "South Africa",
  "Nigeria",
  "Ghana",
  "Remote",
  "Global",
  "Other",
];

const employerRecruitmentInterestOptions = [
  "Software Engineering",
  "Data Science",
  "Product Design",
  "Cybersecurity",
  "AI & Machine Learning",
  "Business Analysis",
  "Project Management",
  "Marketing",
  "Sales",
  "Accounting & Finance",
  "Operations",
  "Customer Success",
  "Research",
  "Internships",
  "Graduate Trainees",
  "Other",
];

type ChartView = "bar" | "line" | "area";
type OpportunityFormValues = z.infer<typeof opportunitySchema>;

const chartViewLabels: Record<ChartView, string> = {
  bar: "Bar chart",
  line: "Line chart",
  area: "Area chart",
};

const employerChartData: Array<{
  label: string;
  candidates: number;
  projects: number;
  opportunities: number;
}> = [];

const analyticsTrendData: Array<{
  label: string;
  profile: number;
  opportunity: number;
  project: number;
}> = [];

type EmployerSummaryStatus = "loading" | "success" | "error";

function useEmployerPortalSummary() {
  const [summary, setSummary] = useState<{
    stats: typeof employerStats;
    students: EmployerStudent[];
    projects: EmployerProject[];
    chartData: typeof employerChartData;
    company: Record<string, unknown> | null;
    dashboard: Record<string, unknown>;
    universities: Record<string, unknown>[];
    savedCandidatesCount: number;
    applicationsCount: number;
  }>({
    stats: [],
    students: [],
    projects: [],
    chartData: [],
    company: null,
    dashboard: {},
    universities: [],
    savedCandidatesCount: 0,
    applicationsCount: 0,
  });
  const [status, setStatus] = useState<EmployerSummaryStatus>("loading");

  useEffect(() => {
    let active = true;
    setStatus("loading");

    fetch("/api/employer/portal-summary", { credentials: "include" })
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error?.message ?? "Unable to load employer data.");
        }

        return payload;
      })
      .then((payload) => {
        if (!active) return;
        const next = payload?.data?.summary ?? payload?.summary ?? payload;

        if (next) {
          setSummary({
            stats: Array.isArray(next.stats) ? next.stats : [],
            students: Array.isArray(next.students)
              ? next.students
                  .map((student, index) => normalizeEmployerStudent(student, index))
                  .filter((student): student is EmployerStudent => Boolean(student))
              : [],
            projects: Array.isArray(next.projects)
              ? next.projects
                  .map((project, index) => normalizeEmployerProject(project, index))
                  .filter((project): project is EmployerProject => Boolean(project))
              : [],
            chartData: Array.isArray(next.chartData) ? next.chartData : [],
            company:
              next.company && typeof next.company === "object"
                ? next.company
                : null,
            dashboard:
              next.dashboard && typeof next.dashboard === "object"
                ? next.dashboard
                : {},
            universities: Array.isArray(next.universities) ? next.universities : [],
            savedCandidatesCount: Number.isFinite(Number(next.savedCandidatesCount))
              ? Number(next.savedCandidatesCount)
              : 0,
            applicationsCount: Number.isFinite(Number(next.applicationsCount))
              ? Number(next.applicationsCount)
              : 0,
          });
          setStatus("success");
          return;
        }

        setStatus("error");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  return {
    ...summary,
    isLoading: status === "loading",
    isReady: status === "success",
    status,
  };
}

const opportunitySchema = z.object({
  title: z.string().min(4, "Enter a title."),
  type: z.string().min(2, "Choose a type."),
  description: z.string().min(12, "Describe the opportunity."),
  requirements: z.string().min(8, "Add requirements."),
  location: z.string().min(2, "Enter a location."),
  duration: z.string().min(2, "Enter duration."),
  deadline: z.string().min(1, "Select a deadline."),
  universities: z.string().min(2, "Add target universities."),
  departments: z.string().min(2, "Add target departments."),
  visibility: z.string().min(2, "Select visibility."),
});

function PageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
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
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  trend: string;
  icon: IconType;
}) {
  return (
    <Card className="min-h-32 p-4 transition hover:border-primary/40">
      <div className="flex items-start justify-between">
        <span className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {trend}
        </span>
      </div>
      <div className="mt-6">
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
      {children}
    </span>
  );
}

function EmployerPageSkeleton({
  variant = "dashboard",
}: {
  variant?: "dashboard" | "talent" | "showcase" | "analytics";
}) {
  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8" aria-busy="true">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full max-w-4xl space-y-3">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-9 w-full max-w-xl" />
          <Skeleton className="h-4 w-full max-w-3xl" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      {variant === "dashboard" ? <EmployerDashboardSkeleton /> : null}
      {variant === "talent" ? <EmployerTalentSkeleton /> : null}
      {variant === "showcase" ? <EmployerShowcaseSkeleton /> : null}
      {variant === "analytics" ? <EmployerAnalyticsSkeleton /> : null}
    </section>
  );
}

const employerDashboardMetricIcons: IconType[] = [
  FiGlobe,
  FiUsers,
  FiBriefcase,
  FiStar,
  FiEye,
  FiTarget,
  FiFileText,
];

function EmployerDashboardSkeleton() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
              <div className="mt-8 space-y-2">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="flex flex-row items-start gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[340px] w-full" />
        </CardContent>
      </Card>
      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-40 rounded-lg" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="grid gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-72 rounded-lg" />
        ))}
      </div>
    </>
  );
}

function EmployerTalentSkeleton() {
  return (
    <>
      <Card className="bg-surface">
        <CardContent className="space-y-5 p-5">
          <Skeleton className="h-11 w-full" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-32 rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-72 rounded-lg" />
        ))}
      </div>
    </>
  );
}

function EmployerShowcaseSkeleton() {
  return (
    <>
      <section className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <Card className="overflow-hidden">
          <div className="grid min-h-[360px] lg:grid-cols-[1.15fr_.85fr]">
            <Skeleton className="h-full min-h-[280px] rounded-none" />
            <div className="flex flex-col justify-between gap-6 p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-36 rounded-full" />
                <Skeleton className="h-8 w-72 max-w-full" />
                <Skeleton className="h-4 w-48" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="aspect-video rounded-md" />
                ))}
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </Card>
        <div className="grid gap-5">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </section>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-36" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-64 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-80 rounded-lg" />
        ))}
      </div>
    </>
  );
}

function EmployerAnalyticsSkeleton() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
              <div className="mt-8 space-y-2">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[340px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-72 rounded-lg" />
        ))}
      </div>
    </>
  );
}

function Avatar({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary", className)}>
      {label}
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
    <div className={cn("relative w-full", className)}>
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
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: string[];
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>All {label.toLowerCase()}</SelectItem>
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

function ChartViewMenu({
  value,
  onChange,
}: {
  value: ChartView;
  onChange: (value: ChartView) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Switch chart view" className="h-9 w-9 p-0" type="button" variant="secondary">
          <FiMoreVertical className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {(Object.keys(chartViewLabels) as ChartView[]).map((view) => (
          <DropdownMenuItem key={view} onClick={() => onChange(view)}>
            {value === view ? <FiCheckCircle className="h-4 w-4 text-primary" /> : <span className="h-4 w-4" />}
            {chartViewLabels[view]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PipelineChart({ view, data = employerChartData }: { view: ChartView; data?: typeof employerChartData }) {
  const commonProps = { data, margin: { top: 12, right: 24, left: -12, bottom: 0 } };

  if (view === "line") {
    return (
      <LineChart {...commonProps}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="4 5" vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line type="monotone" dataKey="candidates" stroke="var(--chart-primary)" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="projects" stroke="var(--chart-secondary)" strokeWidth={3} dot={false} />
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
        <Area type="monotone" dataKey="candidates" stroke="var(--chart-primary)" fill="var(--chart-primary)" fillOpacity={0.18} strokeWidth={2.5} />
        <Area type="monotone" dataKey="projects" stroke="var(--chart-secondary)" fill="var(--chart-secondary)" fillOpacity={0.14} strokeWidth={2.5} />
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
      <Bar dataKey="candidates" fill="var(--chart-primary)" radius={[7, 7, 0, 0]} />
      <Bar dataKey="projects" fill="var(--chart-secondary)" radius={[7, 7, 0, 0]} />
      <Bar dataKey="opportunities" fill="var(--chart-tertiary)" radius={[7, 7, 0, 0]} />
    </BarChart>
  );
}

function AnalyticsChart({
  data = analyticsTrendData,
}: {
  data?: Array<{
    label: string;
    profile: number;
    opportunity: number;
    project: number;
  }>;
}) {
  return (
    <AreaChart data={data} margin={{ top: 12, right: 24, left: -12, bottom: 0 }}>
      <CartesianGrid stroke="var(--border)" strokeDasharray="4 5" vertical={false} />
      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
      <Tooltip />
      <Area type="monotone" dataKey="profile" stroke="var(--chart-primary)" fill="var(--chart-primary)" fillOpacity={0.18} />
      <Area type="monotone" dataKey="opportunity" stroke="var(--chart-secondary)" fill="var(--chart-secondary)" fillOpacity={0.14} />
      <Area type="monotone" dataKey="project" stroke="var(--chart-tertiary)" fill="var(--chart-tertiary)" fillOpacity={0.14} />
    </AreaChart>
  );
}

function RankingBarChart({
  data,
}: {
  data: Array<{ label: string; value: number }>;
}) {
  return (
    <BarChart
      data={data}
      layout="vertical"
      margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
    >
      <CartesianGrid stroke="var(--border)" strokeDasharray="4 5" horizontal={false} />
      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
      <YAxis
        dataKey="label"
        type="category"
        axisLine={false}
        tickLine={false}
        tick={{ fontSize: 12 }}
        width={120}
      />
      <Tooltip />
      <Bar dataKey="value" fill="var(--chart-primary)" radius={[0, 7, 7, 0]} />
    </BarChart>
  );
}

function CandidateContactModal({
  student,
  open,
  onOpenChange,
}: {
  student: EmployerStudent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [method, setMethod] = useState<"EMAIL" | "PHONE">(
    student.email ? "EMAIL" : "PHONE",
  );
  const [subject, setSubject] = useState(`CampusHub opportunity for ${student.name}`);
  const [message, setMessage] = useState(
    `Hi ${student.name}, I found your CampusHub profile interesting and would like to connect about an opportunity.`,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canUseEmail = Boolean(student.email);
  const canUsePhone = Boolean(student.phone);

  async function submitContact() {
    if (!student.id) return;
    if (method === "EMAIL" && !canUseEmail) {
      campusToast.error({ title: "Email unavailable", description: "This candidate has not added an email address." });
      return;
    }
    if (method === "PHONE" && !canUsePhone) {
      campusToast.error({ title: "Phone unavailable", description: "This candidate has not added a phone number." });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/talent-discovery/${student.id}/contact`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          message,
          contactMethod: method,
          contactEmail: method === "EMAIL" ? student.email : null,
          contactPhone: method === "PHONE" ? student.phone : null,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Unable to contact candidate.");
      }

      campusToast.success({
        title: "Candidate notified",
        description: `${student.name} was notified about your contact request.`,
      });
      if (method === "EMAIL" && student.email) {
        window.location.href = `mailto:${student.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      }
      if (method === "PHONE" && student.phone) {
        window.location.href = `tel:${student.phone}`;
      }
      onOpenChange(false);
    } catch (error) {
      campusToast.error({
        title: "Contact failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Contact candidate"
      description={`Choose how to contact ${student.name}.`}
      className="max-w-2xl"
      footer={
        <Button type="button" onClick={submitContact} disabled={isSubmitting}>
          <FiMail className="h-4 w-4" aria-hidden="true" />
          {isSubmitting ? "Sending" : "Send contact request"}
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className={cn(
              "rounded-lg border border-border p-4 text-left transition",
              method === "EMAIL" ? "border-primary bg-primary/10 text-foreground" : "bg-background text-muted-foreground",
              !canUseEmail && "opacity-50",
            )}
            disabled={!canUseEmail}
            onClick={() => setMethod("EMAIL")}
          >
            <span className="flex items-center gap-2 font-semibold"><FiMail /> Email</span>
            <span className="mt-2 block text-sm">{student.email || "No email on profile"}</span>
          </button>
          <button
            type="button"
            className={cn(
              "rounded-lg border border-border p-4 text-left transition",
              method === "PHONE" ? "border-primary bg-primary/10 text-foreground" : "bg-background text-muted-foreground",
              !canUsePhone && "opacity-50",
            )}
            disabled={!canUsePhone}
            onClick={() => setMethod("PHONE")}
          >
            <span className="flex items-center gap-2 font-semibold"><FiPhone /> Phone</span>
            <span className="mt-2 block text-sm">{student.phone || "No phone on profile"}</span>
          </button>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Subject</span>
          <CampusInput value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Internship opportunity" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Message</span>
          <CampusTextarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a short contact note." rows={5} />
        </label>
      </div>
    </Modal>
  );
}

function StudentActionMenu({
  student,
  onSaved,
}: {
  student: EmployerStudent;
  onSaved?: (candidateId: string) => void;
}) {
  const [contactOpen, setContactOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function saveCandidate() {
    if (!student.id) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/talent-discovery/saved-candidates", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateUserId: student.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Unable to save candidate.");
      }
      onSaved?.(student.id);
      campusToast.success({
        title: "Candidate saved",
        description: `${student.name} was added to your talent pool.`,
      });
    } catch (error) {
      campusToast.error({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Open actions for ${student.name}`}
            className="h-9 w-9 shrink-0 p-0"
            type="button"
            variant="ghost"
          >
            <FiMoreVertical className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              window.location.href = `/employer/candidates/${student.id}`;
            }}
          >
            <FiEye className="h-4 w-4" />
            View Profile
          </DropdownMenuItem>
          <DropdownMenuItem disabled={student.saved || isSaving} onClick={saveCandidate}>
            <FiBookmark className="h-4 w-4" />
            {student.saved ? "Saved Candidate" : isSaving ? "Saving" : "Save Candidate"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setContactOpen(true)}>
            <FiMail className="h-4 w-4" />
            Contact Candidate
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CandidateContactModal student={student} open={contactOpen} onOpenChange={setContactOpen} />
    </>
  );
}

function TalentCard({
  student,
  onSaved,
}: {
  student: EmployerStudent;
  onSaved?: (candidateId: string) => void;
}) {
  const visibleSkills = student.skills.slice(0, 3);
  const visibleBadges = student.badges.slice(0, 2);
  const hiddenBadgeCount = student.badges.length - visibleBadges.length;

  return (
    <HoverCard className="h-full rounded-lg border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar label={student.photo} />
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-foreground">{student.name}</h3>
            <p className="truncate text-sm text-muted-foreground">{student.department}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge>{student.availability}</StatusBadge>
          <StudentActionMenu student={student} onSaved={onSaved} />
        </div>
      </div>
      <p className="mt-4 truncate text-sm text-muted-foreground">
        {student.college} - {student.university} - {student.graduationYear}
      </p>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{student.bio}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {visibleSkills.map((skill) => (
          <span key={skill} className="rounded-md bg-surface-muted px-2.5 py-1 text-xs text-muted-foreground">
            {skill}
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-border py-3 text-sm">
        <span className="inline-flex items-baseline gap-1.5">
          <strong className="font-semibold text-foreground">
            {formatCompactNumber(student.xp)}
          </strong>
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            XP
          </span>
        </span>
        <span className="h-4 w-px bg-border" aria-hidden="true" />
        <span className="inline-flex items-baseline gap-1.5">
          <strong className="font-semibold text-foreground">{student.projects}</strong>
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Projects
          </span>
        </span>
        <span className="h-4 w-px bg-border" aria-hidden="true" />
        <span className="inline-flex items-baseline gap-1.5">
          <strong className="font-semibold text-foreground">
            {student.profileCompletion}%
          </strong>
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Profile
          </span>
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {visibleBadges.map((badge) => (
          <StatusBadge key={badge}>{badge}</StatusBadge>
        ))}
        {hiddenBadgeCount > 0 ? <StatusBadge>+{hiddenBadgeCount}</StatusBadge> : null}
      </div>
    </HoverCard>
  );
}

function ProjectImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-surface-muted", className)}>
      <Image
        alt={alt}
        className="object-cover transition duration-300 group-hover:scale-105"
        fill
        sizes="(min-width: 1024px) 360px, (min-width: 768px) 50vw, 100vw"
        src={src}
      />
    </div>
  );
}

function ProjectCard({ project, onView }: { project: EmployerProject; onView: (project: EmployerProject) => void }) {
  const safeProject = normalizeEmployerProject(project, 0);

  if (!safeProject) {
    return null;
  }

  const galleryImages = safeProject.galleryImages.slice(0, 3);

  return (
    <HoverCard className="group h-full overflow-hidden rounded-lg border border-border bg-surface">
      <button
        className="block w-full text-left"
        type="button"
        onClick={() => onView(safeProject)}
      >
        <ProjectImage
          alt={`${safeProject.name} preview`}
          className="aspect-[16/10] border-b border-border"
          src={safeProject.image}
        />
      </button>
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground">{safeProject.name}</h3>
            <p className="mt-1 truncate text-sm text-muted-foreground">{safeProject.owner} - {safeProject.department}</p>
          </div>
          <StatusBadge>{safeProject.projectType}</StatusBadge>
        </div>
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{safeProject.summary}</p>
        <div className="grid grid-cols-3 gap-2">
          {galleryImages.map((image, index) => (
            <ProjectImage
              key={`${image}-${index}`}
              alt={`${safeProject.name} gallery ${index + 1}`}
              className="aspect-video rounded-md border border-border"
              src={image}
            />
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <FiEye className="h-3.5 w-3.5" aria-hidden="true" />
            {formatCompactNumber(safeProject.views)}
          </span>
          <span className="inline-flex items-center gap-1">
            <FiStar className="h-3.5 w-3.5" aria-hidden="true" />
            {safeProject.stars}
          </span>
          <span className="truncate">{safeProject.category}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" onClick={() => onView(safeProject)}>
            <FiEye className="h-4 w-4" />
            Details
          </Button>
          <Button type="button" onClick={() => campusToast.success({ title: "Project Starred", description: `${safeProject.name} was added to starred projects.` })}>
            <FiStar className="h-4 w-4" />
            Star
          </Button>
        </div>
      </div>
    </HoverCard>
  );
}

function ProjectDetailsModal({ project, onClose }: { project: EmployerProject | null; onClose: () => void }) {
  const safeProject = normalizeEmployerProject(project, 0);

  return (
    <Modal open={Boolean(safeProject)} onOpenChange={(open) => !open && onClose()} title={safeProject?.name ?? ""} description={safeProject?.owner}>
      {safeProject ? (
        <div className="space-y-5">
          <ProjectImage
            alt={`${safeProject.name} main preview`}
            className="aspect-[16/8] rounded-lg border border-border"
            src={safeProject.image}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {safeProject.galleryImages.map((image, index) => (
              <ProjectImage
                key={`${image}-${index}`}
                alt={`${safeProject.name} detail ${index + 1}`}
                className="aspect-video rounded-lg border border-border"
                src={image}
              />
            ))}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{safeProject.summary}</p>
          <div className="grid gap-3 md:grid-cols-5">
            {[
              ["Views", formatCompactNumber(safeProject.views), FiEye],
              ["Unique Visitors", formatCompactNumber(safeProject.analytics.uniqueVisitors), FiUsers],
              ["Stars", formatCompactNumber(safeProject.stars), FiStar],
              ["GitHub Clicks", formatCompactNumber(safeProject.analytics.githubClicks), FiGithub],
              ["Video Clicks", formatCompactNumber(safeProject.analytics.videoClicks), FiVideo],
            ].map(([label, value, Icon]) => (
              <div key={label as string} className="rounded-lg border border-border bg-background p-4">
                <Icon className="h-4 w-4 text-primary" />
                <p className="mt-3 text-lg font-semibold">{value as string}</p>
                <p className="text-xs text-muted-foreground">{label as string}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Related Documents</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {safeProject.documents.map((document) => (
                  <button key={document} className="flex w-full items-center justify-between rounded-lg border border-border bg-background p-3 text-left text-sm hover:border-primary/40" type="button">
                    <span className="inline-flex items-center gap-2"><FiFileText className="h-4 w-4 text-primary" />{document}</span>
                    <span className="text-xs text-primary">Preview</span>
                  </button>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Project Links</CardTitle></CardHeader>
              <CardContent className="grid gap-2">
                {safeProject.links.map((link) => (
                  <button key={link} type="button" className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm hover:border-primary/40">
                    <FiExternalLink className="h-4 w-4 text-primary" />
                    {link}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <Card><CardHeader><CardTitle>Team Members</CardTitle></CardHeader><CardContent className="space-y-2">{safeProject.team.map((member) => <StatusBadge key={member}>{member}</StatusBadge>)}</CardContent></Card>
            <Card><CardHeader><CardTitle>Gallery Notes</CardTitle></CardHeader><CardContent className="space-y-2">{safeProject.gallery.map((item) => <div key={item} className="rounded-lg bg-background p-3 text-sm">{item}</div>)}</CardContent></Card>
            <Card><CardHeader><CardTitle>Achievements</CardTitle></CardHeader><CardContent className="space-y-2">{safeProject.achievements.map((item) => <StatusBadge key={item}>{item}</StatusBadge>)}</CardContent></Card>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function OpportunityModal({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (open: boolean) => void; onCreate: (values: OpportunityFormValues) => void }) {
  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      title: "",
      type: "Internship",
      description: "",
      requirements: "",
      location: "",
      duration: "",
      deadline: "",
      universities: "",
      departments: "",
      visibility: "Public",
    },
  });

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Create Opportunity" description="Publish a job, internship, graduate program, scholarship, competition, or hackathon.">
      <form className="space-y-5" onSubmit={form.handleSubmit((values) => { onCreate(values); form.reset(); })}>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">Title<CampusInput placeholder="Opportunity title" {...form.register("title")} /></label>
          <label className="grid gap-2 text-sm font-medium">Type
            <Select value={form.watch("type")} onValueChange={(value) => form.setValue("type", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Job", "Internship", "Graduate Program", "Scholarship", "Competition", "Hackathon"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-medium">Location<CampusInput {...form.register("location")} /></label>
          <label className="grid gap-2 text-sm font-medium">Duration<CampusInput {...form.register("duration")} /></label>
          <label className="grid gap-2 text-sm font-medium">Application Deadline<CampusInput type="date" {...form.register("deadline")} /></label>
          <label className="grid gap-2 text-sm font-medium">Visibility
            <Select value={form.watch("visibility")} onValueChange={(value) => form.setValue("visibility", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Public", "Partner Universities", "Targeted"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
          </label>
        </div>
        <label className="grid gap-2 text-sm font-medium">Target Universities<CampusInput {...form.register("universities")} /></label>
        <label className="grid gap-2 text-sm font-medium">Target Departments<CampusInput {...form.register("departments")} /></label>
        <label className="grid gap-2 text-sm font-medium">Description<CampusTextarea rows={4} {...form.register("description")} /></label>
        <label className="grid gap-2 text-sm font-medium">Requirements<CampusTextarea rows={4} placeholder="One requirement per line" {...form.register("requirements")} /></label>
        <Button type="submit" className="w-full"><FiPlus className="h-4 w-4" />Create Opportunity</Button>
      </form>
    </Modal>
  );
}

function OpportunityCard({ opportunity, onView }: { opportunity: EmployerOpportunity; onView: (opportunity: EmployerOpportunity) => void }) {
  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <StatusBadge>{opportunity.type}</StatusBadge>
          <span className="text-sm text-muted-foreground">{opportunity.status}</span>
        </div>
        <div>
          <h3 className="font-semibold">{opportunity.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{opportunity.location} - {opportunity.duration}</p>
        </div>
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{opportunity.description}</p>
        <div className="mt-auto grid gap-2 rounded-lg bg-background p-4 text-sm text-muted-foreground">
          <span>{opportunity.applicants} applicants</span>
          <span>Deadline {opportunity.deadline}</span>
        </div>
        <Button type="button" onClick={() => onView(opportunity)}><FiEye className="h-4 w-4" />View Details</Button>
      </CardContent>
    </Card>
  );
}

function OpportunityDetailsModal({ opportunity, onClose }: { opportunity: EmployerOpportunity | null; onClose: () => void }) {
  return (
    <Modal open={Boolean(opportunity)} onOpenChange={(open) => !open && onClose()} title={opportunity?.title ?? ""} description={opportunity?.type}>
      {opportunity ? (
        <div className="space-y-5">
          <p className="text-sm leading-6 text-muted-foreground">{opportunity.description}</p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-background p-4"><p className="text-xs text-muted-foreground">Target Audience</p><p className="mt-2 font-semibold">{opportunity.targetAudience}</p></div>
            <div className="rounded-lg bg-background p-4"><p className="text-xs text-muted-foreground">Duration</p><p className="mt-2 font-semibold">{opportunity.duration}</p></div>
            <div className="rounded-lg bg-background p-4"><p className="text-xs text-muted-foreground">Visibility</p><p className="mt-2 font-semibold">{opportunity.visibility}</p></div>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <Card><CardHeader><CardTitle>Requirements</CardTitle></CardHeader><CardContent className="space-y-2">{opportunity.requirements.map((item) => <div key={item} className="rounded-lg bg-background p-3 text-sm">{item}</div>)}</CardContent></Card>
            <Card><CardHeader><CardTitle>Benefits</CardTitle></CardHeader><CardContent className="space-y-2">{opportunity.benefits.map((item) => <StatusBadge key={item}>{item}</StatusBadge>)}</CardContent></Card>
            <Card><CardHeader><CardTitle>Application Process</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">{opportunity.applicationProcess}</p></CardContent></Card>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function compareValues(values: string[]) {
  return Array.from(new Set(values)).sort();
}

function Leaderboard({ title, items }: { title: string; items: { label: string; value: string; detail: string; href?: string }[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {items.length ? items.map((item, index) => {
          const content = (
            <>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{item.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
              </span>
              <span className="text-sm font-semibold text-primary">{item.value}</span>
            </>
          );
          const className = "flex items-center gap-3 rounded-lg bg-background p-3 transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

          return item.href ? (
            <Link key={item.label} href={item.href} className={className}>
              {content}
            </Link>
          ) : (
            <div key={item.label} className={className}>
              {content}
            </div>
          );
        }) : (
          <Empty
            title="No ranking data yet"
            description="Live employer-visible records will appear here once available."
            icon={FiBarChart2}
          />
        )}
      </CardContent>
    </Card>
  );
}

function SummaryRows({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: { label: string; value: string | number; detail?: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-4 rounded-lg bg-background p-3"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{item.label}</span>
                {item.detail ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.detail}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-sm font-semibold text-primary">
                {typeof item.value === "number" ? formatCompactNumber(item.value) : item.value}
              </span>
            </div>
          ))
        ) : (
          <Empty
            title="No data yet"
            description="Employer-visible platform records will appear here."
            icon={FiBriefcase}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function EmployerDashboardView() {
  const [chartView, setChartView] = useState<ChartView>("bar");
  const {
    company,
    stats,
    projects,
    chartData,
    dashboard,
    isLoading,
    status,
  } = useEmployerPortalSummary();
  const topTalent = useMemo(
    () =>
      (Array.isArray(dashboard.topTalent) ? dashboard.topTalent : [])
        .map((student, index) => normalizeEmployerStudent(student, index))
        .filter((student): student is EmployerStudent => Boolean(student)),
    [dashboard.topTalent],
  );
  const trendingProjects = Array.isArray(dashboard.trendingProjects)
    ? dashboard.trendingProjects
        .map((project, index) => normalizeEmployerProject(project, index))
        .filter((project): project is EmployerProject => Boolean(project))
    : [];
  const topUniversities = Array.isArray(dashboard.topUniversities)
    ? dashboard.topUniversities
    : [];
  const topDepartments = Array.isArray(dashboard.topDepartments)
    ? dashboard.topDepartments
    : [];
  const topSkills = Array.isArray(dashboard.topSkills) ? dashboard.topSkills : [];
  const opportunitySummary =
    dashboard.opportunitySummary && typeof dashboard.opportunitySummary === "object"
      ? dashboard.opportunitySummary
      : {};

  if (isLoading) {
    return <EmployerPageSkeleton variant="dashboard" />;
  }

  if (status === "error") {
    return (
      <PageShell
        eyebrow="Employer Portal"
        title="Employer dashboard unavailable."
        description="CampusHub could not load the employer-visible university data."
      >
        <Empty
          title="Unable to load employer data"
          description="Check the employer dashboard API response and try again."
          icon={FiBriefcase}
        />
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Employer Portal" title={`${String(company?.companyName ?? "Employer")} recruiting dashboard.`} description="Track live talent, project engagement, opportunities, and hiring signals from every university that allows employer visibility.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {stats.map((stat, index) => (
          <MetricCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            trend={stat.trend}
            icon={employerDashboardMetricIcons[index] ?? FiBarChart2}
          />
        ))}
      </div>
      <Card>
        <CardHeader className="flex flex-row items-start gap-4">
          <ChartViewMenu value={chartView} onChange={setChartView} />
          <div className="space-y-1"><CardTitle>Recruitment Pipeline Trends</CardTitle><CardDescription>Candidates, project views, and opportunity engagement over time.</CardDescription></div>
        </CardHeader>
        <CardContent className="px-2 pb-5 pt-0 sm:px-4">
          <ResponsiveContainer width="100%" height={340} minWidth={0}><PipelineChart view={chartView} data={chartData} /></ResponsiveContainer>
        </CardContent>
      </Card>
      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <Card><CardHeader><CardTitle>Recommended Talent</CardTitle><CardDescription>High-fit students and alumni ranked by XP, projects, and profile activity.</CardDescription></CardHeader><CardContent>{topTalent.length ? <StaggerContainer className="grid gap-4 md:grid-cols-2">{topTalent.slice(0, 4).map((student) => <TalentCard key={student.id} student={student} />)}</StaggerContainer> : <Empty title="No employer-visible talent yet" description="Student and alumni profiles from opted-in universities will appear here." icon={FiUsers} />}</CardContent></Card>
        <SummaryRows
          title="Opportunity Pipeline"
          description="Employer opportunity activity across visible universities."
          items={[
            { label: "Published opportunities", value: Number(opportunitySummary.published ?? 0) },
            { label: "Pending approvals", value: Number(opportunitySummary.pending ?? 0) },
            { label: "Closed opportunities", value: Number(opportunitySummary.closed ?? 0) },
            { label: "Total opportunities", value: Number(opportunitySummary.total ?? 0) },
          ]}
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Leaderboard title="Top Innovators" items={topTalent.slice(0, 5).map((student) => ({ label: student.name, value: formatCompactNumber(Number(student.xp ?? 0)), detail: student.department, href: `/employer/candidates/${encodeURIComponent(String(student.id ?? ""))}` }))} />
        <Leaderboard title="Trending Projects" items={trendingProjects.slice(0, 5).map((project) => ({ label: project.name, value: formatCompactNumber(Number(project.views ?? 0)), detail: project.owner, href: `/employer/projects/${encodeURIComponent(String(project.id ?? ""))}` }))} />
        <SummaryRows
          title="Skills In Demand"
          description="Most common skills visible in the current talent pool."
          items={topSkills.map((skill) => ({ label: skill.label, value: skill.value }))}
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <SummaryRows
          title="University Coverage"
          description="Universities currently exposing talent and showcase data to employers."
          items={topUniversities.map((item) => ({
            label: item.label,
            value: item.value,
            detail: "visible records",
          }))}
        />
        <SummaryRows
          title="Department Coverage"
          description="Departments with the strongest visible talent and project signals."
          items={topDepartments.map((item) => ({
            label: item.label,
            value: item.value,
            detail: "visible records",
          }))}
        />
        <SummaryRows
          title="Recently Published"
          description="Latest public projects available to employers."
          items={projects.slice(0, 5).map((project) => ({
            label: project.name,
            value: `${formatCompactNumber(Number(project.stars ?? 0))} stars`,
            detail: `${project.owner} - ${project.university}`,
          }))}
        />
      </div>
    </PageShell>
  );
}

export function EmployerTalentDiscoveryView() {
  const [query, setQuery] = useState("");
  const [university, setUniversity] = useState(ALL_VALUE);
  const [department, setDepartment] = useState(ALL_VALUE);
  const [availability, setAvailability] = useState(ALL_VALUE);
  const [skill, setSkill] = useState(ALL_VALUE);
  const [savedCandidateIds, setSavedCandidateIds] = useState<Set<string>>(new Set());
  const { students, isLoading } = useEmployerPortalSummary();
  const studentsWithSavedState = useMemo(
    () =>
      students.map((student) => ({
        ...student,
        saved: Boolean(student.saved || savedCandidateIds.has(student.id)),
      })),
    [students, savedCandidateIds],
  );

  useEffect(() => {
    setSavedCandidateIds(new Set(students.filter((student) => student.saved).map((student) => student.id)));
  }, [students]);

  const filtered = studentsWithSavedState.filter((student) => {
    const haystack = `${student.name} ${student.university} ${student.college} ${student.department} ${student.skills.join(" ")} ${student.badges.join(" ")}`;
    return (
      (!query || haystack.toLowerCase().includes(query.toLowerCase())) &&
      (university === ALL_VALUE || student.university === university) &&
      (department === ALL_VALUE || student.department === department) &&
      (availability === ALL_VALUE || student.availability === availability) &&
      (skill === ALL_VALUE || student.skills.includes(skill))
    );
  });

  if (isLoading) {
    return <EmployerPageSkeleton variant="talent" />;
  }

  return (
    <PageShell eyebrow="Talent Discovery" title="Discover students through proof of work." description="Search talent by skills, badges, XP, projects, graduation year, leadership, and availability.">
      <Card className="bg-surface">
        <CardContent className="space-y-5 p-5">
          <SearchBox value={query} onChange={setQuery} placeholder="Search students, skills, badges, universities" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FilterSelect label="University" value={university} onChange={setUniversity} options={compareValues(studentsWithSavedState.map((s) => s.university))} />
            <FilterSelect label="Department" value={department} onChange={setDepartment} options={compareValues(studentsWithSavedState.map((s) => s.department))} />
            <FilterSelect label="Skill" value={skill} onChange={setSkill} options={compareValues(studentsWithSavedState.flatMap((s) => s.skills))} />
            <FilterSelect label="Availability" value={availability} onChange={setAvailability} options={compareValues(studentsWithSavedState.map((s) => s.availability))} />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {["Top Innovators", "Most Starred Projects", "Most Viewed Projects", "XP 3000+", "3+ Projects", "Graduating 2026"].map((item) => <StatusBadge key={item}>{item}</StatusBadge>)}
          </div>
        </CardContent>
      </Card>
      {filtered.length ? (
        <StaggerContainer className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((student) => (
            <TalentCard
              key={student.id}
              student={student}
              onSaved={(candidateId) =>
                setSavedCandidateIds((current) => new Set([...current, candidateId]))
              }
            />
          ))}
        </StaggerContainer>
      ) : (
        <Empty title="No Talent Matches" description="Adjust filters to find students that match your hiring priorities." />
      )}
    </PageShell>
  );
}

function normalizeTalentProfileResult(result: Record<string, unknown> | null | undefined) {
  if (!result || typeof result !== "object") return null;
  const user = (result.user && typeof result.user === "object" ? result.user : {}) as Record<string, unknown>;
  const profile = (result.profile && typeof result.profile === "object" ? result.profile : {}) as Record<string, unknown>;
  const achievements = (result.achievements && typeof result.achievements === "object" ? result.achievements : {}) as Record<string, unknown>;
  const name =
    [user.firstName, user.lastName].map((part) => (typeof part === "string" ? part.trim() : "")).filter(Boolean).join(" ") ||
    (typeof user.name === "string" ? user.name : "") ||
    "CampusHub candidate";
  const projects = Array.isArray(result.projects) ? result.projects : [];
  const badges = Array.isArray(result.badges) ? result.badges : [];

  return {
    student: normalizeEmployerStudent(
      {
        id: String(user.id ?? profile.userId ?? ""),
        name,
        photo: typeof user.avatar === "string" && user.avatar ? user.avatar : undefined,
        email: typeof user.email === "string" ? user.email : "",
        phone: typeof user.phone === "string" ? user.phone : "",
        university: typeof user.universityName === "string" && user.universityName ? user.universityName : "Not set",
        college: typeof user.collegeName === "string" && user.collegeName ? user.collegeName : "Not set",
        department: typeof user.departmentName === "string" && user.departmentName ? user.departmentName : "Not set",
        skills: Array.isArray(profile.skills) ? profile.skills.map(String) : [],
        badges: badges.map((badge) => {
          const item = badge as Record<string, unknown>;
          return String(item.name ?? item.category ?? "Badge");
        }),
        saved: Boolean(result.saved),
        xp: Number(achievements.totalXp ?? 0),
        availability: String(profile.availabilityStatus ?? "OPEN").replaceAll("_", " "),
        graduationYear: profile.graduationYear ? String(profile.graduationYear) : "Not set",
        bio:
          typeof profile.bio === "string" && profile.bio
            ? profile.bio
            : typeof user.bio === "string"
              ? user.bio
              : "No bio added yet.",
        projects: projects.length,
        profileCompletion: Number(profile.profileStrength ?? 0),
        tags: Array.isArray(profile.preferredWorkType) ? profile.preferredWorkType.map(String) : [],
      },
      0,
    ),
    profile,
    projects,
    badges,
    achievements,
  };
}

export function EmployerCandidateProfileView({ userId }: { userId: string }) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    setStatus("loading");
    fetch(`/api/talent-discovery/${userId}`, { credentials: "include" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error?.message ?? "Unable to load candidate.");
        return data?.data ?? data;
      })
      .then((data) => {
        if (!active) return;
        setPayload(data);
        const normalized = normalizeTalentProfileResult(data);
        if (normalized?.student?.saved) {
          setSavedIds(new Set([normalized.student.id]));
        }
        setStatus("success");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const normalized = normalizeTalentProfileResult(payload);
  const student = normalized?.student
    ? {
        ...normalized.student,
        saved: Boolean(normalized.student.saved || savedIds.has(normalized.student.id)),
      }
    : null;

  async function saveCandidate() {
    if (!student?.id) return;
    try {
      const response = await fetch("/api/talent-discovery/saved-candidates", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateUserId: student.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error?.message ?? "Unable to save candidate.");
      setSavedIds((current) => new Set([...current, student.id]));
      campusToast.success({ title: "Candidate saved", description: `${student.name} is now in your talent pool.` });
    } catch (error) {
      campusToast.error({ title: "Save failed", description: error instanceof Error ? error.message : "Please try again." });
    }
  }

  if (status === "loading") {
    return (
      <PageShell eyebrow="Candidate Profile" title="Loading candidate profile." description="Fetching live profile, projects, and recruiting signals.">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Skeleton className="h-[360px] rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
          </div>
        </div>
      </PageShell>
    );
  }

  if (!student) {
    return (
      <PageShell eyebrow="Candidate Profile" title="Candidate unavailable." description="This talent profile could not be loaded.">
        <Empty title="Candidate unavailable" description="Try opening this profile again from Talent Discovery." icon={FiUsers} />
      </PageShell>
    );
  }

  const projects = normalized?.projects ?? [];
  const badges = normalized?.badges ?? [];

  return (
    <PageShell eyebrow="Candidate Profile" title={student.name} description={`${student.department} - ${student.university}`}>
      <Card className="overflow-hidden">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-5">
            <Avatar label={student.photo} className="h-28 w-28 text-3xl" />
            <div>
              <h2 className="text-2xl font-semibold text-foreground">{student.name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{student.bio}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {student.skills.slice(0, 8).map((skill) => (
                <span key={skill} className="rounded-md bg-surface-muted px-2.5 py-1 text-xs text-muted-foreground">
                  {skill}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <StatPill label="XP" value={formatCompactNumber(student.xp)} />
              <StatPill label="Projects" value={String(student.projects)} />
              <StatPill label="Profile" value={`${student.profileCompletion}%`} />
            </div>
            <div className="grid gap-3">
              <Button type="button" disabled={student.saved} onClick={saveCandidate}>
                <FiBookmark className="h-4 w-4" aria-hidden="true" />
                {student.saved ? "Saved Candidate" : "Save Candidate"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setContactOpen(true)}>
                <FiMail className="h-4 w-4" aria-hidden="true" />
                Contact Candidate
              </Button>
            </div>
          </div>
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <InfoTile label="University" value={student.university} />
              <InfoTile label="College" value={student.college} />
              <InfoTile label="Department" value={student.department} />
              <InfoTile label="Graduation" value={student.graduationYear} />
              <InfoTile label="Email" value={student.email || "Not shared"} />
              <InfoTile label="Phone" value={student.phone || "Not shared"} />
            </div>
            <SummaryRows
              title="Published Projects"
              description="Recent work available for employer review."
              items={projects.slice(0, 5).map((project) => {
                const item = project as Record<string, unknown>;
                return {
                  label: String(item.title ?? item.name ?? "Untitled project"),
                  value: `${formatCompactNumber(Number(item.starCount ?? item.stars ?? 0))} stars`,
                  detail: String(item.category ?? "Project"),
                };
              })}
            />
            <SummaryRows
              title="Badges and Achievements"
              description="Verified signals earned on CampusHub."
              items={badges.slice(0, 6).map((badge) => {
                const item = badge as Record<string, unknown>;
                return {
                  label: String(item.name ?? "Badge"),
                  value: String(item.category ?? "Achievement"),
                  detail: String(item.earnedAt ?? ""),
                };
              })}
            />
          </div>
        </CardContent>
      </Card>
      <CandidateContactModal student={student} open={contactOpen} onOpenChange={setContactOpen} />
    </PageShell>
  );
}

function useSavedEmployerCandidates() {
  const [candidates, setCandidates] = useState<EmployerStudent[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    let active = true;
    setStatus("loading");
    fetch("/api/talent-discovery/saved-candidates?limit=100", {
      credentials: "include",
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error?.message ?? "Unable to load saved candidates.");
        }
        return payload?.data ?? payload;
      })
      .then((payload) => {
        if (!active) return;
        const saved = Array.isArray(payload?.candidates) ? payload.candidates : [];
        setCandidates(
          saved
            .map((item, index) => {
              const candidate = item as Record<string, unknown>;
              const user = (candidate.user && typeof candidate.user === "object" ? candidate.user : {}) as Record<string, unknown>;
              const profile = (candidate.profile && typeof candidate.profile === "object" ? candidate.profile : {}) as Record<string, unknown>;
              const achievements = (candidate.achievements && typeof candidate.achievements === "object" ? candidate.achievements : {}) as Record<string, unknown>;
              const projects = Array.isArray(candidate.projects) ? candidate.projects : [];
              const badges = Array.isArray(candidate.badges) ? candidate.badges : [];
              const name =
                [user.firstName, user.lastName].map((part) => (typeof part === "string" ? part.trim() : "")).filter(Boolean).join(" ") ||
                (typeof user.name === "string" ? user.name : "") ||
                `Saved candidate ${index + 1}`;

              return normalizeEmployerStudent(
                {
                  id: String(user.id ?? profile.userId ?? ""),
                  name,
                  photo: typeof user.avatar === "string" ? user.avatar : undefined,
                  email: typeof user.email === "string" ? user.email : "",
                  phone: typeof user.phone === "string" ? user.phone : "",
                  university: typeof user.universityName === "string" && user.universityName ? user.universityName : "Not set",
                  college: typeof user.collegeName === "string" && user.collegeName ? user.collegeName : "Not set",
                  department: typeof user.departmentName === "string" && user.departmentName ? user.departmentName : "Not set",
                  skills: Array.isArray(profile.skills) ? profile.skills.map(String) : [],
                  badges: badges.map((badge) => String((badge as Record<string, unknown>).name ?? "Badge")),
                  saved: true,
                  xp: Number(achievements.totalXp ?? 0),
                  shortlist: "Saved",
                  availability: String(profile.availabilityStatus ?? "OPEN").replaceAll("_", " "),
                  graduationYear: profile.graduationYear ? String(profile.graduationYear) : "Not set",
                  bio: typeof profile.bio === "string" ? profile.bio : "No bio added yet.",
                  projects: projects.length,
                  profileCompletion: Number(profile.profileStrength ?? 0),
                  tags: Array.isArray(profile.preferredWorkType) ? profile.preferredWorkType.map(String) : [],
                  notes: typeof candidate.notes === "string" ? candidate.notes : "",
                },
                index,
              );
            })
            .filter((candidate): candidate is EmployerStudent => Boolean(candidate)),
        );
        setStatus("success");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  return { candidates, isLoading: status === "loading" };
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-medium text-foreground">{value}</p>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
    </div>
  );
}

function CompanyFact({
  icon: Icon,
  label,
  value,
}: {
  icon: IconType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border/70 bg-background px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <span className="mt-1 block truncate text-sm font-semibold text-foreground">
          {value}
        </span>
      </span>
    </div>
  );
}

function normalizeEmployerStudent(
  student: Partial<EmployerStudent> | null | undefined,
  index: number,
): EmployerStudent | null {
  if (!student || typeof student !== "object") {
    return null;
  }

  const name =
    typeof student.name === "string" && student.name.trim()
      ? student.name
      : `Talent profile ${index + 1}`;

  return {
    ...student,
    id: typeof student.id === "string" && student.id.trim() ? student.id : `student-${index}`,
    name,
    photo:
      typeof student.photo === "string" && student.photo.trim()
        ? student.photo
        : name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("") || "CH",
    email:
      typeof student.email === "string" && student.email.trim()
        ? student.email
        : "",
    phone:
      typeof student.phone === "string" && student.phone.trim()
        ? student.phone
        : "",
    university:
      typeof student.university === "string" && student.university.trim()
        ? student.university
        : "Not set",
    college:
      typeof student.college === "string" && student.college.trim()
        ? student.college
        : "Not set",
    department:
      typeof student.department === "string" && student.department.trim()
        ? student.department
        : "Not set",
    skills: Array.isArray(student.skills) ? student.skills.filter(Boolean) : [],
    badges: Array.isArray(student.badges) ? student.badges.filter(Boolean) : [],
    saved: Boolean(student.saved),
    xp: Number.isFinite(Number(student.xp)) ? Number(student.xp) : 0,
    shortlist:
      typeof student.shortlist === "string" && student.shortlist.trim()
        ? student.shortlist
        : null,
    availability:
      typeof student.availability === "string" && student.availability.trim()
        ? student.availability
        : "Available",
    graduationYear:
      typeof student.graduationYear === "string" && student.graduationYear.trim()
        ? student.graduationYear
        : "Not set",
    bio:
      typeof student.bio === "string" && student.bio.trim()
        ? student.bio
        : "No bio added yet.",
    projects: Number.isFinite(Number(student.projects)) ? Number(student.projects) : 0,
    profileCompletion: Number.isFinite(Number(student.profileCompletion))
      ? Number(student.profileCompletion)
      : 0,
    activity:
      typeof student.activity === "string" && student.activity.trim()
        ? student.activity
        : "No recent activity yet",
    tags: Array.isArray(student.tags) ? student.tags.filter(Boolean) : [],
    notes:
      typeof student.notes === "string" && student.notes.trim()
        ? student.notes
        : "",
  } as EmployerStudent;
}

function normalizeEmployerProject(project: Partial<EmployerProject> | null | undefined, index: number): EmployerProject | null {
  if (!project || typeof project !== "object") {
    return null;
  }

  const image = typeof project.image === "string" && project.image.trim() ? project.image : "/logo.png";
  const name =
    typeof project.name === "string" && project.name.trim()
      ? project.name
      : `Untitled project ${index + 1}`;
  const views = Number.isFinite(Number(project.views)) ? Number(project.views) : 0;
  const stars = Number.isFinite(Number(project.stars)) ? Number(project.stars) : 0;
  const galleryImages =
    Array.isArray(project.galleryImages) && project.galleryImages.filter(Boolean).length
      ? project.galleryImages.filter(Boolean)
      : [image, image, image];

  return {
    ...project,
    id: typeof project.id === "string" && project.id.trim() ? project.id : `project-${index}`,
    name,
    owner: typeof project.owner === "string" && project.owner.trim() ? project.owner : "Unknown creator",
    university:
      typeof project.university === "string" && project.university.trim()
        ? project.university
        : "Not set",
    department:
      typeof project.department === "string" && project.department.trim()
        ? project.department
        : "Not set",
    category:
      typeof project.category === "string" && project.category.trim()
        ? project.category
        : "General",
    projectType:
      typeof project.projectType === "string" && project.projectType.trim()
        ? project.projectType
        : "Project",
    summary:
      typeof project.summary === "string" && project.summary.trim()
        ? project.summary
        : "No project summary has been added yet.",
    image,
    galleryImages,
    views,
    stars,
    documents: Array.isArray(project.documents) ? project.documents.filter(Boolean) : [],
    links: Array.isArray(project.links) ? project.links.filter(Boolean) : [],
    team: Array.isArray(project.team) && project.team.length ? project.team.filter(Boolean) : ["Unknown creator"],
    gallery: Array.isArray(project.gallery) ? project.gallery.filter(Boolean) : [],
    achievements: Array.isArray(project.achievements) ? project.achievements.filter(Boolean) : [],
    analytics: {
      uniqueVisitors: Number.isFinite(Number(project.analytics?.uniqueVisitors))
        ? Number(project.analytics?.uniqueVisitors)
        : views,
      githubClicks: Number.isFinite(Number(project.analytics?.githubClicks))
        ? Number(project.analytics?.githubClicks)
        : 0,
      videoClicks: Number.isFinite(Number(project.analytics?.videoClicks))
        ? Number(project.analytics?.videoClicks)
        : 0,
      linkClicks: Number.isFinite(Number(project.analytics?.linkClicks))
        ? Number(project.analytics?.linkClicks)
        : 0,
    },
  } as EmployerProject;
}

export function EmployerShowcaseView() {
  return <_LegacyEmployerShowcaseView />;
}

function _LegacyEmployerShowcaseView() {
  const [project, setProject] = useState<EmployerProject | null>(null);
  const [activeTab, setActiveTab] = useState("All");
  const { students, projects, isLoading } = useEmployerPortalSummary();
  const safeProjects = useMemo(
    () =>
      (Array.isArray(projects) ? projects : [])
        .map((item, index) => normalizeEmployerProject(item, index))
        .filter((item): item is EmployerProject => Boolean(item)),
    [projects],
  );
  const featuredProject = useMemo(
    () =>
      safeProjects.length
        ? safeProjects.slice().sort((a, b) => b.views - a.views || b.stars - a.stars)[0]
        : null,
    [safeProjects],
  );
  const topCreators = students.slice().sort((a, b) => b.projects - a.projects).slice(0, 4);
  const tabs = [
    "All",
    "Trending",
    "Most Starred",
    "Featured Innovations",
    "Research",
    "Entrepreneurship",
  ];
  const visibleProjects = useMemo(() => {
    const allProjects = [...safeProjects];

    if (activeTab === "Trending") {
      return allProjects.sort((a, b) => b.views - a.views);
    }

    if (activeTab === "Most Starred") {
      return allProjects.sort((a, b) => b.stars - a.stars);
    }

    if (activeTab === "Featured Innovations") {
      return allProjects.filter((item) => item.projectType === "Featured Innovation");
    }

    if (activeTab === "Research") {
      return allProjects.filter((item) => item.projectType === "Research");
    }

    if (activeTab === "Entrepreneurship") {
      return allProjects.filter((item) => item.projectType === "Entrepreneurship");
    }

    return allProjects;
  }, [activeTab, safeProjects]);

  if (isLoading) {
    return <EmployerPageSkeleton variant="showcase" />;
  }

  if (!featuredProject) {
    return (
      <PageShell eyebrow="Showcase" title="Discover innovations before they become resumes." description="Explore student projects from universities that allow employer visibility.">
        <Empty title="No employer-visible projects yet" description="Published showcase projects from opted-in universities will appear here." icon={FiStar} />
      </PageShell>
    );
  }

  const featuredName = featuredProject?.name ?? "Featured project";
  const featuredImage = featuredProject?.image ?? "/logo.png";
  return (
    <PageShell eyebrow="Showcase" title="Discover innovations before they become resumes." description="Explore student projects through visuals, proof of work, creator signals, documents, and engagement metrics.">
      <section className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <Card className="overflow-hidden">
          <div className="grid lg:grid-cols-[minmax(260px,.75fr)_1fr]">
            <button
              className="group block border-b border-border bg-surface-muted p-5 text-left lg:border-b-0 lg:border-r"
              type="button"
              onClick={() => setProject(featuredProject)}
            >
              <ProjectImage
                alt={`${featuredName} featured preview`}
                className="aspect-[4/3] rounded-lg border border-border bg-background [&_img]:object-contain [&_img]:p-8"
                src={featuredImage}
              />
            </button>
            <div className="flex flex-col justify-between gap-8 p-6 lg:p-7">
              <div className="max-w-2xl">
                <StatusBadge>{featuredProject?.projectType ?? "Project"}</StatusBadge>
                <h2 className="mt-4 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                  {featuredName}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {featuredProject?.owner ?? "Unknown creator"} - {featuredProject?.department ?? "Not set"}
                </p>
                <p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground">
                  {featuredProject?.summary ?? "No project summary has been added yet."}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{formatCompactNumber(Number(featuredProject?.views ?? 0))} views</span>
                  <span>{formatCompactNumber(Number(featuredProject?.stars ?? 0))} stars</span>
                </div>
                <Button type="button" onClick={() => setProject(featuredProject)}>
                  <FiEye className="h-4 w-4" />
                  View Project
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Top Creators</CardTitle>
              <CardDescription>Students generating strong employer signals.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topCreators.map((student) => (
                <Link
                  key={student.id}
                  className="flex items-center gap-3 rounded-lg bg-background p-3 transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  href={`/employer/candidates/${encodeURIComponent(String(student.id ?? ""))}`}
                >
                  <Avatar label={student.photo} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{student.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {student.department} - {student.projects} projects
                    </p>
                  </div>
                  <StatusBadge>{formatCompactNumber(student.xp)} XP</StatusBadge>
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Showcase Signals</CardTitle>
              <CardDescription>Visual project discovery for recruiting.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {[
                ["Projects", safeProjects.length.toString()],
                ["Views", formatCompactNumber(safeProjects.reduce((sum, item) => sum + item.views, 0))],
                ["Stars", formatCompactNumber(safeProjects.reduce((sum, item) => sum + item.stars, 0))],
                ["Docs", formatCompactNumber(safeProjects.reduce((sum, item) => sum + item.documents.length, 0))],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-background p-3">
                  <p className="text-lg font-semibold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

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

      <div className="grid gap-5 xl:grid-cols-3">
        {[
          ["Most Viewed", safeProjects.slice().sort((a, b) => b.views - a.views).slice(0, 3)],
          ["Most Starred", safeProjects.slice().sort((a, b) => b.stars - a.stars).slice(0, 3)],
          ["Recently Featured", safeProjects.filter((item) => item.projectType === "Featured Innovation").slice(0, 3)],
        ].map(([title, projectList]) => (
          <Card key={title as string}>
            <CardHeader>
              <CardTitle>{title as string}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(projectList as EmployerProject[]).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="group flex w-full gap-3 rounded-lg bg-background p-3 text-left transition hover:bg-primary/5"
                  onClick={() => setProject(item)}
                >
                  <ProjectImage
                    alt={`${item.name} thumbnail`}
                    className="h-16 w-24 shrink-0 rounded-md border border-border"
                    src={item.image}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{item.name}</span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {item.owner} - {formatCompactNumber(item.views)} views
                    </span>
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {visibleProjects.length ? (
        <StaggerContainer className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleProjects.map((item) => (
            <ProjectCard key={item.id} project={item} onView={setProject} />
          ))}
        </StaggerContainer>
      ) : (
        <Empty title="No Showcase Projects" description="Try another project segment." icon={FiStar} />
      )}
      <ProjectDetailsModal project={project} onClose={() => setProject(null)} />
    </PageShell>
  );
}

export function EmployerSavedCandidatesView() {
  const { candidates: saved, isLoading } = useSavedEmployerCandidates();
  const [activeTab, setActiveTab] = useState<"saved" | "compare">("saved");
  const [savedQuery, setSavedQuery] = useState("");
  const [savedShortlist, setSavedShortlist] = useState(ALL_VALUE);
  const [savedPage, setSavedPage] = useState(1);
  const [compareQuery, setCompareQuery] = useState("");
  const [compareShortlist, setCompareShortlist] = useState(ALL_VALUE);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>(() =>
    saved.slice(0, 2).map((student) => student.id),
  );
  const pageSize = 8;
  const shortlistOptions = compareValues(
    saved
      .map((student) => student.shortlist)
      .filter((shortlist): shortlist is string => Boolean(shortlist)),
  );
  const filteredSaved = saved.filter((student) => {
    const haystack = `${student.name} ${student.department} ${student.shortlist ?? ""} ${student.skills.join(" ")} ${(student.tags ?? []).join(" ")} ${student.notes ?? ""}`;

    return (
      (!savedQuery || haystack.toLowerCase().includes(savedQuery.toLowerCase())) &&
      (savedShortlist === ALL_VALUE || student.shortlist === savedShortlist)
    );
  });
  const totalSavedPages = Math.max(1, Math.ceil(filteredSaved.length / pageSize));
  const currentSavedPage = Math.min(savedPage, totalSavedPages);
  const pagedSaved = filteredSaved.slice(
    (currentSavedPage - 1) * pageSize,
    currentSavedPage * pageSize,
  );
  const columns = useMemo<ColumnDef<EmployerStudent>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Candidate",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar label={row.original.photo} />
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{row.original.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {row.original.availability} - {row.original.graduationYear}
              </p>
            </div>
          </div>
        ),
      },
      { accessorKey: "department", header: "Department" },
      { accessorKey: "xp", header: "XP", cell: ({ row }) => formatCompactNumber(row.original.xp) },
      { accessorKey: "projects", header: "Projects" },
      { accessorKey: "shortlist", header: "Shortlist" },
      {
        accessorKey: "skills",
        header: "Skills",
        cell: ({ row }) => (
          <div className="flex min-w-[220px] flex-wrap gap-1.5">
            {row.original.skills.slice(0, 3).map((skill) => (
              <span key={skill} className="rounded-md bg-surface-muted px-2 py-1 text-xs text-muted-foreground">
                {skill}
              </span>
            ))}
          </div>
        ),
      },
      {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => (
          <p className="line-clamp-2 min-w-[280px] text-sm text-muted-foreground">
            {row.original.notes ?? "No notes yet"}
          </p>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const selected = selectedCandidateIds.includes(row.original.id);

          return (
            <Button
              type="button"
              variant={selected ? "default" : "secondary"}
              onClick={() => {
                toggleCandidate(row.original.id);
                setActiveTab("compare");
              }}
            >
              {selected ? "Selected" : "Compare"}
            </Button>
          );
        },
      },
    ],
    [selectedCandidateIds],
  );
  const table = useReactTable({ data: pagedSaved, columns, getCoreRowModel: getCoreRowModel() });
  const selectedCandidates = saved.filter((student) =>
    selectedCandidateIds.includes(student.id),
  );
  const filteredCandidates = saved.filter((student) => {
    const haystack = `${student.name} ${student.department} ${student.shortlist ?? ""} ${student.skills.join(" ")} ${(student.tags ?? []).join(" ")}`;

    return (
      (!compareQuery || haystack.toLowerCase().includes(compareQuery.toLowerCase())) &&
      (compareShortlist === ALL_VALUE || student.shortlist === compareShortlist)
    );
  });
  const comparisonRows: [string, (student: EmployerStudent) => string][] = [
    ["Shortlist", (student) => student.shortlist ?? "Unassigned"],
    ["Availability", (student) => student.availability],
    ["Graduation", (student) => String(student.graduationYear)],
    ["Skills", (student) => student.skills.slice(0, 4).join(", ")],
    ["Badges", (student) => student.badges.slice(0, 3).join(", ")],
    ["Notes", (student) => student.notes ?? "No notes yet"],
  ];

  function toggleCandidate(candidateId: string) {
    setSelectedCandidateIds((current) =>
      current.includes(candidateId)
        ? current.filter((id) => id !== candidateId)
        : [...current, candidateId],
    );
  }

  useEffect(() => {
    if (!selectedCandidateIds.length && saved.length) {
      setSelectedCandidateIds(saved.slice(0, 2).map((student) => student.id));
    }
  }, [saved, selectedCandidateIds.length]);

  if (isLoading) {
    return <EmployerPageSkeleton variant="talent" />;
  }

  return (
    <PageShell eyebrow="Talent Pool" title="Manage saved talent and shortlists." description="Review bookmarked candidates, shortlist notes, and comparison workflows from one recruiting workspace.">
      <div
        aria-label="Saved candidate sections"
        className="grid w-full grid-cols-2 rounded-lg border border-border bg-background p-1 sm:inline-grid sm:w-fit"
        role="tablist"
      >
        {[
          ["saved", "Saved"],
          ["compare", "Compare"],
        ].map(([key, label]) => (
          <button
            aria-selected={activeTab === key}
            className={cn(
              "rounded-md px-5 py-2 text-center text-sm font-medium text-muted-foreground transition",
              activeTab === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "hover:bg-surface-muted hover:text-foreground",
            )}
            key={key}
            role="tab"
            type="button"
            onClick={() => setActiveTab(key as "saved" | "compare")}
          >
            {label}
          </button>
        ))}
      </div>

      {!saved.length ? (
        <Empty title="No Saved Candidates" description="Save candidates from Talent Discovery to compare them here." icon={FiBookmark} />
      ) : activeTab === "saved" ? (
        <Card>
          <CardHeader>
            <CardTitle>Talent Pool Directory</CardTitle>
            <CardDescription>Search, filter, page through, and send candidates into comparison.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_280px] lg:items-end">
              <SearchBox
                value={savedQuery}
                onChange={(value) => {
                  setSavedQuery(value);
                  setSavedPage(1);
                }}
                placeholder="Search candidates, skills, notes"
              />
              <FilterSelect
                label="Shortlist"
                value={savedShortlist}
                onChange={(value) => {
                  setSavedShortlist(value);
                  setSavedPage(1);
                }}
                options={shortlistOptions}
              />
            </div>

            {pagedSaved.length ? (
              <div className="grid gap-3 lg:hidden">
                {pagedSaved.map((student) => {
                  const selected = selectedCandidateIds.includes(student.id);

                  return (
                    <div key={student.id} className="rounded-lg border border-border bg-background p-4">
                      <div className="flex items-start gap-3">
                        <Avatar label={student.photo} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{student.name}</p>
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {student.department} - {student.shortlist ?? "Unassigned"}
                          </p>
                        </div>
                        <Button
                          className="shrink-0"
                          type="button"
                          variant={selected ? "default" : "secondary"}
                          onClick={() => {
                            toggleCandidate(student.id);
                            setActiveTab("compare");
                          }}
                        >
                          {selected ? "Selected" : "Compare"}
                        </Button>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3 text-center text-sm">
                        <div><p className="font-semibold">{formatCompactNumber(student.xp)}</p><p className="text-xs text-muted-foreground">XP</p></div>
                        <div><p className="font-semibold">{student.projects}</p><p className="text-xs text-muted-foreground">Projects</p></div>
                        <div><p className="font-semibold">{student.profileCompletion}%</p><p className="text-xs text-muted-foreground">Profile</p></div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {student.skills.slice(0, 3).map((skill) => (
                          <span key={skill} className="rounded-md bg-surface-muted px-2 py-1 text-xs text-muted-foreground">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty title="No Matching Candidates" description="Adjust search or shortlist filters to find saved talent." icon={FiSearch} />
            )}

            <div className={cn("hidden max-h-[620px] overflow-auto rounded-lg border border-border lg:block", !pagedSaved.length && "lg:hidden")}>
              <table className="w-full min-w-[1180px] text-sm">
                <thead className="sticky top-0 z-10 bg-surface-muted text-muted-foreground">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="px-4 py-3 text-left font-medium">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-t border-border hover:bg-primary/5">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 align-top">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                {filteredSaved.length
                  ? `Showing ${(currentSavedPage - 1) * pageSize + 1}-${Math.min(currentSavedPage * pageSize, filteredSaved.length)} of ${filteredSaved.length}`
                  : "No candidates match the current filters"}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSavedPage((page) => Math.max(1, page - 1))}
                  disabled={currentSavedPage === 1}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSavedPage((page) => Math.min(totalSavedPages, page + 1))}
                  disabled={currentSavedPage === totalSavedPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[440px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Candidate Picker</CardTitle>
              <CardDescription>Search and filter saved candidates without browsing cards.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SearchBox
                value={compareQuery}
                onChange={setCompareQuery}
                placeholder="Search name, skills, shortlist"
              />
              <FilterSelect
                label="Shortlist"
                value={compareShortlist}
                onChange={setCompareShortlist}
                options={shortlistOptions}
              />
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{filteredCandidates.length} matching</span>
                  <span>{selectedCandidates.length} selected</span>
                </div>
                <div className="flex max-h-20 flex-wrap gap-2 overflow-y-auto">
                  {selectedCandidates.length ? selectedCandidates.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                      onClick={() => toggleCandidate(student.id)}
                    >
                      {student.name}
                      <span aria-hidden="true">×</span>
                    </button>
                  )) : (
                    <span className="text-sm text-muted-foreground">No candidates selected.</span>
                  )}
                </div>
              </div>
              <div className="max-h-[520px] overflow-auto rounded-lg border border-border">
                <table className="w-full min-w-[390px] text-sm">
                  <thead className="sticky top-0 z-10 bg-surface-muted text-muted-foreground">
                    <tr>
                      <th className="w-10 px-3 py-3 text-left font-medium">Pick</th>
                      <th className="px-3 py-3 text-left font-medium">Candidate</th>
                      <th className="px-3 py-3 text-right font-medium">XP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.map((student) => {
                      const selected = selectedCandidateIds.includes(student.id);

                      return (
                        <tr
                          key={student.id}
                          className={cn("border-t border-border hover:bg-primary/5", selected && "bg-primary/5")}
                        >
                          <td className="px-3 py-3">
                            <button
                              aria-label={`${selected ? "Remove" : "Add"} ${student.name}`}
                              type="button"
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground",
                                selected && "border-primary bg-primary text-primary-foreground",
                              )}
                              onClick={() => toggleCandidate(student.id)}
                            >
                              {selected ? <FiCheckCircle className="h-4 w-4" /> : <FiPlus className="h-4 w-4" />}
                            </button>
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-medium">{student.name}</p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {student.shortlist} - {student.projects} projects
                            </p>
                          </td>
                          <td className="px-3 py-3 text-right font-semibold">
                            {formatCompactNumber(student.xp)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Candidate Comparison</CardTitle>
              <CardDescription>
                Compare selected candidates by skills, project output, XP, badges, and shortlist notes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {selectedCandidates.length ? (
                <>
                  <div className={cn(
                    "grid gap-4",
                    selectedCandidates.length === 1
                      ? "lg:grid-cols-1"
                      : selectedCandidates.length === 2
                        ? "lg:grid-cols-2"
                        : "lg:grid-cols-2 xl:grid-cols-3",
                  )}>
                    {selectedCandidates.map((student) => (
                      <div key={student.id} className="rounded-lg border border-border bg-background p-4">
                        <div className="flex items-start gap-3">
                          <Avatar label={student.photo} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">{student.name}</p>
                            <p className="truncate text-sm text-muted-foreground">{student.department}</p>
                          </div>
                          <StatusBadge>{student.availability}</StatusBadge>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3 text-center text-sm">
                          <div><p className="font-semibold">{formatCompactNumber(student.xp)}</p><p className="text-xs text-muted-foreground">XP</p></div>
                          <div><p className="font-semibold">{student.projects}</p><p className="text-xs text-muted-foreground">Projects</p></div>
                          <div><p className="font-semibold">{student.profileCompletion}%</p><p className="text-xs text-muted-foreground">Profile</p></div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {student.skills.slice(0, 4).map((skill) => (
                            <span key={skill} className="rounded-md bg-surface-muted px-2.5 py-1 text-xs text-muted-foreground">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedCandidates.length === 2 ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {selectedCandidates.map((student) => (
                        <div key={`${student.id}-profile`} className="rounded-lg border border-border bg-background p-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold">{student.name}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{student.shortlist}</p>
                            </div>
                            <StatusBadge>{student.graduationYear}</StatusBadge>
                          </div>
                          <p className="mt-4 text-sm leading-6 text-muted-foreground">{student.notes}</p>
                          <div className="mt-4 grid gap-3">
                            {student.badges.slice(0, 3).map((badge) => (
                              <div key={badge} className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-sm">
                                <span>{badge}</span>
                                <FiStar className="h-4 w-4 text-primary" />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-surface-muted text-muted-foreground">
                        <tr>
                          <th className="w-40 px-4 py-3 text-left font-medium">Signal</th>
                          {selectedCandidates.map((student) => (
                            <th key={student.id} className="px-4 py-3 text-left font-medium">
                              {student.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonRows.map(([label, getValue]) => (
                          <tr key={label} className="border-t border-border">
                            <td className="px-4 py-3 font-medium text-muted-foreground">{label}</td>
                            {selectedCandidates.map((student) => (
                              <td key={student.id} className="px-4 py-3 align-top">
                                {getValue(student)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <Empty title="No Candidates Selected" description="Choose candidates from the left pane to build a comparison." icon={FiUsers} />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}

export function EmployerOpportunitiesView() {
  const [tab, setTab] = useState("Jobs");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<EmployerOpportunity | null>(null);
  const [opportunities, setOpportunities] = useState(employerOpportunities);
  const filtered = opportunities.filter((opportunity) => {
    if (tab === "Jobs") return opportunity.type === "Job";
    if (tab === "Internships") return opportunity.type === "Internship";
    if (tab === "Graduate Programs") return opportunity.type === "Graduate Program";
    if (tab === "Scholarships") return opportunity.type === "Scholarship";
    if (tab === "Competitions") return opportunity.type === "Competition";
    return opportunity.type === "Hackathon";
  });

  function createOpportunity(values: OpportunityFormValues) {
    setOpportunities((current) => [{
      id: `opp-${Date.now()}`,
      title: values.title,
      type: values.type as EmployerOpportunity["type"],
      location: values.location,
      applicants: 0,
      status: "Open",
      deadline: values.deadline || "TBD",
      skills: values.requirements.split("\n").filter(Boolean).slice(0, 4),
      description: values.description,
      requirements: values.requirements.split("\n").filter(Boolean),
      benefits: ["Employer mentorship", "Portfolio feedback"],
      targetAudience: values.departments,
      applicationProcess: "Students submit profiles and project links through CampusHub.",
      visibility: values.visibility as EmployerOpportunity["visibility"],
      duration: values.duration,
    }, ...current]);
    setCreateOpen(false);
    campusToast.success({ title: "Opportunity Created", description: `${values.title} is now visible in the employer portal UI.` });
  }

  return (
    <PageShell eyebrow="Opportunities" title="Create and manage talent pathways." description="Publish jobs, internships, graduate programs, scholarships, competitions, and hackathons." actions={<Button type="button" onClick={() => setCreateOpen(true)}><FiPlus className="h-4 w-4" />Create Opportunity</Button>}>
      <div className="overflow-x-auto">
        <div
          aria-label="Opportunity categories"
          className="inline-flex min-w-max rounded-lg border border-border bg-background p-1"
          role="tablist"
        >
          {opportunityTabs.map((item) => (
            <button
              aria-selected={tab === item}
              className={cn(
                "rounded-md px-4 py-2.5 text-sm font-medium text-muted-foreground transition sm:px-5",
                tab === item
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "hover:bg-surface-muted hover:text-foreground",
              )}
              key={item}
              role="tab"
              type="button"
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {filtered.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} onView={setSelected} />)}</div> : <Empty title="No Opportunities" description={`No ${tab.toLowerCase()} are active yet.`} icon={FiBriefcase} />}
      <OpportunityModal open={createOpen} onOpenChange={setCreateOpen} onCreate={createOpportunity} />
      <OpportunityDetailsModal opportunity={selected} onClose={() => setSelected(null)} />
    </PageShell>
  );
}

export function EmployerAnalyticsView() {
  const {
    students,
    projects,
    chartData,
    dashboard,
    universities,
    savedCandidatesCount,
    applicationsCount,
    isLoading,
    status,
  } = useEmployerPortalSummary();
  const safeProjects = useMemo(
    () =>
      (Array.isArray(projects) ? projects : [])
        .map((item, index) => normalizeEmployerProject(item, index))
        .filter((item): item is EmployerProject => Boolean(item)),
    [projects],
  );
  const topTalent = useMemo(
    () =>
      students
        .slice()
        .sort((a, b) => b.xp - a.xp || b.projects - a.projects)
        .slice(0, 5),
    [students],
  );
  const topUniversities = Array.isArray(dashboard.topUniversities)
    ? dashboard.topUniversities
    : [];
  const topDepartments = Array.isArray(dashboard.topDepartments)
    ? dashboard.topDepartments
    : [];
  const topSkills = Array.isArray(dashboard.topSkills) ? dashboard.topSkills : [];
  const opportunitySummary =
    dashboard.opportunitySummary && typeof dashboard.opportunitySummary === "object"
      ? dashboard.opportunitySummary
      : {};
  const totalViews = safeProjects.reduce((sum, project) => sum + Number(project.views ?? 0), 0);
  const totalStars = safeProjects.reduce((sum, project) => sum + Number(project.stars ?? 0), 0);
  const totalDocuments = safeProjects.reduce(
    (sum, project) => sum + (Array.isArray(project.documents) ? project.documents.length : 0),
    0,
  );
  const totalOpportunities = Number(opportunitySummary.total ?? 0);
  const trendData = chartData.map((item) => ({
    label: item.label,
    profile: Number(item.candidates ?? 0),
    opportunity: Number(item.opportunities ?? 0),
    project: Number(item.projects ?? 0),
  }));
  const universityChartData = topUniversities.map((item) => ({
    label: String(item.label ?? "Unknown"),
    value: Number(item.value ?? 0),
  }));
  const departmentChartData = topDepartments.map((item) => ({
    label: String(item.label ?? "Unknown"),
    value: Number(item.value ?? 0),
  }));
  const projectEngagement = safeProjects
    .slice()
    .sort((a, b) => b.views + b.stars - (a.views + a.stars))
    .slice(0, 5);

  if (isLoading) {
    return <EmployerPageSkeleton variant="analytics" />;
  }

  if (status === "error") {
    return (
      <PageShell
        eyebrow="Analytics"
        title="Employer analytics unavailable."
        description="CampusHub could not load employer-visible analytics."
      >
        <Empty
          title="Unable to load employer analytics"
          description="Check the employer analytics data source and try again."
          icon={FiBarChart2}
        />
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Analytics" title="Employer intelligence center." description="Measure employer-visible university reach, talent quality, showcase engagement, opportunity flow, and skill demand.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        {[
          {
            label: "Visible Universities",
            value: formatCompactNumber(universities.length),
            trend: "opted-in",
            icon: FiGlobe,
          },
          {
            label: "Talent Profiles",
            value: formatCompactNumber(students.length),
            trend: "live",
            icon: FiUsers,
          },
          {
            label: "Project Views",
            value: formatCompactNumber(totalViews),
            trend: "showcase",
            icon: FiEye,
          },
          {
            label: "Project Stars",
            value: formatCompactNumber(totalStars),
            trend: "interest",
            icon: FiStar,
          },
          {
            label: "Applications",
            value: formatCompactNumber(applicationsCount),
            trend: "pipeline",
            icon: FiBriefcase,
          },
          {
            label: "Saved Candidates",
            value: formatCompactNumber(savedCandidatesCount),
            trend: "shortlist",
            icon: FiBookmark,
          },
        ].map((item) => (
          <MetricCard
            key={item.label}
            label={item.label}
            value={item.value}
            trend={item.trend}
            icon={item.icon}
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recruiting Signal Trend</CardTitle>
            <CardDescription>
              Talent profiles, published projects, and opportunity records across the visible university network.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 pb-5 pt-0 sm:px-4">
            <ResponsiveContainer width="100%" height={360} minWidth={0}>
              <AnalyticsChart data={trendData} />
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <SummaryRows
          title="Opportunity Health"
          description="Current opportunity lifecycle visible to the employer workspace."
          items={[
            { label: "Published", value: Number(opportunitySummary.published ?? 0) },
            { label: "Pending approval", value: Number(opportunitySummary.pending ?? 0) },
            { label: "Closed", value: Number(opportunitySummary.closed ?? 0) },
            { label: "Total opportunities", value: totalOpportunities },
            { label: "Project documents", value: totalDocuments },
          ]}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>University Reach</CardTitle>
            <CardDescription>
              Employer-visible activity grouped by university.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {universityChartData.length ? (
              <ResponsiveContainer width="100%" height={300} minWidth={0}>
                <RankingBarChart data={universityChartData} />
              </ResponsiveContainer>
            ) : (
              <Empty
                title="No university reach yet"
                description="Universities that allow employer visibility will appear here."
                icon={FiGlobe}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Department Demand Map</CardTitle>
            <CardDescription>
              Talent and project concentration by department.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {departmentChartData.length ? (
              <ResponsiveContainer width="100%" height={300} minWidth={0}>
                <RankingBarChart data={departmentChartData} />
              </ResponsiveContainer>
            ) : (
              <Empty
                title="No department signals yet"
                description="Department-level talent and project data will appear here."
                icon={FiTarget}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Leaderboard
          title="Top Talent Signals"
          items={topTalent.map((student) => ({
            label: student.name,
            value: formatCompactNumber(Number(student.xp ?? 0)),
            detail: `${student.department} - ${student.projects} project${student.projects === 1 ? "" : "s"}`,
            href: `/employer/candidates/${encodeURIComponent(String(student.id ?? ""))}`,
          }))}
        />
        <Leaderboard
          title="Project Engagement"
          items={projectEngagement.map((project) => ({
            label: project.name,
            value: formatCompactNumber(Number(project.views + project.stars)),
            detail: `${formatCompactNumber(project.views)} views - ${formatCompactNumber(project.stars)} stars`,
            href: `/employer/projects/${encodeURIComponent(String(project.id ?? ""))}`,
          }))}
        />
        <SummaryRows
          title="Skill Demand"
          description="Most frequent skills across employer-visible profiles."
          items={topSkills.map((skill) => ({
            label: String(skill.label ?? "Unknown skill"),
            value: Number(skill.value ?? 0),
          }))}
        />
      </div>
    </PageShell>
  );
}

function companyField(company: Record<string, unknown> | null, key: string) {
  const value = company?.[key];

  return typeof value === "string" && value.trim() ? value : "";
}

function CompanySelectField({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const mergedOptions = value && !options.includes(value) ? [value, ...options] : options;

  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {mergedOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function RecruitmentInterestSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const selected = new Set(value);

  function addInterest(next: string) {
    if (next === EMPLOYER_INTEREST_PLACEHOLDER || selected.has(next)) return;
    onChange([...value, next]);
  }

  function removeInterest(interest: string) {
    onChange(value.filter((item) => item !== interest));
  }

  return (
    <label className="space-y-3 md:col-span-2">
      <span className="text-sm font-medium">Recruitment interests</span>
      <Select
        value={EMPLOYER_INTEREST_PLACEHOLDER}
        onValueChange={addInterest}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select recruitment interests" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EMPLOYER_INTEREST_PLACEHOLDER}>
            Select recruitment interests
          </SelectItem>
          {employerRecruitmentInterestOptions.map((interest) => (
            <SelectItem
              key={interest}
              value={interest}
              disabled={selected.has(interest)}
            >
              {interest}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value.length ? (
        <div className="flex flex-wrap gap-2">
          {value.map((interest) => (
            <button
              key={interest}
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-primary/50"
              onClick={() => removeInterest(interest)}
            >
              {interest}
              <FiX className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Select one or more hiring interests.
        </p>
      )}
    </label>
  );
}

function EmployerCompanyProfilePanel() {
  const { company, isLoading } = useEmployerPortalSummary();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    companySize: "",
    location: "",
    website: "",
    contactPerson: "",
    position: "",
    phone: "",
    description: "",
    recruitmentInterests: [] as string[],
  });

  useEffect(() => {
    if (!company) return;

    setForm({
      companyName: companyField(company, "companyName"),
      industry: companyField(company, "industry"),
      companySize: companyField(company, "companySize"),
      location: companyField(company, "location"),
      website: companyField(company, "website"),
      contactPerson: companyField(company, "contactPerson"),
      position: companyField(company, "position"),
      phone: companyField(company, "phone"),
      description: companyField(company, "description"),
      recruitmentInterests: Array.isArray(company.recruitmentInterests)
        ? company.recruitmentInterests.map(String).filter(Boolean)
        : [],
    });
  }, [company]);

  function updateField(key: string, value: string | string[]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveCompanyProfile() {
    setSaving(true);

    try {
      const response = await fetch("/api/employer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          website: form.website || null,
          recruitmentInterests: form.recruitmentInterests,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.data?.summary) {
        throw new Error(
          payload.error?.message ?? "Unable to update company profile.",
        );
      }

      setOpen(false);
      campusToast.success({
        title: "Company profile updated",
        description: "Employer company information has been saved.",
      });
      window.location.reload();
    } catch (error) {
      campusToast.error({
        title: "Company update failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to update company profile.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section className="px-4 pb-8 sm:px-6">
        <Skeleton className="h-72 rounded-lg" />
      </section>
    );
  }

  const companyName = companyField(company, "companyName") || "Company not set";
  const industry = companyField(company, "industry") || "Industry not set";
  const companySize = companyField(company, "companySize") || "Size not set";
  const location = companyField(company, "location") || "Location not set";
  const website = companyField(company, "website") || "Website not set";
  const contactPerson = companyField(company, "contactPerson") || "Contact not set";
  const position = companyField(company, "position") || "Position not set";
  const phone = companyField(company, "phone") || "Phone not set";
  const description =
    companyField(company, "description") || "No company description added yet.";

  return (
    <section className="px-4 pb-8 sm:px-6">
      <Card>
        <CardHeader className="gap-5 border-b border-border/70 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <CardTitle className="text-xl">Company profile</CardTitle>
            <CardDescription>
              Employer organization details shown across recruiting workflows.
            </CardDescription>
          </div>
          <Button className="shrink-0" type="button" onClick={() => setOpen(true)}>
            <FiEdit className="h-4 w-4" aria-hidden />
            Edit company
          </Button>
        </CardHeader>
        <CardContent className="space-y-6 p-5 sm:p-6">
          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <div className="min-w-0 space-y-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {industry}
                  </span>
                  <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {companySize}
                  </span>
                </div>
                <h3 className="text-2xl font-semibold leading-tight text-foreground">
                  {companyName}
                </h3>
                <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>

              {Array.isArray(company?.recruitmentInterests) &&
              company.recruitmentInterests.length ? (
                <div className="flex flex-wrap gap-2 border-t border-border/70 pt-4">
                  {company.recruitmentInterests.map((interest) => (
                    <StatusBadge key={String(interest)}>{String(interest)}</StatusBadge>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <CompanyFact icon={FiUsers} label="Contact" value={contactPerson} />
              <CompanyFact icon={FiBriefcase} label="Role" value={position} />
              <CompanyFact icon={FiMapPin} label="Location" value={location} />
              <CompanyFact icon={FiPhone} label="Phone" value={phone} />
              <CompanyFact icon={FiGlobe} label="Website" value={website} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Edit company profile"
        description="Update the organization information shown to students, alumni, and university teams."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Company name</span>
            <CampusInput
              placeholder="e.g. Kibo Technologies"
              value={form.companyName}
              onChange={(event) => updateField("companyName", event.target.value)}
            />
          </label>
          <CompanySelectField
            label="Industry"
            value={form.industry}
            options={employerIndustryOptions}
            placeholder="Select an industry"
            onChange={(value) => updateField("industry", value)}
          />
          <CompanySelectField
            label="Company size"
            value={form.companySize}
            options={employerCompanySizeOptions}
            placeholder="Select company size"
            onChange={(value) => updateField("companySize", value)}
          />
          <CompanySelectField
            label="Location"
            value={form.location}
            options={employerLocationOptions}
            placeholder="Select company location"
            onChange={(value) => updateField("location", value)}
          />
          <label className="space-y-2">
            <span className="text-sm font-medium">Website</span>
            <CampusInput
              placeholder="https://company.com"
              value={form.website}
              onChange={(event) => updateField("website", event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Phone</span>
            <CampusInput
              placeholder="+255..."
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Contact person</span>
            <CampusInput
              placeholder="Full name"
              value={form.contactPerson}
              onChange={(event) => updateField("contactPerson", event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Position</span>
            <CampusInput
              placeholder="e.g. Talent Lead"
              value={form.position}
              onChange={(event) => updateField("position", event.target.value)}
            />
          </label>
          <RecruitmentInterestSelect
            value={form.recruitmentInterests}
            onChange={(value) => updateField("recruitmentInterests", value)}
          />
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Company description</span>
            <CampusTextarea
              placeholder="Describe what the company does and the kind of talent you are looking for."
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
            />
          </label>
        </div>
        <Button className="mt-6 w-full" type="button" onClick={saveCompanyProfile} disabled={saving}>
          {saving ? "Saving..." : "Save company profile"}
        </Button>
      </Modal>
    </section>
  );
}

export function EmployerProfileView() {
  return (
    <>
      <AccountProfilePage
        fallbackName="Employer profile"
        identityLabel="Employer Identity"
        bioPlaceholder="Share your recruiting focus, hiring interests, or partnership goals."
      />
      <EmployerCompanyProfilePanel />
    </>
  );
}

export function EmployerNotificationsView() {
  const [activeTab, setActiveTab] = useState("All");
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const tabs = getNotificationTabs(notifications);
  const filtered = filterNotificationsByTab(notifications, activeTab);
  const unreadCount = notifications.filter((notification) => notification.unread).length;

  useEffect(() => {
    let mounted = true;

    async function loadNotifications() {
      try {
        setIsLoading(true);
        const nextNotifications = await fetchClientNotifications();
        if (mounted) setNotifications(nextNotifications);
      } catch (error) {
        campusToast.error(
          error instanceof Error
            ? error.message
            : "Unable to load notifications.",
        );
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void loadNotifications();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (tabs.some((tab) => tab.key === activeTab)) return;
    setActiveTab("All");
  }, [activeTab, tabs]);

  const markNotificationRead = async (id: string) => {
    try {
      const updated = await markClientNotificationRead(id);
      setNotifications((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      );
    } catch (error) {
      campusToast.error(
        error instanceof Error
          ? error.message
          : "Unable to mark notification as read.",
      );
    }
  };
  const viewNotification = async (notification: ClientNotification) => {
    if (notification.unread) await markNotificationRead(notification.id);
    campusToast.info({ title: notification.title, description: notification.body });
  };
  const clearNotification = async (id: string) => {
    try {
      await deleteClientNotification(id);
      setNotifications((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      campusToast.error(
        error instanceof Error ? error.message : "Unable to clear notification.",
      );
    }
  };
  const markAllRead = async () => {
    try {
      await markAllClientNotificationsRead();
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          unread: false,
          status: "READ",
        })),
      );
    } catch (error) {
      campusToast.error(
        error instanceof Error ? error.message : "Unable to mark notifications read.",
      );
    }
  };
  const clearAll = async () => {
    try {
      await deleteClientNotifications(notifications.map((notification) => notification.id));
      setNotifications([]);
      setActiveTab("All");
    } catch (error) {
      campusToast.error(
        error instanceof Error ? error.message : "Unable to clear notifications.",
      );
    }
  };

  return (
    <PageShell
      eyebrow="Notifications"
      title="Employer notifications."
      description="Review new talent matches, new projects, project updates, opportunity engagement, applications, and platform alerts."
      action={
        <div className="flex gap-2">
          <Button
            size="sm"
            type="button"
            variant="secondary"
            disabled={unreadCount === 0}
            onClick={markAllRead}
          >
            Mark read
          </Button>
          <Button
            size="sm"
            type="button"
            variant="secondary"
            disabled={notifications.length === 0}
            onClick={clearAll}
          >
            Clear all
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <NotificationTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        <div className="space-y-3">
        {isLoading ? (
          <LoadingState label="Loading notifications" />
        ) : filtered.length ? filtered.map((notification) => (
          <Card key={notification.id} className={notification.unread ? "border-primary/40" : undefined}>
            <CardContent className="flex items-start gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><FiBell className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><StatusBadge>{notification.category}</StatusBadge>{notification.unread ? <StatusBadge>Unread</StatusBadge> : null}</div><h3 className="mt-3 font-semibold">{notification.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{notification.body}</p><p className="mt-3 text-xs text-muted-foreground">{notification.time}</p></div>
              <DropdownMenu><DropdownMenuTrigger asChild><Button aria-label={`Open actions for ${notification.title}`} className="h-9 w-9 shrink-0 p-0" type="button" variant="ghost"><FiMoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => viewNotification(notification)}><FiEye className="h-4 w-4" />View</DropdownMenuItem><DropdownMenuItem disabled={!notification.unread} onClick={() => markNotificationRead(notification.id)}><FiCheckCircle className="h-4 w-4" />Mark as read</DropdownMenuItem><DropdownMenuItem onClick={() => clearNotification(notification.id)}><FiTrash2 className="h-4 w-4" />Clear</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
            </CardContent>
          </Card>
        )) : <Empty title="No Notifications" description={activeTab === "All" ? "New talent matches and employer updates will appear here." : `No notifications for the "${activeTab}" tab.`} icon={FiBell} />}
        </div>
      </div>
    </PageShell>
  );
}
