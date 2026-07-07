import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import { studentEngagementAnalyticsQuerySchema } from "@/features/student-engagement/lib/student-engagement-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import {
  AuditLogModel,
  CommunityMemberModel,
  CommunityUpdateModel,
  EventAttendanceModel,
  ForumEngagementModel,
  ForumReplyModel,
  ForumTopicModel,
  MentorshipRequestModel,
  MentorshipSessionModel,
  OrderRequestModel,
  PollVoteModel,
  ProductFavoriteModel,
  ProductModel,
  ProjectEngagementModel,
  ProjectFavoriteModel,
  ProjectMemberModel,
  ProjectModel,
  ProjectStarModel,
  ShopModel,
  UserModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

type StudentEngagement = {
  userId: string;
  name: string;
  email: string;
  universityId: string | null;
  collegeId: string | null;
  departmentId: string | null;
  lastLoginAt: string | null;
  metrics: {
    logins: number;
    communityParticipation: number;
    projectActivity: number;
    marketplaceActivity: number;
    forumParticipation: number;
    pollParticipation: number;
    eventParticipation: number;
    mentorshipActivity: number;
  };
  engagementScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
};

function canReadStudentEngagement(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.AUDIT_READ) ||
    hasPermission(actor, PERMISSIONS.TENANT_MANAGE) ||
    hasPermission(actor, PERMISSIONS.USER_MANAGE)
  );
}

function scopedUniversityId(actor: AuthUser, requested?: string) {
  if (hasRole(actor.role, ["SUPER_ADMIN"], actor.roles)) {
    return requested ?? actor.universityId ?? null;
  }

  if (!actor.universityId) throw forbidden("University scope is required.");
  if (requested && requested !== actor.universityId) {
    throw forbidden("Cannot view another university's student engagement.");
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

function increment(
  target: Map<string, number>,
  userId: unknown,
  amount: unknown,
) {
  if (typeof userId !== "string" || !userId) return;
  target.set(userId, (target.get(userId) ?? 0) + Number(amount ?? 0));
}

function mergeCounts(
  target: Map<string, number>,
  rows: Array<{ _id: unknown; count: number }>,
) {
  for (const row of rows) increment(target, row._id, row.count);
}

function scoreStudent(metrics: StudentEngagement["metrics"]) {
  return (
    metrics.logins * 1 +
    metrics.communityParticipation * 3 +
    metrics.projectActivity * 5 +
    metrics.marketplaceActivity * 3 +
    metrics.forumParticipation * 3 +
    metrics.pollParticipation * 2 +
    metrics.eventParticipation * 3 +
    metrics.mentorshipActivity * 4
  );
}

function riskLevel(score: number, lastLoginAt: Date | null, now: Date) {
  const inactiveDays = lastLoginAt
    ? Math.floor((now.getTime() - lastLoginAt.getTime()) / 86_400_000)
    : Number.POSITIVE_INFINITY;

  if (score <= 2 || inactiveDays >= 30) return "HIGH";
  if (score <= 8 || inactiveDays >= 14) return "MEDIUM";

  return "LOW";
}

function groupByDay(rows: Array<{ _id: unknown; count: number }>) {
  return rows.map((row) => ({
    date: String(row._id),
    count: Number(row.count ?? 0),
  }));
}

function trendPipeline(match: Record<string, unknown>, dateField: string) {
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

export async function getStudentEngagementAnalytics(query: unknown = {}) {
  const actor = await requireAuth();
  if (!canReadStudentEngagement(actor)) {
    throw forbidden("Student engagement analytics access is required.");
  }

  await connectPostgres();
  const filters = studentEngagementAnalyticsQuerySchema.parse(query);
  const universityId = scopedUniversityId(actor, filters.universityId);
  if (!universityId) throw forbidden("University scope is required.");

  const studentFilter: Record<string, unknown> = {
    universityId,
    status: "ACTIVE",
    ...deletedFilter,
    $or: [{ role: "STUDENT" }, { roles: "STUDENT" }, { userType: "STUDENT" }],
  };
  if (filters.collegeId) studentFilter.collegeId = filters.collegeId;
  if (filters.departmentId) studentFilter.departmentId = filters.departmentId;

  const students = await UserModel.find(studentFilter)
    .select("_id name email universityId collegeId departmentId lastLoginAt")
    .lean();
  const studentIds = students.map((student) => String(student._id));
  const userIdMatch = { $in: studentIds };

  const loginFilter = addDateFilter(
    {
      universityId,
      action: "LOGIN",
      actorId: userIdMatch,
    },
    "createdAt",
    filters.from,
    filters.to,
  );

  const [
    loginCounts,
    communityMemberships,
    communityUpdates,
    projectsOwned,
    projectMemberships,
    projectStars,
    projectFavorites,
    projectEngagements,
    shopsOwned,
    productsOwned,
    productFavorites,
    orderRequestsAsBuyer,
    orderRequestsAsSeller,
    forumTopics,
    forumReplies,
    forumEngagements,
    pollVotes,
    eventAttendance,
    mentorshipRequestsAsMentee,
    mentorshipRequestsAsMentor,
    mentorshipSessionsAsMentee,
    mentorshipSessionsAsMentor,
    loginTrend,
    communityTrend,
    projectTrend,
    marketplaceTrend,
    forumTrend,
    pollTrend,
    eventTrend,
    mentorshipTrend,
  ] = await Promise.all([
    AuditLogModel.aggregate([
      { $match: loginFilter },
      { $group: { _id: "$actorId", count: { $sum: 1 } } },
    ]),
    CommunityMemberModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, userId: userIdMatch },
          "joinedAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]),
    CommunityUpdateModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, authorId: userIdMatch },
          "createdAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$authorId", count: { $sum: 1 } } },
    ]),
    ProjectModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, ownerId: userIdMatch, ...deletedFilter },
          "createdAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$ownerId", count: { $sum: 1 } } },
    ]),
    ProjectMemberModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, userId: userIdMatch },
          "joinedAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]),
    ProjectStarModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, userId: userIdMatch },
          "createdAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]),
    ProjectFavoriteModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, userId: userIdMatch },
          "createdAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]),
    ProjectEngagementModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, userId: userIdMatch },
          "occurredAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]),
    ShopModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, ownerId: userIdMatch, ...deletedFilter },
          "createdAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$ownerId", count: { $sum: 1 } } },
    ]),
    ProductModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, ownerId: userIdMatch, ...deletedFilter },
          "createdAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$ownerId", count: { $sum: 1 } } },
    ]),
    ProductFavoriteModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, userId: userIdMatch },
          "createdAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]),
    OrderRequestModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, buyerId: userIdMatch },
          "createdAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$buyerId", count: { $sum: 1 } } },
    ]),
    OrderRequestModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, sellerId: userIdMatch },
          "createdAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$sellerId", count: { $sum: 1 } } },
    ]),
    ForumTopicModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, authorId: userIdMatch, ...deletedFilter },
          "createdAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$authorId", count: { $sum: 1 } } },
    ]),
    ForumReplyModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, authorId: userIdMatch, ...deletedFilter },
          "createdAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$authorId", count: { $sum: 1 } } },
    ]),
    ForumEngagementModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, userId: userIdMatch },
          "createdAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]),
    PollVoteModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, userId: userIdMatch },
          "votedAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]),
    EventAttendanceModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, userId: userIdMatch },
          "joinedAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]),
    MentorshipRequestModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, menteeId: userIdMatch },
          "createdAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$menteeId", count: { $sum: 1 } } },
    ]),
    MentorshipRequestModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, mentorId: userIdMatch },
          "createdAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$mentorId", count: { $sum: 1 } } },
    ]),
    MentorshipSessionModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, menteeId: userIdMatch },
          "createdAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$menteeId", count: { $sum: 1 } } },
    ]),
    MentorshipSessionModel.aggregate([
      {
        $match: addDateFilter(
          { universityId, mentorId: userIdMatch },
          "createdAt",
          filters.from,
          filters.to,
        ),
      },
      { $group: { _id: "$mentorId", count: { $sum: 1 } } },
    ]),
    AuditLogModel.aggregate(trendPipeline(loginFilter, "createdAt")),
    CommunityUpdateModel.aggregate(
      trendPipeline(
        addDateFilter({ universityId }, "createdAt", filters.from, filters.to),
        "createdAt",
      ),
    ),
    ProjectModel.aggregate(
      trendPipeline(
        addDateFilter({ universityId, ...deletedFilter }, "createdAt", filters.from, filters.to),
        "createdAt",
      ),
    ),
    OrderRequestModel.aggregate(
      trendPipeline(
        addDateFilter({ universityId }, "createdAt", filters.from, filters.to),
        "createdAt",
      ),
    ),
    ForumTopicModel.aggregate(
      trendPipeline(
        addDateFilter({ universityId, ...deletedFilter }, "createdAt", filters.from, filters.to),
        "createdAt",
      ),
    ),
    PollVoteModel.aggregate(
      trendPipeline(
        addDateFilter({ universityId }, "votedAt", filters.from, filters.to),
        "votedAt",
      ),
    ),
    EventAttendanceModel.aggregate(
      trendPipeline(
        addDateFilter({ universityId }, "joinedAt", filters.from, filters.to),
        "joinedAt",
      ),
    ),
    MentorshipRequestModel.aggregate(
      trendPipeline(
        addDateFilter({ universityId }, "createdAt", filters.from, filters.to),
        "createdAt",
      ),
    ),
  ]);

  const logins = new Map<string, number>();
  const communityParticipation = new Map<string, number>();
  const projectActivity = new Map<string, number>();
  const marketplaceActivity = new Map<string, number>();
  const forumParticipation = new Map<string, number>();
  const pollParticipation = new Map<string, number>();
  const eventParticipation = new Map<string, number>();
  const mentorshipActivity = new Map<string, number>();

  mergeCounts(logins, loginCounts);
  mergeCounts(communityParticipation, communityMemberships);
  mergeCounts(communityParticipation, communityUpdates);
  mergeCounts(projectActivity, projectsOwned);
  mergeCounts(projectActivity, projectMemberships);
  mergeCounts(projectActivity, projectStars);
  mergeCounts(projectActivity, projectFavorites);
  mergeCounts(projectActivity, projectEngagements);
  mergeCounts(marketplaceActivity, shopsOwned);
  mergeCounts(marketplaceActivity, productsOwned);
  mergeCounts(marketplaceActivity, productFavorites);
  mergeCounts(marketplaceActivity, orderRequestsAsBuyer);
  mergeCounts(marketplaceActivity, orderRequestsAsSeller);
  mergeCounts(forumParticipation, forumTopics);
  mergeCounts(forumParticipation, forumReplies);
  mergeCounts(forumParticipation, forumEngagements);
  mergeCounts(pollParticipation, pollVotes);
  mergeCounts(eventParticipation, eventAttendance);
  mergeCounts(mentorshipActivity, mentorshipRequestsAsMentee);
  mergeCounts(mentorshipActivity, mentorshipRequestsAsMentor);
  mergeCounts(mentorshipActivity, mentorshipSessionsAsMentee);
  mergeCounts(mentorshipActivity, mentorshipSessionsAsMentor);

  const now = filters.to ?? new Date();
  const studentScores: StudentEngagement[] = students.map((student) => {
    const userId = String(student._id);
    const lastLoginAt = student.lastLoginAt instanceof Date ? student.lastLoginAt : null;
    const metrics = {
      logins: logins.get(userId) ?? 0,
      communityParticipation: communityParticipation.get(userId) ?? 0,
      projectActivity: projectActivity.get(userId) ?? 0,
      marketplaceActivity: marketplaceActivity.get(userId) ?? 0,
      forumParticipation: forumParticipation.get(userId) ?? 0,
      pollParticipation: pollParticipation.get(userId) ?? 0,
      eventParticipation: eventParticipation.get(userId) ?? 0,
      mentorshipActivity: mentorshipActivity.get(userId) ?? 0,
    };
    const engagementScore = scoreStudent(metrics);

    return {
      userId,
      name: String(student.name),
      email: String(student.email),
      universityId:
        typeof student.universityId === "string" ? student.universityId : null,
      collegeId: typeof student.collegeId === "string" ? student.collegeId : null,
      departmentId:
        typeof student.departmentId === "string" ? student.departmentId : null,
      lastLoginAt: lastLoginAt?.toISOString() ?? null,
      metrics,
      engagementScore,
      riskLevel: riskLevel(engagementScore, lastLoginAt, now),
    };
  });

  const mostActiveStudents = [...studentScores]
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, filters.limit);
  const leastActiveStudents = [...studentScores]
    .sort((a, b) => a.engagementScore - b.engagementScore)
    .slice(0, filters.limit);
  const atRiskStudents = studentScores
    .filter((student) => student.riskLevel !== "LOW")
    .sort((a, b) => a.engagementScore - b.engagementScore)
    .slice(0, filters.limit);
  const totalScore = studentScores.reduce(
    (sum, student) => sum + student.engagementScore,
    0,
  );
  const engagedStudents = studentScores.filter(
    (student) => student.engagementScore > 0,
  ).length;

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "STUDENT_ENGAGEMENT_ANALYTICS_VIEWED",
    entityType: "student_engagement_analytics",
    metadata: { filters },
  });

  return {
    filters: {
      universityId,
      collegeId: filters.collegeId ?? null,
      departmentId: filters.departmentId ?? null,
      from: filters.from?.toISOString() ?? null,
      to: filters.to?.toISOString() ?? null,
    },
    summary: {
      totalStudents: students.length,
      engagedStudents,
      atRiskStudents: studentScores.filter((student) => student.riskLevel === "HIGH").length,
      averageEngagementScore:
        students.length > 0 ? Number((totalScore / students.length).toFixed(2)) : 0,
    },
    activityTotals: {
      logins: Array.from(logins.values()).reduce((sum, value) => sum + value, 0),
      communityParticipation: Array.from(communityParticipation.values()).reduce(
        (sum, value) => sum + value,
        0,
      ),
      projectActivity: Array.from(projectActivity.values()).reduce(
        (sum, value) => sum + value,
        0,
      ),
      marketplaceActivity: Array.from(marketplaceActivity.values()).reduce(
        (sum, value) => sum + value,
        0,
      ),
      forumParticipation: Array.from(forumParticipation.values()).reduce(
        (sum, value) => sum + value,
        0,
      ),
      pollParticipation: Array.from(pollParticipation.values()).reduce(
        (sum, value) => sum + value,
        0,
      ),
      eventParticipation: Array.from(eventParticipation.values()).reduce(
        (sum, value) => sum + value,
        0,
      ),
      mentorshipActivity: Array.from(mentorshipActivity.values()).reduce(
        (sum, value) => sum + value,
        0,
      ),
    },
    engagementTrends: {
      logins: groupByDay(loginTrend),
      communityParticipation: groupByDay(communityTrend),
      projectActivity: groupByDay(projectTrend),
      marketplaceActivity: groupByDay(marketplaceTrend),
      forumParticipation: groupByDay(forumTrend),
      pollParticipation: groupByDay(pollTrend),
      eventParticipation: groupByDay(eventTrend),
      mentorshipActivity: groupByDay(mentorshipTrend),
    },
    mostActiveStudents,
    leastActiveStudents,
    atRiskStudents,
  };
}
