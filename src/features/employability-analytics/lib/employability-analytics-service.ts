import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import { employabilityAnalyticsQuerySchema } from "@/features/employability-analytics/lib/employability-analytics-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import {
  ApplicationModel,
  ApplicationStatusEventModel,
  AuditLogModel,
  CareerProfileModel,
  CareerProfileViewModel,
  OpportunityModel,
  OpportunityViewModel,
  SavedCandidateModel,
  UserModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };
const hiredStatuses = ["HIRED", "ACCEPTED"];

type CountRow = {
  _id: unknown;
  count: number;
};

type StudentRow = {
  _id: string;
};

function canReadEmployabilityAnalytics(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.AUDIT_READ) ||
    hasPermission(actor, PERMISSIONS.TENANT_MANAGE) ||
    hasPermission(actor, PERMISSIONS.OPPORTUNITY_APPROVE)
  );
}

function scopedUniversityId(actor: AuthUser, requested?: string) {
  if (hasRole(actor.role, ["SUPER_ADMIN"], actor.roles)) {
    return requested ?? actor.universityId ?? null;
  }

  if (!actor.universityId) throw forbidden("University scope is required.");
  if (requested && requested !== actor.universityId) {
    throw forbidden("Cannot view another university's employability analytics.");
  }

  return actor.universityId;
}

function dateRange(from?: Date, to?: Date) {
  if (!from && !to) return undefined;

  return {
    ...(from ? { $gte: from } : {}),
    ...(to ? { $lte: to } : {}),
  };
}

function addDateFilter(
  filter: Record<string, unknown>,
  field: string,
  from?: Date,
  to?: Date,
) {
  const range = dateRange(from, to);
  if (range) filter[field] = range;

  return filter;
}

function percentage(numerator: number, denominator: number) {
  return denominator > 0
    ? Number(((numerator / denominator) * 100).toFixed(2))
    : 0;
}

function normalizeCounts(rows: CountRow[], key: string) {
  return rows.map((row) => ({
    [key]: String(row._id ?? "UNKNOWN"),
    count: Number(row.count ?? 0),
  }));
}

function dayTrendPipeline(match: Record<string, unknown>, dateField: string) {
  return [
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: `$${dateField}`,
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 as const } },
  ];
}

function normalizeTrend(rows: CountRow[]) {
  return rows.map((row) => ({
    date: String(row._id),
    count: Number(row.count ?? 0),
  }));
}

function opportunityOutcomeMatch(input: {
  universityId: string;
  studentIds: string[];
  from?: Date;
  to?: Date;
  statuses?: string[];
}) {
  return addDateFilter(
    {
      universityId: input.universityId,
      studentId: { $in: input.studentIds },
      ...(input.statuses ? { status: { $in: input.statuses } } : {}),
      ...deletedFilter,
    },
    "submittedAt",
    input.from,
    input.to,
  );
}

async function countHiredByOpportunityKind(input: {
  universityId: string;
  studentIds: string[];
  from?: Date;
  to?: Date;
  kind: "INTERNSHIP" | "JOB";
}) {
  const rows = await ApplicationModel.aggregate([
    {
      $match: opportunityOutcomeMatch({
        universityId: input.universityId,
        studentIds: input.studentIds,
        from: input.from,
        to: input.to,
        statuses: hiredStatuses,
      }),
    },
    {
      $lookup: {
        from: "opportunities",
        localField: "opportunityId",
        foreignField: "_id",
        as: "opportunity",
      },
    },
    { $unwind: "$opportunity" },
    {
      $match:
        input.kind === "INTERNSHIP"
          ? {
              $or: [
                { "opportunity.workType": "INTERNSHIP" },
                { "opportunity.opportunityType": "INTERNSHIP" },
              ],
            }
          : {
              $or: [
                { "opportunity.opportunityType": "JOB" },
                { "opportunity.workType": "FULL_TIME" },
                { "opportunity.workType": "PART_TIME" },
              ],
            },
    },
    { $count: "count" },
  ]);

  return Number(rows[0]?.count ?? 0);
}

async function aggregateTopEmployers(input: {
  universityId: string;
  studentIds: string[];
  from?: Date;
  to?: Date;
  limit: number;
}) {
  const rows = await ApplicationModel.aggregate([
    {
      $match: opportunityOutcomeMatch({
        universityId: input.universityId,
        studentIds: input.studentIds,
        from: input.from,
        to: input.to,
        statuses: hiredStatuses,
      }),
    },
    {
      $lookup: {
        from: "opportunities",
        localField: "opportunityId",
        foreignField: "_id",
        as: "opportunity",
      },
    },
    { $unwind: "$opportunity" },
    {
      $group: {
        _id: {
          employerId: "$opportunity.employerId",
          employerName: "$opportunity.employerName",
        },
        hires: { $sum: 1 },
      },
    },
    { $sort: { hires: -1 as const } },
    { $limit: input.limit },
  ]);

  return rows.map((row) => ({
    employerId: String(row._id?.employerId ?? "UNKNOWN"),
    employerName:
      typeof row._id?.employerName === "string" ? row._id.employerName : null,
    hires: Number(row.hires ?? 0),
  }));
}

export async function getEmployabilityAnalytics(query: unknown = {}) {
  const actor = await requireAuth();
  if (!canReadEmployabilityAnalytics(actor)) {
    throw forbidden("Employability analytics access is required.");
  }

  await connectPostgres();
  const filters = employabilityAnalyticsQuerySchema.parse(query);
  const universityId = scopedUniversityId(actor, filters.universityId);
  if (!universityId) throw forbidden("University scope is required.");

  const studentFilter: Record<string, unknown> = {
    universityId,
    status: "ACTIVE",
    ...deletedFilter,
    $or: [
      { role: { $in: ["STUDENT", "ALUMNI"] } },
      { roles: { $in: ["STUDENT", "ALUMNI"] } },
      { userType: { $in: ["STUDENT", "ALUMNI"] } },
    ],
  };
  if (filters.collegeId) studentFilter.collegeId = filters.collegeId;
  if (filters.departmentId) studentFilter.departmentId = filters.departmentId;

  const students = await UserModel.find(studentFilter).select("_id").lean<
    StudentRow[]
  >();
  const studentIds = students.map((student) => String(student._id));

  const profileFilter: Record<string, unknown> = {
    universityId,
    userId: { $in: studentIds },
    ...deletedFilter,
  };
  const profileCreatedFilter = addDateFilter(
    { ...profileFilter },
    "createdAt",
    filters.from,
    filters.to,
  );
  const applicationFilter = opportunityOutcomeMatch({
    universityId,
    studentIds,
    from: filters.from,
    to: filters.to,
  });
  const shortlistEventFilter = addDateFilter(
    {
      universityId,
      studentId: { $in: studentIds },
      toStatus: "SHORTLISTED",
    },
    "changedAt",
    filters.from,
    filters.to,
  );
  const interviewEventFilter = addDateFilter(
    {
      universityId,
      studentId: { $in: studentIds },
      toStatus: "INTERVIEW",
    },
    "changedAt",
    filters.from,
    filters.to,
  );
  const hiredApplicationFilter = opportunityOutcomeMatch({
    universityId,
    studentIds,
    from: filters.from,
    to: filters.to,
    statuses: hiredStatuses,
  });
  const employerProfileViewFilter = addDateFilter(
    {
      universityId,
      profileUserId: { $in: studentIds },
      viewerType: "EMPLOYER",
    },
    "viewedAt",
    filters.from,
    filters.to,
  );
  const opportunityViewFilter = addDateFilter(
    {
      universityId,
      viewerType: { $in: ["STUDENT", "ALUMNI"] },
      viewerId: { $in: studentIds },
    },
    "viewedAt",
    filters.from,
    filters.to,
  );
  const cvUploadAuditFilter = addDateFilter(
    {
      universityId,
      actorId: { $in: studentIds },
      action: "CAREER_PROFILE_CV_UPLOADED",
    },
    "createdAt",
    filters.from,
    filters.to,
  );

  const [
    careerProfiles,
    careerProfilesCreated,
    cvUploadsFromAudit,
    profilesWithCv,
    applications,
    shortlists,
    interviews,
    hiredApplications,
    internshipsObtained,
    jobsObtained,
    employerProfileViews,
    opportunityViews,
    savedCandidates,
    topSkills,
    topPreferredIndustries,
    topOpportunityIndustries,
    topEmployers,
    profileTrend,
    cvUploadTrend,
    applicationTrend,
    shortlistTrend,
    interviewTrend,
    hireTrend,
    employerViewTrend,
  ] = await Promise.all([
    CareerProfileModel.countDocuments(profileFilter),
    CareerProfileModel.countDocuments(profileCreatedFilter),
    AuditLogModel.countDocuments(cvUploadAuditFilter),
    CareerProfileModel.countDocuments({
      ...profileFilter,
      cvUrl: { $nin: [null, ""] },
    }),
    ApplicationModel.countDocuments(applicationFilter),
    ApplicationStatusEventModel.countDocuments(shortlistEventFilter),
    ApplicationStatusEventModel.countDocuments(interviewEventFilter),
    ApplicationModel.countDocuments(hiredApplicationFilter),
    countHiredByOpportunityKind({
      universityId,
      studentIds,
      from: filters.from,
      to: filters.to,
      kind: "INTERNSHIP",
    }),
    countHiredByOpportunityKind({
      universityId,
      studentIds,
      from: filters.from,
      to: filters.to,
      kind: "JOB",
    }),
    CareerProfileViewModel.countDocuments(employerProfileViewFilter),
    OpportunityViewModel.countDocuments(opportunityViewFilter),
    SavedCandidateModel.countDocuments(
      addDateFilter(
        { universityId, candidateUserId: { $in: studentIds } },
        "createdAt",
        filters.from,
        filters.to,
      ),
    ),
    CareerProfileModel.aggregate([
      { $match: profileFilter },
      { $unwind: "$skills" },
      { $group: { _id: "$skills", count: { $sum: 1 } } },
      { $sort: { count: -1 as const, _id: 1 as const } },
      { $limit: filters.limit },
    ]),
    CareerProfileModel.aggregate([
      { $match: profileFilter },
      { $unwind: "$preferredIndustries" },
      { $group: { _id: "$preferredIndustries", count: { $sum: 1 } } },
      { $sort: { count: -1 as const, _id: 1 as const } },
      { $limit: filters.limit },
    ]),
    OpportunityModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, industry: { $nin: [null, ""] }, ...deletedFilter },
          "createdAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$industry", count: { $sum: 1 } } },
      { $sort: { count: -1 as const, _id: 1 as const } },
      { $limit: filters.limit },
    ]),
    aggregateTopEmployers({
      universityId,
      studentIds,
      from: filters.from,
      to: filters.to,
      limit: filters.limit,
    }),
    CareerProfileModel.aggregate(
      dayTrendPipeline(profileCreatedFilter, "createdAt"),
    ),
    AuditLogModel.aggregate(dayTrendPipeline(cvUploadAuditFilter, "createdAt")),
    ApplicationModel.aggregate(dayTrendPipeline(applicationFilter, "submittedAt")),
    ApplicationStatusEventModel.aggregate(
      dayTrendPipeline(shortlistEventFilter, "changedAt"),
    ),
    ApplicationStatusEventModel.aggregate(
      dayTrendPipeline(interviewEventFilter, "changedAt"),
    ),
    ApplicationModel.aggregate(dayTrendPipeline(hiredApplicationFilter, "submittedAt")),
    CareerProfileViewModel.aggregate(
      dayTrendPipeline(employerProfileViewFilter, "viewedAt"),
    ),
  ]);

  const cvUploads = cvUploadsFromAudit || profilesWithCv;
  const employerEngagement =
    employerProfileViews + opportunityViews + savedCandidates;

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "EMPLOYABILITY_ANALYTICS_VIEWED",
    entityType: "employability_analytics",
    metadata: { filters },
  });

  return {
    filters: {
      universityId,
      collegeId: filters.collegeId ?? null,
      departmentId: filters.departmentId ?? null,
      from: filters.from?.toISOString() ?? null,
      to: filters.to?.toISOString() ?? null,
      limit: filters.limit,
    },
    summary: {
      eligibleStudents: studentIds.length,
      careerProfiles,
      careerProfilesCreated,
      cvUploads,
      profilesWithCv,
      applications,
      shortlists,
      interviews,
      internshipsObtained,
      jobsObtained,
      hiredApplications,
      employerEngagement,
    },
    metrics: {
      employmentRate: percentage(jobsObtained, studentIds.length),
      internshipRate: percentage(internshipsObtained, studentIds.length),
      applicationSuccessRate: percentage(hiredApplications, applications),
      shortlistRate: percentage(shortlists, applications),
      interviewRate: percentage(interviews, applications),
      cvReadinessRate: percentage(profilesWithCv, careerProfiles),
      employerEngagementPerProfile:
        careerProfiles > 0
          ? Number((employerEngagement / careerProfiles).toFixed(2))
          : 0,
    },
    rankings: {
      topSkills: normalizeCounts(topSkills, "skill"),
      topIndustries: {
        studentPreferences: normalizeCounts(
          topPreferredIndustries,
          "industry",
        ),
        opportunityDemand: normalizeCounts(topOpportunityIndustries, "industry"),
      },
      topEmployers,
    },
    trends: {
      careerProfiles: normalizeTrend(profileTrend),
      cvUploads: normalizeTrend(cvUploadTrend),
      applications: normalizeTrend(applicationTrend),
      shortlists: normalizeTrend(shortlistTrend),
      interviews: normalizeTrend(interviewTrend),
      hires: normalizeTrend(hireTrend),
      employerEngagement: normalizeTrend(employerViewTrend),
    },
  };
}
