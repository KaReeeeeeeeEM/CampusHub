"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiCopy,
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

type ApiResponse<T> = {
  data: T | null;
  error: {
    message: string;
  } | null;
};

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

const expiryOptions = [
  { label: "7 days", value: "7" },
  { label: "14 days", value: "14" },
  { label: "30 days", value: "30" },
  { label: "60 days", value: "60" },
  { label: "90 days", value: "90" },
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

function getRecipientLabel(invitation: SerializedTeacherInvitation) {
  const name = [invitation.firstName, invitation.lastName]
    .filter(Boolean)
    .join(" ");

  return name || invitation.email || "Not redeemed yet";
}

function TeacherInvitationForm({
  departments,
  onSubmit,
  isSubmitting,
}: {
  departments: SerializedDepartment[];
  onSubmit: (values: TeacherInvitationInput) => void;
  isSubmitting: boolean;
}) {
  const {
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
    defaultValues: {
      departmentId: "",
      expiresInDays: 14,
    },
  });
  const departmentId = watch("departmentId");
  const expiresInDays = String(watch("expiresInDays") ?? 14);

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <label className="block space-y-2">
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
          <SelectTrigger className="w-full">
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

      <label className="block space-y-2">
        <span className="text-sm font-medium">Expiry</span>
        <Select
          value={expiresInDays}
          onValueChange={(value) =>
            setValue("expiresInDays", Number(value), {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select expiry" />
          </SelectTrigger>
          <SelectContent>
            {expiryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? (
          <FiLoader className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <FiCopy className="h-4 w-4" aria-hidden="true" />
        )}
        Generate Invitation Link
      </Button>
    </form>
  );
}

function InvitationDetails({
  invitation,
  onCopy,
}: {
  invitation: SerializedTeacherInvitation;
  onCopy: (invitation: SerializedTeacherInvitation) => void;
}) {
  const expiresAt = new Date(invitation.expiresAt).toLocaleDateString();
  const shareSubject = encodeURIComponent("CampusHub teacher invitation");
  const shareBody = encodeURIComponent(
    `Use this one-time CampusHub activation link for ${invitation.departmentName}: ${invitation.invitationUrl}`,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
        One-time teacher activation link for {invitation.departmentName}.
        Expires on {expiresAt}.
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border bg-background px-4 py-3 sm:flex-row sm:items-center">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {invitation.invitationUrl}
        </p>
        <Button
          type="button"
          variant="ghost"
          className="justify-start gap-2 text-primary hover:text-primary sm:justify-center"
          onClick={() => onCopy(invitation)}
        >
          <FiCopy className="h-4 w-4" aria-hidden="true" />
          Copy link
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["Department", invitation.departmentName],
          ["Recipient", getRecipientLabel(invitation)],
          ["Status", invitation.status],
          ["Expires", expiresAt],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-border p-3">
            <p className="text-xs uppercase tracking-normal text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>Share via</span>
        <Button
          asChild
          size="icon"
          type="button"
          variant="secondary"
          aria-label="Share invitation by email"
          className="rounded-full"
        >
          <a href={`mailto:?subject=${shareSubject}&body=${shareBody}`}>
            <FiMail className="h-4 w-4" aria-hidden="true" />
          </a>
        </Button>
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
        getRecipientLabel(invitation),
        invitation.email,
        invitation.departmentName,
        invitation.status,
        invitation.invitationUrl,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [invitations, query]);

  function createInvitation(values: TeacherInvitationInput) {
    startTransition(async () => {
      const response = await fetch("/api/campus-admin/teacher-invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json()) as ApiResponse<{
        invitation: SerializedTeacherInvitation;
      }>;

      if (!response.ok || !payload.data) {
        campusToast.error({
          title: "Invitation Failed",
          description:
            payload.error?.message ??
            "Unable to generate teacher invitation link.",
        });
        return;
      }

      const invitation = payload.data.invitation;
      setInvitations((current) => [
        invitation,
        ...current.filter((item) => item.id !== invitation.id),
      ]);
      setCreateOpen(false);
      setViewing(invitation);
      campusToast.info({
        title: "Invitation Link Generated",
        description: "Copy and share this one-time activation link.",
      });
    });
  }

  function patchInvitation(
    invitation: SerializedTeacherInvitation,
    action: "resend" | "deactivate",
  ) {
    startTransition(async () => {
      const response = await fetch(
        `/api/campus-admin/teacher-invitations/${invitation.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const payload = (await response.json()) as ApiResponse<{
        invitation: SerializedTeacherInvitation;
      }>;

      if (!response.ok || !payload.data) {
        campusToast.error({
          title:
            action === "resend"
              ? "Invitation Not Regenerated"
              : "Invitation Not Deactivated",
          description:
            payload.error?.message ?? "Unable to update the invitation.",
        });
        return;
      }

      setInvitations((current) =>
        current.map((item) =>
          item.id === invitation.id ? payload.data!.invitation : item,
        ),
      );
      setDeactivating(null);
      if (viewing?.id === invitation.id) {
        setViewing(payload.data.invitation);
      }
      campusToast.info({
        title:
          action === "resend"
            ? "Invitation Link Regenerated"
            : "Invitation Deactivated",
        description:
          action === "resend"
            ? "Copy and share the new one-time activation link."
            : "The activation link can no longer be used.",
      });
    });
  }

  async function copyInvitationUrl(invitation: SerializedTeacherInvitation) {
    await navigator.clipboard.writeText(invitation.invitationUrl);
    campusToast.info({
      title: "Invitation Copied",
      description: "The activation URL is ready to share.",
    });
  }

  const columns: DataTableColumn<SerializedTeacherInvitation>[] = [
    {
      key: "departmentName",
      header: "Department",
    },
    {
      key: "recipient",
      header: "Recipient",
      cell: (invitation) => (
        <div>
          <p className="font-medium">{getRecipientLabel(invitation)}</p>
          <p className="text-xs text-muted-foreground">
            {invitation.email ?? "One-time activation link"}
          </p>
        </div>
      ),
    },
    {
      key: "expiresAt",
      header: "Expires",
      cell: (invitation) =>
        new Date(invitation.expiresAt).toLocaleDateString(),
    },
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
              label: "Copy Link",
              icon: FiCopy,
              onSelect: () => void copyInvitationUrl(invitation),
            },
            {
              label: "Regenerate Link",
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
            placeholder="Search teacher invitations"
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
            Generate Link
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
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
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
                        onSelect: () => void copyInvitationUrl(invitation),
                      },
                      {
                        label: "Regenerate Link",
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
                  {invitation.departmentName}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getRecipientLabel(invitation)}
                </p>
                <p className="mt-3 line-clamp-2 break-all text-sm text-muted-foreground">
                  {invitation.invitationUrl}
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
                    ? "No matching invitations"
                    : "No teacher invitations yet"
              }
              description={
                departments.length === 0
                  ? "Teachers must be invited into a department."
                  : query
                    ? "Adjust your search and try again."
                    : "Generate a one-time activation link for the first teacher."
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
                      ? "No matching invitations"
                      : "No teacher invitations yet"
                }
                description={
                  departments.length === 0
                    ? "Teachers must be invited into a department."
                    : query
                      ? "Adjust your search and try again."
                      : "Generate a one-time activation link for the first teacher."
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
        description="Generate a department-specific one-time activation link."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        <TeacherInvitationForm
          departments={departments}
          onSubmit={createInvitation}
          isSubmitting={isPending}
        />
      </Modal>

      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title="Teacher Invitation"
        description="Department, status, expiry, and activation link."
        className="max-w-xl"
      >
        {viewing ? (
          <InvitationDetails
            invitation={viewing}
            onCopy={(invitation) => void copyInvitationUrl(invitation)}
          />
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deactivating)}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title="Deactivate Teacher Invitation"
        description={`Deactivate the activation link for ${deactivating?.departmentName ?? "this department"}?`}
        confirmLabel="Deactivate"
        destructive
        onConfirm={() =>
          deactivating ? patchInvitation(deactivating, "deactivate") : undefined
        }
      />
    </>
  );
}
