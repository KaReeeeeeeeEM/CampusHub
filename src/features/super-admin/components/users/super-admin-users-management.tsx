"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiEdit,
  FiEye,
  FiKey,
  FiLoader,
  FiSearch,
  FiSlash,
  FiTrash2,
  FiUserCheck,
} from "react-icons/fi";
import { z } from "zod";

import {
  CampusDataTable,
  CampusInput,
  campusToast,
} from "@/components/campushub";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Drawer } from "@/components/shared/drawer";
import { Empty } from "@/components/shared/empty";
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
import type { SerializedSuperAdminUser } from "@/features/super-admin/lib/super-admin-service";
import type { DataTableColumn } from "@/components/shared/data-table";

const userSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Enter a valid email."),
  role: z.string().min(2, "Role is required."),
  position: z.string().min(2, "Position is required."),
  university: z.string().min(2, "University is required."),
  college: z.string().min(2, "College is required."),
  department: z.string().min(2, "Department is required."),
  status: z.enum(["Active", "Suspended", "Pending"]),
  phone: z.string().min(4, "Phone is required."),
});

type UserInput = z.infer<typeof userSchema>;
type SuperAdminUser = SerializedSuperAdminUser;
type ApiEnvelope<T> = {
  data: T | null;
  error: {
    message: string;
  } | null;
};

const allValue = "ALL";

function uniqueOptions(users: SuperAdminUser[], key: keyof SuperAdminUser) {
  return Array.from(new Set(users.map((user) => String(user[key]))));
}

function StatusBadge({ status }: { status: SuperAdminUser["status"] }) {
  const classes = {
    Active: "border-primary/30 bg-primary/10 text-primary",
    Pending: "border-warning/30 bg-warning/10 text-warning",
    Suspended: "border-destructive/30 bg-destructive/10 text-destructive",
  }[status];

  return (
    <span className={`rounded-md border px-2 py-1 text-xs font-medium ${classes}`}>
      {status}
    </span>
  );
}

async function getApiError(response: Response) {
  try {
    const payload = (await response.json()) as ApiEnvelope<unknown>;
    return payload.error?.message || "The request could not be completed.";
  } catch {
    return "The request could not be completed.";
  }
}

function UserForm({
  user,
  onSubmit,
  isSubmitting,
}: {
  user: SuperAdminUser;
  onSubmit: (values: UserInput) => void;
  isSubmitting: boolean;
}) {
  const { register, handleSubmit, watch, setValue, formState } = useForm<
    z.input<typeof userSchema>,
    unknown,
    UserInput
  >({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      role: user.role,
      position: user.position,
      university: user.university,
      college: user.college,
      department: user.department,
      status: user.status,
      phone: user.phone,
    },
  });
  const status = watch("status");

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["name", "Full Name", "Full name"],
          ["email", "Email", "name@university.edu"],
          ["role", "Role", "Student"],
          ["position", "Position", "Representative"],
          ["university", "University", "Assigned university"],
          ["college", "College", "College of ICT"],
          ["department", "Department", "Computer Science"],
          ["phone", "Phone", "+255 000 000 000"],
        ].map(([name, label, placeholder]) => (
          <label className="block space-y-3" key={name}>
            <span className="block text-sm font-medium">{label}</span>
            <CampusInput
              {...register(name as keyof UserInput)}
              invalid={Boolean(formState.errors[name as keyof UserInput])}
              placeholder={placeholder}
            />
          </label>
        ))}
        <div className="space-y-3 md:col-span-2">
          <span className="block text-sm font-medium">Status</span>
          <Select
            value={status}
            onValueChange={(value) =>
              setValue("status", value as UserInput["status"], {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {["Active", "Pending", "Suspended"].map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        Save User
      </Button>
    </form>
  );
}

export function SuperAdminUsersManagement({
  initialUsers,
}: {
  initialUsers: SuperAdminUser[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState(allValue);
  const [university, setUniversity] = useState(allValue);
  const [college, setCollege] = useState(allValue);
  const [department, setDepartment] = useState(allValue);
  const [position, setPosition] = useState(allValue);
  const [status, setStatus] = useState(allValue);
  const [viewing, setViewing] = useState<SuperAdminUser | null>(null);
  const [editing, setEditing] = useState<SuperAdminUser | null>(null);
  const [suspending, setSuspending] = useState<SuperAdminUser | null>(null);
  const [deleting, setDeleting] = useState<SuperAdminUser | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredUsers = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !normalized ||
        [
          user.name,
          user.email,
          user.role,
          user.position,
          user.university,
          user.college,
          user.department,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return (
        matchesSearch &&
        (role === allValue || user.role === role) &&
        (university === allValue || user.university === university) &&
        (college === allValue || user.college === college) &&
        (department === allValue || user.department === department) &&
        (position === allValue || user.position === position) &&
        (status === allValue || user.status === status)
      );
    });
  }, [college, department, position, role, search, status, university, users]);

  function updateUser(values: UserInput) {
    if (!editing) return;

    startTransition(() => {
      setUsers((current) =>
        current.map((user) =>
          user.id === editing.id ? { ...user, ...values } : user,
        ),
      );
      setEditing(null);
      campusToast.success({
        title: "User Updated",
        description: "User profile details were updated successfully.",
      });
    });
  }

  function setUserStatus(user: SuperAdminUser, nextStatus: SuperAdminUser["status"]) {
    setUsers((current) =>
      current.map((item) =>
        item.id === user.id ? { ...item, status: nextStatus } : item,
      ),
    );
    campusToast.info({
      title: nextStatus === "Active" ? "User Activated" : "User Suspended",
      description: `${user.name} is now marked as ${nextStatus.toLowerCase()}.`,
    });
  }

  function deleteSelectedUser() {
    if (!deleting) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/super-admin/users/${deleting.id}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (!response.ok) {
          campusToast.error({
            title: "User Not Deleted",
            description: await getApiError(response),
          });
          return;
        }

        setUsers((current) =>
          current.filter((user) => user.id !== deleting.id),
        );
        if (viewing?.id === deleting.id) {
          setViewing(null);
        }
        if (editing?.id === deleting.id) {
          setEditing(null);
        }
        setDeleting(null);
        campusToast.warning({
          title: "User Deleted",
          description: `${deleting.name} has been removed from active user access.`,
        });
      } catch {
        campusToast.error({
          title: "User Not Deleted",
          description: "Unable to delete the user. Please try again.",
        });
      }
    });
  }

  const columns: DataTableColumn<SuperAdminUser>[] = [
    {
      key: "photo",
      header: "Photo",
      cell: (user) => (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {user.photo}
        </span>
      ),
    },
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "role", header: "Role" },
    { key: "position", header: "Position" },
    { key: "university", header: "University" },
    { key: "college", header: "College" },
    { key: "department", header: "Department" },
    {
      key: "status",
      header: "Status",
      cell: (user) => <StatusBadge status={user.status} />,
    },
    { key: "lastActive", header: "Last Active" },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      cell: (user) => (
        <AdminActionMenu
          items={[
            { label: "View", icon: FiEye, onSelect: () => setViewing(user) },
            { label: "Edit", icon: FiEdit, onSelect: () => setEditing(user) },
            {
              label: "Suspend",
              icon: FiSlash,
              destructive: true,
              disabled: user.status === "Suspended",
              onSelect: () => setSuspending(user),
            },
            {
              label: "Activate",
              icon: FiUserCheck,
              disabled: user.status === "Active",
              onSelect: () => setUserStatus(user, "Active"),
            },
            {
              label: "Reset Password",
              icon: FiKey,
              onSelect: () =>
                campusToast.info({
                  title: "Password Reset Prepared",
                  description: `A reset instruction would be sent to ${user.email}.`,
                }),
            },
            {
              label: "Delete",
              icon: FiTrash2,
              destructive: true,
              onSelect: () => setDeleting(user),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-3 rounded-xl border border-border bg-surface p-4 lg:grid-cols-[1.2fr_repeat(6,minmax(0,1fr))]">
        <div className="relative">
          <FiSearch
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <CampusInput
            className="pl-9"
            placeholder="Search users"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {[
          ["Role", role, setRole, uniqueOptions(users, "role")],
          ["University", university, setUniversity, uniqueOptions(users, "university")],
          ["College", college, setCollege, uniqueOptions(users, "college")],
          ["Department", department, setDepartment, uniqueOptions(users, "department")],
          ["Position", position, setPosition, uniqueOptions(users, "position")],
          ["Status", status, setStatus, uniqueOptions(users, "status")],
        ].map(([label, value, setter, options]) => (
          <Select
            key={label as string}
            value={value as string}
            onValueChange={setter as (value: string) => void}
          >
            <SelectTrigger>
              <SelectValue placeholder={label as string} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={allValue}>All {label as string}</SelectItem>
              {(options as string[]).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>

      <CampusDataTable
        columns={columns}
        data={filteredUsers}
        getRowId={(user) => user.id}
        pageSize={6}
        empty={
          <Empty
            filterName={search || "selected filters"}
            title="No matching users"
            description="Adjust search or filters to see more users."
          />
        }
      />

      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.name ?? "User Details"}
        description={viewing?.email}
      >
        {viewing ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-background p-5">
              <div className="flex items-start gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                  {viewing.photo}
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{viewing.name}</p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {viewing.email}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-border bg-surface-muted px-2 py-1 text-xs font-medium">
                      {viewing.role}
                    </span>
                    <StatusBadge status={viewing.status} />
                  </div>
                </div>
              </div>
            </div>
            {[
              ["Role", viewing.role],
              ["Position", viewing.position],
              ["University", viewing.university],
              ["College", viewing.college],
              ["Department", viewing.department],
              ["Status", viewing.status],
              ["Last Active", viewing.lastActive],
              ["Phone", viewing.phone],
              ["Country", viewing.country],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-border bg-background p-4"
              >
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </Drawer>

      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit User"
        description="Update global user profile metadata."
      >
        {editing ? (
          <UserForm
            user={editing}
            onSubmit={updateUser}
            isSubmitting={isPending}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(suspending)}
        onOpenChange={(open) => !open && setSuspending(null)}
        title="Suspend User"
        description={
          suspending
            ? `${suspending.name} will lose access until reactivated.`
            : "This user will be suspended."
        }
        confirmLabel="Suspend"
        destructive
        onConfirm={() => {
          if (suspending) {
            setUserStatus(suspending, "Suspended");
          }
          setSuspending(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete User"
        description={
          deleting
            ? `${deleting.name} will be removed from active access and signed out of existing sessions.`
            : "This user will be removed from active access."
        }
        confirmLabel="Delete"
        destructive
        onConfirm={deleteSelectedUser}
      />
    </div>
  );
}
