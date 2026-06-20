import { hasRole } from "@/features/authorization/rbac";
import {
  rankingQuerySchema,
  type RankingQueryInput,
  type RankingTimeFilterInput,
} from "@/features/gamification/lib/ranking-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import {
  CommunityMemberModel,
  CommunityModel,
  EventAttendanceModel,
  EventModel,
  ForumEngagementModel,
  ForumTopicModel,
  MentorshipRequestModel,
  OrderRequestModel,
  ProjectAnalyticsModel,
  ProjectModel,
  ShopModel,
  UserAchievementModel,
  UserModel,
  UserXpProfileModel,
  XpTransactionModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

type RankingRow = {
  rank: number;
  entityType: string;
  entityId: string;
  score: number;
  metrics: Record<string, number>;
  entity: Record<string, unknown> | null;
};

function isSuperAdmin(actor: AuthUser) {
  return hasRole(actor.role, ["SUPER_ADMIN"], actor.roles);
}

function isCampusAdmin(actor: AuthUser) {
  return hasRole(actor.role, ["CAMPUS_ADMIN"], actor.roles);
}

function dayStart(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);

  return date;
}

function timeWindowStart(timeFilter: RankingTimeFilterInput) {
  if (timeFilter === "ALL_TIME") return null;

  const date = dayStart();
  if (timeFilter === "TODAY") return date;
  if (timeFilter === "WEEK") date.setDate(date.getDate() - 7);
  if (timeFilter === "MONTH") date.setMonth(date.getMonth() - 1);
  if (timeFilter === "YEAR") date.setFullYear(date.getFullYear() - 1);

  return date;
}

function assertScopeAccess(actor: AuthUser, filters: RankingQueryInput) {
  if (filters.scope === "GLOBAL") {
    if (!isSuperAdmin(actor)) {
      throw forbidden("Global rankings require platform access.");
    }

    return {};
  }

  if (!actor.universityId) throw forbidden("University scope is required.");

  const universityId = filters.universityId ?? actor.universityId;
  if (!isSuperAdmin(actor) && universityId !== actor.universityId) {
    throw forbidden("Cannot access another university's rankings.");
  }

  if (filters.scope === "UNIVERSITY") return { universityId };

  if (filters.scope === "COLLEGE") {
    const collegeId = filters.collegeId ?? actor.collegeId;
    if (!collegeId) throw forbidden("College scope is required.");
    if (!isSuperAdmin(actor) && !isCampusAdmin(actor) && collegeId !== actor.collegeId) {
      throw forbidden("Cannot access another college's rankings.");
    }

    return { universityId, collegeId };
  }

  const departmentId = filters.departmentId ?? actor.departmentId;
  if (!departmentId) throw forbidden("Department scope is required.");
  if (
    !isSuperAdmin(actor) &&
    !isCampusAdmin(actor) &&
    departmentId !== actor.departmentId
  ) {
    throw forbidden("Cannot access another department's rankings.");
  }

  return { universityId, departmentId };
}

function applyResourceScope(
  match: Record<string, unknown>,
  scope: ReturnType<typeof assertScopeAccess>,
) {
  if (scope.universityId) match.universityId = scope.universityId;
  if (scope.collegeId) match.collegeId = scope.collegeId;
  if (scope.departmentId) match.departmentId = scope.departmentId;

  return match;
}

async function scopedUserIds(scope: ReturnType<typeof assertScopeAccess>) {
  const userMatch: Record<string, unknown> = { status: "ACTIVE", deletedAt: null };

  if (scope.universityId) userMatch.universityId = scope.universityId;
  if (scope.collegeId) userMatch.collegeId = scope.collegeId;
  if (scope.departmentId) userMatch.departmentId = scope.departmentId;

  if (
    !scope.universityId &&
    !scope.collegeId &&
    !scope.departmentId
  ) {
    return null;
  }

  const users = await UserModel.find(userMatch).select("_id").lean();

  return users.map((user) => String(user._id));
}

function serializeEntity(entity: unknown) {
  if (!entity || typeof entity !== "object") return null;

  const record = entity as Record<string, unknown>;

  return {
    id: String(record._id),
    title:
      typeof record.title === "string"
        ? record.title
        : typeof record.name === "string"
          ? record.name
          : typeof record.email === "string"
            ? record.email
            : null,
    subtitle:
      typeof record.description === "string"
        ? record.description
        : typeof record.summary === "string"
          ? record.summary
          : null,
    slug: typeof record.slug === "string" ? record.slug : null,
    image:
      typeof record.coverImage === "string"
        ? record.coverImage
        : typeof record.coverImageUrl === "string"
          ? record.coverImageUrl
          : typeof record.logo === "string"
            ? record.logo
            : typeof record.avatar === "string"
              ? record.avatar
              : null,
    raw: record,
  };
}

function rowFromAggregate(
  row: Record<string, unknown>,
  index: number,
  entityType: string,
): RankingRow {
  const metrics = (row.metrics ?? {}) as Record<string, unknown>;

  return {
    rank: index + 1,
    entityType,
    entityId: String(row.entityId ?? row._id),
    score: Number(row.score ?? 0),
    metrics: Object.fromEntries(
      Object.entries(metrics).map(([key, value]) => [key, Number(value ?? 0)]),
    ),
    entity: serializeEntity(row.entity),
  };
}

async function xpRanking(
  filters: RankingQueryInput,
  scope: ReturnType<typeof assertScopeAccess>,
) {
  const userIds = await scopedUserIds(scope);

  if (filters.timeFilter === "ALL_TIME") {
    const match: Record<string, unknown> = {};
    if (scope.universityId) match.universityId = scope.universityId;
    if (userIds) match.userId = { $in: userIds };

    const rows = await UserXpProfileModel.aggregate<Record<string, unknown>>([
      { $match: match },
      {
        $lookup: {
          from: "user",
          localField: "userId",
          foreignField: "_id",
          as: "entityRows",
        },
      },
      { $addFields: { entity: { $first: "$entityRows" } } },
      {
        $project: {
          entityId: "$userId",
          entity: 1,
          score: "$totalXp",
          metrics: {
            totalXp: "$totalXp",
            weeklyXp: "$weeklyXp",
            monthlyXp: "$monthlyXp",
            level: "$level",
          },
        },
      },
      { $sort: { score: -1, "metrics.level": -1 } },
      { $limit: filters.limit },
    ]);

    return rows.map((row, index) => rowFromAggregate(row, index, "USER"));
  }

  const match: Record<string, unknown> = {
    xpAwarded: { $gt: 0 },
    createdAt: { $gte: timeWindowStart(filters.timeFilter) },
  };
  if (scope.universityId) match.universityId = scope.universityId;
  if (userIds) match.userId = { $in: userIds };

  const rows = await XpTransactionModel.aggregate<Record<string, unknown>>([
    { $match: match },
    { $group: { _id: "$userId", score: { $sum: "$xpAwarded" } } },
    {
      $lookup: {
        from: "user",
        localField: "_id",
        foreignField: "_id",
        as: "entityRows",
      },
    },
    { $addFields: { entityId: "$_id", entity: { $first: "$entityRows" } } },
    { $project: { entityId: 1, entity: 1, score: 1, metrics: { periodXp: "$score" } } },
    { $sort: { score: -1 } },
    { $limit: filters.limit },
  ]);

  return rows.map((row, index) => rowFromAggregate(row, index, "USER"));
}

async function projectRanking(
  filters: RankingQueryInput,
  scope: ReturnType<typeof assertScopeAccess>,
) {
  if (filters.timeFilter === "ALL_TIME") {
    const match = applyResourceScope(
      { status: "PUBLISHED", deletedAt: null },
      scope,
    );
    const rows = await ProjectModel.aggregate<Record<string, unknown>>([
      { $match: match },
      {
        $addFields: {
          score: {
            $add: [
              "$viewCount",
              { $multiply: ["$starCount", 5] },
              { $multiply: ["$shareCount", 4] },
              { $multiply: ["$favoriteCount", 2] },
            ],
          },
        },
      },
      {
        $project: {
          entityId: "$_id",
          entity: "$$ROOT",
          score: 1,
          metrics: {
            views: "$viewCount",
            stars: "$starCount",
            shares: "$shareCount",
            favorites: "$favoriteCount",
          },
        },
      },
      { $sort: { score: -1, createdAt: -1 } },
      { $limit: filters.limit },
    ]);

    return rows.map((row, index) => rowFromAggregate(row, index, "PROJECT"));
  }

  const analyticsMatch: Record<string, unknown> = {
    date: { $gte: timeWindowStart(filters.timeFilter) },
  };
  if (scope.universityId) analyticsMatch.universityId = scope.universityId;

  const projectMatch = applyResourceScope(
    { status: "PUBLISHED", deletedAt: null },
    scope,
  );
  const rows = await ProjectAnalyticsModel.aggregate<Record<string, unknown>>([
    { $match: analyticsMatch },
    {
      $group: {
        _id: "$projectId",
        views: { $sum: "$views" },
        stars: { $sum: "$stars" },
        clicks: {
          $sum: {
            $add: ["$linkClicks", "$documentClicks", "$repositoryClicks"],
          },
        },
        shares: { $sum: "$shares" },
      },
    },
    {
      $lookup: {
        from: "projects",
        localField: "_id",
        foreignField: "_id",
        as: "projectRows",
      },
    },
    { $addFields: { entity: { $first: "$projectRows" } } },
    { $match: Object.fromEntries(Object.entries(projectMatch).map(([key, value]) => [`entity.${key}`, value])) },
    {
      $addFields: {
        entityId: "$_id",
        score: {
          $add: ["$views", { $multiply: ["$stars", 5] }, { $multiply: ["$clicks", 2] }, { $multiply: ["$shares", 4] }],
        },
        metrics: { views: "$views", stars: "$stars", clicks: "$clicks", shares: "$shares" },
      },
    },
    { $sort: { score: -1 } },
    { $limit: filters.limit },
  ]);

  return rows.map((row, index) => rowFromAggregate(row, index, "PROJECT"));
}

async function marketplaceRanking(
  filters: RankingQueryInput,
  scope: ReturnType<typeof assertScopeAccess>,
) {
  if (filters.timeFilter === "ALL_TIME") {
    const match = applyResourceScope({ status: "ACTIVE", deletedAt: null }, scope);
    const rows = await ShopModel.aggregate<Record<string, unknown>>([
      { $match: match },
      {
        $addFields: {
          score: {
            $add: [
              "$viewCount",
              { $multiply: ["$productCount", 5] },
              { $multiply: ["$orderRequestCount", 10] },
              { $multiply: ["$followerCount", 3] },
            ],
          },
        },
      },
      {
        $project: {
          entityId: "$_id",
          entity: "$$ROOT",
          score: 1,
          metrics: {
            views: "$viewCount",
            products: "$productCount",
            orderRequests: "$orderRequestCount",
            followers: "$followerCount",
          },
        },
      },
      { $sort: { score: -1 } },
      { $limit: filters.limit },
    ]);

    return rows.map((row, index) => rowFromAggregate(row, index, "SHOP"));
  }

  const since = timeWindowStart(filters.timeFilter);
  const match: Record<string, unknown> = { createdAt: { $gte: since } };
  if (scope.universityId) match.universityId = scope.universityId;

  const shopMatch = applyResourceScope({ status: "ACTIVE", deletedAt: null }, scope);
  const rows = await OrderRequestModel.aggregate<Record<string, unknown>>([
    { $match: match },
    {
      $group: {
        _id: "$shopId",
        orderRequests: { $sum: 1 },
        completedOrders: {
          $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
        },
      },
    },
    { $lookup: { from: "shops", localField: "_id", foreignField: "_id", as: "shopRows" } },
    { $addFields: { entity: { $first: "$shopRows" } } },
    { $match: Object.fromEntries(Object.entries(shopMatch).map(([key, value]) => [`entity.${key}`, value])) },
    {
      $addFields: {
        entityId: "$_id",
        score: { $add: [{ $multiply: ["$orderRequests", 5] }, { $multiply: ["$completedOrders", 20] }] },
        metrics: { orderRequests: "$orderRequests", completedOrders: "$completedOrders" },
      },
    },
    { $sort: { score: -1 } },
    { $limit: filters.limit },
  ]);

  return rows.map((row, index) => rowFromAggregate(row, index, "SHOP"));
}

async function mentorshipRanking(
  filters: RankingQueryInput,
  scope: ReturnType<typeof assertScopeAccess>,
) {
  const match: Record<string, unknown> = { status: "COMPLETED" };
  const since = timeWindowStart(filters.timeFilter);
  if (since) match.completedAt = { $gte: since };
  if (scope.universityId) match.universityId = scope.universityId;
  const userIds = await scopedUserIds(scope);
  if (userIds) match.mentorId = { $in: userIds };

  const rows = await MentorshipRequestModel.aggregate<Record<string, unknown>>([
    { $match: match },
    { $group: { _id: "$mentorId", completedMentorships: { $sum: 1 } } },
    { $lookup: { from: "mentor_profiles", localField: "_id", foreignField: "userId", as: "profileRows" } },
    { $lookup: { from: "user", localField: "_id", foreignField: "_id", as: "userRows" } },
    { $addFields: { entityId: "$_id", entity: { $first: "$userRows" }, profile: { $first: "$profileRows" } } },
    {
      $addFields: {
        score: { $multiply: ["$completedMentorships", 10] },
        metrics: { completedMentorships: "$completedMentorships" },
      },
    },
    { $sort: { score: -1 } },
    { $limit: filters.limit },
  ]);

  return rows.map((row, index) => rowFromAggregate(row, index, "MENTOR"));
}

async function communitiesRanking(
  filters: RankingQueryInput,
  scope: ReturnType<typeof assertScopeAccess>,
) {
  if (filters.timeFilter === "ALL_TIME") {
    const match = applyResourceScope({ status: "ACTIVE", deletedAt: null }, scope);
    const rows = await CommunityModel.aggregate<Record<string, unknown>>([
      { $match: match },
      { $addFields: { score: { $add: ["$memberCount", { $multiply: ["$moderatorCount", 3] }] } } },
      { $project: { entityId: "$_id", entity: "$$ROOT", score: 1, metrics: { members: "$memberCount", moderators: "$moderatorCount" } } },
      { $sort: { score: -1 } },
      { $limit: filters.limit },
    ]);

    return rows.map((row, index) => rowFromAggregate(row, index, "COMMUNITY"));
  }

  const match: Record<string, unknown> = {
    status: "ACTIVE",
    joinedAt: { $gte: timeWindowStart(filters.timeFilter) },
  };
  if (scope.universityId) match.universityId = scope.universityId;
  const communityMatch = applyResourceScope({ status: "ACTIVE", deletedAt: null }, scope);
  const rows = await CommunityMemberModel.aggregate<Record<string, unknown>>([
    { $match: match },
    { $group: { _id: "$communityId", newMembers: { $sum: 1 } } },
    { $lookup: { from: "communities", localField: "_id", foreignField: "_id", as: "communityRows" } },
    { $addFields: { entity: { $first: "$communityRows" } } },
    { $match: Object.fromEntries(Object.entries(communityMatch).map(([key, value]) => [`entity.${key}`, value])) },
    { $addFields: { entityId: "$_id", score: "$newMembers", metrics: { newMembers: "$newMembers" } } },
    { $sort: { score: -1 } },
    { $limit: filters.limit },
  ]);

  return rows.map((row, index) => rowFromAggregate(row, index, "COMMUNITY"));
}

async function eventsRanking(
  filters: RankingQueryInput,
  scope: ReturnType<typeof assertScopeAccess>,
) {
  if (filters.timeFilter === "ALL_TIME") {
    const match = applyResourceScope({ deletedAt: null }, scope);
    const rows = await EventModel.aggregate<Record<string, unknown>>([
      { $match: match },
      { $addFields: { score: { $add: ["$registrations", { $multiply: ["$attendance", 3] }] } } },
      { $project: { entityId: "$_id", entity: "$$ROOT", score: 1, metrics: { registrations: "$registrations", attendance: "$attendance", attendanceRate: "$attendanceRate" } } },
      { $sort: { score: -1 } },
      { $limit: filters.limit },
    ]);

    return rows.map((row, index) => rowFromAggregate(row, index, "EVENT"));
  }

  const match: Record<string, unknown> = {
    joinedAt: { $gte: timeWindowStart(filters.timeFilter) },
  };
  if (scope.universityId) match.universityId = scope.universityId;
  const eventMatch = applyResourceScope({ deletedAt: null }, scope);
  const rows = await EventAttendanceModel.aggregate<Record<string, unknown>>([
    { $match: match },
    {
      $group: {
        _id: "$eventId",
        registrations: { $sum: 1 },
        checkIns: { $sum: { $cond: [{ $eq: ["$attendanceStatus", "CHECKED_IN"] }, 1, 0] } },
      },
    },
    { $lookup: { from: "events", localField: "_id", foreignField: "_id", as: "eventRows" } },
    { $addFields: { entity: { $first: "$eventRows" } } },
    { $match: Object.fromEntries(Object.entries(eventMatch).map(([key, value]) => [`entity.${key}`, value])) },
    { $addFields: { entityId: "$_id", score: { $add: ["$registrations", { $multiply: ["$checkIns", 3] }] }, metrics: { registrations: "$registrations", checkIns: "$checkIns" } } },
    { $sort: { score: -1 } },
    { $limit: filters.limit },
  ]);

  return rows.map((row, index) => rowFromAggregate(row, index, "EVENT"));
}

async function forumsRanking(
  filters: RankingQueryInput,
  scope: ReturnType<typeof assertScopeAccess>,
) {
  if (filters.timeFilter === "ALL_TIME") {
    const match = applyResourceScope({ status: "ACTIVE", deletedAt: null }, scope);
    const rows = await ForumTopicModel.aggregate<Record<string, unknown>>([
      { $match: match },
      {
        $addFields: {
          score: {
            $add: [
              "$trendingScore",
              "$viewCount",
              { $multiply: ["$upvotes", 3] },
              { $multiply: ["$replyCount", 2] },
              { $multiply: ["$bookmarkCount", 2] },
              { $multiply: ["$shareCount", 4] },
            ],
          },
        },
      },
      { $project: { entityId: "$_id", entity: "$$ROOT", score: 1, metrics: { views: "$viewCount", upvotes: "$upvotes", replies: "$replyCount", bookmarks: "$bookmarkCount", shares: "$shareCount" } } },
      { $sort: { score: -1 } },
      { $limit: filters.limit },
    ]);

    return rows.map((row, index) => rowFromAggregate(row, index, "FORUM_TOPIC"));
  }

  const match: Record<string, unknown> = {
    entityType: "POST",
    createdAt: { $gte: timeWindowStart(filters.timeFilter) },
  };
  if (scope.universityId) match.universityId = scope.universityId;
  const topicMatch = applyResourceScope({ status: "ACTIVE", deletedAt: null }, scope);
  const rows = await ForumEngagementModel.aggregate<Record<string, unknown>>([
    { $match: match },
    {
      $group: {
        _id: "$entityId",
        views: { $sum: { $cond: [{ $eq: ["$engagementType", "VIEW"] }, 1, 0] } },
        upvotes: { $sum: { $cond: [{ $eq: ["$engagementType", "UPVOTE"] }, 1, 0] } },
        bookmarks: { $sum: { $cond: [{ $eq: ["$engagementType", "BOOKMARK"] }, 1, 0] } },
        shares: { $sum: { $cond: [{ $eq: ["$engagementType", "SHARE"] }, 1, 0] } },
      },
    },
    { $lookup: { from: "forum_topics", localField: "_id", foreignField: "_id", as: "topicRows" } },
    { $addFields: { entity: { $first: "$topicRows" } } },
    { $match: Object.fromEntries(Object.entries(topicMatch).map(([key, value]) => [`entity.${key}`, value])) },
    { $addFields: { entityId: "$_id", score: { $add: ["$views", { $multiply: ["$upvotes", 3] }, { $multiply: ["$bookmarks", 2] }, { $multiply: ["$shares", 4] }] }, metrics: { views: "$views", upvotes: "$upvotes", bookmarks: "$bookmarks", shares: "$shares" } } },
    { $sort: { score: -1 } },
    { $limit: filters.limit },
  ]);

  return rows.map((row, index) => rowFromAggregate(row, index, "FORUM_TOPIC"));
}

async function achievementsRanking(
  filters: RankingQueryInput,
  scope: ReturnType<typeof assertScopeAccess>,
) {
  const userIds = await scopedUserIds(scope);
  const match: Record<string, unknown> = {
    status: "COMPLETED",
    completedAt: { $ne: null },
  };
  const since = timeWindowStart(filters.timeFilter);
  if (since) match.completedAt = { $gte: since };
  if (scope.universityId) match.universityId = scope.universityId;
  if (userIds) match.userId = { $in: userIds };

  const rows = await UserAchievementModel.aggregate<Record<string, unknown>>([
    { $match: match },
    { $group: { _id: "$achievementId", completions: { $sum: 1 } } },
    { $lookup: { from: "achievements", localField: "_id", foreignField: "_id", as: "achievementRows" } },
    { $addFields: { entityId: "$_id", entity: { $first: "$achievementRows" }, score: "$completions", metrics: { completions: "$completions" } } },
    { $sort: { score: -1 } },
    { $limit: filters.limit },
  ]);

  return rows.map((row, index) => rowFromAggregate(row, index, "ACHIEVEMENT"));
}

export async function getRanking(query: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  const filters = rankingQuerySchema.parse(query);
  const scope = assertScopeAccess(actor, filters);
  let rows: RankingRow[] = [];

  if (filters.leaderboard === "XP") rows = await xpRanking(filters, scope);
  if (filters.leaderboard === "PROJECTS") rows = await projectRanking(filters, scope);
  if (filters.leaderboard === "MARKETPLACE") rows = await marketplaceRanking(filters, scope);
  if (filters.leaderboard === "MENTORSHIP") rows = await mentorshipRanking(filters, scope);
  if (filters.leaderboard === "COMMUNITIES") rows = await communitiesRanking(filters, scope);
  if (filters.leaderboard === "EVENTS") rows = await eventsRanking(filters, scope);
  if (filters.leaderboard === "FORUMS") rows = await forumsRanking(filters, scope);
  if (filters.leaderboard === "ACHIEVEMENTS") rows = await achievementsRanking(filters, scope);

  await writeAuditLog({
    actorId: actor.id,
    universityId: scope.universityId ?? actor.universityId ?? null,
    action: "RANKING_VIEWED",
    entityType: "ranking",
    entityId: filters.leaderboard,
    metadata: {
      leaderboard: filters.leaderboard,
      scope: filters.scope,
      timeFilter: filters.timeFilter,
      limit: filters.limit,
    },
  });

  return {
    leaderboard: filters.leaderboard,
    scope: filters.scope,
    timeFilter: filters.timeFilter,
    rows,
  };
}
