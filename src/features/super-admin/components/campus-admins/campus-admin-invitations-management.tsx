"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiCopy,
  FiEye,
  FiLoader,
  FiMail,
  FiPlus,
  FiSearch,
} from "react-icons/fi";
import type { z } from "zod";

import {
  CampusDataTable,
  CampusInput,
  campusToast,
} from "@/components/campushub";
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
  campusAdminInvitationInputSchema,
  type CampusAdminInvitationInput,
} from "@/features/super-admin/lib/schemas";
import type {
  SerializedCampusAdminInvitation,
  SerializedUniversity,
} from "@/features/super-admin/lib/super-admin-service";
import type { DataTableColumn } from "@/components/shared/data-table";

type ApiResponse<T> = {
  data: T | null;
  error: {
    message: string;
  } | null;
};

type CampusAdminInvitationsManagementProps = {
  universities: SerializedUniversity[];
  initialInvitations: SerializedCampusAdminInvitation[];
};

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
  status: SerializedCampusAdminInvitation["status"];
}) {
  return (
    <span className="inline-flex rounded-md border border-border bg-background px-2 py-1 text-xs font-medium">
      {status}
    </span>
  );
}

function InvitationForm({
  universities,
  onSubmit,
  isSubmitting,
}: {
  universities: SerializedUniversity[];
  onSubmit: (values: CampusAdminInvitationInput) => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<
    z.input<typeof campusAdminInvitationInputSchema>,
    unknown,
    CampusAdminInvitationInput
  >({
    resolver: zodResolver(campusAdminInvitationInputSchema),
    defaultValues: {
      universityId: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      expiresInDays: 14,
    },
  });

  const universityId = watch("universityId");
  const expiresInDays = String(watch("expiresInDays") ?? 14);

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <label className="space-y-2">
        <span className="text-sm font-medium">University</span>
        <Select
          value={universityId}
          onValueChange={(value) =>
            setValue("universityId", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
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

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">First Name</span>
          <CampusInput
            {...register("firstName")}
            invalid={Boolean(errors.firstName)}
            placeholder="Asha"
            autoComplete="given-name"
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
            autoComplete="family-name"
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
            placeholder="admin@university.edu"
            type="email"
            autoComplete="email"
          />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Phone</span>
          <CampusInput
            {...register("phone")}
            invalid={Boolean(errors.phone)}
            placeholder="+255 000 000 000"
            autoComplete="tel"
          />
        </label>
        <label className="space-y-2">
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
            <SelectTrigger>
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
      </div>

      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? (
          <FiLoader className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <FiMail className="h-4 w-4" aria-hidden="true" />
        )}
        Generate and Send Invitation
      </Button>
    </form>
  );
}

function InvitationDetails({
  invitation,
}: {
  invitation: SerializedCampusAdminInvitation;
}) {
  const rows = [
    ["Name", `${invitation.firstName} ${invitation.lastName}`],
    ["Email", invitation.email],
    ["Phone", invitation.phone],
    ["University", invitation.universityName],
    ["Status", invitation.status],
    ["Expires", new Date(invitation.expiresAt).toLocaleDateString()],
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-background p-3">
        <p className="text-xs uppercase tracking-normal text-muted-foreground">
          Activation URL
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

export function CampusAdminInvitationsManagement({
  universities,
  initialInvitations,
}: CampusAdminInvitationsManagementProps) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] =
    useState<SerializedCampusAdminInvitation | null>(null);
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
        invitation.universityName,
        invitation.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [invitations, query]);

  async function refreshInvitations() {
    const response = await fetch("/api/super-admin/campus-admin-invitations", {
      cache: "no-store",
    });
    const payload = (await response.json()) as ApiResponse<{
      invitations: SerializedCampusAdminInvitation[];
    }>;

    if (payload.data) {
      setInvitations(payload.data.invitations);
    }
  }

  function createInvitation(values: CampusAdminInvitationInput) {
    startTransition(async () => {
      const response = await fetch(
        "/api/super-admin/campus-admin-invitations",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      const payload = (await response.json()) as ApiResponse<{
        invitation: SerializedCampusAdminInvitation;
      }>;

      if (!response.ok || !payload.data) {
        campusToast.error({
          title: "Invitation Failed",
          description:
            payload.error?.message ??
            "Unable to generate campus administrator invitation.",
        });
        return;
      }

      setCreateOpen(false);
      await refreshInvitations();
      campusToast.info({
        title: "Invitation Sent",
        description:
          "Campus administrator invitation has been sent successfully.",
      });
    });
  }

  async function copyInvitationUrl(
    invitation: SerializedCampusAdminInvitation,
  ) {
    await navigator.clipboard.writeText(invitation.invitationUrl);
    campusToast.info({
      title: "Invitation Copied",
      description: "The activation URL is ready to share.",
    });
  }

  const columns: DataTableColumn<SerializedCampusAdminInvitation>[] = [
    {
      key: "name",
      header: "Campus Admin",
      cell: (invitation) => (
        <div>
          <p className="font-medium">
            {invitation.firstName} {invitation.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{invitation.email}</p>
        </div>
      ),
    },
    { key: "universityName", header: "University" },
    {
      key: "expiresAt",
      header: "Expires",
      cell: (invitation) => new Date(invitation.expiresAt).toLocaleDateString(),
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
            placeholder="Search invitations"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Button
          disabled={universities.length === 0}
          type="button"
          onClick={() => setCreateOpen(true)}
        >
          <FiPlus className="h-4 w-4" aria-hidden="true" />
          Create Invitation
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
                universities.length === 0
                  ? "Create a university first"
                  : query
                    ? "No matching invitations"
                    : "No Campus Admin invitations yet"
              }
              description={
                universities.length === 0
                  ? "Campus Admin invitations must be associated with an existing university tenant."
                  : query
                    ? "Adjust your search and try again."
                    : "Generated invitations will appear here with their status and activation URL."
              }
              className="mx-auto border-0 bg-transparent"
            />
          }
        />
      </div>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Campus Admin Invitation"
        description="Generate a university-specific activation invitation."
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        <InvitationForm
          universities={universities}
          onSubmit={createInvitation}
          isSubmitting={isPending}
        />
      </Modal>

      <Modal
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title="Campus Admin Invitation"
        description="Invitation status, recipient, and activation URL."
        className="max-w-3xl"
      >
        {viewing ? <InvitationDetails invitation={viewing} /> : null}
      </Modal>
    </>
  );
}
