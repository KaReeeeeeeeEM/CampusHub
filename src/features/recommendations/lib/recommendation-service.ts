import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import {
  recommendationQuerySchema,
  type RecommendationType,
} from "@/features/recommendations/lib/recommendation-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import {
  ApplicationModel,
  BadgeModel,
  CareerProfileModel,
  CommunityMemberModel,
  CommunityModel,
  EventAttendanceModel,
  EventModel,
  MentorProfileModel,
  OpportunityModel,
  ProductFavoriteModel,
  ProductModel,
  ProjectMemberModel,
  ProjectModel,
  SavedOpportunityModel,
  UserBadgeModel,
  UserModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

type Recommendation = {
  recommendationType: Exclude<RecommendationType, "ALL">;
  recommendationScore: number;
  reason: string;
  entity: Record<string, unknown>;
};

type RecommendationContext = {
  actor: AuthUser;
  targetUser: Record<string, unknown>;
  universityId: string;
  collegeId: string | null;
  departmentId: string | null;
  skills: Set<string>;
  interests: Set<string>;
  badges: Set<string>;
  communityIds: Set<string>;
  eventTypes: Set<string>;
  productCategories: Set<string>;
  appliedOpportunityIds: Set<string>;
  savedOpportunityIds: Set<string>;
  projectIds: Set<string>;
};

function canReadTargetRecommendations(actor: AuthUser, targetUserId: string) {
  return (
    actor.id === targetUserId ||
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.USER_MANAGE)
  );
}

function resolveUniversityScope(
  actor: AuthUser,
  targetUser: Record<string, unknown>,
  requested?: string,
) {
  const targetUniversityId =
    typeof targetUser.universityId === "string" ? targetUser.universityId : null;

  if (hasRole(actor.role, ["SUPER_ADMIN"], actor.roles)) {
    const universityId = requested ?? targetUniversityId ?? actor.universityId;
    if (!universityId) throw forbidden("University scope is required.");

    return universityId;
  }

  if (!actor.universityId) throw forbidden("University scope is required.");
  if (requested && requested !== actor.universityId) {
    throw forbidden("Cannot access another university's recommendations.");
  }
  if (targetUniversityId && targetUniversityId !== actor.universityId) {
    throw forbidden("Cannot access another user's university recommendations.");
  }

  return actor.universityId;
}

function normalizeToken(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function addTokens(target: Set<string>, values: unknown[] = []) {
  for (const value of values) {
    const token = normalizeToken(value);
    if (token) target.add(token);
  }
}

function tokensFromText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function overlap(left: Set<string>, values: unknown[] = []) {
  const matches = new Set<string>();
  for (const value of values) {
    const token = normalizeToken(value);
    if (token && left.has(token)) matches.add(token);
  }

  return [...matches];
}

function textOverlap(left: Set<string>, values: unknown[] = []) {
  const matches = new Set<string>();
  for (const value of values) {
    for (const token of tokensFromText(value)) {
      if (left.has(token)) matches.add(token);
    }
  }

  return [...matches];
}

function capped(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function popularity(value: unknown, divisor: number, max: number) {
  return Math.min(Math.floor(Number(value ?? 0) / divisor), max);
}

function reason(parts: string[]) {
  return parts.length
    ? parts.join("; ")
    : "Recommended from university scope and recent platform activity.";
}

function sortAndLimit(items: Recommendation[], limit: number) {
  return items
    .filter((item) => item.recommendationScore > 0)
    .sort((left, right) => {
      if (right.recommendationScore !== left.recommendationScore) {
        return right.recommendationScore - left.recommendationScore;
      }

      return String(left.entity.id).localeCompare(String(right.entity.id));
    })
    .slice(0, limit);
}

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function visibilityForRole(role: string) {
  if (role === "STUDENT") return "STUDENTS";
  if (role === "TEACHER") return "TEACHERS";
  if (role === "ALUMNI") return "ALUMNI";
  if (role === "EMPLOYER") return "EMPLOYERS";

  return "ALL_USERS";
}

function canSeeTargetedResource(
  context: RecommendationContext,
  resource: Record<string, unknown>,
) {
  const visibility = String(resource.visibility ?? "ALL_USERS");
  if (["ALL_USERS", "PUBLIC", "UNIVERSITY"].includes(visibility)) return true;
  if (visibility === visibilityForRole(String(context.targetUser.role))) return true;
  if (
    visibility === "SPECIFIC_COLLEGES" &&
    context.collegeId &&
    Array.isArray(resource.collegeIds) &&
    resource.collegeIds.map(String).includes(context.collegeId)
  ) {
    return true;
  }
  if (
    visibility === "SPECIFIC_DEPARTMENTS" &&
    context.departmentId &&
    Array.isArray(resource.departmentIds) &&
    resource.departmentIds.map(String).includes(context.departmentId)
  ) {
    return true;
  }
  if (visibility === "COLLEGE" && resource.collegeId === context.collegeId) {
    return true;
  }
  if (
    visibility === "DEPARTMENT" &&
    resource.departmentId === context.departmentId
  ) {
    return true;
  }

  return false;
}

async function buildRecommendationContext(
  actor: AuthUser,
  query: unknown = {},
) {
  const filters = recommendationQuerySchema.parse(query);
  const targetUserId = filters.targetUserId ?? actor.id;
  if (!canReadTargetRecommendations(actor, targetUserId)) {
    throw forbidden("Recommendation access is required.");
  }

  const targetUser = await UserModel.findOne({
    _id: targetUserId,
    ...deletedFilter,
  }).lean();
  if (!targetUser) throw notFound("Recommendation target user not found.");

  const universityId = resolveUniversityScope(
    actor,
    targetUser as Record<string, unknown>,
    filters.universityId,
  );

  const [
    careerProfile,
    userBadges,
    communities,
    eventAttendance,
    productFavorites,
    applications,
    savedOpportunities,
    ownedProjects,
    projectMemberships,
  ] = await Promise.all([
    CareerProfileModel.findOne({
      universityId,
      userId: targetUserId,
      ...deletedFilter,
    }).lean(),
    UserBadgeModel.find({ universityId, userId: targetUserId }).lean(),
    CommunityMemberModel.find({
      universityId,
      userId: targetUserId,
      status: "ACTIVE",
    }).lean(),
    EventAttendanceModel.find({ universityId, userId: targetUserId })
      .sort({ joinedAt: -1 })
      .limit(50)
      .lean(),
    ProductFavoriteModel.find({ universityId, userId: targetUserId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    ApplicationModel.find({ universityId, studentId: targetUserId })
      .select("opportunityId")
      .lean(),
    SavedOpportunityModel.find({ universityId, userId: targetUserId })
      .select("opportunityId")
      .lean(),
    ProjectModel.find({
      universityId,
      ownerId: targetUserId,
      ...deletedFilter,
    })
      .select("_id category techStack skills tags")
      .lean(),
    ProjectMemberModel.find({ universityId, userId: targetUserId })
      .select("projectId")
      .lean(),
  ]);

  const badgeIds = userBadges.map((badge) => String(badge.badgeId));
  const [badges, attendedEvents, favoriteProducts] = await Promise.all([
    BadgeModel.find({ _id: { $in: badgeIds } }).lean(),
    EventModel.find({
      _id: { $in: eventAttendance.map((row) => String(row.eventId)) },
    })
      .select("eventType title")
      .lean(),
    ProductModel.find({
      _id: { $in: productFavorites.map((row) => String(row.productId)) },
    })
      .select("category tags")
      .lean(),
  ]);

  const skills = new Set<string>();
  const interests = new Set<string>();
  const badgeTokens = new Set<string>();
  const eventTypes = new Set<string>();
  const productCategories = new Set<string>();

  if (careerProfile) {
    addTokens(skills, Array.isArray(careerProfile.skills) ? careerProfile.skills : []);
    addTokens(
      interests,
      Array.isArray(careerProfile.preferredIndustries)
        ? careerProfile.preferredIndustries
        : [],
    );
    addTokens(
      interests,
      Array.isArray(careerProfile.preferredWorkType)
        ? careerProfile.preferredWorkType
        : [],
    );
  }

  for (const project of ownedProjects) {
    addTokens(interests, [project.category]);
    addTokens(skills, Array.isArray(project.techStack) ? project.techStack : []);
    addTokens(skills, Array.isArray(project.skills) ? project.skills : []);
    addTokens(interests, Array.isArray(project.tags) ? project.tags : []);
  }

  for (const badge of badges) {
    addTokens(badgeTokens, [badge.name, badge.category, badge.slug]);
    addTokens(interests, [badge.name, badge.category]);
  }

  for (const event of attendedEvents) {
    addTokens(eventTypes, [event.eventType]);
    addTokens(interests, [event.eventType, event.title]);
  }

  for (const product of favoriteProducts) {
    addTokens(productCategories, [product.category]);
    addTokens(interests, [product.category]);
    addTokens(interests, Array.isArray(product.tags) ? product.tags : []);
  }

  return {
    filters,
    context: {
      actor,
      targetUser: targetUser as Record<string, unknown>,
      universityId,
      collegeId:
        typeof targetUser.collegeId === "string" ? targetUser.collegeId : null,
      departmentId:
        typeof targetUser.departmentId === "string"
          ? targetUser.departmentId
          : null,
      skills,
      interests,
      badges: badgeTokens,
      communityIds: new Set(
        communities.map((community) => String(community.communityId)),
      ),
      eventTypes,
      productCategories,
      appliedOpportunityIds: new Set(
        applications.map((application) => String(application.opportunityId)),
      ),
      savedOpportunityIds: new Set(
        savedOpportunities.map((saved) => String(saved.opportunityId)),
      ),
      projectIds: new Set([
        ...ownedProjects.map((project) => String(project._id)),
        ...projectMemberships.map((member) => String(member.projectId)),
      ]),
    } satisfies RecommendationContext,
  };
}

async function recommendProjects(context: RecommendationContext, limit: number) {
  const projects = await ProjectModel.find({
    universityId: context.universityId,
    status: "PUBLISHED",
    ownerId: { $ne: String(context.targetUser._id) },
    ...deletedFilter,
  })
    .sort({ featured: -1, starCount: -1, viewCount: -1, createdAt: -1 })
    .limit(limit * 5)
    .lean();

  return sortAndLimit(
    projects
      .filter((project) => !context.projectIds.has(String(project._id)))
      .filter((project) =>
        canSeeTargetedResource(context, project as Record<string, unknown>),
      )
      .map((project) => {
        const skillMatches = overlap(context.skills, [
          ...(Array.isArray(project.techStack) ? project.techStack : []),
          ...(Array.isArray(project.skills) ? project.skills : []),
        ]);
        const interestMatches = overlap(context.interests, [
          project.category,
          ...(Array.isArray(project.tags) ? project.tags : []),
        ]);
        const reasons: string[] = [];
        let score = 10;
        if (skillMatches.length) {
          score += Math.min(skillMatches.length * 12, 36);
          reasons.push(`matches skills: ${skillMatches.slice(0, 3).join(", ")}`);
        }
        if (interestMatches.length) {
          score += Math.min(interestMatches.length * 8, 24);
          reasons.push(
            `matches interests: ${interestMatches.slice(0, 3).join(", ")}`,
          );
        }
        if (project.departmentId === context.departmentId) {
          score += 15;
          reasons.push("same department");
        } else if (project.collegeId === context.collegeId) {
          score += 10;
          reasons.push("same college");
        }
        score += popularity(project.starCount, 5, 10);
        score += popularity(project.viewCount, 25, 10);

        return {
          recommendationType: "PROJECT",
          recommendationScore: capped(score),
          reason: reason(reasons),
          entity: {
            id: String(project._id),
            title: String(project.title),
            category: String(project.category),
            ownerId: String(project.ownerId),
            visibility: String(project.visibility),
            starCount: Number(project.starCount ?? 0),
            viewCount: Number(project.viewCount ?? 0),
          },
        } satisfies Recommendation;
      }),
    limit,
  );
}

async function recommendMentors(context: RecommendationContext, limit: number) {
  const mentors = await MentorProfileModel.find({
    universityId: context.universityId,
    userId: { $ne: String(context.targetUser._id) },
    status: "ACTIVE",
    ...deletedFilter,
  })
    .sort({ currentMentees: 1, updatedAt: -1 })
    .limit(limit * 5)
    .lean();
  const userMap = await usersById(mentors.map((mentor) => String(mentor.userId)));

  return sortAndLimit(
    mentors.map((mentor) => {
      const expertiseMatches = overlap(context.skills, mentor.expertise);
      const interestMatches = overlap(context.interests, mentor.expertise);
      const mentorUser = userMap.get(String(mentor.userId));
      const reasons: string[] = [];
      let score = 8;
      if (expertiseMatches.length) {
        score += Math.min(expertiseMatches.length * 15, 45);
        reasons.push(
          `mentor expertise matches skills: ${expertiseMatches.slice(0, 3).join(", ")}`,
        );
      }
      if (interestMatches.length) {
        score += Math.min(interestMatches.length * 8, 24);
        reasons.push(
          `mentor expertise matches interests: ${interestMatches.slice(0, 3).join(", ")}`,
        );
      }
      if (Number(mentor.currentMentees ?? 0) < Number(mentor.maxMentees ?? 0)) {
        score += 12;
        reasons.push("mentor has available capacity");
      }
      if (mentorUser?.departmentId === context.departmentId) {
        score += 8;
        reasons.push("same department");
      } else if (mentorUser?.collegeId === context.collegeId) {
        score += 5;
        reasons.push("same college");
      }

      return {
        recommendationType: "MENTOR",
        recommendationScore: capped(score),
        reason: reason(reasons),
        entity: {
          id: String(mentor._id),
          userId: String(mentor.userId),
          name: typeof mentorUser?.name === "string" ? mentorUser.name : null,
          expertise: Array.isArray(mentor.expertise)
            ? mentor.expertise.map(String)
            : [],
          currentMentees: Number(mentor.currentMentees ?? 0),
          maxMentees: Number(mentor.maxMentees ?? 0),
        },
      } satisfies Recommendation;
    }),
    limit,
  );
}

async function recommendCommunities(
  context: RecommendationContext,
  limit: number,
) {
  const communities = await CommunityModel.find({
    universityId: context.universityId,
    status: "ACTIVE",
    visibility: { $in: ["PUBLIC", "UNIVERSITY"] },
    ...deletedFilter,
  })
    .sort({ memberCount: -1, updatedAt: -1 })
    .limit(limit * 5)
    .lean();

  return sortAndLimit(
    communities
      .filter((community) => !context.communityIds.has(String(community._id)))
      .map((community) => {
        const matches = textOverlap(context.interests, [
          community.name,
          community.description,
        ]);
        const reasons: string[] = [];
        let score = 10;
        if (matches.length) {
          score += Math.min(matches.length * 10, 30);
          reasons.push(`community topic matches: ${matches.slice(0, 3).join(", ")}`);
        }
        score += popularity(community.memberCount, 10, 20);
        if (Number(community.memberCount ?? 0) > 0) {
          reasons.push("active community membership");
        }

        return {
          recommendationType: "COMMUNITY",
          recommendationScore: capped(score),
          reason: reason(reasons),
          entity: {
            id: String(community._id),
            name: String(community.name),
            visibility: String(community.visibility),
            memberCount: Number(community.memberCount ?? 0),
          },
        } satisfies Recommendation;
      }),
    limit,
  );
}

async function recommendEvents(context: RecommendationContext, limit: number) {
  const now = new Date();
  const events = await EventModel.find({
    universityId: context.universityId,
    startDate: { $gte: now },
    status: { $in: ["OPEN", "ONGOING"] },
    ...deletedFilter,
  })
    .sort({ startDate: 1, registeredCount: -1 })
    .limit(limit * 5)
    .lean();

  return sortAndLimit(
    events
      .filter((event) =>
        canSeeTargetedResource(context, event as Record<string, unknown>),
      )
      .map((event) => {
        const typeMatches = overlap(context.eventTypes, [event.eventType]);
        const interestMatches = overlap(context.interests, [
          event.eventType,
          event.title,
        ]);
        const reasons: string[] = [];
        let score = 12;
        if (typeMatches.length || interestMatches.length) {
          score += 25;
          reasons.push(`matches event interest: ${String(event.eventType)}`);
        }
        if (
          Array.isArray(event.departmentIds) &&
          context.departmentId &&
          event.departmentIds.map(String).includes(context.departmentId)
        ) {
          score += 18;
          reasons.push("targets your department");
        } else if (
          Array.isArray(event.collegeIds) &&
          context.collegeId &&
          event.collegeIds.map(String).includes(context.collegeId)
        ) {
          score += 12;
          reasons.push("targets your college");
        }
        score += popularity(event.registeredCount ?? event.currentAttendees, 10, 15);

        return {
          recommendationType: "EVENT",
          recommendationScore: capped(score),
          reason: reason(reasons),
          entity: {
            id: String(event._id),
            title: String(event.title),
            eventType: String(event.eventType),
            startDate: serializeDate(event.startDate),
            venue: String(event.venue ?? ""),
            registeredCount: Number(event.registeredCount ?? 0),
          },
        } satisfies Recommendation;
      }),
    limit,
  );
}

async function recommendOpportunities(
  context: RecommendationContext,
  limit: number,
) {
  const opportunities = await OpportunityModel.find({
    universityId: context.universityId,
    status: "PUBLISHED",
    ...deletedFilter,
  })
    .sort({ viewCount: -1, applicationCount: -1, createdAt: -1 })
    .limit(limit * 5)
    .lean();

  return sortAndLimit(
    opportunities
      .filter(
        (opportunity) =>
          !context.appliedOpportunityIds.has(String(opportunity._id)) &&
          !context.savedOpportunityIds.has(String(opportunity._id)),
      )
      .map((opportunity) => {
        const skillMatches = overlap(context.skills, opportunity.skills);
        const industryMatches = overlap(context.interests, [
          opportunity.industry,
          opportunity.workType,
          opportunity.opportunityType,
        ]);
        const reasons: string[] = [];
        let score = 10;
        if (skillMatches.length) {
          score += Math.min(skillMatches.length * 15, 45);
          reasons.push(`matches skills: ${skillMatches.slice(0, 3).join(", ")}`);
        }
        if (industryMatches.length) {
          score += Math.min(industryMatches.length * 10, 25);
          reasons.push(
            `matches career interests: ${industryMatches.slice(0, 3).join(", ")}`,
          );
        }
        if (
          Array.isArray(opportunity.targetDepartments) &&
          context.departmentId &&
          opportunity.targetDepartments.map(String).includes(context.departmentId)
        ) {
          score += 15;
          reasons.push("targets your department");
        } else if (
          Array.isArray(opportunity.targetColleges) &&
          context.collegeId &&
          opportunity.targetColleges.map(String).includes(context.collegeId)
        ) {
          score += 10;
          reasons.push("targets your college");
        }
        score += popularity(opportunity.applicationCount, 10, 10);

        return {
          recommendationType: "OPPORTUNITY",
          recommendationScore: capped(score),
          reason: reason(reasons),
          entity: {
            id: String(opportunity._id),
            title: String(opportunity.title),
            employerId: String(opportunity.employerId),
            employerName:
              typeof opportunity.employerName === "string"
                ? opportunity.employerName
                : null,
            industry:
              typeof opportunity.industry === "string"
                ? opportunity.industry
                : null,
            workType: String(opportunity.workType ?? opportunity.opportunityType),
            applicationDeadline: serializeDate(
              opportunity.applicationDeadline ?? opportunity.deadlineAt,
            ),
          },
        } satisfies Recommendation;
      }),
    limit,
  );
}

async function recommendProducts(context: RecommendationContext, limit: number) {
  const roleVisibility = visibilityForRole(String(context.targetUser.role));
  const products = await ProductModel.find({
    universityId: context.universityId,
    ownerId: { $ne: String(context.targetUser._id) },
    status: "ACTIVE",
    visibility: { $in: ["ALL_USERS", roleVisibility, "PUBLIC", "UNIVERSITY"] },
    ...deletedFilter,
  })
    .sort({ viewCount: -1, favoriteCount: -1, orderRequestCount: -1 })
    .limit(limit * 5)
    .lean();

  return sortAndLimit(
    products.map((product) => {
      const categoryMatches = overlap(context.productCategories, [
        product.category,
      ]);
      const interestMatches = overlap(context.interests, [
        product.category,
        ...(Array.isArray(product.tags) ? product.tags : []),
      ]);
      const textMatches = textOverlap(context.interests, [
        product.title,
        product.name,
        product.description,
      ]);
      const reasons: string[] = [];
      let score = 8;
      if (categoryMatches.length) {
        score += 25;
        reasons.push(`matches marketplace category: ${categoryMatches[0]}`);
      }
      if (interestMatches.length || textMatches.length) {
        score += Math.min(
          (interestMatches.length + textMatches.length) * 8,
          24,
        );
        reasons.push("matches your interests");
      }
      score += popularity(product.viewCount, 25, 10);
      score += popularity(product.orderRequestCount, 5, 12);

      return {
        recommendationType: "MARKETPLACE_PRODUCT",
        recommendationScore: capped(score),
        reason: reason(reasons),
        entity: {
          id: String(product._id),
          title: String(product.title ?? product.name),
          category: String(product.category),
          productType: String(product.productType),
          price: Number(product.price ?? 0),
          currency: String(product.currency ?? "TZS"),
          shopId: String(product.shopId),
          sellerId: String(product.sellerId ?? product.ownerId),
        },
      } satisfies Recommendation;
    }),
    limit,
  );
}

async function recommendEmployers(context: RecommendationContext, limit: number) {
  const employers = await OpportunityModel.aggregate<Record<string, unknown>>([
    {
      $match: {
        universityId: context.universityId,
        status: "PUBLISHED",
        ...deletedFilter,
      },
    },
    {
      $group: {
        _id: "$employerId",
        employerName: { $first: "$employerName" },
        industries: { $addToSet: "$industry" },
        skills: { $addToSet: "$skills" },
        opportunityCount: { $sum: 1 },
        applicationCount: { $sum: "$applicationCount" },
      },
    },
    { $sort: { opportunityCount: -1 as const, applicationCount: -1 as const } },
    { $limit: limit * 5 },
    {
      $lookup: {
        from: "user",
        localField: "_id",
        foreignField: "_id",
        as: "employer",
      },
    },
    { $addFields: { employer: { $first: "$employer" } } },
  ]);

  return sortAndLimit(
    employers.map((employer) => {
      const skills = Array.isArray(employer.skills)
        ? employer.skills.flatMap((value) => (Array.isArray(value) ? value : []))
        : [];
      const skillMatches = overlap(context.skills, skills);
      const industryMatches = overlap(
        context.interests,
        Array.isArray(employer.industries) ? employer.industries : [],
      );
      const reasons: string[] = [];
      let score = 10;
      if (skillMatches.length) {
        score += Math.min(skillMatches.length * 12, 36);
        reasons.push(`hires for your skills: ${skillMatches.slice(0, 3).join(", ")}`);
      }
      if (industryMatches.length) {
        score += Math.min(industryMatches.length * 10, 30);
        reasons.push(
          `matches preferred industries: ${industryMatches.slice(0, 3).join(", ")}`,
        );
      }
      score += Math.min(Number(employer.opportunityCount ?? 0) * 4, 20);

      const employerUser = employer.employer as Record<string, unknown> | undefined;

      return {
        recommendationType: "EMPLOYER",
        recommendationScore: capped(score),
        reason: reason(reasons),
        entity: {
          id: String(employer._id),
          name:
            typeof employer.employerName === "string"
              ? employer.employerName
              : typeof employerUser?.name === "string"
                ? employerUser.name
                : null,
          email:
            typeof employerUser?.email === "string" ? employerUser.email : null,
          opportunityCount: Number(employer.opportunityCount ?? 0),
          applicationCount: Number(employer.applicationCount ?? 0),
          industries: Array.isArray(employer.industries)
            ? employer.industries.filter(Boolean).map(String)
            : [],
        },
      } satisfies Recommendation;
    }),
    limit,
  );
}

async function usersById(userIds: string[]) {
  if (!userIds.length) return new Map<string, Record<string, unknown>>();
  const users = await UserModel.find({ _id: { $in: userIds } }).lean();

  return new Map(
    users.map((user) => [String(user._id), user as Record<string, unknown>]),
  );
}

export async function getRecommendations(query: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  const { filters, context } = await buildRecommendationContext(actor, query);
  const requestedTypes =
    filters.type === "ALL"
      ? ([
          "PROJECT",
          "MENTOR",
          "COMMUNITY",
          "EVENT",
          "OPPORTUNITY",
          "MARKETPLACE_PRODUCT",
          "EMPLOYER",
        ] as const)
      : ([filters.type] as const);

  const recommendationTasks = requestedTypes.map(async (type) => {
    if (type === "PROJECT") {
      return [type, await recommendProjects(context, filters.limit)] as const;
    }
    if (type === "MENTOR") {
      return [type, await recommendMentors(context, filters.limit)] as const;
    }
    if (type === "COMMUNITY") {
      return [type, await recommendCommunities(context, filters.limit)] as const;
    }
    if (type === "EVENT") {
      return [type, await recommendEvents(context, filters.limit)] as const;
    }
    if (type === "OPPORTUNITY") {
      return [type, await recommendOpportunities(context, filters.limit)] as const;
    }
    if (type === "MARKETPLACE_PRODUCT") {
      return [type, await recommendProducts(context, filters.limit)] as const;
    }

    return [type, await recommendEmployers(context, filters.limit)] as const;
  });

  const grouped = Object.fromEntries(await Promise.all(recommendationTasks));
  const all = Object.values(grouped)
    .flat()
    .sort(
      (left, right) => right.recommendationScore - left.recommendationScore,
    );

  await writeAuditLog({
    actorId: actor.id,
    universityId: context.universityId,
    action: "RECOMMENDATIONS_VIEWED",
    entityType: "recommendations",
    entityId: String(context.targetUser._id),
    metadata: {
      type: filters.type,
      targetUserId: String(context.targetUser._id),
      limit: filters.limit,
      signals: {
        skills: context.skills.size,
        interests: context.interests.size,
        badges: context.badges.size,
        communities: context.communityIds.size,
      },
    },
  });

  return {
    filters: {
      type: filters.type,
      universityId: context.universityId,
      targetUserId: String(context.targetUser._id),
      limit: filters.limit,
    },
    matchingFactors: {
      skills: [...context.skills],
      interests: [...context.interests],
      departmentId: context.departmentId,
      collegeId: context.collegeId,
      universityId: context.universityId,
      badges: [...context.badges],
      communities: [...context.communityIds],
    },
    recommendations: {
      grouped,
      all: filters.type === "ALL" ? all.slice(0, filters.limit * 2) : all,
    },
  };
}
