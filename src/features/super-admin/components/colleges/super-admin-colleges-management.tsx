"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiBookOpen,
  FiEdit,
  FiEye,
  FiGrid,
  FiList,
  FiLoader,
  FiPlus,
  FiSearch,
  FiSlash,
  FiTrash2,
} from "react-icons/fi";
import type { z } from "zod";

import {
  CampusDataTable,
  CampusInput,
  CampusTextarea,
  CampusViewToggle,
  campusToast,
} from "@/components/campushub";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Drawer } from "@/components/shared/drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import type { DataTableColumn } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import { AdminActionMenu } from "@/features/administration/components/admin-action-menu";
import {
  superAdminCollegeInputSchema,
  type SuperAdminCollegeInput,
} from "@/features/super-admin/lib/schemas";
import type {
  SerializedSuperAdminCollege,
  SerializedUniversity,
} from "@/features/super-admin/lib/super-admin-service";
import { cn } from "@/lib/utils";

type SuperAdminCollegesManagementProps = {
  colleges: SerializedSuperAdminCollege[];
  universities: SerializedUniversity[];
  initialUniversityId?: string | null;
};

type ApiEnvelope<T> = {
  data: T | null;
  error: { message: string } | null;
};

const statusOptions = [
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
] as const;
const viewOptions = [
  { value: "table", label: "Table view", icon: FiList },
  { value: "cards", label: "Card view", icon: FiGrid },
] as const;

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function StatusBadge({
  status,
}: {
  status: SerializedSuperAdminCollege["status"];
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-1 text-xs font-medium",
        status === "ACTIVE"
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
          : "border-red-500/25 bg-red-500/10 text-red-400",
      )}
    >
      {status}
    </span>
  );
}

function getDefaultValues(
  universities: SerializedUniversity[],
  college?: SerializedSuperAdminCollege,
  initialUniversityId?: string | null,
): SuperAdminCollegeInput {
  return {
    universityId:
      college?.universityId ?? initialUniversityId ?? universities[0]?.id ?? "",
    name: college?.name ?? "",
    shortName: college?.shortName ?? "",
    code: college?.code ?? "",
    description: college?.description ?? "",
    logo: college?.logo ?? "",
    status: college?.status ?? "ACTIVE",
  };
}

async function getApiError(response: Response) {
  try {
    const payload = (await response.json()) as ApiEnvelope<unknown>;
    return payload.error?.message || "The request could not be completed.";
  } catch {
    return "The request could not be completed.";
  }
}

async function readCollegeResponse(response: Response) {
  const payload = (await response.json()) as ApiEnvelope<{
    college: SerializedSuperAdminCollege;
  }>;

  if (!payload.data?.college) {
    throw new Error("College response was empty.");
  }

  return payload.data.college;
}

function CollegeForm({
  universities,
  college,
  initialUniversityId,
  onSubmit,
  isSubmitting,
}: {
  universities: SerializedUniversity[];
  college?: SerializedSuperAdminCollege;
  initialUniversityId?: string | null;
  onSubmit: (values: SuperAdminCollegeInput) => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<
    z.input<typeof superAdminCollegeInputSchema>,
    unknown,
    SuperAdminCollegeInput
  >({
    resolver: zodResolver(superAdminCollegeInputSchema),
    defaultValues: getDefaultValues(universities, college, initialUniversityId),
  });
  const universityId = watch("universityId");
  const status = watch("status");

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">University</span>
          <Select
            value={universityId}
            onValueChange={(value) =>
              setValue("universityId", value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select university" />
            </SelectTrigger>
            <SelectContent>
              {universities.map((university) => (
                <SelectItem key={university.id} value={university.id}>
                  {university.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.universityId ? (
            <p className="text-xs text-destructive">
              {errors.universityId.message}
            </p>
          ) : null}
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Name</span>
          <CampusInput
            {...register("name")}
            invalid={Boolean(errors.name)}
            placeholder="College of Information and Communication Technologies"
          />
          {errors.name ? (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          ) : null}
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Short name</span>
          <CampusInput
            {...register("shortName")}
            invalid={Boolean(errors.shortName)}
            placeholder="CoICT"
          />
          {errors.shortName ? (
            <p className="text-xs text-destructive">
              {errors.shortName.message}
            </p>
          ) : null}
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Code</span>
          <CampusInput
            {...register("code")}
            invalid={Boolean(errors.code)}
            placeholder="COICT"
          />
          {errors.code ? (
            <p className="text-xs text-destructive">{errors.code.message}</p>
          ) : null}
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Status</span>
          <Select
            value={status}
            onValueChange={(value) =>
              setValue("status", value as SuperAdminCollegeInput["status"], {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Logo URL</span>
          <CampusInput
            {...register("logo")}
            invalid={Boolean(errors.logo)}
            placeholder="https://university.edu/assets/college-logo.png"
          />
          {errors.logo ? (
            <p className="text-xs text-destructive">{errors.logo.message}</p>
          ) : null}
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Description</span>
          <CampusTextarea
            {...register("description")}
            invalid={Boolean(errors.description)}
            placeholder="Describe the college, its academic focus, and the departments it manages."
          />
          {errors.description ? (
            <p className="text-xs text-destructive">
              {errors.description.message}
            </p>
          ) : null}
        </label>
      </div>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        {college ? "Save Changes" : "Create College"}
      </Button>
    </form>
  );
}

function CollegeDetails({ college }: { college: SerializedSuperAdminCollege }) {
  const rows = [
    ["University", college.universityName],
    ["Code", college.code],
    ["Departments", college.departmentsCount.toLocaleString()],
    ["Users", college.usersCount.toLocaleString()],
    ["Status", college.status],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background text-primary">
          {college.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={college.logo} alt="" className="h-full w-full object-cover" />
          ) : (
            <FiBookOpen className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <div>
          <h3 className="text-base font-semibold">{college.name}</h3>
          <p className="text-sm text-muted-foreground">{college.shortName}</p>
        </div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        {college.description}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SuperAdminCollegesManagement({
  colleges: initialColleges,
  universities,
  initialUniversityId,
}: SuperAdminCollegesManagementProps) {
  const [colleges, setColleges] = useState(initialColleges);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<SerializedSuperAdminCollege | null>(
    null,
  );
  const [editing, setEditing] = useState<SerializedSuperAdminCollege | null>(
    null,
  );
  const [deactivating, setDeactivating] =
    useState<SerializedSuperAdminCollege | null>(null);
  const [deleting, setDeleting] = useState<SerializedSuperAdminCollege | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const scopedColleges = useMemo(() => {
    if (!initialUniversityId) return colleges;
    return colleges.filter((college) => college.universityId === initialUniversityId);
  }, [colleges, initialUniversityId]);

  const filteredColleges = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return scopedColleges;

    return scopedColleges.filter((college) =>
      [
        college.name,
        college.shortName,
        college.code,
        college.status,
        college.universityName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, scopedColleges]);

  function createCollege(values: SuperAdminCollegeInput) {
    startTransition(async () => {
      try {
        const response = await fetch("/api/super-admin/colleges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          campusToast.error({
            title: "College Not Created",
            description: await getApiError(response),
          });
          return;
        }

        const college = await readCollegeResponse(response);
        setColleges((current) => [college, ...current]);
        setCreateOpen(false);
        campusToast.success({
          title: "College Created",
          description: "The college was created successfully.",
        });
      } catch {
        campusToast.error({
          title: "College Not Created",
          description: "Unable to save the college. Please try again.",
        });
      }
    });
  }

  function updateSelectedCollege(values: SuperAdminCollegeInput) {
    if (!editing) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/super-admin/colleges/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          campusToast.error({
            title: "College Not Updated",
            description: await getApiError(response),
          });
          return;
        }

        const college = await readCollegeResponse(response);
        setColleges((current) =>
          current.map((item) => (item.id === college.id ? college : item)),
        );
        setEditing(null);
        campusToast.success({
          title: "College Updated",
          description: "College information updated successfully.",
        });
      } catch {
        campusToast.error({
          title: "College Not Updated",
          description: "Unable to save the college. Please try again.",
        });
      }
    });
  }

  function deactivateSelectedCollege() {
    if (!deactivating) return;

    startTransition(async () => {
      const response = await fetch(`/api/super-admin/colleges/${deactivating.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "deactivate" }),
      });

      if (!response.ok) {
        campusToast.error({
          title: "College Not Deactivated",
          description: await getApiError(response),
        });
        return;
      }

      const college = await readCollegeResponse(response);
      setColleges((current) =>
        current.map((item) => (item.id === college.id ? college : item)),
      );
      setDeactivating(null);
      campusToast.warning({
        title: "College Deactivated",
        description: "The college has been deactivated.",
      });
    });
  }

  function deleteSelectedCollege() {
    if (!deleting) return;

    startTransition(async () => {
      const response = await fetch(`/api/super-admin/colleges/${deleting.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        campusToast.error({
          title: "College Not Deleted",
          description: await getApiError(response),
        });
        return;
      }

      setColleges((current) => current.filter((item) => item.id !== deleting.id));
      setDeleting(null);
      campusToast.warning({
        title: "College Deleted",
        description: "The college was removed from active records.",
      });
    });
  }

  const actionItems = (college: SerializedSuperAdminCollege) => [
    { label: "View", icon: FiEye, onSelect: () => setViewing(college) },
    { label: "Edit", icon: FiEdit, onSelect: () => setEditing(college) },
    {
      label: "Deactivate",
      icon: FiSlash,
      disabled: college.status === "INACTIVE",
      onSelect: () => setDeactivating(college),
    },
    {
      label: "Delete",
      icon: FiTrash2,
      destructive: true,
      onSelect: () => setDeleting(college),
    },
  ];

  const columns: DataTableColumn<SerializedSuperAdminCollege>[] = [
    { key: "name", header: "College" },
    { key: "code", header: "Code" },
    { key: "universityName", header: "University" },
    {
      key: "departmentsCount",
      header: "Departments",
      cell: (college) => college.departmentsCount.toLocaleString(),
    },
    {
      key: "usersCount",
      header: "Users",
      cell: (college) => college.usersCount.toLocaleString(),
    },
    {
      key: "status",
      header: "Status",
      cell: (college) => <StatusBadge status={college.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-16 text-right",
      cell: (college) => <AdminActionMenu items={actionItems(college)} />,
    },
  ];

  return (
    <>
      <section className="mt-8 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <CampusInput
              className="pl-9"
              placeholder="Search colleges"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <CampusViewToggle
              value={viewMode}
              options={viewOptions}
              onValueChange={setViewMode}
            />
            <Button
              type="button"
              disabled={universities.length === 0}
              onClick={() => setCreateOpen(true)}
            >
              <FiPlus className="h-4 w-4" />
              Create College
            </Button>
          </div>
        </div>

        {viewMode === "table" ? (
          <CampusDataTable
            columns={columns}
            data={filteredColleges}
            getRowId={(college) => college.id}
            empty={
              <EmptyState
                title={query ? "No matching colleges" : "No colleges available"}
                description={
                  query
                    ? "Adjust your search and try again."
                    : "Create the first college for a university."
                }
                className="mx-auto border-0 bg-transparent"
              />
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredColleges.length > 0 ? (
              filteredColleges.map((college) => (
                <article
                  key={college.id}
                  className="rounded-lg border border-border bg-surface p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">{college.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {college.code} · {college.universityName}
                      </p>
                    </div>
                    <AdminActionMenu items={actionItems(college)} />
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {college.description}
                  </p>
                  <div className="mt-5 flex items-center justify-between">
                    <StatusBadge status={college.status} />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(college.createdAt)}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState
                title={query ? "No matching colleges" : "No colleges available"}
                description={
                  query
                    ? "Adjust your search and try again."
                    : "Create the first college for a university."
                }
                className="mx-auto border-0 bg-transparent md:col-span-2 xl:col-span-3"
              />
            )}
          </div>
        )}
      </section>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create College"
        description="Create a college in any university."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        <CollegeForm
          universities={universities}
          initialUniversityId={initialUniversityId}
          onSubmit={createCollege}
          isSubmitting={isPending}
        />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit College"
        description="Update college information."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        {editing ? (
          <CollegeForm
            key={editing.id}
            universities={universities}
            college={editing}
            onSubmit={updateSelectedCollege}
            isSubmitting={isPending}
          />
        ) : null}
      </Modal>

      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.name ?? "College details"}
        description="College profile and operational status."
        className="max-w-xl"
      >
        {viewing ? <CollegeDetails college={viewing} /> : null}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deactivating)}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title="Deactivate College"
        description={`Deactivate ${deactivating?.name ?? "this college"}?`}
        confirmLabel="Deactivate"
        destructive
        onConfirm={deactivateSelectedCollege}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete College"
        description={`Delete ${deleting?.name ?? "this college"} from active records? This is a soft delete for audit safety.`}
        confirmLabel="Delete"
        destructive
        onConfirm={deleteSelectedCollege}
      />
    </>
  );
}
