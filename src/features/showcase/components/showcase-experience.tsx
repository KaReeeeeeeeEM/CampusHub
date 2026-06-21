// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
"use client";


import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  FiAward,
  FiBarChart2,
  FiBookOpen,
  FiChevronDown,
  FiEdit,
  FiExternalLink,
  FiEye,
  FiEyeOff,
  FiFileText,
  FiGithub,
  FiGrid,
  FiLink,
  FiList,
  FiPlus,
  FiSearch,
  FiShare2,
  FiStar,
  FiTag,
  FiTrash2,
  FiTrendingUp,
  FiUsers,
  FiVideo,
  FiZap,
} from "react-icons/fi";
import { z } from "zod";

import {
  CampusDataTable,
  CampusFileUpload,
  CampusInput,
  CampusTextarea,
  Empty,
  campusToast,
} from "@/components/campushub";
import { AchievementModal } from "@/components/achievements";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer } from "@/components/motion/stagger-container";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Drawer } from "@/components/shared/drawer";
import { Modal } from "@/components/shared/modal";
import { MultiStepProgress } from "@/components/shared/multi-step-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import { AdminActionMenu } from "@/features/administration/components/admin-action-menu";
import {
  showcaseBadges,
  showcaseCategories,
  showcaseLeaderboards,
  showcaseProfile,
  showcaseProjects,
  xpSources,
  type ShowcaseBadge,
  type ShowcaseProject,
  type ShowcaseRoleAudience,
  type ShowcaseStatus,
  type ShowcaseVisibility,
} from "@/features/showcase/lib/mock-data";
import { cn } from "@/lib/utils";
import type { DataTableColumn } from "@/components/shared/data-table";

const roleVisibilityOptions: ShowcaseRoleAudience[] = [
  "Students",
  "Teachers",
  "Employers",
  "Alumni",
];

const statusOptions: ShowcaseStatus[] = [
  "Published",
  "In Review",
  "Prototype",
  "Research",
  "Archived",
];

const visibilityOptions: ShowcaseVisibility[] = [
  "Public",
  "Private",
  "Role-Based",
];

const projectSchema = z.object({
  name: z.string().min(2, "Project name is required."),
  shortDescription: z.string().min(10, "Short description is required."),
  detailedDescription: z.string().min(20, "Detailed description is required."),
  category: z.string().min(1, "Select a category."),
  status: z.enum(["Published", "In Review", "Prototype", "Research", "Archived"]),
  visibility: z.enum(["Public", "Private", "Role-Based"]),
  roleVisibility: z.array(z.string()).optional(),
  tags: z.string().min(1, "Add at least one tag."),
  teamMembers: z.string().min(1, "Add at least one team member."),
  demoLink: z.string().optional(),
  websiteLink: z.string().optional(),
  githubLink: z.string().optional(),
  videoLink: z.string().optional(),
  documentLinks: z.string().optional(),
  coverImage: z.string().optional(),
  gallery: z.string().optional(),
  logo: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

const leaderboardProjectPool: ShowcaseProject[] = [...showcaseProjects];

function toFiniteMetric(value: unknown, fallback = 0) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function formatMetric(value: number) {
  return value.toLocaleString();
}

function getShowcaseXpSummary() {
  const currentXp = toFiniteMetric(showcaseProfile.currentXp ?? showcaseProfile.xp);
  const nextLevelXp = Math.max(
    toFiniteMetric(showcaseProfile.nextLevelXp),
    currentXp,
  );

  return {
    level: toFiniteMetric(showcaseProfile.level),
    currentXp,
    nextLevelXp,
    streak: toFiniteMetric(showcaseProfile.streak),
    progressPercent:
      nextLevelXp > 0 ? Math.min((currentXp / nextLevelXp) * 100, 100) : 0,
  };
}

const extendedShowcaseLeaderboards = {
  topProjects: [...leaderboardProjectPool]
    .sort((a, b) => toFiniteMetric(b.stars) - toFiniteMetric(a.stars))
    .slice(0, 10),
  trendingThisWeek: [...leaderboardProjectPool]
    .sort((a, b) => toFiniteMetric(b.views) - toFiniteMetric(a.views))
    .slice(0, 10),
  mostViewed: [...leaderboardProjectPool]
    .sort((a, b) => toFiniteMetric(b.views) - toFiniteMetric(a.views))
    .slice(0, 10),
  mostStarred: [...leaderboardProjectPool]
    .sort((a, b) => toFiniteMetric(b.stars) - toFiniteMetric(a.stars))
    .slice(0, 10),
};
type ShowcaseView = "grid" | "table";

const statusStyles: Record<string, string> = {
  Published: "bg-emerald-500/10 text-emerald-500",
  "In Review": "bg-amber-500/10 text-amber-500",
  Prototype: "bg-blue-500/10 text-blue-500",
  Research: "bg-violet-500/10 text-violet-500",
  Archived: "bg-slate-500/10 text-slate-400",
  Public: "bg-emerald-500/10 text-emerald-500",
  Private: "bg-rose-500/10 text-rose-500",
  "Role-Based": "bg-primary/10 text-primary",
  Featured: "bg-amber-500/10 text-amber-500",
  Shown: "bg-emerald-500/10 text-emerald-500",
  Hidden: "bg-slate-500/10 text-slate-400",
};

function ShowcaseShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full px-4 py-6 sm:px-6">
      <ShowcaseTabs />
      {children}
    </main>
  );
}

function ShowcaseTabs() {
  const pathname = usePathname();
  const tabs = [
    { label: "Overview", href: "/student/showcase", icon: FiStar },
    { label: "Explore", href: "/student/showcase/explore", icon: FiSearch },
    {
      label: "My Projects",
      href: "/student/showcase/my-projects",
      icon: FiBookOpen,
    },
    {
      label: "Leaderboards",
      href: "/student/showcase/leaderboards",
      icon: FiBarChart2,
    },
    {
      label: "Achievements",
      href: "/student/showcase/achievements",
      icon: FiAward,
    },
  ];

  return (
    <div className="mb-5 flex gap-2 overflow-x-auto rounded-lg border border-border bg-surface p-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active =
          pathname === tab.href ||
          (tab.href !== "/student/showcase" && pathname.startsWith(tab.href));

        return (
          <Button
            key={tab.href}
            asChild
            className="h-9 shrink-0 justify-start"
            size="sm"
            variant={active ? "default" : "ghost"}
          >
            <Link href={tab.href}>
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}

function ShowcasePageHeader({
  eyebrow = "CampusHub Showcase",
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <FadeIn>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </FadeIn>
  );
}

function MediaBlock({
  image,
  title,
  className,
}: {
  image: string;
  title: string;
  className?: string;
}) {
  return (
    <div
      aria-label={title}
      className={cn("bg-cover bg-center", className)}
      role="img"
      style={{ backgroundImage: `url(${image})` }}
    />
  );
}

function Pill({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
        statusStyles[value] ?? "bg-primary/10 text-primary",
      )}
    >
      {value}
    </span>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-3">
      <span className="block text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
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
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function RadixSelectField({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ProjectCard({
  project,
  publicMode = false,
  onView,
}: {
  project: ShowcaseProject;
  publicMode?: boolean;
  onView: (project: ShowcaseProject) => void;
}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
      <div className="relative">
        <MediaBlock
          image={project.coverImage}
          title={project.name}
          className="aspect-[16/10] border-b border-border"
        />
        {!publicMode ? (
          <Button
            aria-label={`Star ${project.name}`}
            className="absolute right-3 top-3 h-9 w-9 rounded-full border border-border/70 bg-background/80 p-0 text-amber-500 shadow-sm backdrop-blur transition hover:bg-background hover:text-amber-500"
            type="button"
            variant="secondary"
            onClick={() =>
              campusToast.success({
                title: "Project Starred",
                description: `${project.name} has been added to your starred projects.`,
              })
            }
          >
            <FiStar className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{project.name}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {project.owner} · {project.category}
            </p>
          </div>
          <Pill value={project.visibility} />
        </div>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {project.shortDescription}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <FiEye className="h-3.5 w-3.5" aria-hidden="true" />
            {project.views.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1">
            <FiStar className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
            {project.stars}
          </span>
          <span className="text-right">
            <Pill value={project.status} />
          </span>
        </div>
        <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-2">
          <Button
            className={publicMode ? "sm:col-span-2" : ""}
            type="button"
            variant="secondary"
            onClick={() => onView(project)}
          >
            <FiEye className="h-4 w-4" aria-hidden="true" />
            View Project
          </Button>
          {!publicMode ? (
            <Button
              type="button"
              onClick={() =>
                campusToast.info({
                  title: "Project Shared",
                  description: `${project.name} share link is ready.`,
                })
              }
            >
              <FiShare2 className="h-4 w-4" aria-hidden="true" />
              Share
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ProjectDetailsSheet({
  project,
  open,
  onOpenChange,
  publicMode = false,
}: {
  project: ShowcaseProject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicMode?: boolean;
}) {
  const related = showcaseProjects
    .filter((item) => item.category === project?.category && item.id !== project?.id)
    .slice(0, 2);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={project?.name ?? "Project Details"}
      description={project?.category}
      className="max-w-3xl"
    >
      {project ? (
        <div className="space-y-6">
          <MediaBlock
            image={project.coverImage}
            title={project.name}
            className="aspect-[16/9] rounded-lg border border-border"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {(project.gallery ?? []).map((image) => (
              <MediaBlock
                key={image}
                image={image}
                title={`${project.name} gallery`}
                className="aspect-video rounded-md border border-border"
              />
            ))}
          </div>
          <section className="rounded-lg border border-border bg-surface-muted p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">{project.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {project.detailedDescription}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Pill value={project.status} />
                <Pill value={project.visibility} />
              </div>
            </div>
          </section>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={FiEye} label="Views" value={project.views.toLocaleString()} />
            <Metric
              icon={FiUsers}
              label="Visitors"
              value={project.uniqueVisitors.toLocaleString()}
            />
            <Metric icon={FiStar} label="Stars" value={String(project.stars)} />
            <Metric
              icon={FiLink}
              label="Link Clicks"
              value={String(project.linkClicks)}
            />
          </div>
          <section>
            <h3 className="text-sm font-semibold">Tags</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {(project.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </section>
          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(project.teamMembers ?? []).map((member) => (
                  <div
                    key={member}
                    className="flex items-center gap-3 rounded-md bg-surface-muted px-3 py-2 text-sm"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {member
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                    {member}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Project Links</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {[
                  ["Demo", project.demoLink, FiExternalLink],
                  ["Website", project.websiteLink, FiExternalLink],
                  ["GitHub", project.githubLink, FiGithub],
                  ["Video", project.videoLink, FiVideo],
                ].map(([label, href, Icon]) => (
                  <Button key={String(label)} asChild variant="secondary">
                    <a href={String(href)} target="_blank" rel="noreferrer">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {String(label)}
                    </a>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </section>
          <section>
            <h3 className="text-sm font-semibold">Related Documents</h3>
            <div className="mt-3 grid gap-3">
              {(project.documents ?? []).map((document) => (
                <div
                  key={document.title}
                  className="rounded-lg border border-border bg-surface p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <FiFileText className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{document.title}</p>
                      <p className="mt-1 text-xs text-primary">{document.type}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {document.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          {!publicMode ? <ProjectAnalytics project={project} /> : null}
          {related.length > 0 ? (
            <section>
              <h3 className="text-sm font-semibold">Related Projects</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {related.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 rounded-lg border border-border bg-surface p-3"
                  >
                    <MediaBlock
                      image={item.coverImage}
                      title={item.name}
                      className="h-16 w-20 shrink-0 rounded-md"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.category} · {item.stars} stars
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="mt-4 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ProjectAnalytics({ project }: { project: ShowcaseProject }) {
  const maxViews = Math.max(...project.activityGraph.map((item) => item.views));

  return (
    <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Activity Graph</CardTitle>
          <p className="text-sm text-muted-foreground">
            Views and stars over the last week.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex h-56 items-end gap-4 border-b border-border px-2 pb-4">
            {project.activityGraph.map((item) => (
              <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-40 w-full items-end justify-center gap-1">
                  <span
                    className="w-4 rounded-t bg-primary"
                    style={{ height: `${(item.views / maxViews) * 100}%` }}
                  />
                  <span
                    className="w-4 rounded-t bg-amber-500"
                    style={{ height: `${Math.max(item.stars, 12)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Views
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Stars
            </span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Traffic Sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {project.trafficSources.map((source) => (
            <div key={source.source}>
              <div className="flex items-center justify-between text-sm">
                <span>{source.source}</span>
                <span className="text-muted-foreground">{source.value}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${source.value}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

function ShowcaseActions() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button asChild variant="secondary">
        <Link href="/student/showcase/my-projects">
          <FiBookOpen className="h-4 w-4" aria-hidden="true" />
          My Projects
        </Link>
      </Button>
      <Button asChild>
        <Link href="/student/showcase/explore">
          <FiSearch className="h-4 w-4" aria-hidden="true" />
          Explore Projects
        </Link>
      </Button>
    </div>
  );
}

export function ShowcaseHomePageView() {
  const [selectedProject, setSelectedProject] = useState<ShowcaseProject | null>(null);
  const featured = showcaseProjects.filter((project) => project.featured);
  const trending = showcaseProjects.filter((project) => project.trending);
  const newest = showcaseProjects.filter((project) => project.newest);
  const mostViewed = [...showcaseProjects].sort(
    (a, b) => toFiniteMetric(b.views) - toFiniteMetric(a.views),
  );
  const mostStarred = [...showcaseProjects].sort(
    (a, b) => toFiniteMetric(b.stars) - toFiniteMetric(a.stars),
  );
  const publicProjects = showcaseProjects.filter(
    (project) => project.visibility === "Public" || project.visibility === "ALL_USERS",
  ).length;
  const starsEarned = showcaseProjects.reduce(
    (total, project) => total + toFiniteMetric(project.stars),
    0,
  );
  const projectViews = showcaseProjects.reduce(
    (total, project) => total + toFiniteMetric(project.views),
    0,
  );

  return (
    <ShowcaseShell>
      <ShowcasePageHeader
        title="Showcase"
        description="Publish projects, research, startups, innovations, products, achievements, and portfolio work that helps students become discoverable."
        action={<ShowcaseActions />}
      />
      <StaggerContainer className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={FiBookOpen}
          label="Public Projects"
          value={formatMetric(publicProjects)}
        />
        <Metric
          icon={FiStar}
          label="Stars Earned"
          value={formatMetric(starsEarned)}
        />
        <Metric
          icon={FiEye}
          label="Project Views"
          value={formatMetric(projectViews)}
        />
        <Metric
          icon={FiAward}
          label="Badges Earned"
          value={formatMetric(showcaseBadges.length)}
        />
      </StaggerContainer>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <ProjectCollection
          title="Trending Projects"
          description="Projects gaining attention this week."
          projects={trending}
          onView={setSelectedProject}
        />
        <Card>
          <CardHeader>
            <CardTitle>Project Categories</CardTitle>
            <p className="text-sm text-muted-foreground">
              Innovation areas across campus.
            </p>
          </CardHeader>
          <CardContent className="grid gap-2">
            {showcaseCategories.map((category) => (
              <Link
                key={category}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-muted px-3 py-3 text-sm transition-colors hover:border-primary/40"
                href="/student/showcase/explore"
              >
                <span className="inline-flex items-center gap-2">
                  <FiTag className="h-4 w-4 text-primary" aria-hidden="true" />
                  {category}
                </span>
                <span className="text-xs text-muted-foreground">
                  {showcaseProjects.filter((project) => project.category === category).length}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <ProjectList title="Featured Projects" projects={featured} />
        <ProjectList title="Most Viewed Projects" projects={mostViewed.slice(0, 4)} />
        <ProjectList title="Most Starred Projects" projects={mostStarred.slice(0, 4)} />
        <ProjectList title="Newest Projects" projects={newest} />
      </section>
      <ProjectDetailsSheet
        project={selectedProject}
        open={Boolean(selectedProject)}
        onOpenChange={(open) => !open && setSelectedProject(null)}
      />
    </ShowcaseShell>
  );
}

function ProjectCollection({
  title,
  description,
  projects,
  onView,
}: {
  title: string;
  description: string;
  projects: ShowcaseProject[];
  onView: (project: ShowcaseProject) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} onView={onView} />
        ))}
      </CardContent>
    </Card>
  );
}

function ProjectList({
  title,
  projects,
}: {
  title: string;
  projects: ShowcaseProject[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted p-3"
          >
            <MediaBlock
              image={project.coverImage}
              title={project.name}
              className="h-14 w-20 shrink-0 rounded-md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{project.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {project.owner} · {project.category}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <FiStar className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              {project.stars}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function useProjectFilters() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedCategory = category.trim();

    if (!normalizedQuery && normalizedCategory === "All") {
      return showcaseProjects;
    }

    return showcaseProjects.filter((project) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          project.name,
          project.owner,
          project.category,
          project.shortDescription,
          project.tags.join(" "),
        ].some((value) => value.toLowerCase().includes(normalizedQuery));
      const matchesCategory =
        normalizedCategory === "All" || project.category === normalizedCategory;
      return matchesQuery && matchesCategory;
    });
  }, [category, query]);

  return { query, setQuery, category, setCategory, filteredProjects };
}

export function ShowcaseExplorePageView() {
  const { query, setQuery, category, setCategory, filteredProjects } =
    useProjectFilters();
  const [selectedProject, setSelectedProject] = useState<ShowcaseProject | null>(null);

  return (
    <ShowcaseShell>
      <ShowcasePageHeader
        title="Explore Projects"
        description="Discover public and role-visible student projects, research, startup concepts, products, and innovation work."
      />
      <div className="mb-5 space-y-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search projects, creators, tags"
        />
        <CategoryTabs value={category} onChange={setCategory} />
      </div>
      {filteredProjects.length > 0 ? (
        <StaggerContainer
          key={`${category}-${query.trim() || "all"}-${filteredProjects.length}`}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        >
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onView={setSelectedProject}
            />
          ))}
        </StaggerContainer>
      ) : (
        <Empty filterName={category === "All" ? query : category} icon={FiBookOpen} />
      )}
      <ProjectDetailsSheet
        project={selectedProject}
        open={Boolean(selectedProject)}
        onOpenChange={(open) => !open && setSelectedProject(null)}
      />
    </ShowcaseShell>
  );
}

function CategoryTabs({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {["All", ...showcaseCategories].map((category) => (
        <Button
          key={category}
          size="sm"
          type="button"
          variant={value === category ? "default" : "secondary"}
          onClick={() => onChange(category)}
        >
          {category}
        </Button>
      ))}
    </div>
  );
}

export function ShowcaseMyProjectsPageView() {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ShowcaseView>("table");
  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<ShowcaseProject | null>(null);
  const [viewProject, setViewProject] = useState<ShowcaseProject | null>(null);
  const [deactivateProject, setDeactivateProject] =
    useState<ShowcaseProject | null>(null);
  const projects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return showcaseProjects;
    }

    return showcaseProjects.filter((project) =>
      [
        project.name,
        project.owner,
        project.category,
        project.status,
        project.visibility,
        project.shortDescription,
        project.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query]);

  const columns: DataTableColumn<ShowcaseProject>[] = [
    {
      key: "project",
      header: "Project",
      cell: (project) => (
        <div className="flex items-center gap-3">
          <MediaBlock
            image={project.coverImage}
            title={project.name}
            className="h-12 w-16 rounded-md"
          />
          <div>
            <p className="text-sm font-semibold">{project.name}</p>
            <p className="text-xs text-muted-foreground">{project.owner}</p>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Category" },
    { key: "status", header: "Status", cell: (project) => <Pill value={project.status} /> },
    {
      key: "visibility",
      header: "Visibility",
      cell: (project) => <Pill value={project.visibility} />,
    },
    { key: "views", header: "Views" },
    { key: "linkClicks", header: "Link Clicks" },
    { key: "stars", header: "Stars" },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      cell: (project) => (
        <AdminActionMenu
          items={[
            { label: "View", icon: FiEye, onSelect: () => setViewProject(project) },
            { label: "Edit", icon: FiEdit, onSelect: () => setEditProject(project) },
            {
              label: "Deactivate",
              icon: FiTrash2,
              destructive: true,
              onSelect: () => setDeactivateProject(project),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <ShowcaseShell>
      <ShowcasePageHeader
        title="My Projects"
        description="Create, edit, publish, and monitor your Showcase projects."
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            Create Project
          </Button>
        }
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="Search my projects" />
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>
      {viewMode === "table" ? (
        <CampusDataTable
          columns={columns}
          data={projects}
          getRowId={(project) => project.id}
          empty={<Empty filterName={query || "projects"} icon={FiBookOpen} />}
        />
      ) : projects.length > 0 ? (
        <StaggerContainer
          key={query.trim() ? `filtered-${query.trim()}` : "all-projects"}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onView={setViewProject} />
          ))}
        </StaggerContainer>
      ) : (
        <Empty filterName={query || "projects"} icon={FiBookOpen} />
      )}
      <ProjectFormModal open={createOpen} onOpenChange={setCreateOpen} title="Create Project" />
      <ProjectFormModal
        open={Boolean(editProject)}
        onOpenChange={(open) => !open && setEditProject(null)}
        title="Edit Project"
        project={editProject}
      />
      <ProjectDetailsSheet
        project={viewProject}
        open={Boolean(viewProject)}
        onOpenChange={(open) => !open && setViewProject(null)}
      />
      <ConfirmDialog
        open={Boolean(deactivateProject)}
        onOpenChange={(open) => !open && setDeactivateProject(null)}
        title="Deactivate Project"
        description={`Deactivate ${deactivateProject?.name ?? "this project"} so it is no longer discoverable.`}
        confirmLabel="Deactivate"
        destructive
        onConfirm={() =>
          campusToast.warning({
            title: "Project Deactivated",
            description: `${deactivateProject?.name ?? "Project"} has been archived.`,
          })
        }
      />
    </ShowcaseShell>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: ShowcaseView;
  onChange: (value: ShowcaseView) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-border bg-surface p-1">
      {[
        { value: "table" as const, icon: FiList, label: "Table" },
        { value: "grid" as const, icon: FiGrid, label: "Cards" },
      ].map((item) => {
        const Icon = item.icon;
        return (
          <Button
            key={item.value}
            aria-label={item.label}
            className="h-9 rounded-full px-4"
            size="sm"
            type="button"
            variant={value === item.value ? "default" : "ghost"}
            onClick={() => onChange(item.value)}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </Button>
        );
      })}
    </div>
  );
}

function ProjectFormModal({
  open,
  onOpenChange,
  title,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  project?: ShowcaseProject | null;
}) {
  const initialTags = project?.tags.length ? project.tags : [""];
  const initialTeamMembers = project?.teamMembers.length ? project.teamMembers : [""];
  const [step, setStep] = useState(0);
  const [tags, setTags] = useState(initialTags);
  const [teamMembers, setTeamMembers] = useState(initialTeamMembers);
  const [galleryItems, setGalleryItems] = useState([""]);
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    values: {
      name: project?.name ?? "",
      shortDescription: project?.shortDescription ?? "",
      detailedDescription: project?.detailedDescription ?? "",
      category: project?.category ?? "AI & Data",
      status: project?.status ?? "Prototype",
      visibility: project?.visibility ?? "Public",
      roleVisibility: project?.roleVisibility ?? ["Students"],
      tags: initialTags.filter(Boolean).join(", "),
      teamMembers: initialTeamMembers.filter(Boolean).join(", "),
      demoLink: project?.demoLink ?? "",
      websiteLink: project?.websiteLink ?? "",
      githubLink: project?.githubLink ?? "",
      videoLink: project?.videoLink ?? "",
      documentLinks:
        project?.documents
          .map((document) => `${document.title} | ${document.type} | ${document.url}`)
          .join("\n") ?? "",
      coverImage: "",
      gallery: "",
      logo: "",
    },
  });
  const selectedRoles = form.watch("roleVisibility") ?? [];
  const steps = [
    "Project Overview",
    "Team Members",
    "Tags",
    "Resources",
    "Media",
  ];
  const isLastStep = step === steps.length - 1;

  function toggleRole(value: ShowcaseRoleAudience) {
    const next = selectedRoles.includes(value)
      ? selectedRoles.filter((item) => item !== value)
      : [...selectedRoles, value];
    form.setValue("roleVisibility", next, { shouldValidate: true });
  }

  function updateList(
    values: string[],
    index: number,
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    formKey?: "tags" | "teamMembers" | "gallery",
  ) {
    const next = values.map((item, itemIndex) =>
      itemIndex === index ? value : item,
    );
    setter(next);
    if (formKey) {
      form.setValue(formKey, next.filter(Boolean).join(", "), {
        shouldValidate: true,
      });
    }
  }

  function addListItem(setter: React.Dispatch<React.SetStateAction<string[]>>) {
    setter((current) => [...current, ""]);
  }

  function removeListItem(
    values: string[],
    index: number,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    formKey?: "tags" | "teamMembers" | "gallery",
  ) {
    const next =
      values.length > 1
        ? values.filter((_, itemIndex) => itemIndex !== index)
        : [""];
    setter(next);
    if (formKey) {
      form.setValue(formKey, next.filter(Boolean).join(", "), {
        shouldValidate: true,
      });
    }
  }

  function submit(values: ProjectFormValues) {
    const cleanedTags = tags.map((tag) => tag.trim()).filter(Boolean);
    const cleanedMembers = teamMembers
      .map((member) => member.trim())
      .filter(Boolean);
    form.setValue("tags", cleanedTags.join(", "), { shouldValidate: true });
    form.setValue("teamMembers", cleanedMembers.join(", "), {
      shouldValidate: true,
    });
    campusToast.success({
      title: title === "Create Project" ? "Project Published" : "Project Updated",
      description: `${values.name} has been saved in Showcase.`,
    });
    campusToast.info({
      title: "XP Earned",
      description: "You earned 120 XP for improving your innovation profile.",
    });
    onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Publish portfolio work, research, innovation, or startup progress."
    >
      <form
        className="space-y-6"
        onSubmit={(event) => {
          if (!isLastStep) {
            event.preventDefault();
            setStep((current) => Math.min(steps.length - 1, current + 1));
            return;
          }
          void form.handleSubmit(submit)(event);
        }}
      >
        <MultiStepProgress
          activeIndex={step}
          className="mb-8"
          maxClickableIndex={steps.length - 1}
          steps={steps.map((step) => ({
            label: step,
            icon: FiZap,
          }))}
          onStepClick={setStep}
        />

        {step === 0 ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Project Name" error={form.formState.errors.name?.message}>
                <CampusInput placeholder="AfyaTrack AI" {...form.register("name")} />
              </Field>
              <Field label="Category" error={form.formState.errors.category?.message}>
                <RadixSelectField
                  value={form.watch("category")}
                  onChange={(value) => form.setValue("category", value, { shouldValidate: true })}
                  placeholder="Choose category"
                  options={showcaseCategories}
                />
              </Field>
              <Field label="Status">
                <RadixSelectField
                  value={form.watch("status")}
                  onChange={(value) =>
                    form.setValue("status", value as ShowcaseStatus, { shouldValidate: true })
                  }
                  placeholder="Choose status"
                  options={statusOptions}
                />
              </Field>
              <Field label="Visibility">
                <RadixSelectField
                  value={form.watch("visibility")}
                  onChange={(value) =>
                    form.setValue("visibility", value as ShowcaseVisibility, {
                      shouldValidate: true,
                    })
                  }
                  placeholder="Choose visibility"
                  options={visibilityOptions}
                />
              </Field>
            </div>
            {form.watch("visibility") === "Role-Based" ? (
              <div>
                <p className="text-sm font-medium">Role-Based Access</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {roleVisibilityOptions.map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-3 rounded-md border border-border bg-surface-muted px-3 py-3 text-sm"
                    >
                      <Checkbox
                        checked={selectedRoles.includes(option)}
                        onChange={() => toggleRole(option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            <Field
              label="Short Description"
              error={form.formState.errors.shortDescription?.message}
            >
              <CampusInput
                placeholder="A privacy-first AI triage assistant for campus clinics."
                {...form.register("shortDescription")}
              />
            </Field>
            <Field
              label="Detailed Description"
              error={form.formState.errors.detailedDescription?.message}
            >
              <CampusTextarea
                rows={5}
                placeholder="Explain the problem, target users, solution, progress, impact, and next steps."
                {...form.register("detailedDescription")}
              />
            </Field>
          </div>
        ) : null}

        {step === 1 ? (
          <DynamicProjectList
            addLabel="Add Member"
            items={teamMembers}
            label="Team Members"
            placeholder="Team member name"
            onAdd={() => addListItem(setTeamMembers)}
            onRemove={(index) =>
              removeListItem(teamMembers, index, setTeamMembers, "teamMembers")
            }
            onUpdate={(index, value) =>
              updateList(teamMembers, index, value, setTeamMembers, "teamMembers")
            }
          />
        ) : null}

        {step === 2 ? (
          <DynamicProjectList
            addLabel="Add Tag"
            items={tags}
            label="Tags"
            placeholder="Health Innovation"
            onAdd={() => addListItem(setTags)}
            onRemove={(index) => removeListItem(tags, index, setTags, "tags")}
            onUpdate={(index, value) => updateList(tags, index, value, setTags, "tags")}
          />
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Demo Link">
                <CampusInput placeholder="Demo URL" {...form.register("demoLink")} />
              </Field>
              <Field label="Website Link">
                <CampusInput placeholder="https://project.example.com" {...form.register("websiteLink")} />
              </Field>
              <Field label="GitHub Link">
                <CampusInput placeholder="https://github.com/team/project" {...form.register("githubLink")} />
              </Field>
              <Field label="Video Link">
                <CampusInput placeholder="https://video.example.com/project" {...form.register("videoLink")} />
              </Field>
            </div>
            <Field label="Related Documents">
              <CampusTextarea
                rows={4}
                placeholder={"Project Proposal | Proposal | https://docs.example.com/proposal\nResearch Paper | Research Paper | https://docs.example.com/paper"}
                {...form.register("documentLinks")}
              />
            </Field>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <CampusFileUpload
                label="Project Cover Page"
                value={form.watch("coverImage")}
                onValueChange={(value) => form.setValue("coverImage", value)}
              />
              <CampusFileUpload
                label="Project Logo Optional"
                value={form.watch("logo")}
                onValueChange={(value) => form.setValue("logo", value)}
              />
            </div>
            <DynamicProjectList
              addLabel="Add Gallery Image"
              items={galleryItems}
              label="Project Gallery"
              placeholder="https://images.example.com/project-screen.png"
              onAdd={() => addListItem(setGalleryItems)}
              onRemove={(index) =>
                removeListItem(galleryItems, index, setGalleryItems, "gallery")
              }
              onUpdate={(index, value) =>
                updateList(galleryItems, index, value, setGalleryItems, "gallery")
              }
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            className="flex-1"
            disabled={step === 0}
            type="button"
            variant="secondary"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
          >
            Back
          </Button>
          {!isLastStep ? (
            <Button
              className="flex-1"
              type="button"
              onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}
            >
              Next
            </Button>
          ) : (
            <Button className="flex-1" type="submit">
              {title}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}

function DynamicProjectList({
  label,
  items,
  placeholder,
  addLabel,
  onAdd,
  onRemove,
  onUpdate,
}: {
  label: string;
  items: string[];
  placeholder: string;
  addLabel: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        <Button size="sm" type="button" variant="secondary" onClick={onAdd}>
          <FiPlus className="h-4 w-4" aria-hidden="true" />
          {addLabel}
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={`${label}-${index}`} className="flex gap-2">
            <CampusInput
              value={item}
              placeholder={`${placeholder}${index > 0 ? ` ${index + 1}` : ""}`}
              onChange={(event) => onUpdate(index, event.target.value)}
            />
            <Button
              aria-label={`Remove ${label.toLowerCase()} field`}
              size="icon"
              type="button"
              variant="secondary"
              onClick={() => onRemove(index)}
            >
              <FiTrash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShowcaseLeaderboardsPageView() {
  const tabs = [
    {
      key: "top",
      label: "Top",
      icon: FiAward,
      content: (
        <LeaderboardCard
          title="Top Projects"
          projects={extendedShowcaseLeaderboards.topProjects}
        />
      ),
    },
    {
      key: "trending",
      label: "Trending",
      icon: FiTrendingUp,
      content: (
        <LeaderboardCard
          title="Trending This Week"
          projects={extendedShowcaseLeaderboards.trendingThisWeek}
        />
      ),
    },
    {
      key: "viewed",
      label: "Most Viewed",
      icon: FiEye,
      content: (
        <LeaderboardCard
          title="Most Viewed"
          projects={extendedShowcaseLeaderboards.mostViewed}
          metric="views"
        />
      ),
    },
    {
      key: "starred",
      label: "Most Starred",
      icon: FiStar,
      content: (
        <LeaderboardCard
          title="Most Starred"
          projects={extendedShowcaseLeaderboards.mostStarred}
          metric="stars"
        />
      ),
    },
    {
      key: "creators",
      label: "Creators",
      icon: FiUsers,
      content: (
        <CreatorLeaderboard
          title="Most Active Creators"
          items={showcaseLeaderboards.mostActiveCreators}
        />
      ),
    },
    {
      key: "innovators",
      label: "Innovators",
      icon: FiZap,
      content: (
        <CreatorLeaderboard
          title="Top Innovators"
          items={showcaseLeaderboards.topInnovators}
        />
      ),
    },
  ];
  const [activeTab, setActiveTab] = useState(tabs[0].key);
  const activeContent =
    tabs.find((tab) => tab.key === activeTab)?.content ?? tabs[0].content;

  return (
    <ShowcaseShell>
      <ShowcasePageHeader
        title="Leaderboards"
        description="Recognize projects, creators, innovators, and activity shaping the university innovation ecosystem."
      />
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.key}
              type="button"
              variant={activeTab === tab.key ? "default" : "secondary"}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </Button>
          );
        })}
      </div>
      <div className="mt-5 w-full">
        {activeContent}
      </div>
    </ShowcaseShell>
  );
}

function LeaderboardCard({
  title,
  projects,
  metric = "stars",
}: {
  title: string;
  projects: ShowcaseProject[];
  metric?: "stars" | "views";
}) {
  const [expandedProjectId, setExpandedProjectId] = useState(projects[0]?.id ?? "");

  if (projects.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Empty
            title="No ranked projects yet"
            description="Leaderboard rows will appear after real showcase activity is captured."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Top 10 projects ranked by campus engagement.
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {projects.length} ranked projects
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {projects.map((project, index) => (
          <Button
            key={`${title}-${project.id}`}
            type="button"
            variant="ghost"
            className="flex h-auto w-full flex-col items-stretch justify-start rounded-lg border border-border bg-surface-muted p-0 text-left font-normal transition-all hover:border-primary/40 hover:bg-primary/5"
            onClick={() =>
              setExpandedProjectId((current) =>
                current === project.id ? "" : project.id,
              )
            }
          >
            <div className="flex items-center gap-3 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {index + 1}
              </span>
              <MediaBlock
                image={project.coverImage}
                title={project.name}
                className="h-14 w-20 shrink-0 rounded-md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{project.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {project.owner} · {project.category}
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <span className="text-sm font-semibold text-primary">
                  {metric === "stars"
                    ? `${project.stars} stars`
                    : `${project.views.toLocaleString()} views`}
                </span>
                <p className="mt-1 text-xs text-muted-foreground">
                  {project.uniqueVisitors.toLocaleString()} unique visitors
                </p>
              </div>
              <FiChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  expandedProjectId === project.id && "rotate-180 text-primary",
                )}
                aria-hidden="true"
              />
            </div>
            {expandedProjectId === project.id ? (
              <div className="grid gap-4 border-t border-border p-4 lg:grid-cols-[1.3fr_0.7fr]">
                <div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {project.shortDescription}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.tags.slice(0, 4).map((tag) => (
                      <span
                        key={`${project.id}-${tag}`}
                        className="rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-md bg-background p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Views
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {project.views.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-md bg-background p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Stars
                    </p>
                    <p className="mt-1 text-sm font-semibold">{project.stars}</p>
                  </div>
                  <div className="rounded-md bg-background p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Status
                    </p>
                    <p className="mt-1 text-sm font-semibold">{project.status}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

function CreatorLeaderboard({
  title,
  items,
}: {
  title: string;
  items: { name: string; value: string; meta: string }[];
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Empty
            title="No featured innovators yet"
            description="Featured innovators will appear after public showcase engagement is available."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.name}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted p-3"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {index + 1}
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.meta}</p>
            </div>
            <span className="text-sm font-semibold text-primary">{item.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ShowcaseAchievementsPageView() {
  const [celebratingBadge, setCelebratingBadge] = useState<ShowcaseBadge | null>(null);
  const xpSummary = getShowcaseXpSummary();

  return (
    <ShowcaseShell>
      <ShowcasePageHeader
        title="Achievements & XP"
        description="Track level progression, XP sources, badge collection, streaks, and featured achievement identity."
      />
      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Level {xpSummary.level}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {xpSummary.currentXp.toLocaleString()} XP earned
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${xpSummary.progressPercent}%`,
                }}
              />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Metric
                icon={FiZap}
                label="Current XP"
                value={formatMetric(xpSummary.currentXp)}
              />
              <Metric
                icon={FiTrendingUp}
                label="Daily Streak"
                value={`${formatMetric(xpSummary.streak)} days`}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>XP Sources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {xpSources.map((source) => (
              <div key={source.source}>
                <div className="flex items-center justify-between text-sm">
                  <span>{source.source}</span>
                  <span className="font-semibold text-primary">{source.xp} XP</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min((source.xp / 900) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
      <section className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Badge Collection</CardTitle>
            <p className="text-sm text-muted-foreground">
              Show, hide, or feature badges on your CampusHub profile.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {showcaseBadges.map((badge) => (
              <div
                key={badge.id}
                className={cn(
                  "rounded-lg border border-border bg-surface-muted p-4 transition-all hover:-translate-y-1",
                  badge.status === "Featured" && "border-amber-500/50",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FiAward className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <AdminActionMenu
                    label={`Open actions for ${badge.name}`}
                    items={[
                      {
                        label: "Display on profile",
                        icon: FiEye,
                        disabled: !badge.unlocked,
                        onSelect: () =>
                          campusToast.info({
                            title: "Badge Displayed",
                            description: `${badge.name} will be shown on your profile.`,
                          }),
                      },
                      {
                        label: "Hide from profile",
                        icon: FiEyeOff,
                        disabled: !badge.unlocked,
                        onSelect: () =>
                          campusToast.info({
                            title: "Badge Hidden",
                            description: `${badge.name} will be hidden from your profile.`,
                          }),
                      },
                      {
                        label: badge.unlocked
                          ? "Replay unlock celebration"
                          : "Preview unlock celebration",
                        icon: FiAward,
                        onSelect: () => setCelebratingBadge(badge),
                      },
                      {
                        label: "Feature badge",
                        icon: FiStar,
                        disabled: !badge.unlocked,
                        onSelect: () =>
                          campusToast.info({
                            title: "Badge Featured",
                            description: `${badge.name} is now featured on your profile.`,
                          }),
                      },
                    ]}
                  />
                </div>
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    <Pill value={badge.unlocked ? badge.status : "Locked"} />
                    <Pill value={badge.rarity} />
                  </div>
                </div>
                <h3 className="mt-4 text-sm font-semibold">{badge.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {badge.description}
                </p>
                <p className="mt-3 text-xs font-semibold text-primary">
                  {badge.xp} XP
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
      <AchievementModal
        open={Boolean(celebratingBadge)}
        onOpenChange={(open) => !open && setCelebratingBadge(null)}
        badgeName={celebratingBadge?.name ?? "Achievement"}
        badgeRarity={celebratingBadge?.rarity ?? "Common"}
        badgeDescription={
          celebratingBadge
            ? `${celebratingBadge.description} This badge was earned because your CampusHub activity met the achievement criteria.`
            : "This badge was earned through meaningful CampusHub activity."
        }
        congratulationsMessage="Congratulations. Your campus activity unlocked a new achievement."
        xpEarned={celebratingBadge?.xp ?? 0}
        currentLevel={xpSummary.level}
        currentXp={xpSummary.currentXp}
        nextLevelXp={xpSummary.nextLevelXp}
        badgeIcon={<FiAward className="h-12 w-12" aria-hidden="true" />}
        onViewBadge={() =>
          celebratingBadge
            ? campusToast.info({
                title: "Badge Selected",
                description: `${celebratingBadge.name} is ready to view in your badge collection.`,
              })
            : undefined
        }
        onContinue={() => setCelebratingBadge(null)}
      />
    </ShowcaseShell>
  );
}

export function PublicShowcasePageView() {
  const [selectedProject, setSelectedProject] = useState<ShowcaseProject | null>(null);
  const publicProjects = showcaseProjects.filter(
    (project) => project.visibility === "Public",
  );

  return (
    <main className="bg-background text-foreground">
      <section className="relative isolate overflow-hidden border-b border-border">
        <MediaBlock
          image="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1600&q=80"
          title="Students presenting innovation work"
          className="absolute inset-0 -z-10"
        />
        <div className="absolute inset-0 -z-10 bg-black/68" />
        <div className="mx-auto flex min-h-[620px] max-w-7xl flex-col justify-end px-4 pb-20 pt-48 text-white sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase text-primary">
            CampusHub Showcase
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold sm:text-6xl">
            Student innovation, visible.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-200">
            Explore public projects, research, startups, and standout creators
            emerging from university communities.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="#public-projects">Explore Projects</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="#leaderboards">View Leaderboards</Link>
            </Button>
          </div>
        </div>
      </section>
      <section id="public-projects" className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase text-primary">
              Public Projects
            </p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
              Projects guests can view.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Guests can browse public work and featured innovators. Starring,
              creation, and private project access remain available only inside
              CampusHub.
            </p>
          </div>
          {publicProjects.length > 0 ? (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {publicProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  publicMode
                  project={project}
                  onView={setSelectedProject}
                />
              ))}
            </div>
          ) : (
            <Empty
              className="mt-10"
              title="No public projects yet"
              description="Public student projects will appear here after creators publish real showcase records."
            />
          )}
        </div>
      </section>
      <section id="leaderboards" className="border-b border-border bg-secondary-background py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <CreatorLeaderboard
            title="Featured Innovators"
            items={showcaseLeaderboards.topInnovators}
          />
          <LeaderboardCard
            title="Public Leaderboard"
            projects={showcaseLeaderboards.mostStarred.filter(
              (project) => project.visibility === "Public",
            )}
          />
        </div>
      </section>
      <ProjectDetailsSheet
        publicMode
        project={selectedProject}
        open={Boolean(selectedProject)}
        onOpenChange={(open) => !open && setSelectedProject(null)}
      />
    </main>
  );
}
