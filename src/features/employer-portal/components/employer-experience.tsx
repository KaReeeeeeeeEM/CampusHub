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
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import type { IconType } from "react-icons";
import {
  FiBarChart2,
  FiBell,
  FiBookmark,
  FiBriefcase,
  FiCheckCircle,
  FiExternalLink,
  FiEye,
  FiFileText,
  FiGithub,
  FiMail,
  FiMoreVertical,
  FiPlus,
  FiSearch,
  FiStar,
  FiTarget,
  FiTrash2,
  FiUsers,
  FiVideo,
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
  employerAnalytics,
  employerOpportunities,
  employerProjects,
  employerStats,
  employerStudents,
  mockEmployerProfile,
  opportunityTabs,
  talentInsights,
  type EmployerOpportunity,
  type EmployerProject,
  type EmployerStudent,
} from "@/features/employer-portal/lib/mock-data";
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
import { cn } from "@/lib/utils";

const ALL_VALUE = "all";

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

function Avatar({ label }: { label: string }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
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

function AnalyticsChart() {
  return (
    <AreaChart data={analyticsTrendData} margin={{ top: 12, right: 24, left: -12, bottom: 0 }}>
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

function StudentActionMenu({ student }: { student: EmployerStudent }) {
  return (
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
          onClick={() =>
            campusToast.info({
              title: "Profile Opened",
              description: `${student.name}'s profile preview is ready.`,
            })
          }
        >
          <FiEye className="h-4 w-4" />
          View Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            campusToast.success({
              title: "Candidate Saved",
              description: `${student.name} was added to saved candidates.`,
            })
          }
        >
          <FiBookmark className="h-4 w-4" />
          Save Candidate
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            campusToast.info({
              title: "Contact Drafted",
              description: `Message draft created for ${student.name}.`,
            })
          }
        >
          <FiMail className="h-4 w-4" />
          Contact Candidate
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            campusToast.info({
              title: "Compare Candidate",
              description: `${student.name} added to comparison.`,
            })
          }
        >
          <FiBarChart2 className="h-4 w-4" />
          Compare Candidate
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TalentCard({ student }: { student: EmployerStudent }) {
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
          <StudentActionMenu student={student} />
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
            {student.xp.toLocaleString()}
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
  return (
    <HoverCard className="group h-full overflow-hidden rounded-lg border border-border bg-surface">
      <button
        className="block w-full text-left"
        type="button"
        onClick={() => onView(project)}
      >
        <ProjectImage
          alt={`${project.name} preview`}
          className="aspect-[16/10] border-b border-border"
          src={project.image}
        />
      </button>
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground">{project.name}</h3>
            <p className="mt-1 truncate text-sm text-muted-foreground">{project.owner} - {project.department}</p>
          </div>
          <StatusBadge>{project.projectType}</StatusBadge>
        </div>
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{project.summary}</p>
        <div className="grid grid-cols-3 gap-2">
          {project.galleryImages.slice(0, 3).map((image, index) => (
            <ProjectImage
              key={image}
              alt={`${project.name} gallery ${index + 1}`}
              className="aspect-video rounded-md border border-border"
              src={image}
            />
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <FiEye className="h-3.5 w-3.5" aria-hidden="true" />
            {project.views.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1">
            <FiStar className="h-3.5 w-3.5" aria-hidden="true" />
            {project.stars}
          </span>
          <span className="truncate">{project.category}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" onClick={() => onView(project)}>
            <FiEye className="h-4 w-4" />
            Details
          </Button>
          <Button type="button" onClick={() => campusToast.success({ title: "Project Starred", description: `${project.name} was added to starred projects.` })}>
            <FiStar className="h-4 w-4" />
            Star
          </Button>
        </div>
      </div>
    </HoverCard>
  );
}

function ProjectDetailsModal({ project, onClose }: { project: EmployerProject | null; onClose: () => void }) {
  return (
    <Modal open={Boolean(project)} onOpenChange={(open) => !open && onClose()} title={project?.name ?? ""} description={project?.owner}>
      {project ? (
        <div className="space-y-5">
          <ProjectImage
            alt={`${project.name} main preview`}
            className="aspect-[16/8] rounded-lg border border-border"
            src={project.image}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {project.galleryImages.map((image, index) => (
              <ProjectImage
                key={image}
                alt={`${project.name} detail ${index + 1}`}
                className="aspect-video rounded-lg border border-border"
                src={image}
              />
            ))}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{project.summary}</p>
          <div className="grid gap-3 md:grid-cols-5">
            {[
              ["Views", project.views.toLocaleString(), FiEye],
              ["Unique Visitors", project.analytics.uniqueVisitors.toLocaleString(), FiUsers],
              ["Stars", project.stars.toString(), FiStar],
              ["GitHub Clicks", project.analytics.githubClicks.toString(), FiGithub],
              ["Video Clicks", project.analytics.videoClicks.toString(), FiVideo],
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
                {project.documents.map((document) => (
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
                {project.links.map((link) => (
                  <button key={link} type="button" className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm hover:border-primary/40">
                    <FiExternalLink className="h-4 w-4 text-primary" />
                    {link}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <Card><CardHeader><CardTitle>Team Members</CardTitle></CardHeader><CardContent className="space-y-2">{project.team.map((member) => <StatusBadge key={member}>{member}</StatusBadge>)}</CardContent></Card>
            <Card><CardHeader><CardTitle>Gallery Notes</CardTitle></CardHeader><CardContent className="space-y-2">{project.gallery.map((item) => <div key={item} className="rounded-lg bg-background p-3 text-sm">{item}</div>)}</CardContent></Card>
            <Card><CardHeader><CardTitle>Achievements</CardTitle></CardHeader><CardContent className="space-y-2">{project.achievements.map((item) => <StatusBadge key={item}>{item}</StatusBadge>)}</CardContent></Card>
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

function Leaderboard({ title, items }: { title: string; items: { label: string; value: string; detail: string }[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div key={item.label} className="flex items-center gap-3 rounded-lg bg-background p-3 transition hover:bg-primary/5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">{index + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{item.label}</span>
              <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
            </span>
            <span className="text-sm font-semibold text-primary">{item.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function EmployerDashboardView() {
  const [chartView, setChartView] = useState<ChartView>("bar");

  return (
    <PageShell eyebrow="Employer Portal" title={mockEmployerProfile.company ? `${mockEmployerProfile.company} recruiting dashboard.` : "Recruiting dashboard."} description="Track talent matches, project engagement, opportunities, and hiring signals from the university ecosystem.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {employerStats.map((stat, index) => (
          <MetricCard key={stat.label} label={stat.label} value={stat.value} trend={stat.trend} icon={[FiUsers, FiBookmark, FiBriefcase, FiStar, FiBarChart2][index]} />
        ))}
      </div>
      <Card>
        <CardHeader className="flex flex-row items-start gap-4">
          <ChartViewMenu value={chartView} onChange={setChartView} />
          <div className="space-y-1"><CardTitle>Recruitment Pipeline Trends</CardTitle><CardDescription>Candidates, project views, and opportunity engagement over time.</CardDescription></div>
        </CardHeader>
        <CardContent className="px-2 pb-5 pt-0 sm:px-4">
          <ResponsiveContainer width="100%" height={340} minWidth={0}><PipelineChart view={chartView} /></ResponsiveContainer>
        </CardContent>
      </Card>
      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <Card><CardHeader><CardTitle>Recommended Talent</CardTitle><CardDescription>High-fit students based on skills, badges, projects, and activity.</CardDescription></CardHeader><CardContent><StaggerContainer className="grid gap-4 md:grid-cols-2">{employerStudents.slice(0, 4).map((student) => <TalentCard key={student.id} student={student} />)}</StaggerContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader><CardContent className="grid gap-3">{["Create Opportunity", "Review Talent Pool", "Explore Showcase", "Run Candidate Comparison"].map((action) => <Button key={action} type="button" variant="secondary" onClick={() => campusToast.info({ title: action, description: "UI action ready for employer workflow." })}>{action}</Button>)}</CardContent></Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Leaderboard title="Top Innovators" items={employerStudents.slice().sort((a, b) => b.xp - a.xp).slice(0, 4).map((student) => ({ label: student.name, value: student.xp.toLocaleString(), detail: student.department }))} />
        <Leaderboard title="Trending Projects" items={employerProjects.slice().sort((a, b) => b.views - a.views).slice(0, 4).map((project) => ({ label: project.name, value: project.views.toLocaleString(), detail: project.owner }))} />
        <Card><CardHeader><CardTitle>Talent Insights</CardTitle></CardHeader><CardContent className="space-y-3">{talentInsights.map((item) => <div key={item.label} className="space-y-2"><div className="flex justify-between text-sm"><span>{item.label}</span><span>{item.value}</span></div><div className="h-2 overflow-hidden rounded-full bg-background"><span className="block h-full rounded-full bg-primary" style={{ width: `${item.value * 2}%` }} /></div></div>)}</CardContent></Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        {["Most Active Students", "Recently Published Projects", "Saved Candidates"].map((title) => (
          <Card key={title}><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-3">{(title === "Saved Candidates" ? employerStudents.filter((s) => s.saved) : employerStudents.slice(0, 3)).map((student) => <div key={student.id} className="rounded-lg bg-background p-3"><p className="font-semibold">{student.name}</p><p className="text-sm text-muted-foreground">{student.activity}</p></div>)}</CardContent></Card>
        ))}
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

  const filtered = employerStudents.filter((student) => {
    const haystack = `${student.name} ${student.university} ${student.college} ${student.department} ${student.skills.join(" ")} ${student.badges.join(" ")}`;
    return (
      (!query || haystack.toLowerCase().includes(query.toLowerCase())) &&
      (university === ALL_VALUE || student.university === university) &&
      (department === ALL_VALUE || student.department === department) &&
      (availability === ALL_VALUE || student.availability === availability) &&
      (skill === ALL_VALUE || student.skills.includes(skill))
    );
  });

  return (
    <PageShell eyebrow="Talent Discovery" title="Discover students through proof of work." description="Search talent by skills, badges, XP, projects, graduation year, leadership, and availability.">
      <Card className="bg-surface">
        <CardContent className="space-y-5 p-5">
          <SearchBox value={query} onChange={setQuery} placeholder="Search students, skills, badges, universities" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FilterSelect label="University" value={university} onChange={setUniversity} options={compareValues(employerStudents.map((s) => s.university))} />
            <FilterSelect label="Department" value={department} onChange={setDepartment} options={compareValues(employerStudents.map((s) => s.department))} />
            <FilterSelect label="Skill" value={skill} onChange={setSkill} options={compareValues(employerStudents.flatMap((s) => s.skills))} />
            <FilterSelect label="Availability" value={availability} onChange={setAvailability} options={compareValues(employerStudents.map((s) => s.availability))} />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {["Top Innovators", "Most Starred Projects", "Most Viewed Projects", "XP 3000+", "3+ Projects", "Graduating 2026"].map((item) => <StatusBadge key={item}>{item}</StatusBadge>)}
          </div>
        </CardContent>
      </Card>
      {filtered.length ? <StaggerContainer className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">{filtered.map((student) => <TalentCard key={student.id} student={student} />)}</StaggerContainer> : <Empty title="No Talent Matches" description="Adjust filters to find students that match your hiring priorities." />}
    </PageShell>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between rounded-lg bg-background p-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div>;
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{items.map((item) => <StatusBadge key={item}>{item}</StatusBadge>)}</CardContent></Card>;
}

export function EmployerShowcaseView() {
  const [project, setProject] = useState<EmployerProject | null>(null);
  const [activeTab, setActiveTab] = useState("All");
  const featuredProject = employerProjects.slice().sort((a, b) => b.views - a.views)[0];
  const topCreators = employerStudents.slice().sort((a, b) => b.projects - a.projects).slice(0, 4);
  const tabs = [
    "All",
    "Trending",
    "Most Starred",
    "Featured Innovations",
    "Research",
    "Entrepreneurship",
  ];
  const visibleProjects = useMemo(() => {
    const projects = [...employerProjects];

    if (activeTab === "Trending") {
      return projects.sort((a, b) => b.views - a.views);
    }

    if (activeTab === "Most Starred") {
      return projects.sort((a, b) => b.stars - a.stars);
    }

    if (activeTab === "Featured Innovations") {
      return projects.filter((item) => item.projectType === "Featured Innovation");
    }

    if (activeTab === "Research") {
      return projects.filter((item) => item.projectType === "Research");
    }

    if (activeTab === "Entrepreneurship") {
      return projects.filter((item) => item.projectType === "Entrepreneurship");
    }

    return projects;
  }, [activeTab]);

  return (
    <PageShell eyebrow="Showcase" title="Discover innovations before they become resumes." description="Explore student projects through visuals, proof of work, creator signals, documents, and engagement metrics.">
      <section className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <Card className="overflow-hidden">
          <div className="grid min-h-[360px] lg:grid-cols-[1.15fr_.85fr]">
            <button
              className="group block min-h-[280px] text-left"
              type="button"
              onClick={() => setProject(featuredProject)}
            >
              <ProjectImage
                alt={`${featuredProject.name} featured preview`}
                className="h-full min-h-[280px] border-b border-border lg:border-b-0 lg:border-r"
                src={featuredProject.image}
              />
            </button>
            <div className="flex flex-col justify-between gap-6 p-6">
              <div>
                <StatusBadge>{featuredProject.projectType}</StatusBadge>
                <h2 className="mt-4 text-2xl font-semibold text-foreground">
                  {featuredProject.name}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {featuredProject.owner} - {featuredProject.department}
                </p>
                <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {featuredProject.summary}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {featuredProject.galleryImages.map((image, index) => (
                  <button
                    key={image}
                    className="group block"
                    type="button"
                    onClick={() => setProject(featuredProject)}
                  >
                    <ProjectImage
                      alt={`${featuredProject.name} gallery ${index + 1}`}
                      className="aspect-video rounded-md border border-border"
                      src={image}
                    />
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{featuredProject.views.toLocaleString()} views</span>
                  <span>{featuredProject.stars} stars</span>
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
                <div key={student.id} className="flex items-center gap-3 rounded-lg bg-background p-3">
                  <Avatar label={student.photo} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{student.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {student.department} - {student.projects} projects
                    </p>
                  </div>
                  <StatusBadge>{student.xp.toLocaleString()} XP</StatusBadge>
                </div>
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
                ["Projects", employerProjects.length.toString()],
                ["Views", employerProjects.reduce((sum, item) => sum + item.views, 0).toLocaleString()],
                ["Stars", employerProjects.reduce((sum, item) => sum + item.stars, 0).toLocaleString()],
                ["Docs", employerProjects.reduce((sum, item) => sum + item.documents.length, 0).toString()],
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
          ["Most Viewed", employerProjects.slice().sort((a, b) => b.views - a.views).slice(0, 3)],
          ["Most Starred", employerProjects.slice().sort((a, b) => b.stars - a.stars).slice(0, 3)],
          ["Recently Featured", employerProjects.filter((item) => item.projectType === "Featured Innovation").slice(0, 3)],
        ].map(([title, projects]) => (
          <Card key={title as string}>
            <CardHeader>
              <CardTitle>{title as string}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(projects as EmployerProject[]).map((item) => (
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
                      {item.owner} - {item.views.toLocaleString()} views
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
  const saved = employerStudents.filter((student) => student.saved);
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
      { accessorKey: "xp", header: "XP", cell: ({ row }) => row.original.xp.toLocaleString() },
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
                        <div><p className="font-semibold">{student.xp.toLocaleString()}</p><p className="text-xs text-muted-foreground">XP</p></div>
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
                            {student.xp.toLocaleString()}
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
                          <div><p className="font-semibold">{student.xp.toLocaleString()}</p><p className="text-xs text-muted-foreground">XP</p></div>
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
  return (
    <PageShell eyebrow="Analytics" title="Measure recruiting reach and project engagement." description="Track profile views, opportunity engagement, saved candidates, talent discovery metrics, and project signals.">
      <div className="grid gap-4 md:grid-cols-4">{employerAnalytics.map((item, index) => <MetricCard key={item.label} label={item.label} value={item.value.toLocaleString()} trend={item.change} icon={[FiEye, FiTarget, FiStar, FiBriefcase][index]} />)}</div>
      <Card><CardHeader><CardTitle>Engagement Trends</CardTitle><CardDescription>Profile, opportunity, and project engagement by month.</CardDescription></CardHeader><CardContent className="px-2 pb-5 pt-0 sm:px-4"><ResponsiveContainer width="100%" height={360} minWidth={0}><AnalyticsChart /></ResponsiveContainer></CardContent></Card>
      <div className="grid gap-5 xl:grid-cols-3"><Leaderboard title="Talent Discovery Metrics" items={talentInsights.map((item) => ({ label: item.label, value: item.value.toString(), detail: "matching candidates" }))} /><Leaderboard title="Saved Candidate Statistics" items={employerStudents.filter((s) => s.saved).map((s) => ({ label: s.name, value: s.xp.toString(), detail: s.shortlist ?? "Saved" }))} /><Leaderboard title="Project Engagement Metrics" items={employerProjects.map((p) => ({ label: p.name, value: p.analytics.linkClicks.toString(), detail: "link clicks" }))} /></div>
    </PageShell>
  );
}

export function EmployerProfileView() {
  return (
    <PageShell eyebrow="Company Profile" title={mockEmployerProfile.company || "Company profile"} description="Manage company information, recruitment interests, talent preferences, and activity statistics.">
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card><CardHeader><CardTitle>Company Information</CardTitle></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><MetricMini label="Industry" value={mockEmployerProfile.industry} /><MetricMini label="Location" value={mockEmployerProfile.location} /><MetricMini label="Website" value={mockEmployerProfile.website} /><MetricMini label="Contact" value={mockEmployerProfile.email} /></div><p className="text-sm leading-6 text-muted-foreground">{mockEmployerProfile.description}</p><Button type="button" onClick={() => campusToast.info({ title: "Profile endpoint required", description: "Employer profile updates will save when backend integration is connected." })}>Update Profile</Button></CardContent></Card>
        <InfoList title="Recruitment Interests" items={mockEmployerProfile.interests} />
      </div>
      <div className="grid gap-5 md:grid-cols-3"><InfoList title="Talent Preferences" items={[]} /><InfoList title="Activity Statistics" items={[]} /><InfoList title="University Network" items={[]} /></div>
    </PageShell>
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
