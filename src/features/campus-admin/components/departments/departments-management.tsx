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
  departmentInputSchema,
  type DepartmentInput,
} from "@/features/campus-admin/lib/schemas";
import type {
  SerializedCollege,
  SerializedDepartment,
} from "@/features/campus-admin/lib/campus-admin-service";
import type { DataTableColumn } from "@/components/shared/data-table";

type DepartmentsManagementProps = {
  colleges: SerializedCollege[];
  initialDepartments: SerializedDepartment[];
};

type ApiEnvelope<T> = {
  data: T | null;
  error: {
    message: string;
  } | null;
};

const statusOptions = [
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
] as const;
const viewOptions = [
  { value: "table", label: "Table view", icon: FiList },
  { value: "cards", label: "Card view", icon: FiGrid },
] as const;

function StatusBadge({ status }: { status: SerializedDepartment["status"] }) {
  return (
    <span className="inline-flex rounded-md border border-border bg-background px-2 py-1 text-xs font-medium">
      {status}
    </span>
  );
}

function getDefaultValues(department?: SerializedDepartment): DepartmentInput {
  return {
    collegeId: department?.collegeId ?? "",
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
    department: SerializedDepartment;
  }>;

  if (!payload.data?.department) {
    throw new Error("Department response was empty.");
  }

  return payload.data.department;
}

function DepartmentForm({
  colleges,
  department,
  onSubmit,
  isSubmitting,
}: {
  colleges: SerializedCollege[];
  department?: SerializedDepartment;
  onSubmit: (values: DepartmentInput) => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.input<typeof departmentInputSchema>, unknown, DepartmentInput>({
    resolver: zodResolver(departmentInputSchema),
    defaultValues: getDefaultValues(department),
  });
  const collegeId = watch("collegeId");
  const status = watch("status");

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
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
              {colleges.map((college) => (
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
            placeholder="Computer Science"
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
            placeholder="CS"
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
              setValue("status", value as DepartmentInput["status"], {
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
            placeholder="Describe the department."
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
        {department ? "Save Changes" : "Create Department"}
      </Button>
    </form>
  );
}

function DepartmentDetails({
  department,
}: {
  department: SerializedDepartment;
}) {
  const rows = [
    ["Name", department.name],
    ["Code", department.code],
    ["College", department.collegeName],
    ["Status", department.status],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary">
          <FiLayers className="h-5 w-5" aria-hidden="true" />
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

export function DepartmentsManagement({
  colleges,
  initialDepartments,
}: DepartmentsManagementProps) {
  const [departments, setDepartments] = useState(initialDepartments);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<SerializedDepartment | null>(null);
  const [editing, setEditing] = useState<SerializedDepartment | null>(null);
  const [deactivating, setDeactivating] = useState<SerializedDepartment | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const filteredDepartments = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return departments;
    }

    return departments.filter((department) =>
      [
        department.name,
        department.code,
        department.collegeName,
        department.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [departments, query]);

  function createDepartment(values: DepartmentInput) {
    startTransition(async () => {
      try {
        const response = await fetch("/api/campus-admin/departments", {
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
      } catch {
        campusToast.error({
          title: "Department Not Created",
          description: "Unable to save the department. Please try again.",
        });
      }
    });
  }

  function updateSelectedDepartment(values: DepartmentInput) {
    if (!editing) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/campus-admin/departments/${editing.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(values),
          },
        );

        if (!response.ok) {
          campusToast.error({
            title: "Department Not Updated",
            description: await getApiError(response),
          });
          return;
        }

        const updatedDepartment = await readDepartmentResponse(response);
        setDepartments((current) =>
          current.map((department) =>
            department.id === editing.id ? updatedDepartment : department,
          ),
        );
        setEditing(null);
        campusToast.success({
          title: "Department Updated",
          description: "Department information updated successfully.",
        });
      } catch {
        campusToast.error({
          title: "Department Not Updated",
          description: "Unable to save the department. Please try again.",
        });
      }
    });
  }

  function deactivateSelectedDepartment() {
    if (!deactivating) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/campus-admin/departments/${deactivating.id}`,
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

        const updatedDepartment = await readDepartmentResponse(response);
        setDepartments((current) =>
          current.map((department) =>
            department.id === deactivating.id ? updatedDepartment : department,
          ),
        );
        setDeactivating(null);
        campusToast.warning({
          title: "Department Deactivated",
          description: "The department has been deactivated successfully.",
        });
      } catch {
        campusToast.error({
          title: "Department Not Deactivated",
          description: "Unable to deactivate the department. Please try again.",
        });
      }
    });
  }

  const columns: DataTableColumn<SerializedDepartment>[] = [
    { key: "name", header: "Name" },
    { key: "code", header: "Code" },
    { key: "collegeName", header: "College" },
    {
      key: "teachers",
      header: "Teachers",
      cell: () => "0",
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
      cell: (department) => (
        <AdminActionMenu
          items={[
            {
              label: "View",
              icon: FiEye,
              onSelect: () => setViewing(department),
            },
            {
              label: "Edit",
              icon: FiEdit,
              onSelect: () => setEditing(department),
            },
            {
              label: "Deactivate",
              icon: FiSlash,
              disabled: department.status === "INACTIVE",
              onSelect: () => setDeactivating(department),
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
            disabled={colleges.length === 0}
            type="button"
            onClick={() => setCreateOpen(true)}
          >
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            Create Department
          </Button>
        </div>
      </div>

      {viewMode === "cards" ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredDepartments.length > 0 ? (
            filteredDepartments.map((department) => (
              <article
                key={department.id}
                className="flex h-full flex-col rounded-xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-background text-primary">
                    <FiLayers className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <AdminActionMenu
                    items={[
                      {
                        label: "View",
                        icon: FiEye,
                        onSelect: () => setViewing(department),
                      },
                      {
                        label: "Edit",
                        icon: FiEdit,
                        onSelect: () => setEditing(department),
                      },
                      {
                        label: "Deactivate",
                        icon: FiSlash,
                        disabled: department.status === "INACTIVE",
                        onSelect: () => setDeactivating(department),
                      },
                    ]}
                  />
                </div>
                <h3 className="mt-4 text-base font-semibold">
                  {department.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {department.code} · {department.collegeName}
                </p>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {department.description}
                </p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <StatusBadge status={department.status} />
                  <span className="text-xs text-muted-foreground">
                    0 teachers
                  </span>
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              title={
                colleges.length === 0
                  ? "Create a college first"
                  : query
                    ? "No matching departments"
                    : "No departments yet"
              }
              description={
                colleges.length === 0
                  ? "Departments must belong to a college."
                  : query
                    ? "Adjust your search and try again."
                    : "Create the first department to support teacher invitations."
              }
              className="mx-auto border-0 bg-transparent md:col-span-2 xl:col-span-3"
            />
          )}
        </div>
      ) : (
        <div className="mt-5">
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
                      : "No departments yet"
                }
                description={
                  colleges.length === 0
                    ? "Departments must belong to a college."
                    : query
                      ? "Adjust your search and try again."
                      : "Create the first department to support teacher invitations."
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
        title="Create Department"
        description="Create a department under an existing college."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        <DepartmentForm
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
        description="Department profile and status."
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
    </>
  );
}
