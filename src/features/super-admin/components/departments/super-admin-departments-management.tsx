"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiEdit,
  FiEye,
  FiGrid,
  FiLayers,
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
  superAdminDepartmentInputSchema,
  type SuperAdminDepartmentInput,
} from "@/features/super-admin/lib/schemas";
import type {
  SerializedSuperAdminCollege,
  SerializedSuperAdminDepartment,
  SerializedUniversity,
} from "@/features/super-admin/lib/super-admin-service";
import { cn } from "@/lib/utils";

type Props = {
  departments: SerializedSuperAdminDepartment[];
  colleges: SerializedSuperAdminCollege[];
  universities: SerializedUniversity[];
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

function StatusBadge({
  status,
}: {
  status: SerializedSuperAdminDepartment["status"];
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
  colleges: SerializedSuperAdminCollege[],
  department?: SerializedSuperAdminDepartment,
): SuperAdminDepartmentInput {
  const universityId =
    department?.universityId ?? colleges[0]?.universityId ?? universities[0]?.id ?? "";

  return {
    universityId,
    collegeId:
      department?.collegeId ??
      colleges.find((college) => college.universityId === universityId)?.id ??
      "",
    name: department?.name ?? "",
    code: department?.code ?? "",
    description: department?.description ?? "",
    status: department?.status ?? "ACTIVE",
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

async function readDepartmentResponse(response: Response) {
  const payload = (await response.json()) as ApiEnvelope<{
    department: SerializedSuperAdminDepartment;
  }>;

  if (!payload.data?.department) {
    throw new Error("Department response was empty.");
  }

  return payload.data.department;
}

function DepartmentForm({
  universities,
  colleges,
  department,
  onSubmit,
  isSubmitting,
}: {
  universities: SerializedUniversity[];
  colleges: SerializedSuperAdminCollege[];
  department?: SerializedSuperAdminDepartment;
  onSubmit: (values: SuperAdminDepartmentInput) => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<
    z.input<typeof superAdminDepartmentInputSchema>,
    unknown,
    SuperAdminDepartmentInput
  >({
    resolver: zodResolver(superAdminDepartmentInputSchema),
    defaultValues: getDefaultValues(universities, colleges, department),
  });
  const universityId = watch("universityId");
  const collegeId = watch("collegeId");
  const status = watch("status");
  const filteredColleges = colleges.filter(
    (college) => college.universityId === universityId,
  );

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">University</span>
          <Select
            value={universityId}
            onValueChange={(value) => {
              setValue("universityId", value, {
                shouldDirty: true,
                shouldValidate: true,
              });
              setValue(
                "collegeId",
                colleges.find((college) => college.universityId === value)?.id ??
                  "",
                { shouldDirty: true, shouldValidate: true },
              );
            }}
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
          <span className="text-sm font-medium">College</span>
          <Select
            value={collegeId}
            onValueChange={(value) =>
              setValue("collegeId", value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select college" />
            </SelectTrigger>
            <SelectContent>
              {filteredColleges.map((college) => (
                <SelectItem key={college.id} value={college.id}>
                  {college.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.collegeId ? (
            <p className="text-xs text-destructive">
              {errors.collegeId.message}
            </p>
          ) : null}
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Name</span>
          <CampusInput
            {...register("name")}
            invalid={Boolean(errors.name)}
            placeholder="Computer Science and Engineering"
          />
          {errors.name ? (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          ) : null}
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Code</span>
          <CampusInput
            {...register("code")}
            invalid={Boolean(errors.code)}
            placeholder="CSE"
          />
          {errors.code ? (
            <p className="text-xs text-destructive">{errors.code.message}</p>
          ) : null}
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Status</span>
          <Select
            value={status}
            onValueChange={(value) =>
              setValue("status", value as SuperAdminDepartmentInput["status"], {
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
          <span className="text-sm font-medium">Description</span>
          <CampusTextarea
            {...register("description")}
            invalid={Boolean(errors.description)}
            placeholder="Describe the department, programs offered, and its academic focus."
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
        {department ? "Save Changes" : "Create Department"}
      </Button>
    </form>
  );
}

function DepartmentDetails({
  department,
}: {
  department: SerializedSuperAdminDepartment;
}) {
  const rows = [
    ["University", department.universityName],
    ["College", department.collegeName],
    ["Code", department.code],
    ["Users", department.usersCount.toLocaleString()],
    ["Status", department.status],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary">
          <FiLayers className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-semibold">{department.name}</h3>
          <p className="text-sm text-muted-foreground">{department.code}</p>
        </div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        {department.description}
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

export function SuperAdminDepartmentsManagement({
  departments: initialDepartments,
  colleges,
  universities,
}: Props) {
  const [departments, setDepartments] = useState(initialDepartments);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] =
    useState<SerializedSuperAdminDepartment | null>(null);
  const [editing, setEditing] =
    useState<SerializedSuperAdminDepartment | null>(null);
  const [deactivating, setDeactivating] =
    useState<SerializedSuperAdminDepartment | null>(null);
  const [deleting, setDeleting] =
    useState<SerializedSuperAdminDepartment | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredDepartments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return departments;

    return departments.filter((department) =>
      [
        department.name,
        department.code,
        department.collegeName,
        department.universityName,
        department.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [departments, query]);

  function createDepartment(values: SuperAdminDepartmentInput) {
    startTransition(async () => {
      const response = await fetch("/api/super-admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        campusToast.error({
          title: "Department Not Created",
          description: await getApiError(response),
        });
        return;
      }

      const department = await readDepartmentResponse(response);
      setDepartments((current) => [department, ...current]);
      setCreateOpen(false);
      campusToast.success({
        title: "Department Created",
        description: "The department was created successfully.",
      });
    });
  }

  function updateSelectedDepartment(values: SuperAdminDepartmentInput) {
    if (!editing) return;

    startTransition(async () => {
      const response = await fetch(`/api/super-admin/departments/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        campusToast.error({
          title: "Department Not Updated",
          description: await getApiError(response),
        });
        return;
      }

      const department = await readDepartmentResponse(response);
      setDepartments((current) =>
        current.map((item) => (item.id === department.id ? department : item)),
      );
      setEditing(null);
      campusToast.success({
        title: "Department Updated",
        description: "Department information updated successfully.",
      });
    });
  }

  function deactivateSelectedDepartment() {
    if (!deactivating) return;

    startTransition(async () => {
      const response = await fetch(
        `/api/super-admin/departments/${deactivating.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: "deactivate" }),
        },
      );

      if (!response.ok) {
        campusToast.error({
          title: "Department Not Deactivated",
          description: await getApiError(response),
        });
        return;
      }

      const department = await readDepartmentResponse(response);
      setDepartments((current) =>
        current.map((item) => (item.id === department.id ? department : item)),
      );
      setDeactivating(null);
      campusToast.warning({
        title: "Department Deactivated",
        description: "The department has been deactivated.",
      });
    });
  }

  function deleteSelectedDepartment() {
    if (!deleting) return;

    startTransition(async () => {
      const response = await fetch(
        `/api/super-admin/departments/${deleting.id}`,
        { method: "DELETE", credentials: "include" },
      );

      if (!response.ok) {
        campusToast.error({
          title: "Department Not Deleted",
          description: await getApiError(response),
        });
        return;
      }

      setDepartments((current) =>
        current.filter((item) => item.id !== deleting.id),
      );
      setDeleting(null);
      campusToast.warning({
        title: "Department Deleted",
        description: "The department was removed from active records.",
      });
    });
  }

  const actionItems = (department: SerializedSuperAdminDepartment) => [
    { label: "View", icon: FiEye, onSelect: () => setViewing(department) },
    { label: "Edit", icon: FiEdit, onSelect: () => setEditing(department) },
    {
      label: "Deactivate",
      icon: FiSlash,
      disabled: department.status === "INACTIVE",
      onSelect: () => setDeactivating(department),
    },
    {
      label: "Delete",
      icon: FiTrash2,
      destructive: true,
      onSelect: () => setDeleting(department),
    },
  ];

  const columns: DataTableColumn<SerializedSuperAdminDepartment>[] = [
    { key: "name", header: "Department" },
    { key: "code", header: "Code" },
    { key: "collegeName", header: "College" },
    { key: "universityName", header: "University" },
    {
      key: "usersCount",
      header: "Users",
      cell: (department) => department.usersCount.toLocaleString(),
    },
    {
      key: "status",
      header: "Status",
      cell: (department) => <StatusBadge status={department.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-16 text-right",
      cell: (department) => <AdminActionMenu items={actionItems(department)} />,
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
              placeholder="Search departments"
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
              disabled={colleges.length === 0 || universities.length === 0}
              type="button"
              onClick={() => setCreateOpen(true)}
            >
              <FiPlus className="h-4 w-4" />
              Create Department
            </Button>
          </div>
        </div>

        {viewMode === "table" ? (
          <CampusDataTable
            columns={columns}
            data={filteredDepartments}
            getRowId={(department) => department.id}
            empty={
              <EmptyState
                title={
                  colleges.length === 0
                    ? "Create a college first"
                    : query
                      ? "No matching departments"
                      : "No departments available"
                }
                description={
                  colleges.length === 0
                    ? "Departments must belong to a college."
                    : query
                      ? "Adjust your search and try again."
                      : "Create the first department for a college."
                }
                className="mx-auto border-0 bg-transparent"
              />
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredDepartments.length > 0 ? (
              filteredDepartments.map((department) => (
                <article
                  key={department.id}
                  className="rounded-lg border border-border bg-surface p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">
                        {department.name}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {department.code} · {department.collegeName}
                      </p>
                    </div>
                    <AdminActionMenu items={actionItems(department)} />
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {department.description}
                  </p>
                  <div className="mt-5 flex items-center justify-between">
                    <StatusBadge status={department.status} />
                    <span className="text-xs text-muted-foreground">
                      {department.universityName}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState
                title={query ? "No matching departments" : "No departments available"}
                description={
                  query
                    ? "Adjust your search and try again."
                    : "Create the first department for a college."
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
        title="Create Department"
        description="Create a department under any university college."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        <DepartmentForm
          universities={universities}
          colleges={colleges}
          onSubmit={createDepartment}
          isSubmitting={isPending}
        />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit Department"
        description="Update department information."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        {editing ? (
          <DepartmentForm
            key={editing.id}
            universities={universities}
            colleges={colleges}
            department={editing}
            onSubmit={updateSelectedDepartment}
            isSubmitting={isPending}
          />
        ) : null}
      </Modal>

      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.name ?? "Department details"}
        description="Department profile and operational status."
        className="max-w-xl"
      >
        {viewing ? <DepartmentDetails department={viewing} /> : null}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deactivating)}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title="Deactivate Department"
        description={`Deactivate ${deactivating?.name ?? "this department"}?`}
        confirmLabel="Deactivate"
        destructive
        onConfirm={deactivateSelectedDepartment}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete Department"
        description={`Delete ${deleting?.name ?? "this department"} from active records? This is a soft delete for audit safety.`}
        confirmLabel="Delete"
        destructive
        onConfirm={deleteSelectedDepartment}
      />
    </>
  );
}
