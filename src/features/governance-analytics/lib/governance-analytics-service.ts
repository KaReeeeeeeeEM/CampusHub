import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import { governanceAnalyticsQuerySchema } from "@/features/governance-analytics/lib/governance-analytics-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import {
  AnnouncementModel,
  CommitteeMemberModel,
  CommitteeModel,
  EventModel,
  LeadershipReportModel,
  PollModel,
  PollVoteModel,
  SuggestionModel,
  UserModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";
import type { PipelineStage } from "mongoose";

const deletedFilter = { deletedAt: null };

function canReadGovernanceAnalytics(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.AUDIT_READ) ||
    hasPermission(actor, PERMISSIONS.TENANT_MANAGE)
  );
}

function scopedUniversityId(actor: AuthUser, requested?: string) {
  if (hasRole(actor.role, ["SUPER_ADMIN"], actor.roles)) {
    return requested ?? actor.universityId ?? null;
  }

  if (!actor.universityId) throw forbidden("University scope is required.");
  if (requested && requested !== actor.universityId) {
    throw forbidden("Cannot view another university's governance analytics.");
  }

  return actor.universityId;
}

function createdAtRange(from?: Date, to?: Date) {
  if (!from && !to) return undefined;

  return {
    ...(from ? { $gte: from } : {}),
    ...(to ? { $lte: to } : {}),
  };
}

function addDateRange(
  filter: Record<string, unknown>,
  field: string,
  from?: Date,
  to?: Date,
) {
  const range = createdAtRange(from, to);
  if (range) filter[field] = range;

  return filter;
}

function metadataCommitteeFilter(committeeIds: string[], committeeId?: string) {
  return committeeId
    ? { "metadata.committeeId": committeeId }
    : { "metadata.committeeId": { $in: committeeIds } };
}

function normalizeCounts(items: Array<{ _id: unknown; count: number }>, key: string) {
  return items.map((item) => ({
    [key]: String(item._id ?? "UNKNOWN"),
    count: Number(item.count ?? 0),
  }));
}

export async function getGovernanceAnalytics(query: unknown = {}) {
  const actor = await requireAuth();
  if (!canReadGovernanceAnalytics(actor)) {
    throw forbidden("Governance analytics access is required.");
  }

  await connectMongo();
  const filters = governanceAnalyticsQuerySchema.parse(query);
  const universityId = scopedUniversityId(actor, filters.universityId);
  if (!universityId) throw forbidden("University scope is required.");

  const committeeFilter: Record<string, unknown> = {
    universityId,
    ...deletedFilter,
  };
  if (filters.collegeId) committeeFilter.collegeId = filters.collegeId;
  if (filters.departmentId) committeeFilter.departmentId = filters.departmentId;
  if (filters.committeeId) committeeFilter._id = filters.committeeId;

  const committees = await CommitteeModel.find(committeeFilter)
    .select("_id name category status memberCount")
    .lean();
  const committeeIds = committees.map((committee) => String(committee._id));
  const committeeIdFilter = filters.committeeId
    ? { committeeId: filters.committeeId }
    : { committeeId: { $in: committeeIds } };
  const committeeMetadataFilter = metadataCommitteeFilter(
    committeeIds,
    filters.committeeId,
  );

  const dateOnCreatedAt = createdAtRange(filters.from, filters.to);
  const committeeScopedCreatedAtFilter = {
    ...committeeMetadataFilter,
    ...(dateOnCreatedAt ? { createdAt: dateOnCreatedAt } : {}),
  };

  const userFilter: Record<string, unknown> = {
    universityId,
    status: "ACTIVE",
    ...deletedFilter,
  };
  if (filters.collegeId) userFilter.collegeId = filters.collegeId;
  if (filters.departmentId) userFilter.departmentId = filters.departmentId;

  const suggestionFilter: Record<string, unknown> = {
    universityId,
    ...deletedFilter,
  };
  if (filters.committeeId || committeeIds.length) {
    Object.assign(suggestionFilter, committeeMetadataFilter);
  }
  if (dateOnCreatedAt) suggestionFilter.createdAt = dateOnCreatedAt;

  const reportFilter: Record<string, unknown> = {
    universityId,
    ...deletedFilter,
  };
  if (filters.collegeId) reportFilter.collegeId = filters.collegeId;
  if (filters.departmentId) reportFilter.departmentId = filters.departmentId;
  if (filters.committeeId) reportFilter.committeeId = filters.committeeId;
  addDateRange(reportFilter, "createdAt", filters.from, filters.to);

  const approvedReportFilter: Record<string, unknown> = {
    ...reportFilter,
    status: "APPROVED",
  };
  delete approvedReportFilter.createdAt;
  addDateRange(approvedReportFilter, "approvedAt", filters.from, filters.to);

  const resolvedSuggestionFilter: Record<string, unknown> = {
    ...suggestionFilter,
    status: "RESOLVED",
  };
  delete resolvedSuggestionFilter.createdAt;
  addDateRange(
    resolvedSuggestionFilter,
    "resolvedAt",
    filters.from,
    filters.to,
  );

  const [
    activeMembers,
    committeeEvents,
    committeeAnnouncements,
    committeePolls,
    committeeActivityByStatus,
    representatives,
    representativeAnnouncements,
    representativeEvents,
    representativePolls,
    representativeSuggestions,
    reportsSubmitted,
    reportsApproved,
    reportsByType,
    reportsByStatus,
    suggestionsResolved,
    suggestionsByStatus,
    pollVotes,
    pollStats,
    leadershipParticipants,
  ] = await Promise.all([
    CommitteeMemberModel.countDocuments({
      ...committeeIdFilter,
      status: "ACTIVE",
      ...(dateOnCreatedAt ? { joinedAt: dateOnCreatedAt } : {}),
    }),
    EventModel.countDocuments(committeeScopedCreatedAtFilter),
    AnnouncementModel.countDocuments(committeeScopedCreatedAtFilter),
    PollModel.countDocuments(committeeScopedCreatedAtFilter),
    CommitteeModel.aggregate([
      { $match: committeeFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    UserModel.countDocuments({
      ...userFilter,
      $or: [
        { position: "REPRESENTATIVE" },
        { studentLeadershipPositions: "REPRESENTATIVE" },
        { roles: "REPRESENTATIVE" },
      ],
    }),
    AnnouncementModel.countDocuments({
      universityId,
      ...(dateOnCreatedAt ? { createdAt: dateOnCreatedAt } : {}),
      ...(filters.collegeId ? { collegeIds: filters.collegeId } : {}),
      ...(filters.departmentId ? { departmentIds: filters.departmentId } : {}),
    }),
    EventModel.countDocuments({
      universityId,
      ...(dateOnCreatedAt ? { createdAt: dateOnCreatedAt } : {}),
      ...(filters.collegeId ? { collegeIds: filters.collegeId } : {}),
      ...(filters.departmentId ? { departmentIds: filters.departmentId } : {}),
    }),
    PollModel.countDocuments({
      universityId,
      ...(dateOnCreatedAt ? { createdAt: dateOnCreatedAt } : {}),
      ...(filters.collegeId ? { collegeIds: filters.collegeId } : {}),
      ...(filters.departmentId ? { departmentIds: filters.departmentId } : {}),
    }),
    SuggestionModel.countDocuments(suggestionFilter),
    LeadershipReportModel.countDocuments({
      ...reportFilter,
      status: { $in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"] },
    }),
    LeadershipReportModel.countDocuments(approvedReportFilter),
    LeadershipReportModel.aggregate([
      { $match: reportFilter },
      { $group: { _id: "$reportType", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    LeadershipReportModel.aggregate([
      { $match: reportFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    SuggestionModel.countDocuments(resolvedSuggestionFilter),
    SuggestionModel.aggregate([
      { $match: suggestionFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    PollVoteModel.countDocuments({
      universityId,
      ...(dateOnCreatedAt ? { votedAt: dateOnCreatedAt } : {}),
    }),
    PollModel.aggregate([
      {
        $match: {
          universityId,
          ...(dateOnCreatedAt ? { createdAt: dateOnCreatedAt } : {}),
          ...(filters.committeeId ? committeeMetadataFilter : {}),
          ...(filters.collegeId ? { collegeIds: filters.collegeId } : {}),
          ...(filters.departmentId ? { departmentIds: filters.departmentId } : {}),
        },
      },
      {
        $group: {
          _id: null,
          totalPolls: { $sum: 1 },
          totalVotes: { $sum: "$totalVotes" },
          uniqueVoters: { $sum: "$uniqueVoters" },
          averageParticipationRate: { $avg: "$participationRate" },
        },
      },
    ]),
    LeadershipReportModel.distinct("authorId", reportFilter),
  ]);

  const topActivityPipeline: PipelineStage[] = [
    {
      $match: {
        universityId,
        ...(dateOnCreatedAt ? { createdAt: dateOnCreatedAt } : {}),
      },
    },
    {
      $group: {
        _id: "$createdById",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 as const } },
    { $limit: 5 },
  ];
  const [
    topAnnouncementAuthors,
    topEventAuthors,
    topPollAuthors,
    topSuggestionAuthors,
  ] = await Promise.all([
    AnnouncementModel.aggregate(topActivityPipeline),
    EventModel.aggregate(topActivityPipeline),
    PollModel.aggregate(topActivityPipeline),
    SuggestionModel.aggregate(topActivityPipeline),
  ]);
  const topRepresentatives = [
    { type: "announcements", rows: topAnnouncementAuthors },
    { type: "events", rows: topEventAuthors },
    { type: "polls", rows: topPollAuthors },
    { type: "suggestions", rows: topSuggestionAuthors },
  ];

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "GOVERNANCE_ANALYTICS_VIEWED",
    entityType: "governance_analytics",
    metadata: { filters },
  });

  const pollSummary = pollStats[0] ?? {
    totalPolls: 0,
    totalVotes: 0,
    uniqueVoters: 0,
    averageParticipationRate: 0,
  };

  return {
    filters: {
      universityId,
      collegeId: filters.collegeId ?? null,
      departmentId: filters.departmentId ?? null,
      committeeId: filters.committeeId ?? null,
      from: filters.from?.toISOString() ?? null,
      to: filters.to?.toISOString() ?? null,
    },
    committeeActivity: {
      totalCommittees: committees.length,
      activeMembers,
      events: committeeEvents,
      announcements: committeeAnnouncements,
      polls: committeePolls,
      byStatus: normalizeCounts(committeeActivityByStatus, "status"),
    },
    representativeActivity: {
      activeRepresentatives: representatives,
      announcements: representativeAnnouncements,
      events: representativeEvents,
      polls: representativePolls,
      suggestions: representativeSuggestions,
      topActivity: topRepresentatives.map((group) => ({
        type: String(group.type),
        users: group.rows.map((row) => ({
          userId: String(row._id ?? "UNKNOWN"),
          count: Number(row.count ?? 0),
        })),
      })),
    },
    reports: {
      submitted: reportsSubmitted,
      approved: reportsApproved,
      byType: normalizeCounts(reportsByType, "reportType"),
      byStatus: normalizeCounts(reportsByStatus, "status"),
    },
    suggestions: {
      resolved: suggestionsResolved,
      byStatus: normalizeCounts(suggestionsByStatus, "status"),
    },
    polls: {
      totalPolls: Number(pollSummary.totalPolls ?? 0),
      votes: pollVotes,
      storedVotes: Number(pollSummary.totalVotes ?? 0),
      uniqueVoters: Number(pollSummary.uniqueVoters ?? 0),
      averageParticipationRate: Number(
        pollSummary.averageParticipationRate ?? 0,
      ),
    },
    leadershipEngagement: {
      activeReportAuthors: leadershipParticipants.length,
      engagementScore:
        reportsSubmitted +
        reportsApproved +
        suggestionsResolved +
        pollVotes +
        activeMembers,
    },
  };
}
