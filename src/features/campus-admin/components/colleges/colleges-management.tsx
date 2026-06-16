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
} from "react-icons/fi";
import type { z } from "zod";

import {
  CampusDataTable,
  CampusFileUpload,
  CampusInput,
  CampusTextarea,
  CampusViewToggle,
  campusToast,
} from "@/components/campushub";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Drawer } from "@/components/shared/drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
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
  collegeInputSchema,
  type CollegeInput,
} from "@/features/campus-admin/lib/schemas";
import type { SerializedCollege } from "@/features/campus-admin/lib/campus-admin-service";
import type { DataTableColumn } from "@/components/shared/data-table";

type CollegesManagementProps = {
  initialColleges: SerializedCollege[];
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
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: SerializedCollege["status"] }) {
  return (
    <span className="inline-flex rounded-md border border-border bg-background px-2 py-1 text-xs font-medium">
      {status}
    </span>
  );
}

function getDefaultValues(college?: SerializedCollege): CollegeInput {
  return {
    name: college?.name ?? "",
    shortName: college?.shortName ?? "",
    description: college?.description ?? "",
    logo: college?.logo ?? "",
    status: college?.status ?? "ACTIVE",
  };
}

function CollegeForm({
  college,
  onSubmit,
  isSubmitting,
}: {
  college?: SerializedCollege;
  onSubmit: (values: CollegeInput) => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.input<typeof collegeInputSchema>, unknown, CollegeInput>({
    resolver: zodResolver(collegeInputSchema),
    defaultValues: getDefaultValues(college),
  });
  const status = watch("status");
  const logo = watch("logo");

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">Name</span>
          <CampusInput
            {...register("name")}
            invalid={Boolean(errors.name)}
            placeholder="College of Engineering"
          />
          {errors.name ? (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          ) : null}
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Short Name</span>
          <CampusInput
            {...register("shortName")}
            invalid={Boolean(errors.shortName)}
            placeholder="CoET"
          />
          {errors.shortName ? (
            <p className="text-xs text-destructive">
              {errors.shortName.message}
            </p>
          ) : null}
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Status</span>
          <Select
            value={status}
            onValueChange={(value) =>
              setValue("status", value as CollegeInput["status"], {
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
        <CampusFileUpload
          className="md:col-span-2"
          label="Logo"
          value={logo}
          error={errors.logo?.message}
          onValueChange={(value) =>
            setValue("logo", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Description</span>
          <CampusTextarea
            {...register("description")}
            invalid={Boolean(errors.description)}
            placeholder="Describe the college and its academic scope."
          />
          {errors.description ? (
            <p className="text-xs text-destructive">
              {errors.description.message}
            </p>
          ) : null}
        </label>
      </div>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? (
          <FiLoader className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        {college ? "Save Changes" : "Create College"}
      </Button>
    </form>
  );
}

function CollegeDetails({ college }: { college: SerializedCollege }) {
  const rows = [
    ["Name", college.name],
    ["Short Name", college.shortName],
    ["Slug", college.slug],
    ["Status", college.status],
    ["Created", formatDate(college.createdAt)],
    ["Updated", formatDate(college.updatedAt)],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background text-primary">
          {college.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={college.logo}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <FiBookOpen className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <div>
          <h3 className="text-base font-semibold">{college.name}</h3>
          <p className="text-sm text-muted-foreground">
            {college.shortName || college.slug}
          </p>
        </div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        {college.description}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-md border border-border p-3">
            <p className="text-xs uppercase tracking-normal text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-sm font-medium">{value || "Not set"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CollegesManagement({
  initialColleges,
}: CollegesManagementProps) {
  const [colleges, setColleges] = useState(initialColleges);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<SerializedCollege | null>(null);
  const [editing, setEditing] = useState<SerializedCollege | null>(null);
  const [deactivating, setDeactivating] = useState<SerializedCollege | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const filteredColleges = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return colleges;
    }

    return colleges.filter((college) =>
      [college.name, college.shortName, college.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [colleges, query]);

  function createCollege(values: CollegeInput) {
    startTransition(async () => {
      const createdAt = new Date().toISOString();
      setColleges((current) => [
        {
          id: `college-${Date.now()}`,
          universityId: "udsm",
          slug: values.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          createdAt,
          updatedAt: createdAt,
          ...values,
        },
        ...current,
      ]);
      setCreateOpen(false);
      campusToast.success({
        title: "College Created",
        description: "The college was created successfully.",
      });
    });
  }

  function updateSelectedCollege(values: CollegeInput) {
    if (!editing) {
      return;
    }

    startTransition(async () => {
      setColleges((current) =>
        current.map((college) =>
          college.id === editing.id
            ? { ...college, ...values, updatedAt: new Date().toISOString() }
            : college,
        ),
      );
      setEditing(null);
      campusToast.success({
        title: "College Updated",
        description: "College information updated successfully.",
      });
    });
  }

  function deactivateSelectedCollege() {
    if (!deactivating) {
      return;
    }

    startTransition(async () => {
      setColleges((current) =>
        current.map((college) =>
          college.id === deactivating.id
            ? {
                ...college,
                status: "INACTIVE",
                updatedAt: new Date().toISOString(),
              }
            : college,
        ),
      );
      setDeactivating(null);
      campusToast.warning({
        title: "College Deactivated",
        description: "The college has been deactivated successfully.",
      });
    });
  }

  const columns: DataTableColumn<SerializedCollege>[] = [
    {
      key: "logo",
      header: "Logo",
      className: "w-20",
      cell: (college) => (
        <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-border bg-background text-primary">
          {college.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={college.logo}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <FiBookOpen className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
      ),
    },
    { key: "name", header: "Name" },
    { key: "shortName", header: "Short Name" },
    {
      key: "departments",
      header: "Departments",
      cell: (college) =>
        college.id === "college-ict"
          ? "2"
          : college.id === "college-engineering"
            ? "1"
            : "0",
    },
    {
      key: "representatives",
      header: "Representatives",
      cell: (college) =>
        college.id === "college-ict" || college.id === "college-engineering"
          ? "1"
          : "0",
    },
    {
      key: "status",
      header: "Status",
      cell: (college) => <StatusBadge status={college.status} />,
    },
    {
      key: "createdAt",
      header: "Created Date",
      cell: (college) => formatDate(college.createdAt),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-16 text-right",
      cell: (college) => (
        <AdminActionMenu
          items={[
            { label: "View", icon: FiEye, onSelect: () => setViewing(college) },
            {
              label: "Edit",
              icon: FiEdit,
              onSelect: () => setEditing(college),
            },
            {
              label: "Deactivate",
              icon: FiSlash,
              disabled: college.status === "INACTIVE",
              onSelect: () => setDeactivating(college),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <FiSearch
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
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
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            Create College
          </Button>
        </div>
      </div>

      {viewMode === "cards" ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredColleges.length > 0 ? (
            filteredColleges.map((college) => (
              <article
                key={college.id}
                className="flex h-full flex-col rounded-xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-border bg-background text-primary">
                    {college.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={college.logo}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FiBookOpen className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                  <AdminActionMenu
                    items={[
                      {
                        label: "View",
                        icon: FiEye,
                        onSelect: () => setViewing(college),
                      },
                      {
                        label: "Edit",
                        icon: FiEdit,
                        onSelect: () => setEditing(college),
                      },
                      {
                        label: "Deactivate",
                        icon: FiSlash,
                        disabled: college.status === "INACTIVE",
                        onSelect: () => setDeactivating(college),
                      },
                    ]}
                  />
                </div>
                <h3 className="mt-4 text-base font-semibold">{college.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {college.shortName}
                </p>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {college.description}
                </p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <StatusBadge status={college.status} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(college.createdAt)}
                  </span>
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              title={query ? "No matching colleges" : "No colleges yet"}
              description={
                query
                  ? "Adjust your search and try again."
                  : "Create the first college before adding departments or representatives."
              }
              className="mx-auto border-0 bg-transparent md:col-span-2 xl:col-span-3"
            />
          )}
        </div>
      ) : (
        <div className="mt-5">
          <CampusDataTable
            columns={columns}
            data={filteredColleges}
            getRowId={(college) => college.id}
            empty={
              <EmptyState
                title={query ? "No matching colleges" : "No colleges yet"}
                description={
                  query
                    ? "Adjust your search and try again."
                    : "Create the first college before adding departments or representatives."
                }
                className="mx-auto border-0 bg-transparent"
              />
            }
          />
        </div>
      )}

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create College"
        description="Create a college inside your assigned university."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        <CollegeForm onSubmit={createCollege} isSubmitting={isPending} />
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
        description={`Deactivate ${deactivating?.name ?? "this college"}? Related records will remain available for audit and future reactivation.`}
        confirmLabel="Deactivate"
        destructive
        onConfirm={deactivateSelectedCollege}
      />
    </>
  );
}
