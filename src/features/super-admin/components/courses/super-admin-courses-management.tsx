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
import type { DataTableColumn } from "@/components/shared/data-table";
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
  superAdminCourseInputSchema,
  type SuperAdminCourseInput,
} from "@/features/super-admin/lib/schemas";
import type {
  SerializedSuperAdminCourse,
  SerializedSuperAdminDepartment,
  SerializedUniversity,
} from "@/features/super-admin/lib/super-admin-service";
import { cn } from "@/lib/utils";

type Props = {
  courses: SerializedSuperAdminCourse[];
  departments: SerializedSuperAdminDepartment[];
  universities: SerializedUniversity[];
};

type ApiEnvelope<T> = {
  data: T | null;
  error: { message: string } | null;
};

const allValue = "__all__";

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
  status: SerializedSuperAdminCourse["status"];
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
  departments: SerializedSuperAdminDepartment[],
  course?: SerializedSuperAdminCourse,
): SuperAdminCourseInput {
  const universityId =
    course?.universityId ?? departments[0]?.universityId ?? universities[0]?.id ?? "";

  return {
    universityId,
    departmentId:
      course?.departmentId ??
      departments.find((department) => department.universityId === universityId)
        ?.id ??
      "",
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
    course: SerializedSuperAdminCourse;
  }>;

  if (!payload.data?.course) {
    throw new Error("Course response was empty.");
  }

  return payload.data.course;
}

function CourseForm({
  universities,
  departments,
  course,
  onSubmit,
  isSubmitting,
}: {
  universities: SerializedUniversity[];
  departments: SerializedSuperAdminDepartment[];
  course?: SerializedSuperAdminCourse;
  onSubmit: (values: SuperAdminCourseInput) => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<
    z.input<typeof superAdminCourseInputSchema>,
    unknown,
    SuperAdminCourseInput
  >({
    resolver: zodResolver(superAdminCourseInputSchema),
    defaultValues: getDefaultValues(universities, departments, course),
  });
  const universityId = watch("universityId");
  const departmentId = watch("departmentId");
  const status = watch("status");
  const filteredDepartments = departments.filter(
    (department) => department.universityId === universityId,
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
                "departmentId",
                departments.find(
                  (department) => department.universityId === value,
                )?.id ?? "",
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
              {filteredDepartments.map((department) => (
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
            max={8}
            min={1}
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
              setValue("status", value as SuperAdminCourseInput["status"], {
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
            placeholder="Describe the course, academic track, and graduation requirements."
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
        {course ? "Save Changes" : "Create Course"}
      </Button>
    </form>
  );
}

function CourseDetails({ course }: { course: SerializedSuperAdminCourse }) {
  const rows = [
    ["University", course.universityName],
    ["College", course.collegeName],
    ["Department", course.departmentName],
    ["Code", course.code],
    ["Years of study", `${course.durationYears}`],
    ["Students", course.studentsCount.toLocaleString()],
    ["Status", course.status],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary">
          <FiBook className="h-5 w-5" />
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
          <div key={label} className="rounded-lg border border-border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-sm font-medium">{value || "Not set"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SuperAdminCoursesManagement({
  courses: initialCourses,
  departments,
  universities,
}: Props) {
  const [courses, setCourses] = useState(initialCourses);
  const [query, setQuery] = useState("");
  const [universityFilter, setUniversityFilter] = useState(allValue);
  const [departmentFilter, setDepartmentFilter] = useState(allValue);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<SerializedSuperAdminCourse | null>(
    null,
  );
  const [editing, setEditing] = useState<SerializedSuperAdminCourse | null>(
    null,
  );
  const [deactivating, setDeactivating] =
    useState<SerializedSuperAdminCourse | null>(null);
  const [deleting, setDeleting] = useState<SerializedSuperAdminCourse | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const filterDepartments = useMemo(() => {
    if (universityFilter === allValue) return departments;
    return departments.filter(
      (department) => department.universityId === universityFilter,
    );
  }, [departments, universityFilter]);

  const filteredCourses = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return courses.filter((course) => {
      const matchesUniversity =
        universityFilter === allValue || course.universityId === universityFilter;
      const matchesDepartment =
        departmentFilter === allValue ||
        course.departmentId === departmentFilter;
      const matchesSearch =
        !normalized ||
        [
          course.name,
          course.code,
          course.departmentName,
          course.collegeName,
          course.universityName,
          course.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return matchesUniversity && matchesDepartment && matchesSearch;
    });
  }, [courses, departmentFilter, query, universityFilter]);

  function createCourse(values: SuperAdminCourseInput) {
    startTransition(async () => {
      const response = await fetch("/api/super-admin/courses", {
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

  function updateSelectedCourse(values: SuperAdminCourseInput) {
    if (!editing) return;
    startTransition(async () => {
      const response = await fetch(`/api/super-admin/courses/${editing.id}`, {
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
        current.map((item) => (item.id === course.id ? course : item)),
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
        `/api/super-admin/courses/${deactivating.id}`,
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
        current.map((item) => (item.id === course.id ? course : item)),
      );
      setDeactivating(null);
      campusToast.warning({
        title: "Course Deactivated",
        description: "The course has been deactivated.",
      });
    });
  }

  function deleteSelectedCourse() {
    if (!deleting) return;
    startTransition(async () => {
      const response = await fetch(`/api/super-admin/courses/${deleting.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        campusToast.error({
          title: "Course Not Deleted",
          description: await getApiError(response),
        });
        return;
      }

      setCourses((current) => current.filter((item) => item.id !== deleting.id));
      setDeleting(null);
      campusToast.warning({
        title: "Course Deleted",
        description: "The course was removed from active records.",
      });
    });
  }

  const actionItems = (course: SerializedSuperAdminCourse) => [
    { label: "View", icon: FiEye, onSelect: () => setViewing(course) },
    { label: "Edit", icon: FiEdit, onSelect: () => setEditing(course) },
    {
      label: "Deactivate",
      icon: FiSlash,
      disabled: course.status === "INACTIVE",
      onSelect: () => setDeactivating(course),
    },
    {
      label: "Delete",
      icon: FiTrash2,
      destructive: true,
      onSelect: () => setDeleting(course),
    },
  ];

  const columns: DataTableColumn<SerializedSuperAdminCourse>[] = [
    { key: "name", header: "Course" },
    { key: "code", header: "Code" },
    { key: "departmentName", header: "Department" },
    { key: "collegeName", header: "College" },
    { key: "universityName", header: "University" },
    {
      key: "durationYears",
      header: "Years",
      cell: (course) => course.durationYears.toLocaleString(),
    },
    {
      key: "studentsCount",
      header: "Students",
      cell: (course) => course.studentsCount.toLocaleString(),
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
      cell: (course) => <AdminActionMenu items={actionItems(course)} />,
    },
  ];

  const emptyTitle =
    departments.length === 0
      ? "Create a department first"
      : query || universityFilter !== allValue || departmentFilter !== allValue
        ? "No matching courses"
        : "No courses available";
  const emptyDescription =
    departments.length === 0
      ? "Courses must belong to a department under a university."
      : query || universityFilter !== allValue || departmentFilter !== allValue
        ? "Adjust your search or filters and try again."
        : "Create courses to support student enrollment and alumni transition.";

  return (
    <>
      <section className="mt-8 space-y-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_280px_280px_auto]">
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <CampusInput
              className="pl-9"
              placeholder="Search courses"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Select
            value={universityFilter}
            onValueChange={(value) => {
              setUniversityFilter(value);
              setDepartmentFilter(allValue);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All universities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={allValue}>All Universities</SelectItem>
              {universities.map((university) => (
                <SelectItem key={university.id} value={university.id}>
                  {university.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={allValue}>All Departments</SelectItem>
              {filterDepartments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
            <CampusViewToggle
              value={viewMode}
              options={viewOptions}
              onValueChange={setViewMode}
            />
            <Button
              disabled={departments.length === 0 || universities.length === 0}
              type="button"
              onClick={() => setCreateOpen(true)}
            >
              <FiPlus className="h-4 w-4" />
              Create Course
            </Button>
          </div>
        </div>

        {viewMode === "table" ? (
          <CampusDataTable
            columns={columns}
            data={filteredCourses}
            getRowId={(course) => course.id}
            empty={
              <EmptyState
                title={emptyTitle}
                description={emptyDescription}
                className="mx-auto border-0 bg-transparent"
              />
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.length > 0 ? (
              filteredCourses.map((course) => (
                <article
                  key={course.id}
                  className="rounded-lg border border-border bg-surface p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">{course.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {course.code} · {course.durationYears} years
                      </p>
                    </div>
                    <AdminActionMenu items={actionItems(course)} />
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {course.description}
                  </p>
                  <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                    <p>{course.universityName}</p>
                    <p>
                      {course.collegeName} · {course.departmentName}
                    </p>
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <StatusBadge status={course.status} />
                    <span className="text-xs text-muted-foreground">
                      {course.studentsCount.toLocaleString()} students
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState
                title={emptyTitle}
                description={emptyDescription}
                className="mx-auto border-0 bg-transparent md:col-span-2 xl:col-span-3"
              />
            )}
          </div>
        )}
      </section>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Course"
        description="Create a course under a registered department."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        <CourseForm
          departments={departments}
          universities={universities}
          onSubmit={createCourse}
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
            course={editing}
            departments={departments}
            universities={universities}
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

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete Course"
        description={`Delete ${deleting?.name ?? "this course"} from active records?`}
        confirmLabel="Delete"
        destructive
        onConfirm={deleteSelectedCourse}
      />
    </>
  );
}
