import { randomUUID } from "node:crypto";

import { hasRole } from "@/features/authorization/rbac";
import { createSystemNotification } from "@/features/notifications/lib/notification-engine";
import {
  contactCandidateSchema,
  savedCandidateQuerySchema,
  saveCandidateSchema,
  talentDiscoveryQuerySchema,
} from "@/features/career/lib/talent-discovery-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import {
  BadgeModel,
  CareerProfileModel,
  CareerProfileViewModel,
  ProjectModel,
  SavedCandidateModel,
  UserBadgeModel,
  UserModel,
  UserXpProfileModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function assertCanDiscoverTalent(actor: AuthUser) {
  if (
    !hasRole(
      actor.role,
      ["EMPLOYER", "SUPER_ADMIN", "CAMPUS_ADMIN"],
      actor.roles,
    )
  ) {
    throw forbidden("Employer talent discovery access is required.");
  }
}

function assertCanSaveOrContact(actor: AuthUser) {
  if (!hasRole(actor.role, ["EMPLOYER"], actor.roles)) {
    throw forbidden("Only employers can save or contact candidates.");
  }
}

function resolveUniversityScope(
  actor: AuthUser,
  requestedUniversityId?: string,
) {
  if (hasRole(actor.role, ["SUPER_ADMIN", "EMPLOYER"], actor.roles)) {
    return requestedUniversityId ?? actor.universityId ?? null;
  }

  if (!actor.universityId) throw forbidden("University scope is required.");
  if (requestedUniversityId && requestedUniversityId !== actor.universityId) {
    throw forbidden("Cannot discover talent in another university.");
  }

  return actor.universityId;
}

function intersect(
  current: Set<string> | null,
  nextValues: Iterable<string>,
): Set<string> {
  const next = new Set(nextValues);
  if (!current) return next;

  return new Set([...current].filter((value) => next.has(value)));
}

function hasAnyDiscoveryFilter(input: unknown[] | string | undefined) {
  return Array.isArray(input) ? input.length > 0 : Boolean(input);
}

function serializeUser(user: Record<string, unknown> | undefined) {
  if (!user) return null;

  return {
    id: String(user._id),
    name: String(user.name ?? ""),
    username: typeof user.username === "string" ? user.username : null,
    firstName: typeof user.firstName === "string" ? user.firstName : null,
    lastName: typeof user.lastName === "string" ? user.lastName : null,
    avatar:
      typeof user.avatar === "string"
        ? user.avatar
        : typeof user.image === "string"
          ? user.image
          : null,
    role: String(user.role ?? "STUDENT"),
    universityId:
      typeof user.universityId === "string" ? user.universityId : null,
    collegeId: typeof user.collegeId === "string" ? user.collegeId : null,
    departmentId:
      typeof user.departmentId === "string" ? user.departmentId : null,
  };
}

function serializeProfile(profile: Record<string, unknown>) {
  return {
    id: String(profile._id),
    userId: String(profile.userId),
    universityId: String(profile.universityId),
    headline: typeof profile.headline === "string" ? profile.headline : null,
    bio: typeof profile.bio === "string" ? profile.bio : null,
    skills: Array.isArray(profile.skills) ? profile.skills.map(String) : [],
    languages: Array.isArray(profile.languages)
      ? profile.languages.map(String)
      : [],
    certifications: Array.isArray(profile.certifications)
      ? profile.certifications
      : [],
    experience: Array.isArray(profile.experience) ? profile.experience : [],
    education: Array.isArray(profile.education) ? profile.education : [],
    portfolioLinks: Array.isArray(profile.portfolioLinks)
      ? profile.portfolioLinks
      : [],
    cvUrl: typeof profile.cvUrl === "string" ? profile.cvUrl : null,
    availabilityStatus: String(profile.availabilityStatus ?? "OPEN"),
    preferredWorkType: Array.isArray(profile.preferredWorkType)
      ? profile.preferredWorkType.map(String)
      : [],
    preferredIndustries: Array.isArray(profile.preferredIndustries)
      ? profile.preferredIndustries.map(String)
      : [],
    graduationYear:
      typeof profile.graduationYear === "number"
        ? Number(profile.graduationYear)
        : null,
    profileStrength: Number(profile.profileStrength ?? 0),
    profileViewCount: Number(profile.profileViewCount ?? 0),
    employerViewCount: Number(profile.employerViewCount ?? 0),
    savedCount: Number(profile.savedCount ?? 0),
    contactCount: Number(profile.contactCount ?? 0),
    createdAt: serializeDate(profile.createdAt),
    updatedAt: serializeDate(profile.updatedAt),
  };
}

function serializeProject(project: Record<string, unknown>) {
  return {
    id: String(project._id),
    title: String(project.title ?? ""),
    slug: String(project.slug ?? ""),
    category: String(project.category ?? ""),
    shortDescription:
      typeof project.shortDescription === "string"
        ? project.shortDescription
        : null,
    techStack: Array.isArray(project.techStack)
      ? project.techStack.map(String)
      : [],
    skills: Array.isArray(project.skills) ? project.skills.map(String) : [],
    starCount: Number(project.starCount ?? 0),
    viewCount: Number(project.viewCount ?? 0),
  };
}

async function getCandidateUserIds(input: {
  universityId: string | null;
  collegeId?: string;
  departmentId?: string;
}) {
  const userFilter: Record<string, unknown> = {
    status: "ACTIVE",
    ...deletedFilter,
    $or: [
      { role: { $in: ["STUDENT", "ALUMNI"] } },
      { roles: { $in: ["STUDENT", "ALUMNI"] } },
    ],
  };
  if (input.universityId) userFilter.universityId = input.universityId;
  if (input.collegeId) userFilter.collegeId = input.collegeId;
  if (input.departmentId) userFilter.departmentId = input.departmentId;

  const users = await UserModel.find(userFilter).select("_id").lean();

  return new Set(users.map((user) => String(user._id)));
}

async function getProjectMatchedUserIds(input: {
  universityId: string | null;
  candidateUserIds: Set<string>;
  projectSkills: string[];
  projectCategories: string[];
  projectQuery: string;
}) {
  if (
    !hasAnyDiscoveryFilter(input.projectSkills) &&
    !hasAnyDiscoveryFilter(input.projectCategories) &&
    !input.projectQuery
  ) {
    return null;
  }

  const projectFilter: Record<string, unknown> = {
    ownerId: { $in: [...input.candidateUserIds] },
    status: "PUBLISHED",
    ...deletedFilter,
  };
  if (input.universityId) projectFilter.universityId = input.universityId;
  if (input.projectSkills.length) {
    projectFilter.$or = [
      { skills: { $in: input.projectSkills } },
      { techStack: { $in: input.projectSkills } },
    ];
  }
  if (input.projectCategories.length) {
    projectFilter.category = { $in: input.projectCategories };
  }
  if (input.projectQuery) projectFilter.$text = { $search: input.projectQuery };

  const projects = await ProjectModel.find(projectFilter)
    .select("ownerId")
    .lean();

  return new Set(projects.map((project) => String(project.ownerId)));
}

async function getBadgeMatchedUserIds(input: {
  universityId: string | null;
  candidateUserIds: Set<string>;
  badgeIds: string[];
  badgeCategories: string[];
}) {
  if (!input.badgeIds.length && !input.badgeCategories.length) return null;

  let badgeIds = input.badgeIds;
  if (input.badgeCategories.length) {
    const badges = await BadgeModel.find({
      category: { $in: input.badgeCategories },
      status: "ACTIVE",
    })
      .select("_id")
      .lean();
    badgeIds = [
      ...new Set([...badgeIds, ...badges.map((badge) => String(badge._id))]),
    ];
  }
  if (!badgeIds.length) return new Set<string>();

  const badgeFilter: Record<string, unknown> = {
    userId: { $in: [...input.candidateUserIds] },
    badgeId: { $in: badgeIds },
  };
  if (input.universityId) badgeFilter.universityId = input.universityId;

  const userBadges = await UserBadgeModel.find(badgeFilter)
    .select("userId")
    .lean();

  return new Set(userBadges.map((badge) => String(badge.userId)));
}

async function getAchievementMatchedUserIds(input: {
  universityId: string | null;
  candidateUserIds: Set<string>;
  minXp?: number;
  minLevel?: number;
}) {
  if (input.minXp === undefined && input.minLevel === undefined) return null;

  const xpFilter: Record<string, unknown> = {
    userId: { $in: [...input.candidateUserIds] },
  };
  if (input.universityId) xpFilter.universityId = input.universityId;
  if (input.minXp !== undefined) xpFilter.totalXp = { $gte: input.minXp };
  if (input.minLevel !== undefined) xpFilter.level = { $gte: input.minLevel };

  const xpProfiles = await UserXpProfileModel.find(xpFilter)
    .select("userId")
    .lean();

  return new Set(xpProfiles.map((profile) => String(profile.userId)));
}

async function getProfileDecorations(userIds: string[], employerId: string) {
  const [users, projects, badges, xpProfiles, savedCandidates] =
    await Promise.all([
      UserModel.find({ _id: { $in: userIds } })
        .select(
          "_id name username firstName lastName avatar image role roles universityId collegeId departmentId",
        )
        .lean(),
      ProjectModel.find({
        ownerId: { $in: userIds },
        status: "PUBLISHED",
        ...deletedFilter,
      })
        .sort({ featured: -1, starCount: -1, viewCount: -1 })
        .limit(Math.max(userIds.length * 3, 12))
        .select(
          "_id ownerId title slug shortDescription category techStack skills starCount viewCount",
        )
        .lean(),
      UserBadgeModel.find({ userId: { $in: userIds } })
        .sort({ earnedAt: -1 })
        .limit(Math.max(userIds.length * 4, 16))
        .lean(),
      UserXpProfileModel.find({ userId: { $in: userIds } }).lean(),
      SavedCandidateModel.find({
        savedById: employerId,
        candidateUserId: { $in: userIds },
        status: "ACTIVE",
      }).lean(),
    ]);
  const badgeIds = badges.map((badge) => String(badge.badgeId));
  const badgeRecords = await BadgeModel.find({ _id: { $in: badgeIds } }).lean();
  const badgeById = new Map(
    badgeRecords.map((badge) => [String(badge._id), badge]),
  );

  return {
    userById: new Map(users.map((user) => [String(user._id), user])),
    projectsByUserId: projects.reduce((map, project) => {
      const ownerId = String(project.ownerId);
      const items = map.get(ownerId) ?? [];
      items.push(serializeProject(project as Record<string, unknown>));
      map.set(ownerId, items);

      return map;
    }, new Map<string, ReturnType<typeof serializeProject>[]>()),
    badgesByUserId: badges.reduce((map, userBadge) => {
      const userId = String(userBadge.userId);
      const badge = badgeById.get(String(userBadge.badgeId));
      const items = map.get(userId) ?? [];
      items.push({
        id: String(userBadge.badgeId),
        name: badge ? String(badge.name) : null,
        category: badge ? String(badge.category) : null,
        iconUrl:
          badge && typeof badge.iconUrl === "string" ? badge.iconUrl : null,
        earnedAt: serializeDate(userBadge.earnedAt),
      });
      map.set(userId, items);

      return map;
    }, new Map<string, Array<Record<string, unknown>>>()),
    xpByUserId: new Map(
      xpProfiles.map((profile) => [String(profile.userId), profile]),
    ),
    savedByUserId: new Map(
      savedCandidates.map((saved) => [String(saved.candidateUserId), saved]),
    ),
  };
}

export async function searchTalent(input: unknown = {}) {
  const actor = await requireAuth();
  assertCanDiscoverTalent(actor);
  await connectMongo();
  const filters = talentDiscoveryQuerySchema.parse(input);
  const universityId = resolveUniversityScope(actor, filters.universityId);
  let candidateUserIds: Set<string> | null = await getCandidateUserIds({
    universityId,
    collegeId: filters.collegeId,
    departmentId: filters.departmentId,
  });

  const projectMatched = await getProjectMatchedUserIds({
    universityId,
    candidateUserIds,
    projectSkills: filters.projectSkills,
    projectCategories: filters.projectCategories,
    projectQuery: filters.projectQuery,
  });
  if (projectMatched)
    candidateUserIds = intersect(candidateUserIds, projectMatched);

  const badgeMatched = await getBadgeMatchedUserIds({
    universityId,
    candidateUserIds,
    badgeIds: filters.badgeIds,
    badgeCategories: filters.badgeCategories,
  });
  if (badgeMatched)
    candidateUserIds = intersect(candidateUserIds, badgeMatched);

  const achievementMatched = await getAchievementMatchedUserIds({
    universityId,
    candidateUserIds,
    minXp: filters.minXp,
    minLevel: filters.minLevel,
  });
  if (achievementMatched) {
    candidateUserIds = intersect(candidateUserIds, achievementMatched);
  }

  const profileFilter: Record<string, unknown> = {
    userId: { $in: [...candidateUserIds] },
    ...deletedFilter,
  };
  if (universityId) profileFilter.universityId = universityId;
  if (filters.skills.length) profileFilter.skills = { $all: filters.skills };
  if (filters.availabilityStatus) {
    profileFilter.availabilityStatus = filters.availabilityStatus;
  }
  if (filters.preferredWorkType) {
    profileFilter.preferredWorkType = filters.preferredWorkType;
  }
  if (filters.graduationYear)
    profileFilter.graduationYear = filters.graduationYear;
  if (filters.minExperienceCount !== undefined) {
    profileFilter.$expr = {
      $gte: [
        { $size: { $ifNull: ["$experience", []] } },
        filters.minExperienceCount,
      ],
    };
  }
  if (filters.q) profileFilter.$text = { $search: filters.q };
  if (filters.cursor)
    profileFilter.createdAt = { $lt: new Date(filters.cursor) };

  const profiles = await CareerProfileModel.find(profileFilter)
    .sort({ profileStrength: -1, employerViewCount: -1, updatedAt: -1 })
    .limit(filters.limit)
    .lean();
  const userIds = profiles.map((profile) => String(profile.userId));
  const decorations = await getProfileDecorations(userIds, actor.id);

  await writeAuditLog({
    actorId: actor.id,
    universityId: universityId ?? actor.universityId ?? null,
    action: "TALENT_DISCOVERY_SEARCHED",
    entityType: "talent_discovery",
    entityId: null,
    metadata: {
      filters,
      resultCount: profiles.length,
    },
  });

  return {
    candidates: profiles.map((profile) => {
      const userId = String(profile.userId);
      const xp = decorations.xpByUserId.get(userId);
      const saved = decorations.savedByUserId.get(userId);

      return {
        user: serializeUser(
          decorations.userById.get(userId) as
            | Record<string, unknown>
            | undefined,
        ),
        profile: serializeProfile(profile as Record<string, unknown>),
        projects: decorations.projectsByUserId.get(userId) ?? [],
        badges: decorations.badgesByUserId.get(userId) ?? [],
        achievements: {
          totalXp: Number(xp?.totalXp ?? 0),
          level: Number(xp?.level ?? 1),
          rank: typeof xp?.rank === "number" ? Number(xp.rank) : null,
        },
        saved: Boolean(saved),
        savedCandidateId: saved ? String(saved._id) : null,
      };
    }),
    nextCursor:
      profiles.length === filters.limit
        ? serializeDate(profiles[profiles.length - 1]?.createdAt)
        : null,
  };
}

async function findCandidateProfile(userId: string, actor: AuthUser) {
  const profile = await CareerProfileModel.findOne({
    userId,
    ...deletedFilter,
  }).lean();
  if (!profile) throw notFound("Career profile not found.");

  if (
    !hasRole(actor.role, ["EMPLOYER", "SUPER_ADMIN"], actor.roles) &&
    profile.universityId !== actor.universityId
  ) {
    throw notFound("Career profile not found.");
  }

  return profile;
}

async function trackProfileView(
  profile: Record<string, unknown>,
  actor: AuthUser,
  source: string,
) {
  const viewerType =
    actor.id === profile.userId
      ? "SELF"
      : actor.role === "EMPLOYER"
        ? "EMPLOYER"
        : hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles)
          ? "ADMIN"
          : "OTHER";

  if (viewerType === "SELF") return;

  await Promise.all([
    CareerProfileViewModel.create({
      _id: randomUUID(),
      universityId: profile.universityId,
      profileId: profile._id,
      profileUserId: profile.userId,
      viewerId: actor.id,
      viewerRole: actor.role,
      viewerType,
      viewedAt: new Date(),
      source,
    }),
    CareerProfileModel.updateOne(
      { _id: profile._id },
      {
        $inc: {
          profileViewCount: 1,
          employerViewCount: viewerType === "EMPLOYER" ? 1 : 0,
        },
      },
    ),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(profile.universityId),
      action: "TALENT_PROFILE_VIEWED",
      entityType: "career_profile",
      entityId: String(profile._id),
      metadata: {
        profileUserId: profile.userId,
        viewerType,
        source,
      },
    }),
  ]);
}

export async function getTalentProfile(userId: string) {
  const actor = await requireAuth();
  assertCanDiscoverTalent(actor);
  await connectMongo();
  const profile = await findCandidateProfile(userId, actor);
  await trackProfileView(profile as Record<string, unknown>, actor, "DETAIL");

  const decorations = await getProfileDecorations([userId], actor.id);
  const user = decorations.userById.get(userId);
  if (!user) throw notFound("Candidate not found.");
  const xp = decorations.xpByUserId.get(userId);
  const saved = decorations.savedByUserId.get(userId);

  return {
    user: serializeUser(user as Record<string, unknown>),
    profile: serializeProfile(profile as Record<string, unknown>),
    projects: decorations.projectsByUserId.get(userId) ?? [],
    badges: decorations.badgesByUserId.get(userId) ?? [],
    achievements: {
      totalXp: Number(xp?.totalXp ?? 0),
      level: Number(xp?.level ?? 1),
      rank: typeof xp?.rank === "number" ? Number(xp.rank) : null,
    },
    saved: Boolean(saved),
    savedCandidateId: saved ? String(saved._id) : null,
  };
}

export async function saveCandidate(input: unknown) {
  const actor = await requireAuth();
  assertCanSaveOrContact(actor);
  await connectMongo();
  const payload = saveCandidateSchema.parse(input);
  const profile = await findCandidateProfile(payload.candidateUserId, actor);
  const id = `saved-candidate:${actor.id}:${payload.candidateUserId}:${
    payload.opportunityId ?? "general"
  }`;

  try {
    const saved = await SavedCandidateModel.create({
      _id: id,
      universityId: profile.universityId,
      savedById: actor.id,
      candidateUserId: payload.candidateUserId,
      opportunityId: payload.opportunityId ?? null,
      notes: payload.notes ?? null,
      status: "ACTIVE",
    });
    await CareerProfileModel.updateOne(
      { _id: profile._id },
      { $inc: { savedCount: 1 } },
    );
    await writeAuditLog({
      actorId: actor.id,
      universityId: String(profile.universityId),
      action: "CANDIDATE_SAVED",
      entityType: "saved_candidate",
      entityId: String(saved._id),
      metadata: {
        candidateUserId: payload.candidateUserId,
        opportunityId: payload.opportunityId ?? null,
      },
    });

    return { saved: true, duplicate: false, id: String(saved._id) };
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === 11000
    ) {
      await SavedCandidateModel.updateOne(
        { _id: id },
        {
          $set: {
            status: "ACTIVE",
            notes: payload.notes ?? null,
          },
        },
      );

      return { saved: true, duplicate: true, id };
    }

    throw error;
  }
}

export async function unsaveCandidate(candidateUserId: string) {
  const actor = await requireAuth();
  assertCanSaveOrContact(actor);
  await connectMongo();
  const saved = await SavedCandidateModel.findOneAndUpdate(
    {
      savedById: actor.id,
      candidateUserId,
      status: "ACTIVE",
    },
    { $set: { status: "ARCHIVED" } },
    { new: true },
  ).lean();
  if (!saved) throw notFound("Saved candidate not found.");
  await CareerProfileModel.updateOne(
    { userId: candidateUserId },
    { $inc: { savedCount: -1 } },
  );
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(saved.universityId),
    action: "CANDIDATE_UNSAVED",
    entityType: "saved_candidate",
    entityId: String(saved._id),
    metadata: { candidateUserId },
  });

  return { saved: false, archived: true };
}

export async function listSavedCandidates(input: unknown = {}) {
  const actor = await requireAuth();
  assertCanSaveOrContact(actor);
  await connectMongo();
  const filters = savedCandidateQuerySchema.parse(input);
  const savedFilter: Record<string, unknown> = {
    savedById: actor.id,
  };
  if (filters.status) savedFilter.status = filters.status;
  else savedFilter.status = "ACTIVE";
  if (filters.opportunityId) savedFilter.opportunityId = filters.opportunityId;
  if (filters.cursor) savedFilter.createdAt = { $lt: new Date(filters.cursor) };

  const saved = await SavedCandidateModel.find(savedFilter)
    .sort({ createdAt: -1 })
    .limit(filters.limit)
    .lean();
  const userIds = saved.map((item) => String(item.candidateUserId));
  const profiles = await CareerProfileModel.find({
    userId: { $in: userIds },
    ...deletedFilter,
  }).lean();
  const profileByUserId = new Map(
    profiles.map((profile) => [String(profile.userId), profile]),
  );
  const decorations = await getProfileDecorations(userIds, actor.id);

  return {
    candidates: saved
      .map((item) => {
        const userId = String(item.candidateUserId);
        const profile = profileByUserId.get(userId);
        if (!profile) return null;
        const user = decorations.userById.get(userId);
        const xp = decorations.xpByUserId.get(userId);

        return {
          id: String(item._id),
          notes: typeof item.notes === "string" ? item.notes : null,
          opportunityId:
            typeof item.opportunityId === "string" ? item.opportunityId : null,
          status: String(item.status),
          savedAt: serializeDate(item.createdAt),
          user: serializeUser(user as Record<string, unknown> | undefined),
          profile: serializeProfile(profile as Record<string, unknown>),
          projects: decorations.projectsByUserId.get(userId) ?? [],
          badges: decorations.badgesByUserId.get(userId) ?? [],
          achievements: {
            totalXp: Number(xp?.totalXp ?? 0),
            level: Number(xp?.level ?? 1),
            rank: typeof xp?.rank === "number" ? Number(xp.rank) : null,
          },
        };
      })
      .filter(Boolean),
    nextCursor:
      saved.length === filters.limit
        ? serializeDate(saved[saved.length - 1]?.createdAt)
        : null,
  };
}

export async function contactCandidate(userId: string, input: unknown) {
  const actor = await requireAuth();
  assertCanSaveOrContact(actor);
  await connectMongo();
  const payload = contactCandidateSchema.parse(input);
  const profile = await findCandidateProfile(userId, actor);

  await Promise.all([
    createSystemNotification({
      target: { recipientId: userId },
      senderId: actor.id,
      type: "OPPORTUNITY",
      title: payload.subject,
      message: payload.message,
      entityType: "career_profile",
      entityId: String(profile._id),
      actionUrl: "/student/career",
      priority: "HIGH",
      metadata: {
        opportunityId: payload.opportunityId ?? null,
        contactEmail: payload.contactEmail ?? actor.email,
        employerId: actor.id,
      },
    }),
    CareerProfileModel.updateOne(
      { _id: profile._id },
      { $inc: { contactCount: 1 } },
    ),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(profile.universityId),
      action: "CANDIDATE_CONTACTED",
      entityType: "career_profile",
      entityId: String(profile._id),
      metadata: {
        candidateUserId: userId,
        opportunityId: payload.opportunityId ?? null,
      },
    }),
  ]);

  return { contacted: true };
}
