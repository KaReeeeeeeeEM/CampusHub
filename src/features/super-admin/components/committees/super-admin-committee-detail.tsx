"use client";

import { useMemo, useState, useTransition } from "react";
import { FiSearch, FiSlash, FiUsers } from "react-icons/fi";

import { CampusDataTable, CampusInput, campusToast } from "@/components/campushub";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/shared/data-table";
import type {
  SerializedSuperAdminCommittee,
  SerializedSuperAdminCommitteeCommunityDetail,
  SerializedSuperAdminCommitteeMember,
} from "@/features/super-admin/lib/super-admin-service";

type Props = {
  detail: SerializedSuperAdminCommitteeCommunityDetail;
};

type MemberWithCommittee = SerializedSuperAdminCommitteeMember & {
  committeeName: string;
};

type ApiEnvelope<T> = {
  data: T | null;
  error: { message: string } | null;
};

async function getApiError(response: Response) {
  try {
    const payload = (await response.json()) as ApiEnvelope<unknown>;
    return payload.error?.message || "The request could not be completed.";
  } catch {
    return "The request could not be completed.";
  }
}

export function SuperAdminCommitteeDetail({ detail }: Props) {
  const [committees, setCommittees] = useState(detail.committees);
  const [query, setQuery] = useState("");
  const [removing, setRemoving] = useState<MemberWithCommittee | null>(null);
  const [isPending, startTransition] = useTransition();
  const filteredCommittees = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return committees;

    return committees.filter((committee) =>
      [
        committee.name,
        committee.category,
        committee.scopeType,
        committee.status,
        ...committee.members.flatMap((member) => [
          member.name,
          member.email,
          member.role,
        ]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [committees, query]);

  function removeMember() {
    if (!removing) return;

    startTransition(async () => {
      const response = await fetch(
        `/api/super-admin/committees/${removing.committeeId}/members/${removing.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        campusToast.error({
          title: "Member Not Removed",
          description: await getApiError(response),
        });
        return;
      }

      setCommittees((current) =>
        current.map((committee) =>
          committee.id === removing.committeeId
            ? {
                ...committee,
                memberCount: Math.max(0, committee.memberCount - 1),
                members: committee.members.filter(
                  (member) => member.id !== removing.id,
                ),
              }
            : committee,
        ),
      );
      setRemoving(null);
      campusToast.warning({
        title: "Member Removed",
        description: "The committee member was removed successfully.",
      });
    });
  }

  function columnsFor(
    committee: SerializedSuperAdminCommittee,
  ): DataTableColumn<SerializedSuperAdminCommitteeMember>[] {
    return [
      { key: "name", header: "Member" },
      { key: "email", header: "Email" },
      { key: "role", header: "Role" },
      { key: "joinedAt", header: "Joined" },
      {
        key: "actions",
        header: "Actions",
        className: "w-24 text-right",
        cell: (member) => (
          <Button
            size="sm"
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() =>
              setRemoving({
                ...member,
                committeeName: committee.name,
              })
            }
          >
            <FiSlash className="h-4 w-4" aria-hidden="true" />
            Remove
          </Button>
        ),
      },
    ];
  }

  return (
    <>
      <section className="mt-8 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface p-5">
            <p className="text-2xl font-semibold">
              {committees.length.toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Committees</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-5">
            <p className="text-2xl font-semibold">
              {committees
                .reduce((sum, committee) => sum + committee.members.length, 0)
                .toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Active members</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-5">
            <p className="text-2xl font-semibold">
              {detail.community.communityMembers.toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Community members
            </p>
          </div>
        </div>

        <div className="relative w-full sm:max-w-sm">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <CampusInput
            className="pl-9"
            placeholder="Search committees or members"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {filteredCommittees.length > 0 ? (
          filteredCommittees.map((committee) => (
            <article
              key={committee.id}
              className="space-y-4 rounded-lg border border-border bg-surface p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary">
                    <FiUsers className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold">{committee.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {committee.category} · {committee.scopeType} ·{" "}
                      {committee.status}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {committee.description ?? "No description provided."}
                    </p>
                  </div>
                </div>
                <span className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
                  {committee.members.length.toLocaleString()} members
                </span>
              </div>

              <CampusDataTable
                columns={columnsFor(committee)}
                data={committee.members}
                getRowId={(member) => member.id}
                empty={
                  <EmptyState
                    title="No active members"
                    description="This committee does not have active members yet."
                    className="mx-auto border-0 bg-transparent"
                  />
                }
              />
            </article>
          ))
        ) : (
          <EmptyState
            title={query ? "No matching committees" : "No committees available"}
            description={
              query
                ? "Adjust your search and try again."
                : "No committees are available for this community context yet."
            }
            className="max-w-none"
          />
        )}
      </section>

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove Committee Member"
        description={`Remove ${removing?.name ?? "this member"} from ${removing?.committeeName ?? "this committee"}?`}
        confirmLabel="Remove"
        destructive
        onConfirm={removeMember}
      />
    </>
  );
}
