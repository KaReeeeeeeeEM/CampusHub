"use client";

import { useMemo, useState, useTransition } from "react";
import {
  FiEdit,
  FiFilter,
  FiPlus,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";

import {
  CampusDataTable,
  CampusInput,
  CampusTextarea,
  Empty,
  campusToast,
} from "@/components/campushub";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { DataTableColumn } from "@/components/shared/data-table";
import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import type {
  PlatformContentInput,
  PlatformContentItem,
  PlatformContentType,
  PlatformContentUniversity,
} from "@/features/super-admin/lib/platform-content-service";

type PlatformContentManagementProps = {
  initialItems: PlatformContentItem[];
  universities: PlatformContentUniversity[];
  initialType?: PlatformContentType | "all";
  lockType?: boolean;
};

const typeOptions: Array<{ value: PlatformContentType | "all"; label: string }> = [
  { value: "all", label: "All Content" },
  { value: "announcements", label: "Announcements" },
  { value: "events", label: "Events" },
  { value: "almanac", label: "Almanac" },
  { value: "map-locations", label: "Map Locations" },
  { value: "polls", label: "Polls" },
  { value: "suggestions", label: "Suggestions" },
  { value: "forums", label: "Forums" },
  { value: "communities", label: "Communities" },
  { value: "committees", label: "Committees" },
];

const createTypeOptions = typeOptions.filter(
  (option): option is { value: PlatformContentType; label: string } =>
    option.value !== "all",
);

function labelForType(type: string) {
  return typeOptions.find((option) => option.value === type)?.label ?? type;
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function defaultForm(universities: PlatformContentUniversity[]): PlatformContentInput {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    type: "announcements",
    universityId: universities[0]?.id ?? "",
    title: "",
    description: "",
    category: "GENERAL",
    status: "DRAFT",
    startsAt: new Date().toISOString().slice(0, 16),
    endsAt: tomorrow.toISOString().slice(0, 16),
    venue: "",
    latitude: 0,
    longitude: 0,
    options: ["Yes", "No"],
  };
}

async function parseApiResponse<T>(response: Response) {
  const payload = (await response.json()) as {
    data: T | null;
    error: { message: string } | null;
  };

  if (!response.ok || payload.error || !payload.data) {
    throw new Error(payload.error?.message ?? "Request failed.");
  }

  return payload.data;
}

export function PlatformContentManagement({
  initialItems,
  universities,
  initialType = "all",
  lockType = false,
}: PlatformContentManagementProps) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<PlatformContentType | "all">(initialType);
  const [universityId, setUniversityId] = useState("all");
  const [form, setForm] = useState<PlatformContentInput>(() =>
    defaultForm(universities),
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformContentItem | null>(null);
  const [deleting, setDeleting] = useState<PlatformContentItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    return items.filter((item) => {
      const matchesType = type === "all" || item.type === type;
      const matchesUniversity =
        universityId === "all" || item.universityId === universityId;
      const matchesQuery =
        !normalized ||
        [
          item.title,
          item.universityName,
          item.category,
          item.status,
          item.description,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return matchesType && matchesUniversity && matchesQuery;
    });
  }, [items, query, type, universityId]);

  const columns: DataTableColumn<PlatformContentItem>[] = [
    {
      key: "title",
      header: "Record",
      cell: (item) => (
        <div>
          <p className="font-semibold">{item.title}</p>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {item.description || "No description"}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (item) => labelForType(item.type),
    },
    { key: "universityName", header: "University" },
    { key: "category", header: "Category" },
    { key: "status", header: "Status" },
    {
      key: "startsAt",
      header: "Date",
      cell: (item) => formatDate(item.startsAt ?? item.createdAt),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-32 text-right",
      cell: (item) => (
        <div className="flex justify-end gap-2">
          <Button
            size="icon"
            type="button"
            variant="ghost"
            onClick={() => {
              setEditing(item);
              setForm({
                ...defaultForm(universities),
                type: item.type,
                universityId: item.universityId,
                title: item.title,
                description: item.description,
                category: item.category,
                status: item.status,
                startsAt: item.startsAt?.slice(0, 16) ?? "",
              });
            }}
          >
            <FiEdit className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            size="icon"
            type="button"
            variant="ghost"
            onClick={() => setDeleting(item)}
          >
            <FiTrash2 className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      ),
    },
  ];

  function updateForm<K extends keyof PlatformContentInput>(
    key: K,
    value: PlatformContentInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submitForm() {
    startTransition(async () => {
      try {
        const response = await fetch(
          editing
            ? `/api/super-admin/platform-content/${editing.type}/${editing.id}`
            : "/api/super-admin/platform-content",
          {
            method: editing ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(form),
          },
        );
        const data = await parseApiResponse<{ item: PlatformContentItem }>(
          response,
        );

        setItems((current) =>
          editing
            ? current.map((item) => (item.id === data.item.id ? data.item : item))
            : [data.item, ...current],
        );
        setCreateOpen(false);
        setEditing(null);
        setForm(defaultForm(universities));
        campusToast.success({
          title: editing ? "Content Updated" : "Content Created",
          description: "The platform content record has been saved.",
        });
      } catch (error) {
        campusToast.error({
          title: "Content Not Saved",
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      }
    });
  }

  function deleteItem() {
    if (!deleting) return;

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/super-admin/platform-content/${deleting.type}/${deleting.id}`,
          {
            method: "DELETE",
            credentials: "include",
          },
        );
        await parseApiResponse<{ id: string; type: string }>(response);
        setItems((current) => current.filter((item) => item.id !== deleting.id));
        setDeleting(null);
        campusToast.success({
          title: "Content Deleted",
          description: "The record has been removed from active platform content.",
        });
      } catch (error) {
        campusToast.error({
          title: "Content Not Deleted",
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      }
    });
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-3 rounded-lg border border-border bg-surface p-4 lg:grid-cols-[1fr_220px_260px_auto]">
        <label className="relative">
          <span className="sr-only">Search platform content</span>
          <FiSearch
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <CampusInput
            className="pl-9"
            placeholder="Search platform content"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {lockType ? (
          <div className="flex h-11 items-center rounded-md border border-border bg-background px-3 text-sm font-medium">
            {labelForType(type)}
          </div>
        ) : (
          <Select
            value={type}
            onValueChange={(value) =>
              setType(value as PlatformContentType | "all")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={universityId} onValueChange={setUniversityId}>
          <SelectTrigger>
            <SelectValue placeholder="University" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Universities</SelectItem>
            {universities.map((university) => (
              <SelectItem key={university.id} value={university.id}>
                {university.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          onClick={() => {
            setEditing(null);
            setForm({
              ...defaultForm(universities),
              type: initialType === "all" ? "announcements" : initialType,
            });
            setCreateOpen(true);
          }}
        >
          <FiPlus className="h-4 w-4" aria-hidden="true" />
          Create
        </Button>
      </div>

      <CampusDataTable
        columns={columns}
        data={filtered}
        getRowId={(item) => item.id}
        empty={
          <Empty
            filterName={query || labelForType(type)}
            icon={FiFilter}
            title="No platform content"
            description="Records from universities will appear here once they are created."
          />
        }
      />

      <Modal
        open={createOpen || Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditing(null);
          }
        }}
        title={editing ? "Edit Platform Content" : "Create Platform Content"}
        description="Super Admin records are platform-wide and can target any university."
      >
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            submitForm();
          }}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Type</span>
              <Select
                value={form.type}
                disabled={Boolean(editing) || lockType}
                onValueChange={(value) =>
                  updateForm("type", value as PlatformContentType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {createTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">University</span>
              <Select
                value={form.universityId}
                disabled={Boolean(editing)}
                onValueChange={(value) => updateForm("universityId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose university" />
                </SelectTrigger>
                <SelectContent>
                  {universities.map((university) => (
                    <SelectItem key={university.id} value={university.id}>
                      {university.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Title / Name</span>
              <CampusInput
                required
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Category</span>
              <CampusInput
                value={form.category ?? ""}
                onChange={(event) => updateForm("category", event.target.value)}
              />
            </label>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Status</span>
              <CampusInput
                value={form.status ?? ""}
                onChange={(event) => updateForm("status", event.target.value)}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Venue</span>
              <CampusInput
                value={form.venue ?? ""}
                onChange={(event) => updateForm("venue", event.target.value)}
              />
            </label>
          </div>
          <label className="space-y-2">
            <span className="text-sm font-medium">Description</span>
            <CampusTextarea
              value={form.description ?? ""}
              onChange={(event) => updateForm("description", event.target.value)}
            />
          </label>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Start Date</span>
              <CampusInput
                type="datetime-local"
                value={form.startsAt ?? ""}
                onChange={(event) => updateForm("startsAt", event.target.value)}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">End Date</span>
              <CampusInput
                type="datetime-local"
                value={form.endsAt ?? ""}
                onChange={(event) => updateForm("endsAt", event.target.value)}
              />
            </label>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Latitude</span>
              <CampusInput
                type="number"
                step="any"
                value={String(form.latitude ?? 0)}
                onChange={(event) =>
                  updateForm("latitude", Number(event.target.value))
                }
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Longitude</span>
              <CampusInput
                type="number"
                step="any"
                value={String(form.longitude ?? 0)}
                onChange={(event) =>
                  updateForm("longitude", Number(event.target.value))
                }
              />
            </label>
          </div>
          <label className="space-y-2">
            <span className="text-sm font-medium">Poll Options</span>
            <CampusInput
              value={(form.options ?? []).join(", ")}
              onChange={(event) =>
                updateForm(
                  "options",
                  event.target.value.split(",").map((option) => option.trim()),
                )
              }
            />
          </label>
          <Button className="w-full" disabled={isPending} type="submit">
            {editing ? "Save Changes" : "Create Content"}
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete platform content"
        description="This removes the record from active platform content across the platform."
        confirmLabel="Delete"
        onConfirm={deleteItem}
      />
    </section>
  );
}
