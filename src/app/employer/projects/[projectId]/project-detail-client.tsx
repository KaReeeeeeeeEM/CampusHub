"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiExternalLink,
  FiEye,
  FiFileText,
  FiStar,
  FiUser,
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

type EmployerProjectDetail = {
  id: string;
  ownerId: string | null;
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

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(value: unknown) {
  const next = Number(value);

  return Number.isFinite(next) ? next : 0;
}

function normalizeProject(value: unknown, index: number): EmployerProjectDetail | null {
  if (!value || typeof value !== "object") return null;

  const project = value as Record<string, unknown>;
  const image = stringValue(project.image, "/logo.png");
  const galleryImages = Array.isArray(project.galleryImages)
    ? project.galleryImages.map((item) => stringValue(item, "")).filter(Boolean)
    : [];
  const ownerId = stringValue(project.ownerId, "");

  return {
    id: stringValue(project.id, `project-${index}`),
    ownerId: ownerId || null,
    name: stringValue(project.name, `Untitled project ${index + 1}`),
    owner: stringValue(project.owner, "Unknown creator"),
    university: stringValue(project.university, "Not set"),
    department: stringValue(project.department, "Not set"),
    category: stringValue(project.category, "General"),
    projectType: stringValue(project.projectType, "Project"),
    summary: stringValue(project.summary, "No project summary has been added yet."),
    image,
    galleryImages: galleryImages.length ? galleryImages : [image],
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
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-background",
        className,
      )}
    >
      <img
        alt={alt}
        className="h-full w-full object-contain p-8"
        src={src}
        onError={(event) => {
          event.currentTarget.src = "/logo.png";
        }}
      />
    </div>
  );
}

function ProjectDetailSkeleton() {
  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-[420px] rounded-lg" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </section>
  );
}

export function EmployerProjectDetailClient({
  projectId,
}: {
  projectId: string;
}) {
  const [projects, setProjects] = useState<EmployerProjectDetail[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );

  useEffect(() => {
    let active = true;

    async function loadProject() {
      try {
        setStatus("loading");
        const response = await fetch("/api/employer/portal-summary", {
          credentials: "include",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error?.message ?? "Unable to load project.");
        }

        const next = payload?.data?.summary ?? payload?.summary ?? payload;
        const normalized = Array.isArray(next?.projects)
          ? next.projects
              .map((project: unknown, index: number) =>
                normalizeProject(project, index),
              )
              .filter(
                (project: EmployerProjectDetail | null): project is EmployerProjectDetail =>
                  Boolean(project),
              )
          : [];

        if (active) {
          setProjects(normalized);
          setStatus("success");
        }
      } catch {
        if (active) {
          setStatus("error");
        }
      }
    }

    void loadProject();

    return () => {
      active = false;
    };
  }, []);

  const project = useMemo(
    () => projects.find((item) => item.id === decodeURIComponent(projectId)),
    [projectId, projects],
  );

  if (status === "loading") {
    return <ProjectDetailSkeleton />;
  }

  if (status === "error") {
    return (
      <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Button asChild variant="secondary">
          <Link href="/employer/showcase">
            <FiArrowLeft className="h-4 w-4" />
            Back to showcase
          </Link>
        </Button>
        <Empty
          title="Unable to load project"
          description="CampusHub could not load this employer-visible project."
          icon={FiFileText}
        />
      </section>
    );
  }

  if (!project) {
    return (
      <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Button asChild variant="secondary">
          <Link href="/employer/showcase">
            <FiArrowLeft className="h-4 w-4" />
            Back to showcase
          </Link>
        </Button>
        <Empty
          title="Project not found"
          description="This project is not available in the employer-visible showcase."
          icon={FiFileText}
        />
      </section>
    );
  }

  const gallery = project.galleryImages.slice(0, 4);

  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <Button asChild variant="secondary">
        <Link href="/employer/showcase">
          <FiArrowLeft className="h-4 w-4" />
          Back to showcase
        </Link>
      </Button>

      <Card className="overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[minmax(320px,560px)_1fr]">
          <div className="border-b border-border bg-surface-muted p-5 xl:border-b-0 xl:border-r">
            <ProjectImage
              alt={`${project.name} preview`}
              className="aspect-[4/3] h-full min-h-[360px]"
              src={project.image}
            />
          </div>
          <div className="flex flex-col gap-6 p-6 lg:p-8">
            <div>
              <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {project.projectType}
              </span>
              <h1 className="mt-4 text-3xl font-semibold leading-tight text-foreground">
                {project.name}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                {project.owner} · {project.department} · {project.university}
              </p>
              <p className="mt-6 max-w-3xl text-sm leading-7 text-muted-foreground">
                {project.summary}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
            {[
                ["Views", formatCompactNumber(project.views), FiEye],
                ["Stars", formatCompactNumber(project.stars), FiStar],
                ["Documents", formatCompactNumber(project.documents.length), FiFileText],
              ].map(([label, value, Icon]) => (
                <div key={label as string} className="rounded-lg border border-border bg-background p-4">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  <p className="mt-3 text-xl font-semibold">{value as string}</p>
                  <p className="text-xs text-muted-foreground">{label as string}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Category
                </p>
                <p className="mt-2 font-semibold text-foreground">{project.category}</p>
              </div>
              {project.ownerId ? (
                <Button asChild className="h-full min-h-[74px]" variant="secondary">
                  <Link href={`/employer/candidates/${encodeURIComponent(project.ownerId)}`}>
                    <FiUser className="h-4 w-4" />
                    View creator profile
                  </Link>
                </Button>
              ) : (
                <div className="rounded-lg border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Creator
                  </p>
                  <p className="mt-2 font-semibold text-foreground">{project.owner}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project Gallery</CardTitle>
            <CardDescription>Visual previews attached to this project.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {gallery.map((image, index) => (
              <ProjectImage
                key={`${image}-${index}`}
                alt={`${project.name} gallery ${index + 1}`}
                className="aspect-video [&_img]:p-4"
                src={image}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resources</CardTitle>
            <CardDescription>Documents and external links shared by the creator.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Documents</p>
              {project.documents.length ? (
                project.documents.map((document) => (
                  <div
                    key={document}
                    className="flex items-center gap-3 rounded-lg bg-background p-3 text-sm"
                  >
                    <FiFileText className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="truncate">{document}</span>
                  </div>
                ))
              ) : (
                <p className="rounded-lg bg-background p-3 text-sm text-muted-foreground">
                  No project documents attached.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Links</p>
              {project.links.length ? (
                project.links.map((link) => (
                  <a
                    key={link}
                    className="flex items-center gap-3 rounded-lg bg-background p-3 text-sm transition hover:bg-primary/5"
                    href={link}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <FiExternalLink className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="truncate">{link}</span>
                  </a>
                ))
              ) : (
                <p className="rounded-lg bg-background p-3 text-sm text-muted-foreground">
                  No external links attached.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
