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
  SerializedCampusAdminAccount,
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
  initialAccounts: SerializedCampusAdminAccount[];
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
  invitation: SerializedCampusAdminInvitation;
  onCopy: (invitation: SerializedCampusAdminInvitation) => void;
}) {
  const expiresAt = new Date(invitation.expiresAt).toLocaleDateString();
  const shareSubject = encodeURIComponent("CampusHub Campus Admin invitation");
  const shareBody = encodeURIComponent(
    `Use this one-time CampusHub activation link for ${invitation.universityName}: ${invitation.invitationUrl}`,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
        One-time activation link for {invitation.universityName}. Expires on{" "}
        {expiresAt}.
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

export function CampusAdminInvitationsManagement({
  universities,
  initialAccounts,
  initialInvitations,
}: CampusAdminInvitationsManagementProps) {
  const [accounts] = useState(initialAccounts);
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

  const filteredAccounts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return accounts;
    }

    return accounts.filter((account) =>
      [
        account.name,
        account.email,
        account.universityName,
        account.status,
        account.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [accounts, query]);

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
      setViewing(payload.data.invitation);
      campusToast.info({
        title: "Invitation Link Generated",
        description: "Copy and share this one-time activation link.",
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

  const accountColumns: DataTableColumn<SerializedCampusAdminAccount>[] = [
    {
      key: "name",
      header: "Campus Admin",
      cell: (account) => (
        <div>
          <p className="font-medium">{account.name}</p>
          <p className="text-xs text-muted-foreground">{account.email}</p>
        </div>
      ),
    },
    { key: "universityName", header: "University" },
    { key: "phone", header: "Phone" },
    {
      key: "status",
      header: "Status",
      cell: (account) => (
        <span className="inline-flex rounded-md border border-border bg-background px-2 py-1 text-xs font-medium">
          {account.status}
        </span>
      ),
    },
  ];

  const invitationColumns: DataTableColumn<SerializedCampusAdminInvitation>[] = [
    {
      key: "name",
      header: "Recipient",
      cell: (invitation) => (
        <div>
          <p className="font-medium">
            {invitation.email
              ? [invitation.firstName, invitation.lastName]
                  .filter(Boolean)
                  .join(" ") || invitation.email
              : "Not redeemed yet"}
          </p>
          <p className="text-xs text-muted-foreground">
            {invitation.email ?? "One-time activation link"}
          </p>
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
            placeholder="Search Campus Admins"
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
        <div className="mb-6">
          <div className="mb-3">
            <h2 className="text-base font-semibold">
              Active Campus Admin Accounts
            </h2>
            <p className="text-sm text-muted-foreground">
              Campus Admin users currently assigned to universities.
            </p>
          </div>
          <CampusDataTable
            columns={accountColumns}
            data={filteredAccounts}
            getRowId={(account) => account.id}
            empty={
              <EmptyState
                title={
                  query
                    ? "No matching Campus Admin accounts"
                    : "No active Campus Admin accounts yet"
                }
                description={
                  query
                    ? "Adjust your search and try again."
                    : "Activated or seeded Campus Admin accounts will appear here."
                }
                className="mx-auto border-0 bg-transparent"
              />
            }
          />
        </div>

        <div className="mb-3">
          <h2 className="text-base font-semibold">Campus Admin Invitations</h2>
          <p className="text-sm text-muted-foreground">
            Generated activation links and their redemption status.
          </p>
        </div>
        <CampusDataTable
          columns={invitationColumns}
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
        description="Generate a university-specific one-time activation link."
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
        title="Campus Admin Invitation Link"
        className="max-w-2xl"
      >
        {viewing ? (
          <InvitationDetails invitation={viewing} onCopy={copyInvitationUrl} />
        ) : null}
      </Modal>
    </>
  );
}
