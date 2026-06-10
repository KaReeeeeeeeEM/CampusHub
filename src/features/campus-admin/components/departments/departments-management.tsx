"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiEdit,
  FiEye,
  FiLayers,
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

const statusOptions = [
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
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
        <label className="space-y-2">
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
      <Button disabled={isSubmitting} type="submit">
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
      const college = colleges.find((item) => item.id === values.collegeId);
      const createdAt = new Date().toISOString();
      setDepartments((current) => [
        {
          id: `department-${Date.now()}`,
          universityId: "udsm",
          collegeName: college?.name ?? "Unknown college",
          createdAt,
          updatedAt: createdAt,
          ...values,
          code: values.code.toUpperCase(),
        },
        ...current,
      ]);
      setCreateOpen(false);
      campusToast.success({
        title: "Department Created",
        description: "The department was created successfully.",
      });
    });
  }

  function updateSelectedDepartment(values: DepartmentInput) {
    if (!editing) {
      return;
    }

    startTransition(async () => {
      const college = colleges.find((item) => item.id === values.collegeId);
      setDepartments((current) =>
        current.map((department) =>
          department.id === editing.id
            ? {
                ...department,
                ...values,
                code: values.code.toUpperCase(),
                collegeName: college?.name ?? department.collegeName,
                updatedAt: new Date().toISOString(),
              }
            : department,
        ),
      );
      setEditing(null);
      campusToast.success({
        title: "Department Updated",
        description: "Department information updated successfully.",
      });
    });
  }

  function deactivateSelectedDepartment() {
    if (!deactivating) {
      return;
    }

    startTransition(async () => {
      setDepartments((current) =>
        current.map((department) =>
          department.id === deactivating.id
            ? {
                ...department,
                status: "INACTIVE",
                updatedAt: new Date().toISOString(),
              }
            : department,
        ),
      );
      setDeactivating(null);
      campusToast.warning({
        title: "Department Deactivated",
        description: "The department has been deactivated successfully.",
      });
    });
  }

  const columns: DataTableColumn<SerializedDepartment>[] = [
    { key: "name", header: "Name" },
    { key: "code", header: "Code" },
    { key: "collegeName", header: "College" },
    {
      key: "teachers",
      header: "Teachers",
      cell: (department) =>
        department.id === "department-cs"
          ? "2"
          : department.id === "department-electronics"
            ? "1"
            : "0",
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
        <Button
          disabled={colleges.length === 0}
          type="button"
          onClick={() => setCreateOpen(true)}
        >
          <FiPlus className="h-4 w-4" aria-hidden="true" />
          Create Department
        </Button>
      </div>

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
