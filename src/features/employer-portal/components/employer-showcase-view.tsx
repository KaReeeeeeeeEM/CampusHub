"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FiExternalLink,
  FiEye,
  FiFileText,
  FiStar,
  FiUsers,
} from "react-icons/fi";

import { Empty } from "@/components/shared/empty";
import { Skeleton } from "@/components/shared/skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCompactNumber } from "@/lib/number-format";
import { cn } from "@/lib/utils";

type EmployerShowcaseProject = {
  id: string;
  name: string;
  owner: string;
  university: string;
  department: string;
  category: string;
  projectType: string;
  summary: string;
  image: string;
  galleryImages: string[];
  views: number;
  stars: number;
  documents: string[];
  links: string[];
};

type EmployerShowcaseStudent = {
  id: string;
  name: string;
  photo: string;
  department: string;
  projects: number;
  xp: number;
};

type ShowcaseSummary = {
  projects: EmployerShowcaseProject[];
  students: EmployerShowcaseStudent[];
};

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(value: unknown) {
  const next = Number(value);

  return Number.isFinite(next) ? next : 0;
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "CH"
  );
}

function normalizeProject(
  value: unknown,
  index: number,
): EmployerShowcaseProject | null {
  if (!value || typeof value !== "object") return null;

  const project = value as Record<string, unknown>;
  const image = stringValue(project.image, "/logo.png");
  const name = stringValue(project.name, `Untitled project ${index + 1}`);
  const galleryImages = Array.isArray(project.galleryImages)
    ? project.galleryImages
        .map((item) => stringValue(item, ""))
        .filter(Boolean)
    : [];

  return {
    id: stringValue(project.id, `project-${index}`),
    name,
    owner: stringValue(project.owner, "Unknown creator"),
    university: stringValue(project.university, "Not set"),
    department: stringValue(project.department, "Not set"),
    category: stringValue(project.category, "General"),
    projectType: stringValue(project.projectType, "Project"),
    summary: stringValue(project.summary, "No project summary has been added yet."),
    image,
    galleryImages: galleryImages.length ? galleryImages : [image, image, image],
    views: numberValue(project.views),
    stars: numberValue(project.stars),
    documents: Array.isArray(project.documents)
      ? project.documents.map((item) => stringValue(item, "")).filter(Boolean)
      : [],
    links: Array.isArray(project.links)
      ? project.links.map((item) => stringValue(item, "")).filter(Boolean)
      : [],
  };
}

function normalizeStudent(
  value: unknown,
  index: number,
): EmployerShowcaseStudent | null {
  if (!value || typeof value !== "object") return null;

  const student = value as Record<string, unknown>;
  const name = stringValue(student.name, `Talent profile ${index + 1}`);

  return {
    id: stringValue(student.id, `student-${index}`),
    name,
    photo: stringValue(student.photo, initials(name)),
    department: stringValue(student.department, "Not set"),
    projects: numberValue(student.projects),
    xp: numberValue(student.xp),
  };
}

function ProjectPreview({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-border bg-surface-muted",
        className,
      )}
    >
      <img
        alt={alt}
        className="h-full w-full object-cover"
        src={src}
        onError={(event) => {
          event.currentTarget.src = "/logo.png";
        }}
      />
    </div>
  );
}

function ShowcaseSkeleton() {
  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-full max-w-xl" />
        <Skeleton className="h-4 w-full max-w-3xl" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <Skeleton className="h-[430px] rounded-lg" />
        <div className="grid gap-5">
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-44 rounded-lg" />
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-80 rounded-lg" />
        ))}
      </div>
    </section>
  );
}

export function EmployerShowcasePageView() {
  const [summary, setSummary] = useState<ShowcaseSummary>({
    projects: [],
    students: [],
  });
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [activeTab, setActiveTab] = useState("All");

  useEffect(() => {
    let active = true;

    async function loadShowcase() {
      try {
        setStatus("loading");
        const response = await fetch("/api/employer/portal-summary", {
          credentials: "include",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error?.message ?? "Unable to load showcase.");
        }

        const next = payload?.data?.summary ?? payload?.summary ?? payload;
        const projects = Array.isArray(next?.projects)
          ? next.projects
              .map((project: unknown, index: number) =>
                normalizeProject(project, index),
              )
              .filter((project: EmployerShowcaseProject | null): project is EmployerShowcaseProject =>
                Boolean(project),
              )
          : [];
        const students = Array.isArray(next?.students)
          ? next.students
              .map((student: unknown, index: number) =>
                normalizeStudent(student, index),
              )
              .filter((student: EmployerShowcaseStudent | null): student is EmployerShowcaseStudent =>
                Boolean(student),
              )
          : [];

        if (!active) return;
        setSummary({ projects, students });
        setStatus("success");
      } catch {
        if (active) setStatus("error");
      }
    }

    void loadShowcase();

    return () => {
      active = false;
    };
  }, []);

  const featuredProject = useMemo(() => {
    return (
      summary.projects
        .slice()
        .sort((a, b) => b.views - a.views || b.stars - a.stars)[0] ?? null
    );
  }, [summary.projects]);
  const topCreators = useMemo(
    () =>
      summary.students
        .slice()
        .sort((a, b) => b.projects - a.projects || b.xp - a.xp)
        .slice(0, 4),
    [summary.students],
  );
  const showcaseSignals = useMemo(
    () => [
      {
        label: "Views",
        value: featuredProject?.views ?? 0,
        display: formatCompactNumber(featuredProject?.views ?? 0),
      },
      {
        label: "Stars",
        value: featuredProject?.stars ?? 0,
        display: formatCompactNumber(featuredProject?.stars ?? 0),
      },
      {
        label: "Docs",
        value: featuredProject?.documents.length ?? 0,
        display: formatCompactNumber(featuredProject?.documents.length ?? 0),
      },
    ],
    [featuredProject],
  );
  const projectTypeSignals = useMemo(() => {
    const counts = summary.projects.reduce<Record<string, number>>((acc, project) => {
      const label = project.projectType || project.category || "Project";
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4);
  }, [summary.projects]);
  const strongestSignal = Math.max(
    1,
    ...showcaseSignals.map((signal) => signal.value),
    ...projectTypeSignals.map(([, value]) => value),
  );
  const visibleProjects = useMemo(() => {
    const projects = summary.projects.slice();

    if (activeTab === "Trending") {
      return projects.sort((a, b) => b.views - a.views);
    }

    if (activeTab === "Most Starred") {
      return projects.sort((a, b) => b.stars - a.stars);
    }

    if (activeTab === "Featured Innovations") {
      return projects.filter((project) => project.projectType === "Featured Innovation");
    }

    if (activeTab === "Research") {
      return projects.filter((project) => project.category === "Research");
    }

    return projects;
  }, [activeTab, summary.projects]);

  if (status === "loading") {
    return <ShowcaseSkeleton />;
  }

  if (status === "error") {
    return (
      <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Empty
          title="Unable to load employer showcase"
          description="CampusHub could not load employer-visible projects."
          icon={FiStar}
        />
      </section>
    );
  }

  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-4xl space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
          Showcase
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Discover innovations before they become resumes.
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Explore student projects from every university that allows employer
          visibility.
        </p>
      </div>

      {!featuredProject ? (
        <Empty
          title="No employer-visible projects yet"
          description="Published showcase projects from opted-in universities will appear here."
          icon={FiStar}
        />
      ) : (
        <>
          <section className="grid items-start gap-5 xl:grid-cols-[1.35fr_.65fr]">
            <Card className="h-fit overflow-hidden">
              <div className="grid lg:grid-cols-[minmax(260px,420px)_1fr]">
                <div className="border-b border-border bg-surface-muted p-5 lg:border-b-0 lg:border-r">
                  <ProjectPreview
                    alt={`${featuredProject.name} featured preview`}
                    className="aspect-[4/3] rounded-lg border-border bg-background lg:h-full lg:min-h-[360px] lg:aspect-auto [&_img]:object-contain [&_img]:p-8"
                    src={featuredProject.image}
                  />
                </div>
                <div className="flex flex-col gap-6 p-6 lg:p-7">
                  <div className="max-w-2xl">
                    <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {featuredProject.projectType}
                    </span>
                    <h2 className="mt-4 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                      {featuredProject.name}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {featuredProject.owner} · {featuredProject.department}
                    </p>
                    <p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground">
                      {featuredProject.summary}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {showcaseSignals.map((signal) => (
                      <div key={signal.label} className="rounded-lg border border-border bg-background p-3">
                        <p className="text-lg font-semibold text-foreground">{signal.display}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{signal.label}</p>
                        <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-muted">
                          <span
                            className="block h-full rounded-full bg-primary"
                            style={{ width: `${Math.max(12, (signal.value / strongestSignal) * 100)}%` }}
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">Project mix</p>
                      <p className="text-xs text-muted-foreground">{summary.projects.length} total</p>
                    </div>
                    <div className="space-y-3">
                      {projectTypeSignals.map(([label, value]) => (
                        <div key={label}>
                          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                            <span className="truncate text-muted-foreground">{label}</span>
                            <span className="font-medium text-foreground">{value}</span>
                          </div>
                          <span className="block h-2 overflow-hidden rounded-full bg-muted">
                            <span
                              className="block h-full rounded-full bg-primary"
                              style={{ width: `${Math.max(10, (value / strongestSignal) * 100)}%` }}
                            />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <div className="text-sm text-muted-foreground">
                      Featured from {featuredProject.university}
                    </div>
                    <Button asChild>
                      <Link href={`/employer/projects/${encodeURIComponent(featuredProject.id)}`}>
                        <FiEye className="h-4 w-4" />
                        View Project
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid gap-5">
              <Card>
                <CardHeader>
                  <CardTitle>Top Creators</CardTitle>
                  <CardDescription>
                    Students and alumni generating strong employer signals.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topCreators.length ? (
                    topCreators.map((student) => (
                      <Link
                        key={student.id}
                        className="flex items-center gap-3 rounded-lg bg-background p-3 transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        href={`/employer/candidates/${encodeURIComponent(student.id)}`}
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {student.photo}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {student.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {student.department} · {student.projects} projects
                          </span>
                        </span>
                      </Link>
                    ))
                  ) : (
                    <Empty
                      title="No creators yet"
                      description="Talent profiles will appear here."
                      icon={FiUsers}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Showcase Signals</CardTitle>
                  <CardDescription>
                    Live project discovery metrics for recruiting.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  {[
                    ["Projects", formatCompactNumber(summary.projects.length)],
                    [
                      "Views",
                      formatCompactNumber(
                        summary.projects.reduce((sum, project) => sum + project.views, 0),
                      ),
                    ],
                    [
                      "Stars",
                      formatCompactNumber(
                        summary.projects.reduce((sum, project) => sum + project.stars, 0),
                      ),
                    ],
                    [
                      "Docs",
                      formatCompactNumber(
                        summary.projects.reduce(
                          (sum, project) => sum + project.documents.length,
                          0,
                        ),
                      ),
                    ],
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
            {["All", "Trending", "Most Starred", "Featured Innovations", "Research"].map(
              (tab) => (
                <Button
                  key={tab}
                  type="button"
                  variant={activeTab === tab ? "default" : "secondary"}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </Button>
              ),
            )}
          </div>

          {visibleProjects.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleProjects.map((project) => (
                <Card key={project.id} className="overflow-hidden">
                  <ProjectPreview
                    alt={`${project.name} preview`}
                    className="aspect-[16/10] rounded-none border-0 border-b"
                    src={project.image}
                  />
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>
                      {project.owner} · {project.university}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {project.summary}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <FiEye className="h-3.5 w-3.5" />
                        {formatCompactNumber(project.views)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FiStar className="h-3.5 w-3.5" />
                        {formatCompactNumber(project.stars)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FiFileText className="h-3.5 w-3.5" />
                        {project.documents.length}
                      </span>
                      {project.links.length ? (
                        <span className="inline-flex items-center gap-1">
                          <FiExternalLink className="h-3.5 w-3.5" />
                          {project.links.length}
                        </span>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Empty
              title="No projects in this segment"
              description="Try another showcase segment."
              icon={FiStar}
            />
          )}
        </>
      )}
    </section>
  );
}
