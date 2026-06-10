"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiCopy,
  FiEdit,
  FiEye,
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
  representativeInvitationInputSchema,
  type RepresentativeInvitationInput,
} from "@/features/campus-admin/lib/schemas";
import type {
  SerializedCollege,
  SerializedRepresentativeInvitation,
} from "@/features/campus-admin/lib/campus-admin-service";
import type { DataTableColumn } from "@/components/shared/data-table";

type RepresentativesManagementProps = {
  colleges: SerializedCollege[];
  initialInvitations: Array<
    SerializedRepresentativeInvitation & {
      photo?: string | null;
      position?: string;
    }
  >;
};

function StatusBadge({
  status,
}: {
  status: SerializedRepresentativeInvitation["status"];
}) {
  return (
    <span className="inline-flex rounded-md border border-border bg-background px-2 py-1 text-xs font-medium">
      {status}
    </span>
  );
}

function getDefaultValues(
  invitation?: SerializedRepresentativeInvitation,
): RepresentativeInvitationInput {
  return {
    collegeId: invitation?.collegeId ?? "",
    firstName: invitation?.firstName ?? "",
    lastName: invitation?.lastName ?? "",
    email: invitation?.email ?? "",
    phone: invitation?.phone ?? "",
    expiresInDays: 14,
  };
}

function RepresentativeInvitationForm({
  colleges,
  invitation,
  onSubmit,
  isSubmitting,
}: {
  colleges: SerializedCollege[];
  invitation?: SerializedRepresentativeInvitation;
  onSubmit: (values: RepresentativeInvitationInput) => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<
    z.input<typeof representativeInvitationInputSchema>,
    unknown,
    RepresentativeInvitationInput
  >({
    resolver: zodResolver(representativeInvitationInputSchema),
    defaultValues: getDefaultValues(invitation),
  });
  const collegeId = watch("collegeId");

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
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
            {colleges.map((college) => (
              <SelectItem key={college.id} value={college.id}>
                {college.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.collegeId ? (
          <p className="text-xs text-destructive">{errors.collegeId.message}</p>
        ) : null}
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">First Name</span>
          <CampusInput
            {...register("firstName")}
            invalid={Boolean(errors.firstName)}
            placeholder="Asha"
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
            placeholder="Mollel"
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
            placeholder="representative@university.edu"
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
      <Button disabled={isSubmitting} type="submit">
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
  invitation: SerializedRepresentativeInvitation;
}) {
  const rows = [
    ["Name", `${invitation.firstName} ${invitation.lastName}`],
    ["Email", invitation.email],
    ["Phone", invitation.phone],
    ["College", invitation.collegeName],
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

export function RepresentativesManagement({
  colleges,
  initialInvitations,
}: RepresentativesManagementProps) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] =
    useState<SerializedRepresentativeInvitation | null>(null);
  const [editing, setEditing] =
    useState<SerializedRepresentativeInvitation | null>(null);
  const [deactivating, setDeactivating] =
    useState<SerializedRepresentativeInvitation | null>(null);
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
        invitation.collegeName,
        invitation.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [invitations, query]);

  function createInvitation(values: RepresentativeInvitationInput) {
    startTransition(async () => {
      const college = colleges.find((item) => item.id === values.collegeId);
      setInvitations((current) => [
        {
          id: `representative-${Date.now()}`,
          universityId: "udsm",
          collegeName: college?.name ?? "Unknown college",
          status: "SENT",
          invitationUrl: `https://campushub.local/representatives/activate/${Date.now()}`,
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
        title: "Representative Invitation Sent",
        description: "The representative invitation was sent successfully.",
      });
    });
  }

  function updateInvitation(values: RepresentativeInvitationInput) {
    if (!editing) {
      return;
    }

    startTransition(async () => {
      const college = colleges.find((item) => item.id === values.collegeId);
      setInvitations((current) =>
        current.map((invitation) =>
          invitation.id === editing.id
            ? {
                ...invitation,
                ...values,
                phone: values.phone || null,
                collegeName: college?.name ?? invitation.collegeName,
              }
            : invitation,
        ),
      );
      setEditing(null);
      campusToast.success({
        title: "Representative Updated",
        description: "Representative invitation details were updated.",
      });
    });
  }

  function patchInvitation(
    invitation: SerializedRepresentativeInvitation,
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
                    ? `https://campushub.local/representatives/activate/${Date.now()}`
                    : item.invitationUrl,
              }
            : item,
        ),
      );
      setDeactivating(null);
      if (action === "resend") {
        campusToast.info({
          title: "Invitation Resent",
          description: "Representative invitation has been regenerated.",
        });
      } else {
        campusToast.warning({
          title: "Representative Deactivated",
          description: "Representative invitation has been deactivated.",
        });
      }
    });
  }

  async function copyInvitationUrl(
    invitation: SerializedRepresentativeInvitation,
  ) {
    await navigator.clipboard.writeText(invitation.invitationUrl);
    campusToast.info({
      title: "Invitation Copied",
      description: "The representative invitation URL is ready to share.",
    });
  }

  const columns: DataTableColumn<SerializedRepresentativeInvitation>[] = [
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
    { key: "collegeName", header: "College" },
    {
      key: "position",
      header: "Position",
      cell: (invitation) =>
        "position" in invitation
          ? String(invitation.position)
          : "Representative",
    },
    { key: "email", header: "Email" },
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
            placeholder="Search representatives"
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
          Create Representative
        </Button>
      </div>

      <div className="mt-5">
        <CampusDataTable
          columns={columns}
          data={filteredInvitations}
          getRowId={(invitation) => invitation.id}
          empty={
            <EmptyState
              title={
                colleges.length === 0
                  ? "Create a college first"
                  : query
                    ? "No matching representatives"
                    : "No representatives yet"
              }
              description={
                colleges.length === 0
                  ? "Representatives must be invited into a college."
                  : query
                    ? "Adjust your search and try again."
                    : "Invite the first college representative."
              }
              className="mx-auto border-0 bg-transparent"
            />
          }
        />
      </div>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Representative Invitation"
        description="Invite a representative into a college."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        <RepresentativeInvitationForm
          colleges={colleges}
          onSubmit={createInvitation}
          isSubmitting={isPending}
        />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit Representative Invitation"
        description="Update representative invitation details."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        {editing ? (
          <RepresentativeInvitationForm
            key={editing.id}
            colleges={colleges}
            invitation={editing}
            onSubmit={updateInvitation}
            isSubmitting={isPending}
          />
        ) : null}
      </Modal>

      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title="Representative Invitation"
        description="Invitation recipient, college, status, and activation link."
        className="max-w-xl"
      >
        {viewing ? <InvitationDetails invitation={viewing} /> : null}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deactivating)}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title="Deactivate Representative"
        description={`Deactivate ${deactivating?.firstName ?? "this"} ${deactivating?.lastName ?? "representative"}?`}
        confirmLabel="Deactivate"
        destructive
        onConfirm={() =>
          deactivating ? patchInvitation(deactivating, "deactivate") : undefined
        }
      />
    </>
  );
}
