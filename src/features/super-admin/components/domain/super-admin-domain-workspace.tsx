"use client";

import { useMemo, useState } from "react";
import {
  FiBarChart2,
  FiBookOpen,
  FiDatabase,
  FiEye,
  FiFilter,
  FiGrid,
  FiLink,
  FiList,
  FiSearch,
  FiShare2,
  FiStar,
} from "react-icons/fi";

import {
  CampusDataTable,
  CampusInput,
  CampusViewToggle,
  Empty,
} from "@/components/campushub";
import { Drawer } from "@/components/shared/drawer";
import type { DataTableColumn } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import type {
  SuperAdminDomainRecord,
  SuperAdminDomainWorkspace as SuperAdminDomainWorkspaceData,
  SuperAdminProjectShowcaseRecord,
} from "@/features/super-admin/lib/super-admin-domain-service";
import { cn } from "@/lib/utils";

type SuperAdminDomainWorkspaceProps = {
  workspace: SuperAdminDomainWorkspaceData;
};

type ProjectViewMode = "grid" | "table";

const projectViewOptions = [
  { value: "grid", label: "Card view", icon: FiGrid },
  { value: "table", label: "Table view", icon: FiList },
] as const;

function formatDate(value: string | null) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function ProjectPill({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
      {formatStatus(value)}
    </span>
  );
}

function ProjectCover({
  project,
  className,
}: {
  project: SuperAdminProjectShowcaseRecord;
  className?: string;
}) {
  return project.coverImage ? (
    <div
      aria-label={project.title}
      className={cn("bg-cover bg-center", className)}
      role="img"
      style={{ backgroundImage: `url(${project.coverImage})` }}
    />
  ) : (
    <div
      aria-label={project.title}
      className={cn(
        "flex items-center justify-center bg-primary/10 text-primary",
        className,
      )}
      role="img"
    >
      <FiBookOpen className="h-8 w-8" aria-hidden="true" />
    </div>
  );
}

function SuperAdminProjectCard({
  project,
  onView,
}: {
  project: SuperAdminProjectShowcaseRecord;
  onView: (project: SuperAdminProjectShowcaseRecord) => void;
}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
      <div className="relative">
        <ProjectCover
          project={project}
          className="aspect-[16/10] border-b border-border"
        />
        {project.featured ? (
          <span className="absolute right-3 top-3 inline-flex rounded-full border border-amber-500/30 bg-background/90 px-3 py-1 text-xs font-semibold text-amber-500 backdrop-blur">
            Featured
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{project.title}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {project.universityName} · {project.category}
            </p>
          </div>
          <ProjectPill value={project.visibility} />
        </div>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {project.summary}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <FiEye className="h-3.5 w-3.5" aria-hidden="true" />
            {project.views.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1">
            <FiStar className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
            {project.stars.toLocaleString()}
          </span>
          <span className="inline-flex items-center justify-end gap-1">
            <FiShare2 className="h-3.5 w-3.5" aria-hidden="true" />
            {project.shares.toLocaleString()}
          </span>
        </div>
        <div className="mt-auto pt-5">
          <Button
            className="w-full"
            type="button"
            variant="secondary"
            onClick={() => onView(project)}
          >
            <FiEye className="h-4 w-4" aria-hidden="true" />
            View Project
          </Button>
        </div>
      </div>
    </article>
  );
}

function SuperAdminProjectsShowcase({
  workspace,
}: {
  workspace: SuperAdminDomainWorkspaceData;
}) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ProjectViewMode>("grid");
  const [selectedProject, setSelectedProject] =
    useState<SuperAdminProjectShowcaseRecord | null>(null);
  const projects = workspace.projects ?? [];
  const filteredProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return projects;

    return projects.filter((project) =>
      [
        project.title,
        project.summary,
        project.description,
        project.universityName,
        project.category,
        project.status,
        project.projectStatus,
        project.visibility,
        project.tags.join(" "),
        project.techStack.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [projects, query]);
  const projectTab = workspace.tabs.find((tab) => tab.id === "projects") ?? workspace.tabs[0];
  const columns: DataTableColumn<SuperAdminProjectShowcaseRecord>[] = [
    {
      key: "project",
      header: "Project",
      cell: (project) => (
        <div className="flex items-center gap-3">
          <ProjectCover
            project={project}
            className="h-12 w-16 shrink-0 rounded-md"
          />
          <div>
            <p className="text-sm font-semibold">{project.title}</p>
            <p className="text-xs text-muted-foreground">
              {project.universityName}
            </p>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Category" },
    {
      key: "status",
      header: "Status",
      cell: (project) => <ProjectPill value={project.status} />,
    },
    {
      key: "visibility",
      header: "Visibility",
      cell: (project) => <ProjectPill value={project.visibility} />,
    },
    { key: "views", header: "Views" },
    { key: "stars", header: "Stars" },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      cell: (project) => (
        <Button
          size="sm"
          type="button"
          variant="secondary"
          onClick={() => setSelectedProject(project)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {projectTab.metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-border bg-surface p-5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FiBarChart2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="mt-5 text-3xl font-semibold">
              {metric.value.toLocaleString()}
            </p>
            <p className="mt-2 text-sm font-medium">{metric.label}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {metric.description}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-md">
          <span className="sr-only">Search projects</span>
          <FiSearch
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <CampusInput
            className="pl-9"
            placeholder="Search projects, universities, tags"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <CampusViewToggle
          value={view}
          options={projectViewOptions}
          onValueChange={setView}
        />
      </div>

      {view === "table" ? (
        <CampusDataTable
          columns={columns}
          data={filteredProjects}
          getRowId={(project) => project.id}
          empty={
            <Empty
              icon={query ? FiFilter : FiBookOpen}
              title={
                query
                  ? `No projects found for "${query}"`
                  : "No projects available"
              }
              description={
                query
                  ? "Try another search term or clear the search field."
                  : "Showcase projects from universities will appear here once they exist."
              }
            />
          }
        />
      ) : filteredProjects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <SuperAdminProjectCard
              key={project.id}
              project={project}
              onView={setSelectedProject}
            />
          ))}
        </div>
      ) : (
        <Empty
          icon={query ? FiFilter : FiBookOpen}
          title={query ? `No projects found for "${query}"` : "No projects available"}
          description={
            query
              ? "Try another search term or clear the search field."
              : "Showcase projects from universities will appear here once they exist."
          }
        />
      )}

      <Drawer
        open={Boolean(selectedProject)}
        onOpenChange={(open) => !open && setSelectedProject(null)}
        title={selectedProject?.title ?? "Project"}
        description={selectedProject?.universityName}
        className="max-w-2xl"
      >
        {selectedProject ? (
          <div className="space-y-5">
            <ProjectCover
              project={selectedProject}
              className="aspect-[16/9] overflow-hidden rounded-lg border border-border"
            />
            <div className="flex flex-wrap gap-2">
              <ProjectPill value={selectedProject.status} />
              <ProjectPill value={selectedProject.projectStatus} />
              <ProjectPill value={selectedProject.visibility} />
              {selectedProject.featured ? <ProjectPill value="Featured" /> : null}
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {selectedProject.description}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Views", selectedProject.views],
                ["Stars", selectedProject.stars],
                ["Shares", selectedProject.shares],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border p-3">
                  <p className="text-xs uppercase tracking-normal text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {Number(value).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            {selectedProject.tags.length > 0 ||
            selectedProject.techStack.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Tags and Stack</p>
                <div className="flex flex-wrap gap-2">
                  {[...selectedProject.tags, ...selectedProject.techStack].map(
                    (item) => (
                      <span
                        key={item}
                        className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                      >
                        {item}
                      </span>
                    ),
                  )}
                </div>
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                ["Demo", selectedProject.demoUrl],
                ["Repository", selectedProject.repositoryUrl],
                ["Project", selectedProject.projectUrl],
              ].map(([label, href]) =>
                typeof href === "string" && href ? (
                  <Button key={label} asChild type="button" variant="secondary">
                    <a href={href} target="_blank" rel="noreferrer">
                      <FiLink className="h-4 w-4" aria-hidden="true" />
                      {label}
                    </a>
                  </Button>
                ) : null,
              )}
            </div>
          </div>
        ) : null}
      </Drawer>
    </section>
  );
}

export function SuperAdminDomainWorkspace({
  workspace,
}: SuperAdminDomainWorkspaceProps) {
  if (workspace.domain === "projects") {
    return <SuperAdminProjectsShowcase workspace={workspace} />;
  }

  const [activeTabId, setActiveTabId] = useState(workspace.defaultTab);
  const [query, setQuery] = useState("");
  const activeTab =
    workspace.tabs.find((tab) => tab.id === activeTabId) ?? workspace.tabs[0];

  const filteredRecords = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return activeTab.records;

    return activeTab.records.filter((record) =>
      [
        record.title,
        record.subtitle,
        record.universityName,
        record.category,
        record.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [activeTab.records, query]);

  const columns: DataTableColumn<SuperAdminDomainRecord>[] = [
    {
      key: "title",
      header: "Record",
      cell: (record) => (
        <div>
          <p className="font-semibold">{record.title}</p>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {record.subtitle}
          </p>
        </div>
      ),
    },
    { key: "universityName", header: "University" },
    { key: "category", header: "Category" },
    { key: "status", header: "Status" },
    {
      key: "date",
      header: "Date",
      cell: (record) => formatDate(record.date),
    },
  ];

  return (
    <section className="space-y-6">
      <div
        className="flex gap-2 overflow-x-auto rounded-lg border border-border bg-surface p-2"
        role="tablist"
        aria-label="Super Admin module sections"
      >
        {workspace.tabs.map((tab) => {
          const active = tab.id === activeTab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn(
                "shrink-0 rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-background hover:text-foreground",
                active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              )}
              onClick={() => {
                setActiveTabId(tab.id);
                setQuery("");
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {activeTab.metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-border bg-surface p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FiBarChart2 className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Live
              </span>
            </div>
            <p className="mt-5 text-3xl font-semibold">
              {metric.value.toLocaleString()}
            </p>
            <p className="mt-2 text-sm font-medium">{metric.label}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {metric.description}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{activeTab.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeTab.description}
            </p>
          </div>
          <label className="relative block w-full lg:w-96">
            <span className="sr-only">Search {activeTab.label.toLowerCase()}</span>
            <FiSearch
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <CampusInput
              className="pl-9"
              placeholder={`Search ${activeTab.label.toLowerCase()}`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-5">
          <CampusDataTable
            columns={columns}
            data={filteredRecords}
            getRowId={(record) => record.id}
            empty={
              <Empty
                icon={query ? FiFilter : FiDatabase}
                title={
                  query
                    ? `No ${activeTab.label.toLowerCase()} found for "${query}"`
                    : `No ${activeTab.label.toLowerCase()} available`
                }
                description={
                  query
                    ? "Try another search term or clear the search field."
                    : "Live records from universities will appear here once they exist."
                }
              />
            }
          />
        </div>
      </div>
    </section>
  );
}
