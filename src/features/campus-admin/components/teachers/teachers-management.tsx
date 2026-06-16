"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiCopy,
  FiEdit,
  FiEye,
  FiGrid,
  FiList,
  FiLoader,
  FiMail,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSlash,
} from "react-icons/fi";
import type { z } from "zod";

import {
  CampusDataTable,
  CampusInput,
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
  teacherInvitationInputSchema,
  type TeacherInvitationInput,
} from "@/features/campus-admin/lib/schemas";
import type {
  SerializedDepartment,
  SerializedTeacherInvitation,
} from "@/features/campus-admin/lib/campus-admin-service";
import type { DataTableColumn } from "@/components/shared/data-table";

type TeachersManagementProps = {
  departments: SerializedDepartment[];
  initialInvitations: Array<
    SerializedTeacherInvitation & { photo?: string | null }
  >;
};
const viewOptions = [
  { value: "table", label: "Table view", icon: FiList },
  { value: "cards", label: "Card view", icon: FiGrid },
] as const;

function StatusBadge({
  status,
}: {
  status: SerializedTeacherInvitation["status"];
}) {
  return (
    <span className="inline-flex rounded-md border border-border bg-background px-2 py-1 text-xs font-medium">
      {status}
    </span>
  );
}

function getDefaultValues(
  invitation?: SerializedTeacherInvitation,
): TeacherInvitationInput {
  return {
    departmentId: invitation?.departmentId ?? "",
    firstName: invitation?.firstName ?? "",
    lastName: invitation?.lastName ?? "",
    email: invitation?.email ?? "",
    phone: invitation?.phone ?? "",
    expiresInDays: 14,
  };
}

function TeacherInvitationForm({
  departments,
  invitation,
  onSubmit,
  isSubmitting,
}: {
  departments: SerializedDepartment[];
  invitation?: SerializedTeacherInvitation;
  onSubmit: (values: TeacherInvitationInput) => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<
    z.input<typeof teacherInvitationInputSchema>,
    unknown,
    TeacherInvitationInput
  >({
    resolver: zodResolver(teacherInvitationInputSchema),
    defaultValues: getDefaultValues(invitation),
  });
  const departmentId = watch("departmentId");

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
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
            {departments.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
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
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">First Name</span>
          <CampusInput
            {...register("firstName")}
            invalid={Boolean(errors.firstName)}
            placeholder="John"
          />
          {errors.firstName ? (
            <p className="text-xs text-destructive">
              {errors.firstName.message}
            </p>
          ) : null}
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Last Name</span>
          <CampusInput
            {...register("lastName")}
            invalid={Boolean(errors.lastName)}
            placeholder="Mwangi"
          />
          {errors.lastName ? (
            <p className="text-xs text-destructive">
              {errors.lastName.message}
            </p>
          ) : null}
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Email</span>
          <CampusInput
            {...register("email")}
            invalid={Boolean(errors.email)}
            placeholder="teacher@university.edu"
            type="email"
          />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Phone</span>
          <CampusInput {...register("phone")} placeholder="+255 000 000 000" />
        </label>
      </div>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? (
          <FiLoader className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <FiMail className="h-4 w-4" aria-hidden="true" />
        )}
        {invitation ? "Save Changes" : "Send Invitation"}
      </Button>
    </form>
  );
}

function InvitationDetails({
  invitation,
}: {
  invitation: SerializedTeacherInvitation;
}) {
  const rows = [
    ["Name", `${invitation.firstName} ${invitation.lastName}`],
    ["Email", invitation.email],
    ["Phone", invitation.phone],
    ["Department", invitation.departmentName],
    ["Status", invitation.status],
    ["Expires", new Date(invitation.expiresAt).toLocaleDateString()],
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-background p-3">
        <p className="text-xs uppercase tracking-normal text-muted-foreground">
          Invitation URL
        </p>
        <p className="mt-2 break-all text-sm font-medium">
          {invitation.invitationUrl}
        </p>
      </div>
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

export function TeachersManagement({
  departments,
  initialInvitations,
}: TeachersManagementProps) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<SerializedTeacherInvitation | null>(
    null,
  );
  const [editing, setEditing] = useState<SerializedTeacherInvitation | null>(
    null,
  );
  const [deactivating, setDeactivating] =
    useState<SerializedTeacherInvitation | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredInvitations = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return invitations;
    }

    return invitations.filter((invitation) =>
      [
        invitation.firstName,
        invitation.lastName,
        invitation.email,
        invitation.departmentName,
        invitation.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [invitations, query]);

  function createInvitation(values: TeacherInvitationInput) {
    startTransition(async () => {
      const department = departments.find(
        (item) => item.id === values.departmentId,
      );
      setInvitations((current) => [
        {
          id: `teacher-${Date.now()}`,
          universityId: "udsm",
          departmentName: department?.name ?? "Unknown department",
          status: "SENT",
          invitationUrl: `https://campushub.local/teachers/activate/${Date.now()}`,
          expiresAt: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          createdAt: new Date().toISOString(),
          ...values,
          phone: values.phone || null,
        },
        ...current,
      ]);
      setCreateOpen(false);
      campusToast.info({
        title: "Teacher Invitation Sent",
        description: "The teacher invitation was sent successfully.",
      });
    });
  }

  function updateInvitation(values: TeacherInvitationInput) {
    if (!editing) {
      return;
    }

    startTransition(async () => {
      const department = departments.find(
        (item) => item.id === values.departmentId,
      );
      setInvitations((current) =>
        current.map((invitation) =>
          invitation.id === editing.id
            ? {
                ...invitation,
                ...values,
                phone: values.phone || null,
                departmentName: department?.name ?? invitation.departmentName,
              }
            : invitation,
        ),
      );
      setEditing(null);
      campusToast.success({
        title: "Teacher Updated",
        description: "Teacher invitation details were updated.",
      });
    });
  }

  function patchInvitation(
    invitation: SerializedTeacherInvitation,
    action: "resend" | "deactivate",
  ) {
    startTransition(async () => {
      setInvitations((current) =>
        current.map((item) =>
          item.id === invitation.id
            ? {
                ...item,
                status: action === "resend" ? "SENT" : "DISABLED",
                invitationUrl:
                  action === "resend"
                    ? `https://campushub.local/teachers/activate/${Date.now()}`
                    : item.invitationUrl,
              }
            : item,
        ),
      );
      setDeactivating(null);
      if (action === "resend") {
        campusToast.info({
          title: "Invitation Resent",
          description: "Teacher invitation has been regenerated.",
        });
      } else {
        campusToast.warning({
          title: "Teacher Deactivated",
          description: "Teacher invitation has been deactivated.",
        });
      }
    });
  }

  async function copyInvitationUrl(invitation: SerializedTeacherInvitation) {
    await navigator.clipboard.writeText(invitation.invitationUrl);
    campusToast.info({
      title: "Invitation Copied",
      description: "The teacher invitation URL is ready to share.",
    });
  }

  const columns: DataTableColumn<SerializedTeacherInvitation>[] = [
    {
      key: "photo",
      header: "Photo",
      className: "w-20",
      cell: (invitation) => (
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {invitation.firstName.charAt(0)}
          {invitation.lastName.charAt(0)}
        </span>
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (invitation) => (
        <span>
          {invitation.firstName} {invitation.lastName}
        </span>
      ),
    },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone" },
    { key: "departmentName", header: "Department" },
    {
      key: "status",
      header: "Status",
      cell: (invitation) => <StatusBadge status={invitation.status} />,
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
              label: "Edit",
              icon: FiEdit,
              onSelect: () => setEditing(invitation),
            },
            {
              label: "Copy Link",
              icon: FiCopy,
              onSelect: () => void copyInvitationUrl(invitation),
            },
            {
              label: "Resend Invitation",
              icon: FiRefreshCw,
              onSelect: () => patchInvitation(invitation, "resend"),
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
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <FiSearch
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <CampusInput
            className="pl-9"
            placeholder="Search teachers"
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
            Create Teacher
          </Button>
        </div>
      </div>

      {viewMode === "cards" ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredInvitations.length > 0 ? (
            filteredInvitations.map((invitation) => (
              <article
                key={invitation.id}
                className="flex h-full flex-col rounded-xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {invitation.firstName.charAt(0)}
                    {invitation.lastName.charAt(0)}
                  </span>
                  <AdminActionMenu
                    items={[
                      {
                        label: "View",
                        icon: FiEye,
                        onSelect: () => setViewing(invitation),
                      },
                      {
                        label: "Edit",
                        icon: FiEdit,
                        onSelect: () => setEditing(invitation),
                      },
                      {
                        label: "Copy Link",
                        icon: FiCopy,
                        onSelect: () => void copyInvitationUrl(invitation),
                      },
                      {
                        label: "Resend Invitation",
                        icon: FiRefreshCw,
                        onSelect: () => patchInvitation(invitation, "resend"),
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
                  {invitation.firstName} {invitation.lastName}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {invitation.departmentName}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {invitation.email}
                </p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <StatusBadge status={invitation.status} />
                  <span className="text-xs text-muted-foreground">
                    Expires{" "}
                    {new Date(invitation.expiresAt).toLocaleDateString()}
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
                    ? "No matching teachers"
                    : "No teachers yet"
              }
              description={
                departments.length === 0
                  ? "Teachers must be invited into a department."
                  : query
                    ? "Adjust your search and try again."
                    : "Invite the first teacher."
              }
              className="mx-auto border-0 bg-transparent md:col-span-2 xl:col-span-3"
            />
          )}
        </div>
      ) : (
        <div className="mt-5">
          <CampusDataTable
            columns={columns}
            data={filteredInvitations}
            getRowId={(invitation) => invitation.id}
            empty={
              <EmptyState
                title={
                  departments.length === 0
                    ? "Create a department first"
                    : query
                      ? "No matching teachers"
                      : "No teachers yet"
                }
                description={
                  departments.length === 0
                    ? "Teachers must be invited into a department."
                    : query
                      ? "Adjust your search and try again."
                      : "Invite the first teacher."
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
        title="Create Teacher Invitation"
        description="Invite a teacher into a department."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        <TeacherInvitationForm
          departments={departments}
          onSubmit={createInvitation}
          isSubmitting={isPending}
        />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit Teacher Invitation"
        description="Update teacher invitation details."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        {editing ? (
          <TeacherInvitationForm
            key={editing.id}
            departments={departments}
            invitation={editing}
            onSubmit={updateInvitation}
            isSubmitting={isPending}
          />
        ) : null}
      </Modal>

      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title="Teacher Invitation"
        description="Invitation recipient, department, status, and activation link."
        className="max-w-xl"
      >
        {viewing ? <InvitationDetails invitation={viewing} /> : null}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deactivating)}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title="Deactivate Teacher"
        description={`Deactivate ${deactivating?.firstName ?? "this"} ${deactivating?.lastName ?? "teacher"}?`}
        confirmLabel="Deactivate"
        destructive
        onConfirm={() =>
          deactivating ? patchInvitation(deactivating, "deactivate") : undefined
        }
      />
    </>
  );
}
