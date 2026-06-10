"use client";

import { useMemo, useState, useTransition } from "react";
import {
  FiCheckCircle,
  FiEye,
  FiInfo,
  FiLoader,
  FiSearch,
  FiXCircle,
} from "react-icons/fi";

import {
  CampusDataTable,
  CampusInput,
  CampusTextarea,
  campusToast,
} from "@/components/campushub";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import { AdminActionMenu } from "@/features/administration/components/admin-action-menu";
import type { DataTableColumn } from "@/components/shared/data-table";

export type EmployerApplicationRow = {
  id: string;
  companyName: string;
  industry: string;
  companySize: string;
  website: string | null;
  contactPerson: string;
  position: string;
  email: string;
  phone: string;
  country: string;
  reasonForJoining: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "MORE_INFORMATION_REQUESTED";
  reviewNotes: string | null;
  createdAt: string | null;
};

type EmployerApplicationAction =
  | "approve"
  | "reject"
  | "request-more-information";

type EmployerApplicationsManagementProps = {
  initialApplications: EmployerApplicationRow[];
};

function StatusBadge({ status }: { status: EmployerApplicationRow["status"] }) {
  return (
    <span className="inline-flex rounded-md border border-border bg-background px-2 py-1 text-xs font-medium">
      {status}
    </span>
  );
}

function ApplicationDetails({
  application,
}: {
  application: EmployerApplicationRow;
}) {
  const rows = [
    ["Company", application.companyName],
    ["Industry", application.industry],
    ["Company Size", application.companySize],
    ["Website", application.website],
    ["Contact", application.contactPerson],
    ["Position", application.position],
    ["Email", application.email],
    ["Phone", application.phone],
    ["Country", application.country],
    ["Status", application.status],
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-md border border-border p-3">
            <p className="text-xs uppercase tracking-normal text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 break-words text-sm font-medium">
              {value || "Not set"}
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-md border border-border p-3">
        <p className="text-xs uppercase tracking-normal text-muted-foreground">
          Reason For Joining
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {application.reasonForJoining}
        </p>
      </div>
      {application.reviewNotes ? (
        <div className="rounded-md border border-border p-3">
          <p className="text-xs uppercase tracking-normal text-muted-foreground">
            Review Notes
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {application.reviewNotes}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ReviewDialog({
  application,
  action,
  notes,
  isSubmitting,
  onNotesChange,
  onCancel,
  onConfirm,
}: {
  application: EmployerApplicationRow | null;
  action: EmployerApplicationAction | null;
  notes: string;
  isSubmitting: boolean;
  onNotesChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const title =
    action === "approve"
      ? "Approve Employer Application"
      : action === "reject"
        ? "Reject Employer Application"
        : "Request More Information";

  const description =
    action === "approve"
      ? "Approve this employer and generate an activation invitation."
      : action === "reject"
        ? "Reject this employer application."
        : "Ask the employer to provide more information before approval.";

  return (
    <Modal
      open={Boolean(application && action)}
      onOpenChange={(open) => !open && onCancel()}
      title={title}
      description={description}
      className="max-w-2xl"
    >
      <div className="space-y-5">
        <div className="rounded-md border border-border bg-background p-4">
          <p className="font-medium">{application?.companyName}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {application?.contactPerson} · {application?.email}
          </p>
        </div>
        <label className="space-y-2">
          <span className="text-sm font-medium">Review Notes</span>
          <CampusTextarea
            value={notes}
            placeholder="Add a concise review note."
            onChange={(event) => onNotesChange(event.target.value)}
          />
        </label>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            type="button"
            variant={action === "reject" ? "destructive" : "default"}
            onClick={onConfirm}
          >
            {isSubmitting ? (
              <FiLoader className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function EmployerApplicationsManagement({
  initialApplications,
}: EmployerApplicationsManagementProps) {
  const [applications, setApplications] = useState(initialApplications);
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<EmployerApplicationRow | null>(null);
  const [reviewing, setReviewing] = useState<EmployerApplicationRow | null>(
    null,
  );
  const [reviewAction, setReviewAction] =
    useState<EmployerApplicationAction | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredApplications = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return applications;
    }

    return applications.filter((application) =>
      [
        application.companyName,
        application.industry,
        application.country,
        application.contactPerson,
        application.email,
        application.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [applications, query]);

  function openReview(
    application: EmployerApplicationRow,
    action: EmployerApplicationAction,
  ) {
    setReviewing(application);
    setReviewAction(action);
    setReviewNotes("");
  }

  function closeReview() {
    setReviewing(null);
    setReviewAction(null);
    setReviewNotes("");
  }

  function reviewApplication() {
    if (!reviewing || !reviewAction) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(
        `/api/employer-applications/${reviewing.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: reviewAction,
            reviewNotes,
          }),
        },
      );
      const payload = (await response.json()) as {
        application?: EmployerApplicationRow;
        activationUrl?: string | null;
        error?: string;
      };

      if (!response.ok || !payload.application) {
        campusToast.error({
          title: "Review Failed",
          description:
            payload.error ?? "Unable to review employer application.",
        });
        return;
      }

      setApplications((current) =>
        current.map((application) =>
          application.id === reviewing.id
            ? {
                ...application,
                status: payload.application?.status ?? application.status,
                reviewNotes:
                  payload.application?.reviewNotes ?? application.reviewNotes,
              }
            : application,
        ),
      );
      closeReview();

      if (reviewAction === "approve") {
        campusToast.success({
          title: "Application Approved",
          description:
            "Employer activation invitation has been generated successfully.",
        });
      } else if (reviewAction === "reject") {
        campusToast.warning({
          title: "Application Rejected",
          description: "The employer application has been rejected.",
        });
      } else {
        campusToast.info({
          title: "More Information Requested",
          description:
            "The employer has been marked for additional information.",
        });
      }
    });
  }

  const columns: DataTableColumn<EmployerApplicationRow>[] = [
    {
      key: "companyName",
      header: "Company",
      cell: (application) => (
        <div>
          <p className="font-medium">{application.companyName}</p>
          <p className="text-xs text-muted-foreground">
            {application.industry} · {application.companySize}
          </p>
        </div>
      ),
    },
    {
      key: "contactPerson",
      header: "Contact",
      cell: (application) => (
        <div>
          <p className="font-medium">{application.contactPerson}</p>
          <p className="text-xs text-muted-foreground">{application.email}</p>
        </div>
      ),
    },
    { key: "country", header: "Country" },
    {
      key: "status",
      header: "Status",
      cell: (application) => <StatusBadge status={application.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-16 text-right",
      cell: (application) => (
        <AdminActionMenu
          items={[
            {
              label: "View",
              icon: FiEye,
              onSelect: () => setViewing(application),
            },
            {
              label: "Approve",
              icon: FiCheckCircle,
              disabled: application.status === "APPROVED",
              onSelect: () => openReview(application, "approve"),
            },
            {
              label: "Reject",
              icon: FiXCircle,
              destructive: true,
              disabled: application.status === "REJECTED",
              onSelect: () => openReview(application, "reject"),
            },
            {
              label: "Request More Information",
              icon: FiInfo,
              disabled: application.status === "MORE_INFORMATION_REQUESTED",
              onSelect: () =>
                openReview(application, "request-more-information"),
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
            placeholder="Search applications"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-5">
        <CampusDataTable
          columns={columns}
          data={filteredApplications}
          getRowId={(application) => application.id}
          empty={
            <EmptyState
              title={
                query ? "No matching applications" : "No employer applications"
              }
              description={
                query
                  ? "Adjust your search and try again."
                  : "Submitted employer applications will appear here for Super Admin review."
              }
              className="mx-auto border-0 bg-transparent"
            />
          }
        />
      </div>

      <Modal
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.companyName ?? "Employer Application"}
        description="Employer application profile and review context."
        className="max-h-[90vh] max-w-4xl overflow-y-auto"
      >
        {viewing ? <ApplicationDetails application={viewing} /> : null}
      </Modal>

      <ReviewDialog
        application={reviewing}
        action={reviewAction}
        notes={reviewNotes}
        isSubmitting={isPending}
        onNotesChange={setReviewNotes}
        onCancel={closeReview}
        onConfirm={reviewApplication}
      />
    </>
  );
}
