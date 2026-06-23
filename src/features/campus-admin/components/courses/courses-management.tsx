"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiBook,
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
  courseInputSchema,
  type CourseInput,
} from "@/features/campus-admin/lib/schemas";
import type {
  SerializedCourse,
  SerializedDepartment,
} from "@/features/campus-admin/lib/campus-admin-service";
import type { DataTableColumn } from "@/components/shared/data-table";

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

function StatusBadge({ status }: { status: SerializedCourse["status"] }) {
  return (
    <span className="inline-flex rounded-md border border-border bg-background px-2 py-1 text-xs font-medium">
      {status}
    </span>
  );
}

function getDefaultValues(course?: SerializedCourse): CourseInput {
  return {
    departmentId: course?.departmentId ?? "",
    name: course?.name ?? "",
    code: course?.code ?? "",
    durationYears: course?.durationYears ?? 4,
    description: course?.description ?? "",
    status: course?.status ?? "ACTIVE",
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

async function readCourseResponse(response: Response) {
  const payload = (await response.json()) as ApiEnvelope<{
    course: SerializedCourse;
  }>;

  if (!payload.data?.course) {
    throw new Error("Course response was empty.");
  }

  return payload.data.course;
}

function CourseForm({
  departments,
  course,
  onSubmit,
  isSubmitting,
}: {
  departments: SerializedDepartment[];
  course?: SerializedCourse;
  onSubmit: (values: CourseInput) => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.input<typeof courseInputSchema>, unknown, CourseInput>({
    resolver: zodResolver(courseInputSchema),
    defaultValues: getDefaultValues(course),
  });
  const departmentId = watch("departmentId");
  const status = watch("status");

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Department</span>
          <Select
            value={departmentId}
            onValueChange={(value) =>
              setValue("departmentId", value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name} ({department.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.departmentId ? (
            <p className="text-xs text-destructive">
              {errors.departmentId.message}
            </p>
          ) : null}
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Course name</span>
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
          <span className="text-sm font-medium">Course code</span>
          <CampusInput
            {...register("code")}
            invalid={Boolean(errors.code)}
            placeholder="BSC-CS"
          />
          {errors.code ? (
            <p className="text-xs text-destructive">{errors.code.message}</p>
          ) : null}
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Years of study</span>
          <CampusInput
            {...register("durationYears")}
            invalid={Boolean(errors.durationYears)}
            min={1}
            max={8}
            placeholder="4"
            type="number"
          />
          {errors.durationYears ? (
            <p className="text-xs text-destructive">
              {errors.durationYears.message}
            </p>
          ) : null}
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Status</span>
          <Select
            value={status}
            onValueChange={(value) =>
              setValue("status", value as CourseInput["status"], {
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
            placeholder="Describe the course and graduation track."
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
        {course ? "Save Changes" : "Create Course"}
      </Button>
    </form>
  );
}

function CourseDetails({ course }: { course: SerializedCourse }) {
  const rows = [
    ["Course", course.name],
    ["Code", course.code],
    ["Department", course.departmentName],
    ["College", course.collegeName],
    ["Years of study", `${course.durationYears}`],
    ["Status", course.status],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary">
          <FiBook className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-base font-semibold">{course.name}</h3>
          <p className="text-sm text-muted-foreground">
            {course.code} · {course.durationYears} years
          </p>
        </div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        {course.description}
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

export function CoursesManagement({
  departments,
  initialCourses,
}: {
  departments: SerializedDepartment[];
  initialCourses: SerializedCourse[];
}) {
  const [courses, setCourses] = useState(initialCourses);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<SerializedCourse | null>(null);
  const [editing, setEditing] = useState<SerializedCourse | null>(null);
  const [deactivating, setDeactivating] = useState<SerializedCourse | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const filteredCourses = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return courses;
    }

    return courses.filter((course) =>
      [
        course.name,
        course.code,
        course.departmentName,
        course.collegeName,
        course.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [courses, query]);

  function createSelectedCourse(values: CourseInput) {
    startTransition(async () => {
      const response = await fetch("/api/campus-admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        campusToast.error({
          title: "Course Not Created",
          description: await getApiError(response),
        });
        return;
      }

      const course = await readCourseResponse(response);
      setCourses((current) => [course, ...current]);
      setCreateOpen(false);
      campusToast.success({
        title: "Course Created",
        description: "The course was created successfully.",
      });
    });
  }

  function updateSelectedCourse(values: CourseInput) {
    if (!editing) return;
    startTransition(async () => {
      const response = await fetch(`/api/campus-admin/courses/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        campusToast.error({
          title: "Course Not Updated",
          description: await getApiError(response),
        });
        return;
      }

      const course = await readCourseResponse(response);
      setCourses((current) =>
        current.map((item) => (item.id === editing.id ? course : item)),
      );
      setEditing(null);
      campusToast.success({
        title: "Course Updated",
        description: "Course information was updated.",
      });
    });
  }

  function deactivateSelectedCourse() {
    if (!deactivating) return;
    startTransition(async () => {
      const response = await fetch(
        `/api/campus-admin/courses/${deactivating.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: "deactivate" }),
        },
      );

      if (!response.ok) {
        campusToast.error({
          title: "Course Not Deactivated",
          description: await getApiError(response),
        });
        return;
      }

      const course = await readCourseResponse(response);
      setCourses((current) =>
        current.map((item) => (item.id === deactivating.id ? course : item)),
      );
      setDeactivating(null);
      campusToast.warning({
        title: "Course Deactivated",
        description: "The course has been deactivated.",
      });
    });
  }

  const columns: DataTableColumn<SerializedCourse>[] = [
    { key: "name", header: "Course" },
    { key: "code", header: "Code" },
    { key: "departmentName", header: "Department" },
    {
      key: "durationYears",
      header: "Years",
      cell: (course) => `${course.durationYears}`,
    },
    {
      key: "status",
      header: "Status",
      cell: (course) => <StatusBadge status={course.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-16 text-right",
      cell: (course) => (
        <AdminActionMenu
          items={[
            { label: "View", icon: FiEye, onSelect: () => setViewing(course) },
            { label: "Edit", icon: FiEdit, onSelect: () => setEditing(course) },
            {
              label: "Deactivate",
              icon: FiSlash,
              disabled: course.status === "INACTIVE",
              onSelect: () => setDeactivating(course),
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
            placeholder="Search courses"
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
            disabled={departments.length === 0}
            type="button"
            onClick={() => setCreateOpen(true)}
          >
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            Create Course
          </Button>
        </div>
      </div>

      {viewMode === "cards" ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.length > 0 ? (
            filteredCourses.map((course) => (
              <article
                key={course.id}
                className="flex h-full flex-col rounded-xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-background text-primary">
                    <FiBook className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <AdminActionMenu
                    items={[
                      {
                        label: "View",
                        icon: FiEye,
                        onSelect: () => setViewing(course),
                      },
                      {
                        label: "Edit",
                        icon: FiEdit,
                        onSelect: () => setEditing(course),
                      },
                      {
                        label: "Deactivate",
                        icon: FiSlash,
                        disabled: course.status === "INACTIVE",
                        onSelect: () => setDeactivating(course),
                      },
                    ]}
                  />
                </div>
                <h3 className="mt-4 text-base font-semibold">{course.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {course.code} · {course.departmentName}
                </p>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {course.description}
                </p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <StatusBadge status={course.status} />
                  <span className="text-xs text-muted-foreground">
                    {course.durationYears} years
                  </span>
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              title={
                departments.length === 0
                  ? "Create a department first"
                  : query
                    ? "No matching courses"
                    : "No courses yet"
              }
              description={
                departments.length === 0
                  ? "Courses must belong to a department."
                  : query
                    ? "Adjust your search and try again."
                    : "Create courses to support student enrollment and alumni transition."
              }
              className="mx-auto border-0 bg-transparent md:col-span-2 xl:col-span-3"
            />
          )}
        </div>
      ) : (
        <div className="mt-5">
          <CampusDataTable
            columns={columns}
            data={filteredCourses}
            getRowId={(course) => course.id}
            empty={
              <EmptyState
                title={
                  departments.length === 0
                    ? "Create a department first"
                    : query
                      ? "No matching courses"
                      : "No courses yet"
                }
                description={
                  departments.length === 0
                    ? "Courses must belong to a department."
                    : query
                      ? "Adjust your search and try again."
                      : "Create courses to support student enrollment and alumni transition."
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
        title="Create Course"
        description="Create a course under a registered department."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        <CourseForm
          departments={departments}
          onSubmit={createSelectedCourse}
          isSubmitting={isPending}
        />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit Course"
        description="Update course details and official years of study."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        {editing ? (
          <CourseForm
            key={editing.id}
            departments={departments}
            course={editing}
            onSubmit={updateSelectedCourse}
            isSubmitting={isPending}
          />
        ) : null}
      </Modal>

      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.name ?? "Course details"}
        description="Course structure and graduation duration."
        className="max-w-xl"
      >
        {viewing ? <CourseDetails course={viewing} /> : null}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deactivating)}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title="Deactivate Course"
        description={`Deactivate ${deactivating?.name ?? "this course"}?`}
        confirmLabel="Deactivate"
        destructive
        onConfirm={deactivateSelectedCourse}
      />
    </>
  );
}
