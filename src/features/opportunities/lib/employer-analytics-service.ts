import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import {
  employerAnalyticsQuerySchema,
  type EmployerAnalyticsTimeFilter,
} from "@/features/opportunities/lib/employer-analytics-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import {
  ApplicationModel,
  ApplicationStatusEventModel,
  OpportunityModel,
  OpportunityViewModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";
import type { PipelineStage } from "@/lib/db/model-compat";

const deletedFilter = { deletedAt: null };

function canViewEmployerAnalytics(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN", "EMPLOYER"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.OPPORTUNITY_APPROVE) ||
    hasPermission(actor, PERMISSIONS.AUDIT_READ)
  );
}

function resolveUniversityId(actor: AuthUser, requestedUniversityId?: string) {
  if (hasRole(actor.role, ["SUPER_ADMIN"], actor.roles)) {
    return requestedUniversityId ?? actor.universityId;
  }

  if (!actor.universityId) throw forbidden("University scope is required.");
  if (requestedUniversityId && requestedUniversityId !== actor.universityId) {
    throw forbidden("Cannot access another university's employer analytics.");
  }

  return actor.universityId;
}

function resolveEmployerId(actor: AuthUser, requestedEmployerId?: string) {
  if (hasRole(actor.role, ["EMPLOYER"], actor.roles)) {
    if (requestedEmployerId && requestedEmployerId !== actor.id) {
      throw forbidden("Employers can only access their own analytics.");
    }

    return actor.id;
  }

  return requestedEmployerId;
}

function getRangeStart(timeFilter: EmployerAnalyticsTimeFilter) {
  const now = new Date();
  const start = new Date(now);

  if (timeFilter === "ALL_TIME") return null;
  if (timeFilter === "TODAY") {
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (timeFilter === "WEEK") start.setDate(start.getDate() - 7);
  if (timeFilter === "MONTH") start.setMonth(start.getMonth() - 1);
  if (timeFilter === "YEAR") start.setFullYear(start.getFullYear() - 1);

  return start;
}

function withDateRange(field: string, start: Date | null) {
  return start ? { [field]: { $gte: start } } : {};
}

function buildSeriesPipeline(input: {
  match: Record<string, unknown>;
  dateField: string;
  status?: string;
}): PipelineStage[] {
  const match = input.status
    ? { ...input.match, toStatus: input.status }
    : input.match;

  return [
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: `$${input.dateField}` },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 as const } },
  ];
}

function serializeSeries(rows: Array<{ _id: string; count: number }>) {
  return rows.map((row) => ({
    date: String(row._id),
    count: Number(row.count ?? 0),
  }));
}

function serializeOpportunity(opportunity: Record<string, unknown>) {
  return {
    id: String(opportunity._id),
    title: String(opportunity.title),
    employerId: String(opportunity.employerId ?? opportunity.postedById),
    employerName:
      typeof opportunity.employerName === "string"
        ? opportunity.employerName
        : null,
    universityId: String(opportunity.universityId),
    industry:
      typeof opportunity.industry === "string" ? opportunity.industry : null,
    workType: String(opportunity.workType ?? opportunity.opportunityType),
    status: String(opportunity.status),
    viewCount: Number(opportunity.viewCount ?? 0),
    applicationCount: Number(opportunity.applicationCount ?? 0),
    shareCount: Number(opportunity.shareCount ?? 0),
  };
}

async function countByOpportunity(input: {
  collection: "views" | "applications" | "statusEvents";
  match: Record<string, unknown>;
}) {
  const pipeline: PipelineStage[] = [
    { $match: input.match },
    { $group: { _id: "$opportunityId", count: { $sum: 1 } } },
  ];
  const rows =
    input.collection === "views"
      ? await OpportunityViewModel.aggregate(pipeline)
      : input.collection === "applications"
        ? await ApplicationModel.aggregate(pipeline)
        : await ApplicationStatusEventModel.aggregate(pipeline);

  return new Map(rows.map((row) => [String(row._id), Number(row.count ?? 0)]));
}

export async function getEmployerAnalytics(query: unknown = {}) {
  const actor = await requireAuth();
  if (!canViewEmployerAnalytics(actor)) {
    throw forbidden("Employer analytics access is required.");
  }
  await connectPostgres();

  const filters = employerAnalyticsQuerySchema.parse(query);
  const universityId = resolveUniversityId(actor, filters.universityId);
  const employerId = resolveEmployerId(actor, filters.employerId);
  const rangeStart = getRangeStart(filters.timeFilter);

  const opportunityFilter: Record<string, unknown> = { ...deletedFilter };
  if (universityId) opportunityFilter.universityId = universityId;
  if (employerId) opportunityFilter.employerId = employerId;
  if (filters.opportunityId) opportunityFilter._id = filters.opportunityId;

  const opportunities = await OpportunityModel.find(opportunityFilter)
    .select(
      "_id universityId employerId postedById employerName title industry workType opportunityType status viewCount applicationCount shareCount",
    )
    .lean();

  if (filters.opportunityId && opportunities.length === 0) {
    throw notFound("Opportunity not found.");
  }

  const opportunityIds = opportunities.map((opportunity) =>
    String(opportunity._id),
  );
  const scopedUniversityIds = Array.from(
    new Set(opportunities.map((opportunity) => String(opportunity.universityId))),
  );

  const baseViewMatch = {
    opportunityId: { $in: opportunityIds },
    ...withDateRange("viewedAt", rangeStart),
  };
  const baseApplicationMatch = {
    opportunityId: { $in: opportunityIds },
    ...withDateRange("submittedAt", rangeStart),
  };
  const baseStatusEventMatch = {
    opportunityId: { $in: opportunityIds },
    ...withDateRange("changedAt", rangeStart),
  };

  const [
    opportunityViews,
    applications,
    shortlists,
    interviews,
    hires,
    viewCounts,
    applicationCounts,
    shortlistCounts,
    interviewCounts,
    hireCounts,
    viewSeries,
    applicationSeries,
    shortlistSeries,
    interviewSeries,
    hireSeries,
  ] = await Promise.all([
    OpportunityViewModel.countDocuments(baseViewMatch),
    ApplicationModel.countDocuments(baseApplicationMatch),
    ApplicationStatusEventModel.countDocuments({
      ...baseStatusEventMatch,
      toStatus: "SHORTLISTED",
    }),
    ApplicationStatusEventModel.countDocuments({
      ...baseStatusEventMatch,
      toStatus: "INTERVIEW",
    }),
    ApplicationStatusEventModel.countDocuments({
      ...baseStatusEventMatch,
      toStatus: "HIRED",
    }),
    countByOpportunity({ collection: "views", match: baseViewMatch }),
    countByOpportunity({
      collection: "applications",
      match: baseApplicationMatch,
    }),
    countByOpportunity({
      collection: "statusEvents",
      match: { ...baseStatusEventMatch, toStatus: "SHORTLISTED" },
    }),
    countByOpportunity({
      collection: "statusEvents",
      match: { ...baseStatusEventMatch, toStatus: "INTERVIEW" },
    }),
    countByOpportunity({
      collection: "statusEvents",
      match: { ...baseStatusEventMatch, toStatus: "HIRED" },
    }),
    OpportunityViewModel.aggregate(
      buildSeriesPipeline({ match: baseViewMatch, dateField: "viewedAt" }),
    ),
    ApplicationModel.aggregate(
      buildSeriesPipeline({
        match: baseApplicationMatch,
        dateField: "submittedAt",
      }),
    ),
    ApplicationStatusEventModel.aggregate(
      buildSeriesPipeline({
        match: baseStatusEventMatch,
        dateField: "changedAt",
        status: "SHORTLISTED",
      }),
    ),
    ApplicationStatusEventModel.aggregate(
      buildSeriesPipeline({
        match: baseStatusEventMatch,
        dateField: "changedAt",
        status: "INTERVIEW",
      }),
    ),
    ApplicationStatusEventModel.aggregate(
      buildSeriesPipeline({
        match: baseStatusEventMatch,
        dateField: "changedAt",
        status: "HIRED",
      }),
    ),
  ]);

  const topOpportunities = opportunities
    .map((opportunity) => {
      const id = String(opportunity._id);
      const metrics = {
        views: viewCounts.get(id) ?? 0,
        applications: applicationCounts.get(id) ?? 0,
        shortlists: shortlistCounts.get(id) ?? 0,
        interviews: interviewCounts.get(id) ?? 0,
        hires: hireCounts.get(id) ?? 0,
      };

      return {
        opportunity: serializeOpportunity(opportunity as Record<string, unknown>),
        metrics,
        score:
          metrics.views +
          metrics.applications * 3 +
          metrics.shortlists * 5 +
          metrics.interviews * 8 +
          metrics.hires * 13,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, filters.limit);

  await writeAuditLog({
    actorId: actor.id,
    universityId: universityId ?? scopedUniversityIds[0] ?? null,
    action: "EMPLOYER_ANALYTICS_VIEWED",
    entityType: "employer_analytics",
    entityId: employerId ?? filters.opportunityId ?? "aggregate",
    metadata: {
      timeFilter: filters.timeFilter,
      employerId: employerId ?? null,
      opportunityId: filters.opportunityId ?? null,
      opportunityCount: opportunityIds.length,
    },
  });

  return {
    scope: {
      universityId: universityId ?? null,
      employerId: employerId ?? null,
      opportunityId: filters.opportunityId ?? null,
      timeFilter: filters.timeFilter,
      rangeStart: rangeStart?.toISOString() ?? null,
    },
    totals: {
      opportunityViews,
      applications,
      shortlists,
      interviews,
      hires,
      conversionRates: {
        applicationFromView:
          opportunityViews > 0 ? applications / opportunityViews : 0,
        shortlistFromApplication:
          applications > 0 ? shortlists / applications : 0,
        interviewFromShortlist: shortlists > 0 ? interviews / shortlists : 0,
        hireFromInterview: interviews > 0 ? hires / interviews : 0,
      },
    },
    series: {
      opportunityViews: serializeSeries(viewSeries),
      applications: serializeSeries(applicationSeries),
      shortlists: serializeSeries(shortlistSeries),
      interviews: serializeSeries(interviewSeries),
      hires: serializeSeries(hireSeries),
    },
    topOpportunities,
  };
}
