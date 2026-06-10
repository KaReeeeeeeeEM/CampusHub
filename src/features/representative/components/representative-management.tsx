"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiArchive,
  FiEdit,
  FiEye,
  FiLoader,
  FiLock,
  FiPauseCircle,
  FiPlus,
  FiSearch,
  FiSlash,
  FiUsers,
} from "react-icons/fi";
import { z } from "zod";

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

const departments = [
  "All Departments",
  "Computer Science",
  "Electronics and Telecommunications",
  "Information Systems",
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

function DetailsGrid({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
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
  const { register, handleSubmit, watch, setValue, formState } =
    useForm<z.input<typeof committeeSchema>, unknown, CommitteeInput>({
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
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Email</span>
          <CampusInput
            {...register("email")}
            invalid={Boolean(formState.errors.email)}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Phone</span>
          <CampusInput
            {...register("phone")}
            invalid={Boolean(formState.errors.phone)}
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
          />
        </label>
      </div>
      <Button disabled={isSubmitting} type="submit">
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
      [member.name, member.category, member.position, member.email, member.status]
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
      cell: (member) => <AvatarCell src={member.photo} fallback={member.name} />,
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
                ["Status", <StatusBadge key="status" status={viewing.status} />],
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
      [student.name, student.department, student.year, student.email, student.status]
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
                ["Status", <StatusBadge key="status" status={viewing.status} />],
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
  name: z.string().min(2, "Link name is required."),
  department: z.enum(departments),
  maxUsage: z.coerce.number().int().min(1).max(5000),
  expiresAt: z.string().min(1, "Expiry date is required."),
  description: z.string().min(10, "Description is required."),
});

type InvitationInput = z.infer<typeof invitationSchema>;

function InvitationForm({
  invitation,
  onSubmit,
  isSubmitting,
}: {
  invitation?: StudentInvitation;
  onSubmit: (values: InvitationInput) => void;
  isSubmitting: boolean;
}) {
  const { register, handleSubmit, watch, setValue, formState } =
    useForm<z.input<typeof invitationSchema>, unknown, InvitationInput>({
      resolver: zodResolver(invitationSchema),
      defaultValues: {
        name: invitation?.name ?? "",
        department:
          (invitation?.department as InvitationInput["department"] | undefined) ??
          "All Departments",
        maxUsage: invitation?.maxUsage ?? 250,
        expiresAt: invitation?.expiresAt ?? "",
        description: invitation?.description ?? "",
      },
    });

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">Link Name</span>
          <CampusInput
            {...register("name")}
            invalid={Boolean(formState.errors.name)}
          />
        </label>
        <SelectField
          label="Department"
          value={watch("department")}
          options={departments}
          onValueChange={(value) => setValue("department", value)}
        />
        <label className="space-y-2">
          <span className="text-sm font-medium">Maximum Usage</span>
          <CampusInput
            {...register("maxUsage")}
            type="number"
            invalid={Boolean(formState.errors.maxUsage)}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Expiry Date</span>
          <CampusInput
            {...register("expiresAt")}
            type="date"
            invalid={Boolean(formState.errors.expiresAt)}
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Description</span>
          <CampusTextarea
            {...register("description")}
            invalid={Boolean(formState.errors.description)}
          />
        </label>
      </div>
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        {invitation ? "Save Link" : "Generate Link"}
      </Button>
    </form>
  );
}

export function InvitationsManagement({
  initialInvitations,
}: {
  initialInvitations: StudentInvitation[];
}) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [query, setQuery] = useState("");
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
      [invitation.name, invitation.department, invitation.status]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [invitations, query]);

  function createInvitation(values: InvitationInput) {
    startTransition(() => {
      const slug = values.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      setInvitations((current) => [
        {
          id: `invitation-${Date.now()}`,
          usageCount: 0,
          status: "ACTIVE",
          createdAt: new Date().toISOString().slice(0, 10),
          link: `https://campushub.local/join/${slug}`,
          ...values,
        },
        ...current,
      ]);
      setCreateOpen(false);
      campusToast.success({
        title: "Invitation Link Generated",
        description: "Student enrollment link is ready to share.",
      });
    });
  }

  function deactivateInvitation() {
    if (!deactivating) return;
    setInvitations((current) =>
      current.map((invitation) =>
        invitation.id === deactivating.id
          ? { ...invitation, status: "INACTIVE" }
          : invitation,
      ),
    );
    setDeactivating(null);
    campusToast.warning({
      title: "Invitation Link Deactivated",
      description: "Students can no longer use this invitation link.",
    });
  }

  const columns: DataTableColumn<StudentInvitation>[] = [
    { key: "name", header: "Link Name" },
    { key: "department", header: "Department" },
    {
      key: "usageCount",
      header: "Usage Count",
      cell: (invitation) =>
        `${invitation.usageCount.toLocaleString()} / ${invitation.maxUsage.toLocaleString()}`,
    },
    {
      key: "status",
      header: "Status",
      cell: (invitation) => <StatusBadge status={invitation.status} />,
    },
    {
      key: "createdAt",
      header: "Created Date",
      cell: (invitation) => formatDate(invitation.createdAt),
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
              label: "Deactivate",
              icon: FiSlash,
              disabled: invitation.status === "INACTIVE",
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
          ["Active Links", invitations.filter((item) => item.status === "ACTIVE").length],
          [
            "Students Joined",
            invitations.reduce((sum, item) => sum + item.usageCount, 0),
          ],
          ["Departments Covered", new Set(invitations.map((item) => item.department)).size],
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
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            Generate Link
          </Button>
        }
      />
      <div className="mt-5">
        <CampusDataTable
          columns={columns}
          data={filtered}
          getRowId={(invitation) => invitation.id}
          empty={
            <EmptyState
              title={query ? "No matching links" : "No invitation links"}
              description="Generate student invitation links to onboard verified students."
              className="mx-auto border-0 bg-transparent"
            />
          }
        />
      </div>
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Generate Student Invitation"
        description="Create a department-aware enrollment link for students."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        <InvitationForm onSubmit={createInvitation} isSubmitting={isPending} />
      </Modal>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.name ?? "Invitation link"}
        description="Enrollment link usage and sharing details."
        className="max-w-xl"
      >
        {viewing ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-normal text-muted-foreground">
                Invitation URL
              </p>
              <p className="mt-2 break-all text-sm font-medium">
                {viewing.link}
              </p>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {viewing.description}
            </p>
            <DetailsGrid
              rows={[
                ["Department", viewing.department],
                ["Usage", `${viewing.usageCount} / ${viewing.maxUsage}`],
                ["Status", <StatusBadge key="status" status={viewing.status} />],
                ["Created", formatDate(viewing.createdAt)],
                ["Expires", formatDate(viewing.expiresAt)],
              ]}
            />
          </div>
        ) : null}
      </Drawer>
      <ConfirmDialog
        open={Boolean(deactivating)}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title="Deactivate Invitation Link"
        description={`Deactivate ${deactivating?.name ?? "this invitation link"}?`}
        confirmLabel="Deactivate"
        destructive
        onConfirm={deactivateInvitation}
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
  const { register, handleSubmit, watch, setValue, formState } =
    useForm<z.input<typeof announcementSchema>, unknown, AnnouncementInput>({
      resolver: zodResolver(announcementSchema),
      defaultValues: {
        title: announcement?.title ?? "",
        category:
          (announcement?.category as
            | AnnouncementInput["category"]
            | undefined) ?? "Academic",
        audience:
          (announcement?.audience as
            | AnnouncementInput["audience"]
            | undefined) ?? "All CoICT Students",
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
          />
        </label>
      </div>
      <Button disabled={isSubmitting} type="submit">
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
      [announcement.title, announcement.category, announcement.audience, announcement.status]
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
                ["Status", <StatusBadge key="status" status={viewing.status} />],
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
  const { register, handleSubmit, watch, setValue, formState } =
    useForm<z.input<typeof eventSchema>, unknown, EventInput>({
      resolver: zodResolver(eventSchema),
      defaultValues: {
        name: event?.name ?? "",
        category:
          (event?.category as EventInput["category"] | undefined) ??
          "Workshop",
        venue: event?.venue ?? "",
        date: event?.date ?? "",
        attendees: event?.attendees ?? 0,
        status:
          (event?.status as EventInput["status"] | undefined) ?? "UPCOMING",
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
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Date</span>
          <CampusInput
            {...register("date")}
            type="date"
            invalid={Boolean(formState.errors.date)}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Attendees</span>
          <CampusInput
            {...register("attendees")}
            type="number"
            invalid={Boolean(formState.errors.attendees)}
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
          />
        </label>
      </div>
      <Button disabled={isSubmitting} type="submit">
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
                ["Status", <StatusBadge key="status" status={viewing.status} />],
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
  const { register, handleSubmit, watch, setValue, formState } =
    useForm<z.input<typeof forumSchema>, unknown, ForumInput>({
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
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Summary</span>
          <CampusTextarea
            {...register("summary")}
            invalid={Boolean(formState.errors.summary)}
          />
        </label>
      </div>
      <Button disabled={isSubmitting} type="submit">
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
                ["Status", <StatusBadge key="status" status={viewing.status} />],
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
      <Button type="submit">Update Status</Button>
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
                ["Status", <StatusBadge key="status" status={viewing.status} />],
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

const pollSchema = z.object({
  title: z.string().min(2, "Title is required."),
  question: z.string().min(5, "Question is required."),
  endDate: z.string().min(1, "End date is required."),
  status: z.enum(["ACTIVE", "DRAFT", "CLOSED"]),
  optionsText: z.string().min(5, "Add poll options."),
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
  const { register, handleSubmit, watch, setValue, formState } =
    useForm<z.input<typeof pollSchema>, unknown, PollInput>({
      resolver: zodResolver(pollSchema),
      defaultValues: {
        title: poll?.title ?? "",
        question: poll?.question ?? "",
        endDate: poll?.endDate ?? "",
        status: (poll?.status as PollInput["status"] | undefined) ?? "DRAFT",
        optionsText: poll?.options.join("\n") ?? "",
      },
    });

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">Title</span>
          <CampusInput
            {...register("title")}
            invalid={Boolean(formState.errors.title)}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">End Date</span>
          <CampusInput
            {...register("endDate")}
            type="date"
            invalid={Boolean(formState.errors.endDate)}
          />
        </label>
        <SelectField
          label="Status"
          value={watch("status")}
          options={["ACTIVE", "DRAFT", "CLOSED"] as const}
          onValueChange={(value) => setValue("status", value)}
        />
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Question</span>
          <CampusTextarea
            {...register("question")}
            invalid={Boolean(formState.errors.question)}
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Options</span>
          <CampusTextarea
            {...register("optionsText")}
            placeholder="One option per line"
            invalid={Boolean(formState.errors.optionsText)}
          />
        </label>
      </div>
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        {poll ? "Save Poll" : "Create Poll"}
      </Button>
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
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return polls;
    return polls.filter((poll) =>
      [poll.title, poll.question, poll.status]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [polls, query]);

  function normalizePoll(values: PollInput) {
    return {
      title: values.title,
      question: values.question,
      endDate: values.endDate,
      status: values.status,
      options: values.optionsText
        .split("\n")
        .map((option) => option.trim())
        .filter(Boolean),
    };
  }

  function createPoll(values: PollInput) {
    startTransition(() => {
      setPolls((current) => [
        {
          id: `poll-${Date.now()}`,
          responses: 0,
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
        poll.id === editing.id ? { ...poll, ...normalizePoll(values) } : poll,
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
        poll.id === closing.id ? { ...poll, status: "CLOSED" } : poll,
      ),
    );
    setClosing(null);
    campusToast.warning({
      title: "Poll Closed",
      description: "The poll is no longer accepting responses.",
    });
  }

  const columns: DataTableColumn<Poll>[] = [
    { key: "title", header: "Title" },
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
              label: "Close",
              icon: FiSlash,
              disabled: poll.status === "CLOSED",
              onSelect: () => setClosing(poll),
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
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        <PollForm onSubmit={createPoll} isSubmitting={isPending} />
      </Modal>
      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit Poll"
        description="Update poll question, options, and status."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
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
        description="Poll participation and options."
        className="max-w-xl"
      >
        {viewing ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {viewing.question}
            </p>
            <div className="space-y-2">
              {viewing.options.map((option) => (
                <div
                  key={option}
                  className="rounded-md border border-border bg-background p-3 text-sm"
                >
                  {option}
                </div>
              ))}
            </div>
            <DetailsGrid
              rows={[
                ["Responses", viewing.responses.toLocaleString()],
                ["End Date", formatDate(viewing.endDate)],
                ["Status", <StatusBadge key="status" status={viewing.status} />],
              ]}
            />
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
    </>
  );
}
