// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import {
  FiArchive,
  FiArrowLeft,
  FiArrowRight,
  FiBarChart2,
  FiCheckCircle,
  FiCopy,
  FiEdit,
  FiEye,
  FiGrid,
  FiLoader,
  FiLock,
  FiList,
  FiMail,
  FiPauseCircle,
  FiPieChart,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSlash,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { z } from "zod";

import {
  CampusDataTable,
  CampusCheckbox,
  CampusInput,
  CampusTextarea,
  CampusViewToggle,
  campusToast,
} from "@/components/campushub";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Drawer } from "@/components/shared/drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { MultiStepProgress } from "@/components/shared/multi-step-progress";
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
  committeeCategories,
  eventCategories,
  type Announcement,
  type CollegeEvent,
  type CollegeStudent,
  type CommitteeMember,
  type ForumTopic,
  type Poll,
  type StudentInvitation,
  type Suggestion,
} from "@/features/representative/lib/mock-data";
import type { DataTableColumn } from "@/components/shared/data-table";

const pollTargetColleges = [
  "College of ICT",
  "College of Engineering and Technology",
  "College of Natural and Applied Sciences",
  "College of Social Sciences",
] as const;

const pollTargetDepartments = [
  "Computer Science",
  "Electronics and Telecommunications",
  "Information Systems",
  "Civil Engineering",
  "Software Engineering",
] as const;

const audienceOptions = [
  "All CoICT Students",
  "Year 1 Students",
  "Year 2 Students",
  "Sports Clubs",
  "Final Year Students",
] as const;

const announcementCategories = [
  "Academic",
  "Sports",
  "Media",
  "Technology",
  "Entertainment",
  "Student Welfare",
] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-md border border-border bg-background px-2 py-1 text-xs font-medium">
      {status.replaceAll("_", " ")}
    </span>
  );
}

function AvatarCell({
  src,
  fallback,
  icon: Icon = FiUsers,
}: {
  src?: string;
  fallback: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-border bg-primary/10 text-primary">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <Icon className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="sr-only">{fallback}</span>
    </span>
  );
}

function Toolbar({
  query,
  onQueryChange,
  placeholder,
  action,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <FiSearch
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <CampusInput
          className="pl-9"
          placeholder={placeholder}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
      {action}
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onValueChange: (value: T) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <Select value={value} onValueChange={(next) => onValueChange(next as T)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option.replaceAll("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function DetailsGrid({
  rows,
  className = "sm:grid-cols-2",
}: {
  rows: [string, React.ReactNode][];
  className?: string;
}) {
  return (
    <div className={`grid gap-3 ${className}`}>
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-md border border-border p-3">
          <p className="text-xs uppercase tracking-normal text-muted-foreground">
            {label}
          </p>
          <div className="mt-1 text-sm font-medium">{value || "Not set"}</div>
        </div>
      ))}
    </div>
  );
}

const committeeSchema = z.object({
  name: z.string().min(2, "Name is required."),
  category: z.enum(committeeCategories),
  position: z.string().min(2, "Position is required."),
  email: z.string().email("Enter a valid email."),
  phone: z.string().min(5, "Phone is required."),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING", "SUSPENDED"]),
  notes: z.string().min(10, "Add a short note."),
});

type CommitteeInput = z.infer<typeof committeeSchema>;

function CommitteeForm({
  member,
  onSubmit,
  isSubmitting,
}: {
  member?: CommitteeMember;
  onSubmit: (values: CommitteeInput) => void;
  isSubmitting: boolean;
}) {
  const { register, handleSubmit, watch, setValue, formState } = useForm<
    z.input<typeof committeeSchema>,
    unknown,
    CommitteeInput
  >({
    resolver: zodResolver(committeeSchema),
    defaultValues: {
      name: member?.name ?? "",
      category:
        (member?.category as CommitteeInput["category"] | undefined) ??
        "Academic Affairs",
      position: member?.position ?? "",
      email: member?.email ?? "",
      phone: member?.phone ?? "",
      status:
        (member?.status as CommitteeInput["status"] | undefined) ?? "ACTIVE",
      notes: member?.notes ?? "",
    },
  });

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">Name</span>
          <CampusInput
            {...register("name")}
            invalid={Boolean(formState.errors.name)}
            placeholder="Neema Salum"
          />
        </label>
        <SelectField
          label="Category"
          value={watch("category")}
          options={committeeCategories}
          onValueChange={(value) => setValue("category", value)}
        />
        <label className="space-y-2">
          <span className="text-sm font-medium">Position</span>
          <CampusInput
            {...register("position")}
            invalid={Boolean(formState.errors.position)}
            placeholder="Technology Committee Lead"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Email</span>
          <CampusInput
            {...register("email")}
            invalid={Boolean(formState.errors.email)}
            placeholder="leader@university.edu"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Phone</span>
          <CampusInput
            {...register("phone")}
            invalid={Boolean(formState.errors.phone)}
            placeholder="+255 000 000 000"
          />
        </label>
        <SelectField
          label="Status"
          value={watch("status")}
          options={["ACTIVE", "INACTIVE", "PENDING", "SUSPENDED"] as const}
          onValueChange={(value) => setValue("status", value)}
        />
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Notes</span>
          <CampusTextarea
            {...register("notes")}
            invalid={Boolean(formState.errors.notes)}
            placeholder="Add responsibilities, committee coverage, or handover notes."
          />
        </label>
      </div>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        {member ? "Save Changes" : "Create Committee Member"}
      </Button>
    </form>
  );
}

export function CommitteeManagement({
  initialMembers,
}: {
  initialMembers: CommitteeMember[];
}) {
  const [members, setMembers] = useState(initialMembers);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<CommitteeMember | null>(null);
  const [editing, setEditing] = useState<CommitteeMember | null>(null);
  const [deactivating, setDeactivating] = useState<CommitteeMember | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return members;
    return members.filter((member) =>
      [
        member.name,
        member.category,
        member.position,
        member.email,
        member.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [members, query]);

  function createMember(values: CommitteeInput) {
    startTransition(() => {
      setMembers((current) => [
        {
          id: `committee-${Date.now()}`,
          photo: "",
          joinedAt: new Date().toISOString().slice(0, 10),
          ...values,
        },
        ...current,
      ]);
      setCreateOpen(false);
      campusToast.success({
        title: "Committee Member Created",
        description: "The committee member was added successfully.",
      });
    });
  }

  function updateMember(values: CommitteeInput) {
    if (!editing) return;
    startTransition(() => {
      setMembers((current) =>
        current.map((member) =>
          member.id === editing.id ? { ...member, ...values } : member,
        ),
      );
      setEditing(null);
      campusToast.success({
        title: "Committee Member Updated",
        description: "Committee member information was updated.",
      });
    });
  }

  function deactivateMember() {
    if (!deactivating) return;
    startTransition(() => {
      setMembers((current) =>
        current.map((member) =>
          member.id === deactivating.id
            ? { ...member, status: "INACTIVE" }
            : member,
        ),
      );
      setDeactivating(null);
      campusToast.warning({
        title: "Committee Member Deactivated",
        description: "The committee member is no longer active.",
      });
    });
  }

  const columns: DataTableColumn<CommitteeMember>[] = [
    {
      key: "photo",
      header: "Photo",
      className: "w-20",
      cell: (member) => (
        <AvatarCell src={member.photo} fallback={member.name} />
      ),
    },
    { key: "name", header: "Name" },
    { key: "category", header: "Category" },
    { key: "position", header: "Position" },
    { key: "email", header: "Email" },
    {
      key: "status",
      header: "Status",
      cell: (member) => <StatusBadge status={member.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-16 text-right",
      cell: (member) => (
        <AdminActionMenu
          items={[
            { label: "View", icon: FiEye, onSelect: () => setViewing(member) },
            { label: "Edit", icon: FiEdit, onSelect: () => setEditing(member) },
            {
              label: "Deactivate",
              icon: FiSlash,
              disabled: member.status === "INACTIVE",
              onSelect: () => setDeactivating(member),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <Toolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search committee"
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            Create Committee Member
          </Button>
        }
      />
      <div className="mt-5">
        <CampusDataTable
          columns={columns}
          data={filtered}
          getRowId={(member) => member.id}
          empty={
            <EmptyState
              title={query ? "No matching members" : "No committee members"}
              description="Create committee members to coordinate college operations."
              className="mx-auto border-0 bg-transparent"
            />
          }
        />
      </div>
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Committee Member"
        description="Add a category lead or executive committee member."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        <CommitteeForm onSubmit={createMember} isSubmitting={isPending} />
      </Modal>
      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit Committee Member"
        description="Update committee member details."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        {editing ? (
          <CommitteeForm
            key={editing.id}
            member={editing}
            onSubmit={updateMember}
            isSubmitting={isPending}
          />
        ) : null}
      </Modal>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.name ?? "Committee member"}
        description="Committee profile and responsibilities."
        className="max-w-xl"
      >
        {viewing ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <AvatarCell src={viewing.photo} fallback={viewing.name} />
              <div>
                <p className="font-semibold">{viewing.name}</p>
                <p className="text-sm text-muted-foreground">
                  {viewing.position}
                </p>
              </div>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {viewing.notes}
            </p>
            <DetailsGrid
              rows={[
                ["Category", viewing.category],
                ["Email", viewing.email],
                ["Phone", viewing.phone],
                [
                  "Status",
                  <StatusBadge key="status" status={viewing.status} />,
                ],
                ["Joined", formatDate(viewing.joinedAt)],
              ]}
            />
          </div>
        ) : null}
      </Drawer>
      <ConfirmDialog
        open={Boolean(deactivating)}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title="Deactivate Committee Member"
        description={`Deactivate ${deactivating?.name ?? "this member"}?`}
        confirmLabel="Deactivate"
        destructive
        onConfirm={deactivateMember}
      />
    </>
  );
}

export function StudentsManagement({
  initialStudents,
}: {
  initialStudents: CollegeStudent[];
}) {
  const [students, setStudents] = useState(initialStudents);
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<CollegeStudent | null>(null);
  const [suspending, setSuspending] = useState<CollegeStudent | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return students;
    return students.filter((student) =>
      [
        student.name,
        student.department,
        student.year,
        student.email,
        student.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [students, query]);

  function suspendStudent() {
    if (!suspending) return;
    setStudents((current) =>
      current.map((student) =>
        student.id === suspending.id
          ? { ...student, status: "SUSPENDED" }
          : student,
      ),
    );
    setSuspending(null);
    campusToast.warning({
      title: "Student Suspended",
      description: "The student account has been marked for review.",
    });
  }

  const columns: DataTableColumn<CollegeStudent>[] = [
    {
      key: "photo",
      header: "Photo",
      className: "w-20",
      cell: (student) => (
        <AvatarCell src={student.photo} fallback={student.name} />
      ),
    },
    { key: "name", header: "Name" },
    { key: "department", header: "Department" },
    { key: "year", header: "Year" },
    { key: "email", header: "Email" },
    {
      key: "status",
      header: "Status",
      cell: (student) => <StatusBadge status={student.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-16 text-right",
      cell: (student) => (
        <AdminActionMenu
          items={[
            { label: "View", icon: FiEye, onSelect: () => setViewing(student) },
            {
              label: "Suspend",
              icon: FiPauseCircle,
              destructive: true,
              disabled: student.status === "SUSPENDED",
              onSelect: () => setSuspending(student),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <Toolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search students"
      />
      <div className="mt-5">
        <CampusDataTable
          columns={columns}
          data={filtered}
          getRowId={(student) => student.id}
          empty={
            <EmptyState
              title={query ? "No matching students" : "No students yet"}
              description="Students will appear here after joining through invitation links."
              className="mx-auto border-0 bg-transparent"
            />
          }
        />
      </div>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.name ?? "Student details"}
        description="Student enrollment and profile summary."
        className="max-w-xl"
      >
        {viewing ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <AvatarCell src={viewing.photo} fallback={viewing.name} />
              <div>
                <p className="font-semibold">{viewing.name}</p>
                <p className="text-sm text-muted-foreground">
                  {viewing.department}
                </p>
              </div>
            </div>
            <DetailsGrid
              rows={[
                ["Department", viewing.department],
                ["Year", viewing.year],
                ["Email", viewing.email],
                [
                  "Status",
                  <StatusBadge key="status" status={viewing.status} />,
                ],
                ["Joined", formatDate(viewing.joinedAt)],
              ]}
            />
          </div>
        ) : null}
      </Drawer>
      <ConfirmDialog
        open={Boolean(suspending)}
        onOpenChange={(open) => !open && setSuspending(null)}
        title="Suspend Student"
        description={`Suspend ${suspending?.name ?? "this student"} from active college access?`}
        confirmLabel="Suspend"
        destructive
        onConfirm={suspendStudent}
      />
    </>
  );
}

const invitationSchema = z.object({
  courseId: z.string().min(1, "Select a course."),
  yearOfStudy: z.coerce.number().int().min(1).max(8),
  expiresInDays: z.coerce.number().int().min(1).max(180),
  maxUsageCount: z.preprocess(
    (value) => (value === "" || value == null ? undefined : Number(value)),
    z.number().int().min(1).max(5000).optional(),
  ),
});

type InvitationInput = z.infer<typeof invitationSchema>;

const invitationExpiryOptions = [
  { label: "7 days", value: "7" },
  { label: "14 days", value: "14" },
  { label: "30 days", value: "30" },
  { label: "60 days", value: "60" },
  { label: "90 days", value: "90" },
] as const;

const invitationViewOptions = [
  { value: "table", label: "Table view", icon: FiList },
  { value: "cards", label: "Card view", icon: FiGrid },
] as const;

type InvitationScope = {
  universityId: string;
  universityName: string;
  collegeId: string;
  collegeName: string;
};

type InvitationCourse = {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  departmentName: string;
  durationYears: number;
};

type InvitationApiResponse = {
  invitation?: StudentInvitation;
  invitations?: StudentInvitation[];
  error?: string;
};

function getInvitationStatus(invitation: StudentInvitation) {
  if (invitation.status === "DISABLED") return "DISABLED";
  if (
    invitation.expiresAt &&
    new Date(invitation.expiresAt).getTime() < Date.now()
  ) {
    return "EXPIRED";
  }
  if (
    typeof invitation.maxUsageCount === "number" &&
    invitation.usageCount >= invitation.maxUsageCount
  ) {
    return "FULL";
  }
  return invitation.status ?? "ACTIVE";
}

function formatNullableDate(value?: string | null) {
  return value ? formatDate(value) : "No expiry";
}

function InvitationForm({
  scope,
  courses,
  onSubmit,
  isSubmitting,
}: {
  scope: InvitationScope;
  courses: InvitationCourse[];
  onSubmit: (values: InvitationInput) => void;
  isSubmitting: boolean;
}) {
  const { register, handleSubmit, watch, setValue, formState } = useForm<
    z.input<typeof invitationSchema>,
    unknown,
    InvitationInput
  >({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      courseId: "",
      yearOfStudy: 1,
      expiresInDays: 14,
      maxUsageCount: undefined,
    },
  });
  const courseId = watch("courseId");
  const selectedCourse = courses.find((course) => course.id === courseId);
  const yearOptions = Array.from(
    { length: selectedCourse?.durationYears ?? 1 },
    (_, index) => index + 1,
  );

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
        <p className="text-sm font-semibold text-primary">
          Student invitation for {scope.collegeName}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Students who join through this link will be attached to{" "}
          {scope.universityName} and {scope.collegeName}.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Course</span>
          <Select
            value={courseId}
            onValueChange={(value) => {
              setValue("courseId", value, {
                shouldDirty: true,
                shouldValidate: true,
              });
              setValue("yearOfStudy", 1, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name} ({course.code}) · {course.departmentName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formState.errors.courseId ? (
            <p className="text-xs text-destructive">
              {formState.errors.courseId.message}
            </p>
          ) : null}
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Year of study</span>
          <Select
            value={String(watch("yearOfStudy") ?? 1)}
            onValueChange={(value) =>
              setValue("yearOfStudy", Number(value), {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            disabled={!selectedCourse}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  Year {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Expiry</span>
          <Select
            value={String(watch("expiresInDays") ?? 14)}
            onValueChange={(value) =>
              setValue("expiresInDays", Number(value), {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select expiry" />
            </SelectTrigger>
            <SelectContent>
              {invitationExpiryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Usage limit</span>
          <CampusInput
            {...register("maxUsageCount")}
            type="number"
            min={1}
            max={5000}
            invalid={Boolean(formState.errors.maxUsageCount)}
            placeholder="Leave blank for unlimited uses"
          />
        </label>
      </div>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        Generate Student Link
      </Button>
    </form>
  );
}

export function InvitationsManagement({
  invitationScope,
  courses,
  initialInvitations,
}: {
  invitationScope: InvitationScope;
  courses: InvitationCourse[];
  initialInvitations: StudentInvitation[];
}) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<StudentInvitation | null>(null);
  const [deactivating, setDeactivating] = useState<StudentInvitation | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return invitations;
    return invitations.filter((invitation) =>
      [
        invitation.collegeName,
        invitation.departmentName,
        invitation.courseName,
        invitation.universityName,
        invitation.status,
        invitation.invitationUrl,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [invitations, query]);

  function createInvitation(values: InvitationInput) {
    startTransition(async () => {
      const expiresAt = new Date(
        Date.now() + values.expiresInDays * 24 * 60 * 60 * 1000,
      ).toISOString();
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          universityId: invitationScope.universityId,
          collegeId: invitationScope.collegeId,
          courseId: values.courseId,
          yearOfStudy: values.yearOfStudy,
          expiresAt,
          maxUsageCount: values.maxUsageCount,
        }),
      });
      const payload = (await response.json()) as InvitationApiResponse;

      if (!response.ok || !payload.invitation) {
        campusToast.error({
          title: "Invitation Not Generated",
          description: payload.error ?? "Unable to generate student link.",
        });
        return;
      }

      setInvitations((current) => [payload.invitation, ...current]);
      setCreateOpen(false);
      setViewing(payload.invitation);
      campusToast.info({
        title: "Student Link Generated",
        description: "Copy and share this link with students.",
      });
    });
  }

  function patchInvitation(
    invitation: StudentInvitation,
    action: "disable" | "regenerate",
  ) {
    startTransition(async () => {
      const response = await fetch(`/api/invitations/${invitation.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as InvitationApiResponse;

      if (!response.ok || !payload.invitation) {
        campusToast.error({
          title:
            action === "disable"
              ? "Invitation Not Deactivated"
              : "Invitation Not Regenerated",
          description: payload.error ?? "Unable to update the invitation.",
        });
        return;
      }

      if (action === "regenerate") {
        setInvitations((current) => [
          payload.invitation!,
          ...current.map((item) =>
            item.id === invitation.id ? { ...item, status: "DISABLED" } : item,
          ),
        ]);
        setViewing(payload.invitation);
      } else {
        setInvitations((current) =>
          current.map((item) =>
            item.id === invitation.id ? payload.invitation! : item,
          ),
        );
        if (viewing?.id === invitation.id) {
          setViewing(payload.invitation);
        }
      }

      setDeactivating(null);
      campusToast.info({
        title:
          action === "disable"
            ? "Invitation Deactivated"
            : "Invitation Regenerated",
        description:
          action === "disable"
            ? "Students can no longer use this link."
            : "Copy and share the new student invitation link.",
      });
    });
  }

  async function copyInvitation(invitation: StudentInvitation) {
    await navigator.clipboard.writeText(invitation.invitationUrl);
    campusToast.info({
      title: "Invitation Copied",
      description: "The student join link is ready to share.",
    });
  }

  const columns: DataTableColumn<StudentInvitation>[] = [
    {
      key: "courseName",
      header: "Course",
      cell: (invitation) => (
        <div>
          <p className="font-medium">
            {invitation.courseName ?? invitation.collegeName}
          </p>
          <p className="text-xs text-muted-foreground">
            {invitation.departmentName ?? invitation.universityName}
          </p>
        </div>
      ),
    },
    {
      key: "usageCount",
      header: "Usage",
      cell: (invitation) =>
        `${invitation.usageCount.toLocaleString()} / ${
          invitation.maxUsageCount
            ? invitation.maxUsageCount.toLocaleString()
            : "Unlimited"
        }`,
    },
    {
      key: "status",
      header: "Status",
      cell: (invitation) => (
        <StatusBadge status={getInvitationStatus(invitation)} />
      ),
    },
    {
      key: "expiresAt",
      header: "Expires",
      cell: (invitation) => formatNullableDate(invitation.expiresAt),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-16 text-right",
      cell: (invitation) => (
        <AdminActionMenu
          items={[
            {
              label: "View",
              icon: FiEye,
              onSelect: () => setViewing(invitation),
            },
            {
              label: "Copy Link",
              icon: FiCopy,
              onSelect: () => void copyInvitation(invitation),
            },
            {
              label: "Regenerate Link",
              icon: FiRefreshCw,
              disabled: isPending,
              onSelect: () => patchInvitation(invitation, "regenerate"),
            },
            {
              label: "Deactivate",
              icon: FiSlash,
              destructive: true,
              disabled: invitation.status === "DISABLED",
              onSelect: () => setDeactivating(invitation),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          [
            "Active Links",
            invitations.filter((item) => getInvitationStatus(item) === "ACTIVE")
              .length,
          ],
          [
            "Students Joined",
            invitations.reduce((sum, item) => sum + item.usageCount, 0),
          ],
          ["Total Links", invitations.length],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-border bg-surface p-5"
          >
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </div>
        ))}
      </section>
      <Toolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search invitations"
        action={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <CampusViewToggle
              value={viewMode}
              options={invitationViewOptions}
              onValueChange={setViewMode}
            />
            <Button
              type="button"
              disabled={courses.length === 0}
              onClick={() => setCreateOpen(true)}
            >
              <FiPlus className="h-4 w-4" aria-hidden="true" />
              Generate Student Link
            </Button>
          </div>
        }
      />
      {viewMode === "cards" ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.length > 0 ? (
            filtered.map((invitation) => (
              <article
                key={invitation.id}
                className="flex h-full flex-col rounded-lg border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FiMail className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <AdminActionMenu
                    items={[
                      {
                        label: "View",
                        icon: FiEye,
                        onSelect: () => setViewing(invitation),
                      },
                      {
                        label: "Copy Link",
                        icon: FiCopy,
                        onSelect: () => void copyInvitation(invitation),
                      },
                      {
                        label: "Regenerate Link",
                        icon: FiRefreshCw,
                        disabled: isPending,
                        onSelect: () =>
                          patchInvitation(invitation, "regenerate"),
                      },
                      {
                        label: "Deactivate",
                        icon: FiSlash,
                        destructive: true,
                        disabled: invitation.status === "DISABLED",
                        onSelect: () => setDeactivating(invitation),
                      },
                    ]}
                  />
                </div>
                <h3 className="mt-4 text-base font-semibold">
                  {invitation.courseName ?? invitation.collegeName}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {invitation.yearOfStudy
                    ? `Year ${invitation.yearOfStudy}`
                    : invitation.universityName}
                </p>
                <p className="mt-4 line-clamp-2 break-all text-sm text-muted-foreground">
                  {invitation.invitationUrl}
                </p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <StatusBadge status={getInvitationStatus(invitation)} />
                  <span className="text-xs text-muted-foreground">
                    {invitation.usageCount} joined
                  </span>
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              title={query ? "No matching links" : "No invitation links"}
              description="Generate student invitation links to onboard verified students into your college."
              className="mx-auto border-0 bg-transparent md:col-span-2 xl:col-span-3"
            />
          )}
        </div>
      ) : (
        <div className="mt-5">
          <CampusDataTable
            columns={columns}
            data={filtered}
            getRowId={(invitation) => invitation.id}
            empty={
              <EmptyState
                title={query ? "No matching links" : "No invitation links"}
                description="Generate student invitation links to onboard verified students into your college."
                className="mx-auto border-0 bg-transparent"
              />
            }
          />
        </div>
      )}
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Generate Student Invitation"
        description="Create a college-scoped enrollment link for students."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        <InvitationForm
          scope={invitationScope}
          courses={courses}
          onSubmit={createInvitation}
          isSubmitting={isPending}
        />
      </Modal>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.collegeName ?? "Invitation link"}
        description="Enrollment link usage and sharing details."
        className="max-w-xl"
      >
        {viewing ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-normal text-muted-foreground">
                Invitation URL
              </p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                <p className="min-w-0 flex-1 break-all text-sm font-medium">
                  {viewing.invitationUrl}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void copyInvitation(viewing)}
                >
                  <FiCopy className="h-4 w-4" aria-hidden="true" />
                  Copy
                </Button>
              </div>
            </div>
            <DetailsGrid
              className="grid-cols-1"
              rows={[
                ["University", viewing.universityName],
                ["College", viewing.collegeName],
                ["Department", viewing.departmentName ?? "Not assigned"],
                ["Course", viewing.courseName ?? "Not assigned"],
                [
                  "Year",
                  viewing.yearOfStudy ? `Year ${viewing.yearOfStudy}` : "Not set",
                ],
                [
                  "Expected graduation",
                  viewing.expectedGraduationYear
                    ? `${viewing.expectedGraduationYear}`
                    : "Not set",
                ],
                [
                  "Usage",
                  `${viewing.usageCount} / ${
                    viewing.maxUsageCount ?? "Unlimited"
                  }`,
                ],
                [
                  "Status",
                  <StatusBadge
                    key="status"
                    status={getInvitationStatus(viewing)}
                  />,
                ],
                ["Created", formatNullableDate(viewing.createdAt)],
                ["Expires", formatNullableDate(viewing.expiresAt)],
              ]}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                className="w-full"
                type="button"
                variant="secondary"
                onClick={() => patchInvitation(viewing, "regenerate")}
                disabled={isPending}
              >
                <FiRefreshCw className="h-4 w-4" aria-hidden="true" />
                Regenerate Link
              </Button>
              <Button
                className="w-full"
                type="button"
                variant="destructive"
                onClick={() => setDeactivating(viewing)}
                disabled={viewing.status === "DISABLED"}
              >
                <FiSlash className="h-4 w-4" aria-hidden="true" />
                Deactivate
              </Button>
            </div>
          </div>
        ) : null}
      </Drawer>
      <ConfirmDialog
        open={Boolean(deactivating)}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title="Deactivate Invitation Link"
        description={`Deactivate the student invitation link for ${
          deactivating?.collegeName ?? "this college"
        }?`}
        confirmLabel="Deactivate"
        destructive
        onConfirm={() =>
          deactivating ? patchInvitation(deactivating, "disable") : undefined
        }
      />
    </>
  );
}

const announcementSchema = z.object({
  title: z.string().min(2, "Title is required."),
  category: z.enum(announcementCategories),
  audience: z.enum(audienceOptions),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  body: z.string().min(10, "Announcement body is required."),
});

type AnnouncementInput = z.infer<typeof announcementSchema>;

function AnnouncementForm({
  announcement,
  onSubmit,
  isSubmitting,
}: {
  announcement?: Announcement;
  onSubmit: (values: AnnouncementInput) => void;
  isSubmitting: boolean;
}) {
  const { register, handleSubmit, watch, setValue, formState } = useForm<
    z.input<typeof announcementSchema>,
    unknown,
    AnnouncementInput
  >({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: announcement?.title ?? "",
      category:
        (announcement?.category as AnnouncementInput["category"] | undefined) ??
        "Academic",
      audience:
        (announcement?.audience as AnnouncementInput["audience"] | undefined) ??
        "All CoICT Students",
      status:
        (announcement?.status as AnnouncementInput["status"] | undefined) ??
        "DRAFT",
      body: announcement?.body ?? "",
    },
  });

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Title</span>
          <CampusInput
            {...register("title")}
            invalid={Boolean(formState.errors.title)}
            placeholder="Mid-semester assessment schedule"
          />
        </label>
        <SelectField
          label="Category"
          value={watch("category")}
          options={announcementCategories}
          onValueChange={(value) => setValue("category", value)}
        />
        <SelectField
          label="Audience"
          value={watch("audience")}
          options={audienceOptions}
          onValueChange={(value) => setValue("audience", value)}
        />
        <SelectField
          label="Status"
          value={watch("status")}
          options={["DRAFT", "PUBLISHED", "ARCHIVED"] as const}
          onValueChange={(value) => setValue("status", value)}
        />
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Body</span>
          <CampusTextarea
            {...register("body")}
            invalid={Boolean(formState.errors.body)}
            placeholder="Write the announcement body for the selected audience."
          />
        </label>
      </div>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        {announcement ? "Save Announcement" : "Create Announcement"}
      </Button>
    </form>
  );
}

export function AnnouncementsManagement({
  initialAnnouncements,
}: {
  initialAnnouncements: Announcement[];
}) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<Announcement | null>(null);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deactivating, setDeactivating] = useState<Announcement | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return announcements;
    return announcements.filter((announcement) =>
      [
        announcement.title,
        announcement.category,
        announcement.audience,
        announcement.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [announcements, query]);

  function createAnnouncement(values: AnnouncementInput) {
    startTransition(() => {
      setAnnouncements((current) => [
        {
          id: `announcement-${Date.now()}`,
          createdAt: new Date().toISOString().slice(0, 10),
          ...values,
        },
        ...current,
      ]);
      setCreateOpen(false);
      campusToast.success({
        title: "Announcement Published",
        description: "The announcement was saved for the selected audience.",
      });
    });
  }

  function updateAnnouncement(values: AnnouncementInput) {
    if (!editing) return;
    setAnnouncements((current) =>
      current.map((announcement) =>
        announcement.id === editing.id
          ? { ...announcement, ...values }
          : announcement,
      ),
    );
    setEditing(null);
    campusToast.success({
      title: "Announcement Updated",
      description: "Announcement details were updated.",
    });
  }

  function archiveAnnouncement() {
    if (!deactivating) return;
    setAnnouncements((current) =>
      current.map((announcement) =>
        announcement.id === deactivating.id
          ? { ...announcement, status: "ARCHIVED" }
          : announcement,
      ),
    );
    setDeactivating(null);
    campusToast.warning({
      title: "Announcement Archived",
      description: "The announcement is no longer active.",
    });
  }

  const columns: DataTableColumn<Announcement>[] = [
    { key: "title", header: "Title" },
    { key: "category", header: "Category" },
    { key: "audience", header: "Audience" },
    {
      key: "status",
      header: "Status",
      cell: (announcement) => <StatusBadge status={announcement.status} />,
    },
    {
      key: "createdAt",
      header: "Created Date",
      cell: (announcement) => formatDate(announcement.createdAt),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-16 text-right",
      cell: (announcement) => (
        <AdminActionMenu
          items={[
            {
              label: "View",
              icon: FiEye,
              onSelect: () => setViewing(announcement),
            },
            {
              label: "Edit",
              icon: FiEdit,
              onSelect: () => setEditing(announcement),
            },
            {
              label: "Archive",
              icon: FiArchive,
              disabled: announcement.status === "ARCHIVED",
              onSelect: () => setDeactivating(announcement),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <Toolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search announcements"
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            Create Announcement
          </Button>
        }
      />
      <div className="mt-5">
        <CampusDataTable
          columns={columns}
          data={filtered}
          getRowId={(announcement) => announcement.id}
          empty={
            <EmptyState
              title={query ? "No matching announcements" : "No announcements"}
              description="Publish academic, welfare, media, and technology updates for students."
              className="mx-auto border-0 bg-transparent"
            />
          }
        />
      </div>
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Announcement"
        description="Draft or publish a college announcement."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        <AnnouncementForm
          onSubmit={createAnnouncement}
          isSubmitting={isPending}
        />
      </Modal>
      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit Announcement"
        description="Update announcement content and status."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        {editing ? (
          <AnnouncementForm
            key={editing.id}
            announcement={editing}
            onSubmit={updateAnnouncement}
            isSubmitting={isPending}
          />
        ) : null}
      </Modal>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.title ?? "Announcement"}
        description="Announcement content and distribution."
        className="max-w-xl"
      >
        {viewing ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {viewing.body}
            </p>
            <DetailsGrid
              rows={[
                ["Category", viewing.category],
                ["Audience", viewing.audience],
                [
                  "Status",
                  <StatusBadge key="status" status={viewing.status} />,
                ],
                ["Created", formatDate(viewing.createdAt)],
              ]}
            />
          </div>
        ) : null}
      </Drawer>
      <ConfirmDialog
        open={Boolean(deactivating)}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title="Archive Announcement"
        description={`Archive ${deactivating?.title ?? "this announcement"}?`}
        confirmLabel="Archive"
        onConfirm={archiveAnnouncement}
      />
    </>
  );
}

const eventSchema = z.object({
  name: z.string().min(2, "Event name is required."),
  category: z.enum(eventCategories),
  venue: z.string().min(2, "Venue is required."),
  date: z.string().min(1, "Date is required."),
  attendees: z.coerce.number().int().min(0),
  status: z.enum(["UPCOMING", "LIVE", "CANCELLED", "COMPLETED"]),
  description: z.string().min(10, "Description is required."),
});

type EventInput = z.infer<typeof eventSchema>;

function EventForm({
  event,
  onSubmit,
  isSubmitting,
}: {
  event?: CollegeEvent;
  onSubmit: (values: EventInput) => void;
  isSubmitting: boolean;
}) {
  const { register, handleSubmit, watch, setValue, formState } = useForm<
    z.input<typeof eventSchema>,
    unknown,
    EventInput
  >({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: event?.name ?? "",
      category:
        (event?.category as EventInput["category"] | undefined) ?? "Workshop",
      venue: event?.venue ?? "",
      date: event?.date ?? "",
      attendees: event?.attendees ?? 0,
      status: (event?.status as EventInput["status"] | undefined) ?? "UPCOMING",
      description: event?.description ?? "",
    },
  });

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">Event</span>
          <CampusInput
            {...register("name")}
            invalid={Boolean(formState.errors.name)}
            placeholder="Career readiness workshop"
          />
        </label>
        <SelectField
          label="Category"
          value={watch("category")}
          options={eventCategories}
          onValueChange={(value) => setValue("category", value)}
        />
        <label className="space-y-2">
          <span className="text-sm font-medium">Venue</span>
          <CampusInput
            {...register("venue")}
            invalid={Boolean(formState.errors.venue)}
            placeholder="CoICT Lecture Theatre"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Date</span>
          <CampusInput
            {...register("date")}
            type="date"
            invalid={Boolean(formState.errors.date)}
            placeholder="Select event date"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Attendees</span>
          <CampusInput
            {...register("attendees")}
            type="number"
            invalid={Boolean(formState.errors.attendees)}
            placeholder="180"
          />
        </label>
        <SelectField
          label="Status"
          value={watch("status")}
          options={["UPCOMING", "LIVE", "CANCELLED", "COMPLETED"] as const}
          onValueChange={(value) => setValue("status", value)}
        />
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Description</span>
          <CampusTextarea
            {...register("description")}
            invalid={Boolean(formState.errors.description)}
            placeholder="Describe the event, expected audience, and logistics."
          />
        </label>
      </div>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        {event ? "Save Event" : "Create Event"}
      </Button>
    </form>
  );
}

export function EventsManagement({
  initialEvents,
}: {
  initialEvents: CollegeEvent[];
}) {
  const [events, setEvents] = useState(initialEvents);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<CollegeEvent | null>(null);
  const [editing, setEditing] = useState<CollegeEvent | null>(null);
  const [cancelling, setCancelling] = useState<CollegeEvent | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return events;
    return events.filter((event) =>
      [event.name, event.category, event.venue, event.status]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [events, query]);

  function createEvent(values: EventInput) {
    startTransition(() => {
      setEvents((current) => [
        { id: `event-${Date.now()}`, ...values },
        ...current,
      ]);
      setCreateOpen(false);
      campusToast.success({
        title: "Event Created",
        description: "The college event was created successfully.",
      });
    });
  }

  function updateEvent(values: EventInput) {
    if (!editing) return;
    setEvents((current) =>
      current.map((event) =>
        event.id === editing.id ? { ...event, ...values } : event,
      ),
    );
    setEditing(null);
    campusToast.success({
      title: "Event Updated",
      description: "Event information was updated.",
    });
  }

  function cancelEvent() {
    if (!cancelling) return;
    setEvents((current) =>
      current.map((event) =>
        event.id === cancelling.id ? { ...event, status: "CANCELLED" } : event,
      ),
    );
    setCancelling(null);
    campusToast.warning({
      title: "Event Cancelled",
      description: "The event has been marked as cancelled.",
    });
  }

  const columns: DataTableColumn<CollegeEvent>[] = [
    { key: "name", header: "Event" },
    { key: "category", header: "Category" },
    { key: "venue", header: "Venue" },
    {
      key: "date",
      header: "Date",
      cell: (event) => formatDate(event.date),
    },
    {
      key: "attendees",
      header: "Attendees",
      cell: (event) => event.attendees.toLocaleString(),
    },
    {
      key: "status",
      header: "Status",
      cell: (event) => <StatusBadge status={event.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-16 text-right",
      cell: (event) => (
        <AdminActionMenu
          items={[
            { label: "View", icon: FiEye, onSelect: () => setViewing(event) },
            { label: "Edit", icon: FiEdit, onSelect: () => setEditing(event) },
            {
              label: "Cancel",
              icon: FiSlash,
              disabled: event.status === "CANCELLED",
              onSelect: () => setCancelling(event),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <Toolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search events"
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            Create Event
          </Button>
        }
      />
      <div className="mt-5">
        <CampusDataTable
          columns={columns}
          data={filtered}
          getRowId={(event) => event.id}
          empty={
            <EmptyState
              title={query ? "No matching events" : "No events"}
              description="Create workshops, hackathons, forums, and social events for the college."
              className="mx-auto border-0 bg-transparent"
            />
          }
        />
      </div>
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Event"
        description="Create a college event for students and stakeholders."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        <EventForm onSubmit={createEvent} isSubmitting={isPending} />
      </Modal>
      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit Event"
        description="Update event details."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        {editing ? (
          <EventForm
            key={editing.id}
            event={editing}
            onSubmit={updateEvent}
            isSubmitting={isPending}
          />
        ) : null}
      </Modal>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.name ?? "Event"}
        description="Event planning and participation summary."
        className="max-w-xl"
      >
        {viewing ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {viewing.description}
            </p>
            <DetailsGrid
              rows={[
                ["Category", viewing.category],
                ["Venue", viewing.venue],
                ["Date", formatDate(viewing.date)],
                ["Attendees", viewing.attendees.toLocaleString()],
                [
                  "Status",
                  <StatusBadge key="status" status={viewing.status} />,
                ],
              ]}
            />
          </div>
        ) : null}
      </Drawer>
      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Cancel Event"
        description={`Cancel ${cancelling?.name ?? "this event"}?`}
        confirmLabel="Cancel Event"
        destructive
        onConfirm={cancelEvent}
      />
    </>
  );
}

const forumSchema = z.object({
  topic: z.string().min(2, "Topic is required."),
  category: z.enum(committeeCategories),
  createdBy: z.string().min(2, "Creator is required."),
  status: z.enum(["OPEN", "LOCKED", "PINNED"]),
  summary: z.string().min(10, "Summary is required."),
});

type ForumInput = z.infer<typeof forumSchema>;

function ForumForm({
  topic,
  onSubmit,
  isSubmitting,
}: {
  topic?: ForumTopic;
  onSubmit: (values: ForumInput) => void;
  isSubmitting: boolean;
}) {
  const { register, handleSubmit, watch, setValue, formState } = useForm<
    z.input<typeof forumSchema>,
    unknown,
    ForumInput
  >({
    resolver: zodResolver(forumSchema),
    defaultValues: {
      topic: topic?.topic ?? "",
      category:
        (topic?.category as ForumInput["category"] | undefined) ??
        "Academic Affairs",
      createdBy: topic?.createdBy ?? "Representative Team",
      status: (topic?.status as ForumInput["status"] | undefined) ?? "OPEN",
      summary: topic?.summary ?? "",
    },
  });

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Topic</span>
          <CampusInput
            {...register("topic")}
            invalid={Boolean(formState.errors.topic)}
            placeholder="How can we improve lab access?"
          />
        </label>
        <SelectField
          label="Category"
          value={watch("category")}
          options={committeeCategories}
          onValueChange={(value) => setValue("category", value)}
        />
        <SelectField
          label="Status"
          value={watch("status")}
          options={["OPEN", "LOCKED", "PINNED"] as const}
          onValueChange={(value) => setValue("status", value)}
        />
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Created By</span>
          <CampusInput
            {...register("createdBy")}
            invalid={Boolean(formState.errors.createdBy)}
            placeholder="Representative Team"
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Summary</span>
          <CampusTextarea
            {...register("summary")}
            invalid={Boolean(formState.errors.summary)}
            placeholder="Summarize the forum topic and moderation context."
          />
        </label>
      </div>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        {topic ? "Save Topic" : "Create Topic"}
      </Button>
    </form>
  );
}

export function ForumsManagement({
  initialTopics,
}: {
  initialTopics: ForumTopic[];
}) {
  const [topics, setTopics] = useState(initialTopics);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<ForumTopic | null>(null);
  const [editing, setEditing] = useState<ForumTopic | null>(null);
  const [locking, setLocking] = useState<ForumTopic | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return topics;
    return topics.filter((topic) =>
      [topic.topic, topic.category, topic.createdBy, topic.status]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [topics, query]);

  function createTopic(values: ForumInput) {
    startTransition(() => {
      setTopics((current) => [
        {
          id: `topic-${Date.now()}`,
          replies: 0,
          views: 0,
          createdAt: new Date().toISOString().slice(0, 10),
          ...values,
        },
        ...current,
      ]);
      setCreateOpen(false);
      campusToast.success({
        title: "Forum Topic Created",
        description: "The discussion topic is ready for moderation.",
      });
    });
  }

  function updateTopic(values: ForumInput) {
    if (!editing) return;
    setTopics((current) =>
      current.map((topic) =>
        topic.id === editing.id ? { ...topic, ...values } : topic,
      ),
    );
    setEditing(null);
    campusToast.success({
      title: "Forum Topic Updated",
      description: "The discussion topic was updated.",
    });
  }

  function lockTopic() {
    if (!locking) return;
    setTopics((current) =>
      current.map((topic) =>
        topic.id === locking.id ? { ...topic, status: "LOCKED" } : topic,
      ),
    );
    setLocking(null);
    campusToast.warning({
      title: "Forum Topic Locked",
      description: "Students can no longer reply to this topic.",
    });
  }

  const columns: DataTableColumn<ForumTopic>[] = [
    { key: "topic", header: "Topic" },
    { key: "category", header: "Category" },
    { key: "replies", header: "Replies" },
    { key: "views", header: "Views" },
    { key: "createdBy", header: "Created By" },
    {
      key: "status",
      header: "Status",
      cell: (topic) => <StatusBadge status={topic.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-16 text-right",
      cell: (topic) => (
        <AdminActionMenu
          items={[
            { label: "View", icon: FiEye, onSelect: () => setViewing(topic) },
            { label: "Edit", icon: FiEdit, onSelect: () => setEditing(topic) },
            {
              label: "Lock",
              icon: FiLock,
              disabled: topic.status === "LOCKED",
              onSelect: () => setLocking(topic),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <Toolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search forum topics"
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            Create Topic
          </Button>
        }
      />
      <div className="mt-5">
        <CampusDataTable
          columns={columns}
          data={filtered}
          getRowId={(topic) => topic.id}
          empty={
            <EmptyState
              title={query ? "No matching topics" : "No forum topics"}
              description="Create or moderate college discussion topics."
              className="mx-auto border-0 bg-transparent"
            />
          }
        />
      </div>
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Topic"
        description="Start a moderated college discussion."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        <ForumForm onSubmit={createTopic} isSubmitting={isPending} />
      </Modal>
      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit Topic"
        description="Update topic moderation details."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        {editing ? (
          <ForumForm
            key={editing.id}
            topic={editing}
            onSubmit={updateTopic}
            isSubmitting={isPending}
          />
        ) : null}
      </Modal>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.topic ?? "Forum topic"}
        description="Community discussion summary."
        className="max-w-xl"
      >
        {viewing ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {viewing.summary}
            </p>
            <DetailsGrid
              rows={[
                ["Category", viewing.category],
                ["Replies", viewing.replies],
                ["Views", viewing.views],
                ["Created By", viewing.createdBy],
                [
                  "Status",
                  <StatusBadge key="status" status={viewing.status} />,
                ],
              ]}
            />
          </div>
        ) : null}
      </Drawer>
      <ConfirmDialog
        open={Boolean(locking)}
        onOpenChange={(open) => !open && setLocking(null)}
        title="Lock Topic"
        description={`Lock ${locking?.topic ?? "this topic"}?`}
        confirmLabel="Lock Topic"
        onConfirm={lockTopic}
      />
    </>
  );
}

const suggestionStatusOptions = [
  "PENDING",
  "UNDER_REVIEW",
  "RESOLVED",
  "REJECTED",
] as const;

const suggestionSchema = z.object({
  status: z.enum(suggestionStatusOptions),
});

type SuggestionInput = z.infer<typeof suggestionSchema>;

function SuggestionStatusForm({
  suggestion,
  onSubmit,
}: {
  suggestion: Suggestion;
  onSubmit: (values: SuggestionInput) => void;
}) {
  const { handleSubmit, watch, setValue } = useForm<
    z.input<typeof suggestionSchema>,
    unknown,
    SuggestionInput
  >({
    resolver: zodResolver(suggestionSchema),
    defaultValues: {
      status:
        (suggestion.status as SuggestionInput["status"] | undefined) ??
        "PENDING",
    },
  });

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <SelectField
        label="Status"
        value={watch("status")}
        options={suggestionStatusOptions}
        onValueChange={(value) => setValue("status", value)}
      />
      <Button className="w-full" type="submit">
        Update Status
      </Button>
    </form>
  );
}

export function SuggestionsManagement({
  initialSuggestions,
}: {
  initialSuggestions: Suggestion[];
}) {
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<Suggestion | null>(null);
  const [editing, setEditing] = useState<Suggestion | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return suggestions;
    return suggestions.filter((suggestion) =>
      [suggestion.subject, suggestion.category, suggestion.status]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [suggestions, query]);

  function updateSuggestion(values: SuggestionInput) {
    if (!editing) return;
    setSuggestions((current) =>
      current.map((suggestion) =>
        suggestion.id === editing.id
          ? { ...suggestion, status: values.status }
          : suggestion,
      ),
    );
    setEditing(null);
    campusToast.success({
      title: "Suggestion Status Updated",
      description: "The suggestion review status was updated.",
    });
  }

  const columns: DataTableColumn<Suggestion>[] = [
    { key: "subject", header: "Subject" },
    {
      key: "anonymous",
      header: "Anonymous",
      cell: (suggestion) => (suggestion.anonymous ? "Yes" : "No"),
    },
    { key: "category", header: "Category" },
    {
      key: "status",
      header: "Status",
      cell: (suggestion) => <StatusBadge status={suggestion.status} />,
    },
    {
      key: "submittedAt",
      header: "Submitted Date",
      cell: (suggestion) => formatDate(suggestion.submittedAt),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-16 text-right",
      cell: (suggestion) => (
        <AdminActionMenu
          items={[
            {
              label: "View",
              icon: FiEye,
              onSelect: () => setViewing(suggestion),
            },
            {
              label: "Update Status",
              icon: FiEdit,
              onSelect: () => setEditing(suggestion),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <Toolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search suggestions"
      />
      <div className="mt-5">
        <CampusDataTable
          columns={columns}
          data={filtered}
          getRowId={(suggestion) => suggestion.id}
          empty={
            <EmptyState
              title={query ? "No matching suggestions" : "No suggestions"}
              description="Student feedback and anonymous suggestions appear here."
              className="mx-auto border-0 bg-transparent"
            />
          }
        />
      </div>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.subject ?? "Suggestion"}
        description="Student suggestion review details."
        className="max-w-xl"
      >
        {viewing ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {viewing.description}
            </p>
            <DetailsGrid
              rows={[
                ["Anonymous", viewing.anonymous ? "Yes" : "No"],
                ["Category", viewing.category],
                [
                  "Status",
                  <StatusBadge key="status" status={viewing.status} />,
                ],
                ["Submitted", formatDate(viewing.submittedAt)],
              ]}
            />
          </div>
        ) : null}
      </Drawer>
      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Update Suggestion Status"
        description={editing?.subject ?? "Review suggestion"}
      >
        {editing ? (
          <SuggestionStatusForm
            key={editing.id}
            suggestion={editing}
            onSubmit={updateSuggestion}
          />
        ) : null}
      </Modal>
    </>
  );
}

const pollCategories = [
  "Academic",
  "Technology",
  "Sports",
  "Student Welfare",
  "Entertainment",
  "Media",
  "General",
  "Campus Governance",
  "Other",
] as const;

const pollAudienceOptions = [
  "Entire University",
  "Specific College",
  "Specific Department",
  "Students",
  "Teachers",
  "Employers",
  "Alumni",
  "Custom Audience",
] as const;

const pollResultVisibilityOptions = [
  "ALWAYS_VISIBLE",
  "AFTER_VOTING",
  "AFTER_ENDS",
  "HIDDEN",
] as const;

const pollVisibilityLabels: Record<Poll["resultsVisibility"], string> = {
  ALWAYS_VISIBLE: "Always Visible",
  AFTER_VOTING: "Visible After Voting",
  AFTER_ENDS: "Visible After Poll Ends",
  HIDDEN: "Never Visible",
};

function formatPollVisibility(value: Poll["resultsVisibility"]) {
  return pollVisibilityLabels[value];
}

function pollVotesTotal(poll: Poll) {
  return Object.values(poll.optionVotes).reduce(
    (total, value) => total + value,
    0,
  );
}

function pollOptionPercent(poll: Poll, option: string) {
  const total = pollVotesTotal(poll) || poll.responses || 1;
  return Math.round(((poll.optionVotes[option] ?? 0) / total) * 100);
}

function pollWinningOption(poll: Poll) {
  return poll.options.reduce((winner, option) => {
    const winnerVotes = poll.optionVotes[winner] ?? 0;
    const optionVotes = poll.optionVotes[option] ?? 0;
    return optionVotes > winnerVotes ? option : winner;
  }, poll.options[0] ?? "");
}

function getPollAudienceScope(
  audience?: string,
): (typeof pollAudienceOptions)[number] {
  if (audience?.includes("College")) return "Specific College";
  if (audience?.includes("Department")) return "Specific Department";
  if (pollAudienceOptions.includes(audience as PollInput["audience"])) {
    return audience as PollInput["audience"];
  }
  return "Entire University";
}

function getPollTargetCollege(audience?: string) {
  return (
    pollTargetColleges.find((college) => audience?.includes(college)) ?? ""
  );
}

function getPollTargetDepartment(audience?: string) {
  return (
    pollTargetDepartments.find((department) =>
      audience?.includes(department),
    ) ?? ""
  );
}

function resolvePollAudience(values: {
  audience: (typeof pollAudienceOptions)[number];
  targetCollege?: string;
  targetDepartment?: string;
}) {
  if (values.audience === "Specific College") {
    return `${values.targetCollege} students`;
  }

  if (values.audience === "Specific Department") {
    return `${values.targetDepartment} Department`;
  }

  return values.audience;
}

const pollSchema = z
  .object({
    title: z.string().min(2, "Title is required."),
    question: z.string().min(5, "Question is required."),
    description: z.string().min(10, "Description is required."),
    category: z.enum(pollCategories),
    audience: z.enum(pollAudienceOptions),
    targetCollege: z.string().optional(),
    targetDepartment: z.string().optional(),
    endDate: z.string().min(1, "End date is required."),
    status: z.enum(["ACTIVE", "DRAFT", "CLOSED"]),
    resultsVisibility: z.enum(pollResultVisibilityOptions),
    allowMultipleVotes: z.boolean(),
    anonymousVoting: z.boolean(),
    options: z
      .array(
        z.object({
          value: z.string().min(1, "Option cannot be empty."),
        }),
      )
      .min(2, "Add at least two poll options."),
  })
  .superRefine((values, context) => {
    if (values.audience === "Specific College" && !values.targetCollege) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a college for this audience.",
        path: ["targetCollege"],
      });
    }

    if (values.audience === "Specific Department" && !values.targetDepartment) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a department for this audience.",
        path: ["targetDepartment"],
      });
    }
  });

type PollInput = z.infer<typeof pollSchema>;

function PollForm({
  poll,
  onSubmit,
  isSubmitting,
}: {
  poll?: Poll;
  onSubmit: (values: PollInput) => void;
  isSubmitting: boolean;
}) {
  const [step, setStep] = useState(0);
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState,
  } = useForm<z.input<typeof pollSchema>, unknown, PollInput>({
    resolver: zodResolver(pollSchema),
    defaultValues: {
      title: poll?.title ?? "",
      question: poll?.question ?? "",
      description: poll?.description ?? "",
      category: poll?.category ?? "General",
      audience: getPollAudienceScope(poll?.audience),
      targetCollege: getPollTargetCollege(poll?.audience),
      targetDepartment: getPollTargetDepartment(poll?.audience),
      endDate: poll?.endDate ?? "",
      status: (poll?.status as PollInput["status"] | undefined) ?? "DRAFT",
      resultsVisibility: poll?.resultsVisibility ?? "AFTER_VOTING",
      allowMultipleVotes: poll?.allowMultipleVotes ?? false,
      anonymousVoting: poll?.anonymousVoting ?? true,
      options: poll?.options.map((option) => ({ value: option })) ?? [
        { value: "" },
        { value: "" },
      ],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "options",
  });
  const selectedAudience = watch("audience");
  const steps = [
    {
      title: "Basics",
      description: "Write the poll title, question, and context.",
    },
    {
      title: "Audience",
      description: "Set targeting, deadline, status, and result visibility.",
    },
    {
      title: "Options",
      description: "Add choices and voting rules.",
    },
  ];
  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;

  async function goNext() {
    const valid = await trigger(
      step === 0
        ? ["title", "question", "description"]
        : [
            "category",
            "audience",
            "targetCollege",
            "targetDepartment",
            "endDate",
            "status",
            "resultsVisibility",
          ],
    );
    if (valid) setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        if (!isLastStep) {
          event.preventDefault();
          void goNext();
          return;
        }
        void handleSubmit(onSubmit)(event);
      }}
    >
      <MultiStepProgress
        activeIndex={step}
        className="mb-8"
        maxClickableIndex={step}
        steps={steps.map((item) => ({
          label: item.title,
          icon: FiArrowRight,
        }))}
        onStepClick={setStep}
      />
      <div className="rounded-lg border border-border bg-background p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {currentStep.title}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {currentStep.description}
        </p>
      </div>
      {step === 0 ? (
        <div className="grid gap-4">
          <label className="space-y-2">
            <span className="text-sm font-medium">Title</span>
            <CampusInput
              {...register("title")}
              invalid={Boolean(formState.errors.title)}
              placeholder="Preferred event day"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Question</span>
            <CampusTextarea
              {...register("question")}
              invalid={Boolean(formState.errors.question)}
              placeholder="What day works best for college-wide events?"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Description</span>
            <CampusTextarea
              {...register("description")}
              invalid={Boolean(formState.errors.description)}
              placeholder="Explain the purpose of the poll and how results will be used."
            />
          </label>
        </div>
      ) : null}
      {step === 1 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Category"
            value={watch("category")}
            options={pollCategories}
            onValueChange={(value) => setValue("category", value)}
          />
          <SelectField
            label="Audience"
            value={selectedAudience}
            options={pollAudienceOptions}
            onValueChange={(value) => {
              setValue("audience", value);
              if (value === "Specific College") {
                setValue("targetCollege", pollTargetColleges[0]);
              } else {
                setValue("targetCollege", "");
              }
              if (value === "Specific Department") {
                setValue("targetDepartment", pollTargetDepartments[0]);
              } else {
                setValue("targetDepartment", "");
              }
            }}
          />
          {selectedAudience === "Specific College" ? (
            <div className="md:col-span-2">
              <SelectField
                label="College"
                value={watch("targetCollege") || pollTargetColleges[0]}
                options={pollTargetColleges}
                onValueChange={(value) => setValue("targetCollege", value)}
              />
            </div>
          ) : null}
          {selectedAudience === "Specific Department" ? (
            <div className="md:col-span-2">
              <SelectField
                label="Department"
                value={watch("targetDepartment") || pollTargetDepartments[0]}
                options={pollTargetDepartments}
                onValueChange={(value) => setValue("targetDepartment", value)}
              />
            </div>
          ) : null}
          <label className="space-y-2">
            <span className="text-sm font-medium">End Date</span>
            <CampusInput
              {...register("endDate")}
              type="date"
              invalid={Boolean(formState.errors.endDate)}
              placeholder="Select closing date"
            />
          </label>
          <SelectField
            label="Status"
            value={watch("status")}
            options={["ACTIVE", "DRAFT", "CLOSED"] as const}
            onValueChange={(value) => setValue("status", value)}
          />
          <div className="md:col-span-2">
            <SelectField
              label="Results Visibility"
              value={watch("resultsVisibility")}
              options={pollResultVisibilityOptions}
              onValueChange={(value) => setValue("resultsVisibility", value)}
            />
          </div>
        </div>
      ) : null}
      {step === 2 ? (
        <div className="grid gap-4">
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-sm font-medium">Options</span>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add each poll option as a separate choice.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => append({ value: "" })}
              >
                <FiPlus className="h-4 w-4" aria-hidden="true" />
                Add Option
              </Button>
            </div>
            <div className="grid gap-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-3">
                  <CampusInput
                    {...register(`options.${index}.value`)}
                    invalid={Boolean(formState.errors.options?.[index]?.value)}
                    placeholder={`Option ${index + 1}`}
                  />
                  <Button
                    aria-label={`Remove option ${index + 1}`}
                    className="shrink-0"
                    disabled={fields.length <= 2}
                    size="icon"
                    type="button"
                    variant="secondary"
                    onClick={() => remove(index)}
                  >
                    <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
            {formState.errors.options?.message ? (
              <p className="text-xs font-medium text-destructive">
                {formState.errors.options.message}
              </p>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
              <CampusCheckbox
                checked={watch("allowMultipleVotes")}
                onChange={(event) =>
                  setValue("allowMultipleVotes", event.target.checked)
                }
              />
              <span className="text-sm font-medium">Allow multiple votes</span>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
              <CampusCheckbox
                checked={watch("anonymousVoting")}
                onChange={(event) =>
                  setValue("anonymousVoting", event.target.checked)
                }
              />
              <span className="text-sm font-medium">Anonymous voting</span>
            </label>
          </div>
        </div>
      ) : null}
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          disabled={step === 0 || isSubmitting}
          type="button"
          variant="secondary"
          onClick={() => setStep((current) => Math.max(current - 1, 0))}
        >
          <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        {!isLastStep ? (
          <Button disabled={isSubmitting} type="button" onClick={goNext}>
            Continue
            <FiArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? (
              <FiLoader className="h-4 w-4 animate-spin" />
            ) : null}
            {poll ? "Save Poll" : "Create Poll"}
          </Button>
        )}
      </div>
    </form>
  );
}

export function PollsManagement({ initialPolls }: { initialPolls: Poll[] }) {
  const [polls, setPolls] = useState(initialPolls);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<Poll | null>(null);
  const [editing, setEditing] = useState<Poll | null>(null);
  const [closing, setClosing] = useState<Poll | null>(null);
  const [deleting, setDeleting] = useState<Poll | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return polls;
    return polls.filter((poll) =>
      [poll.title, poll.question, poll.status, poll.category, poll.audience]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [polls, query]);

  const totalResponses = polls.reduce(
    (total, poll) => total + poll.responses,
    0,
  );
  const activePolls = polls.filter((poll) => poll.status === "ACTIVE");
  const closedPolls = polls.filter((poll) => poll.status === "CLOSED");
  const averageParticipation =
    polls.length > 0
      ? Math.round(
          polls.reduce((total, poll) => total + poll.participationRate, 0) /
            polls.length,
        )
      : 0;
  const categoryBreakdown = pollCategories
    .map((category) => ({
      name: category,
      value: polls.filter((poll) => poll.category === category).length,
    }))
    .filter((item) => item.value > 0);
  const votesOverTime = polls[0]?.votesOverTime ?? [];
  const topPolls = [...polls]
    .sort((a, b) => b.responses - a.responses)
    .slice(0, 3);

  function normalizePoll(values: PollInput, existing?: Poll): Omit<Poll, "id"> {
    const options = values.options
      .map((option) => option.value.trim())
      .filter(Boolean);
    const optionVotes = options.reduce<Record<string, number>>(
      (acc, option) => {
        acc[option] = existing?.optionVotes[option] ?? 0;
        return acc;
      },
      {},
    );

    return {
      title: values.title,
      question: values.question,
      description: values.description,
      category: values.category,
      audience: resolvePollAudience(values),
      createdBy: existing?.createdBy ?? "Student Representative Office",
      endDate: values.endDate,
      createdAt: existing?.createdAt ?? "2026-06-13",
      closedDate:
        values.status === "CLOSED"
          ? (existing?.closedDate ?? values.endDate)
          : undefined,
      status: values.status,
      responses: existing?.responses ?? 0,
      options,
      optionVotes,
      visibility:
        values.audience === "Entire University" ? "Everyone" : "Students",
      resultsVisibility: values.resultsVisibility,
      allowMultipleVotes: values.allowMultipleVotes,
      anonymousVoting: values.anonymousVoting,
      participationRate: existing?.participationRate ?? 0,
      votesOverTime: existing?.votesOverTime ?? [],
      departmentParticipation: existing?.departmentParticipation ?? [],
      yearParticipation: existing?.yearParticipation ?? [],
      rules: [
        values.allowMultipleVotes
          ? "Students may choose multiple options"
          : "One vote per student",
        values.anonymousVoting ? "Votes are anonymous" : "Votes are attributed",
        formatPollVisibility(values.resultsVisibility),
      ],
    };
  }

  function createPoll(values: PollInput) {
    startTransition(() => {
      setPolls((current) => [
        {
          id: `poll-${Date.now()}`,
          ...normalizePoll(values),
        },
        ...current,
      ]);
      setCreateOpen(false);
      campusToast.success({
        title: "Poll Created",
        description: "The poll is ready for student responses.",
      });
    });
  }

  function updatePoll(values: PollInput) {
    if (!editing) return;
    setPolls((current) =>
      current.map((poll) =>
        poll.id === editing.id
          ? { id: poll.id, ...normalizePoll(values, poll) }
          : poll,
      ),
    );
    setEditing(null);
    campusToast.success({
      title: "Poll Updated",
      description: "Poll details were updated.",
    });
  }

  function closePoll() {
    if (!closing) return;
    setPolls((current) =>
      current.map((poll) =>
        poll.id === closing.id
          ? {
              ...poll,
              status: "CLOSED",
              closedDate: poll.closedDate ?? "2026-06-13",
            }
          : poll,
      ),
    );
    setClosing(null);
    campusToast.warning({
      title: "Poll Closed",
      description: "The poll is no longer accepting responses.",
    });
  }

  function duplicatePoll(poll: Poll) {
    setPolls((current) => [
      {
        ...poll,
        id: `poll-copy-${Date.now()}`,
        title: `Copy of ${poll.title}`,
        status: "DRAFT",
        responses: 0,
        optionVotes: Object.fromEntries(
          poll.options.map((option) => [option, 0]),
        ),
        participationRate: 0,
        votesOverTime: [],
        departmentParticipation: [],
        yearParticipation: [],
      },
      ...current,
    ]);
    campusToast.info({
      title: "Poll Duplicated",
      description: "A draft copy was created for editing.",
    });
  }

  function deletePoll() {
    if (!deleting) return;
    setPolls((current) => current.filter((poll) => poll.id !== deleting.id));
    setDeleting(null);
    campusToast.warning({
      title: "Poll Deleted",
      description: "The poll was removed from the management list.",
    });
  }

  const columns: DataTableColumn<Poll>[] = [
    {
      key: "title",
      header: "Title",
      cell: (poll) => (
        <div>
          <p className="font-semibold">{poll.title}</p>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {poll.question}
          </p>
        </div>
      ),
    },
    { key: "category", header: "Category" },
    { key: "audience", header: "Audience" },
    {
      key: "responses",
      header: "Responses",
      cell: (poll) => poll.responses.toLocaleString(),
    },
    {
      key: "endDate",
      header: "End Date",
      cell: (poll) => formatDate(poll.endDate),
    },
    {
      key: "status",
      header: "Status",
      cell: (poll) => <StatusBadge status={poll.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-16 text-right",
      cell: (poll) => (
        <AdminActionMenu
          items={[
            { label: "View", icon: FiEye, onSelect: () => setViewing(poll) },
            { label: "Edit", icon: FiEdit, onSelect: () => setEditing(poll) },
            {
              label: "Duplicate",
              icon: FiCopy,
              onSelect: () => duplicatePoll(poll),
            },
            {
              label: "Close",
              icon: FiSlash,
              disabled: poll.status === "CLOSED",
              onSelect: () => setClosing(poll),
            },
            {
              label: "Delete",
              icon: FiTrash2,
              onSelect: () => setDeleting(poll),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Responses",
            value: totalResponses.toLocaleString(),
            icon: FiUsers,
          },
          {
            label: "Participation Rate",
            value: `${averageParticipation}%`,
            icon: FiBarChart2,
          },
          {
            label: "Active Polls",
            value: activePolls.length.toString(),
            icon: FiPieChart,
          },
          {
            label: "Closed Polls",
            value: closedPolls.length.toString(),
            icon: FiCheckCircle,
          },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="mt-5 text-2xl font-semibold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Votes Over Time</p>
              <p className="text-sm text-muted-foreground">
                Response velocity from the leading active poll.
              </p>
            </div>
            <FiBarChart2 className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-5 h-56">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={votesOverTime}>
                <XAxis
                  axisLine={false}
                  dataKey="day"
                  tickLine={false}
                  tick={{ fill: "currentColor", fontSize: 12 }}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "rgba(79, 70, 229, 0.08)" }}
                  contentStyle={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: "var(--surface)",
                    color: "var(--foreground)",
                  }}
                />
                <Bar
                  dataKey="votes"
                  fill="var(--primary)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="font-semibold">Response Breakdown</p>
          <p className="text-sm text-muted-foreground">
            Poll volume by category.
          </p>
          <div className="mt-5 h-44">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  dataKey="value"
                  innerRadius={45}
                  outerRadius={72}
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={
                        [
                          "var(--primary)",
                          "var(--chart-secondary)",
                          "var(--chart-tertiary)",
                          "var(--chart-accent)",
                        ][index % 4]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: "var(--surface)",
                    color: "var(--foreground)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="mt-5 rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Poll Leaderboard</p>
            <p className="text-sm text-muted-foreground">
              Most participated, highest engagement, and recent decision polls.
            </p>
          </div>
          <FiPieChart className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {topPolls.map((poll) => (
            <div
              key={poll.id}
              className="rounded-lg border border-border bg-background p-4"
            >
              <StatusBadge status={poll.category} />
              <p className="mt-3 font-semibold">{poll.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {poll.responses.toLocaleString()} responses ·{" "}
                {poll.participationRate}% participation
              </p>
            </div>
          ))}
        </div>
      </div>
      <Toolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search polls"
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            Create Poll
          </Button>
        }
      />
      <div className="mt-5">
        <CampusDataTable
          columns={columns}
          data={filtered}
          getRowId={(poll) => poll.id}
          empty={
            <EmptyState
              title={query ? "No matching polls" : "No polls"}
              description="Create polls to collect structured student feedback."
              className="mx-auto border-0 bg-transparent"
            />
          }
        />
      </div>
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Poll"
        description="Create a structured poll for student input."
        className="max-h-[90vh] max-w-5xl overflow-y-auto"
      >
        <PollForm onSubmit={createPoll} isSubmitting={isPending} />
      </Modal>
      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit Poll"
        description="Update poll question, options, and status."
        className="max-h-[90vh] max-w-5xl overflow-y-auto"
      >
        {editing ? (
          <PollForm
            key={editing.id}
            poll={editing}
            onSubmit={updatePoll}
            isSubmitting={isPending}
          />
        ) : null}
      </Modal>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.title ?? "Poll"}
        description={viewing?.question ?? "Poll participation and options."}
        className="max-w-2xl"
      >
        {viewing ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {viewing.description}
            </p>
            <DetailsGrid
              rows={[
                ["Category", viewing.category],
                ["Audience", viewing.audience],
                ["Created By", viewing.createdBy],
                ["Responses", viewing.responses.toLocaleString()],
                ["Participation", `${viewing.participationRate}%`],
                ["Winning Option", pollWinningOption(viewing)],
                ["End Date", formatDate(viewing.endDate)],
                ["Results", formatPollVisibility(viewing.resultsVisibility)],
                [
                  "Status",
                  <StatusBadge key="status" status={viewing.status} />,
                ],
              ]}
            />
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-semibold">Response Breakdown</p>
              <div className="mt-4 space-y-3">
                {viewing.options.map((option) => {
                  const percent = pollOptionPercent(viewing, option);

                  return (
                    <div key={option}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span>{option}</span>
                        <span className="text-muted-foreground">
                          {viewing.optionVotes[option] ?? 0} · {percent}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-semibold">Rules</p>
              <div className="mt-3 space-y-2">
                {viewing.rules.map((rule) => (
                  <p
                    key={rule}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <FiCheckCircle
                      className="h-4 w-4 text-primary"
                      aria-hidden="true"
                    />
                    {rule}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>
      <ConfirmDialog
        open={Boolean(closing)}
        onOpenChange={(open) => !open && setClosing(null)}
        title="Close Poll"
        description={`Close ${closing?.title ?? "this poll"}?`}
        confirmLabel="Close Poll"
        onConfirm={closePoll}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete Poll"
        description={`Delete ${deleting?.title ?? "this poll"}? This removes it from the table.`}
        confirmLabel="Delete Poll"
        onConfirm={deletePoll}
      />
    </>
  );
}
