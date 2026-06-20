import { randomUUID } from "node:crypto";

import { hasRole } from "@/features/authorization/rbac";
import {
  addCareerCertificationSchema,
  addCareerExperienceSchema,
  addCareerPortfolioLinkSchema,
  addCareerSkillSchema,
  careerProfileQuerySchema,
  createCareerProfileSchema,
  updateCareerProfileSchema,
  uploadCareerCvSchema,
} from "@/features/career/lib/career-profile-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import {
  BadgeModel,
  CareerProfileModel,
  ProjectModel,
  UserBadgeModel,
  UserXpProfileModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function requireUniversity(actor: AuthUser) {
  if (!actor.universityId) throw forbidden("University scope is required.");

  return actor.universityId;
}

function canOwnCareerProfile(actor: AuthUser) {
  return hasRole(actor.role, ["STUDENT", "ALUMNI"], actor.roles);
}

function canReadCareerProfile(
  actor: AuthUser,
  profile: Record<string, unknown>,
) {
  return (
    profile.userId === actor.id ||
    hasRole(
      actor.role,
      ["SUPER_ADMIN", "CAMPUS_ADMIN", "EMPLOYER"],
      actor.roles,
    )
  );
}

function calculateProfileStrength(profile: Record<string, unknown>) {
  let score = 0;
  if (profile.headline) score += 10;
  if (profile.bio) score += 15;
  if (Array.isArray(profile.skills) && profile.skills.length) score += 15;
  if (Array.isArray(profile.languages) && profile.languages.length) score += 5;
  if (Array.isArray(profile.certifications) && profile.certifications.length) {
    score += 10;
  }
  if (Array.isArray(profile.experience) && profile.experience.length)
    score += 15;
  if (Array.isArray(profile.education) && profile.education.length) score += 10;
  if (Array.isArray(profile.portfolioLinks) && profile.portfolioLinks.length) {
    score += 10;
  }
  if (profile.cvUrl) score += 10;

  return Math.min(score, 100);
}

function normalizeStringList(values: string[] = []) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function serializeCareerProfile(profile: Record<string, unknown>) {
  return {
    id: String(profile._id),
    universityId: String(profile.universityId),
    userId: String(profile.userId),
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

async function getProfileOrThrow(userId: string, actor: AuthUser) {
  const profile = await CareerProfileModel.findOne({
    userId,
    universityId: requireUniversity(actor),
    ...deletedFilter,
  }).lean();

  if (
    !profile ||
    !canReadCareerProfile(actor, profile as Record<string, unknown>)
  ) {
    throw notFound("Career profile not found.");
  }

  return profile;
}

async function getCareerProfileIntegrations(
  profile: Record<string, unknown>,
  query: unknown = {},
) {
  const filters = careerProfileQuerySchema.parse(query);
  const userId = String(profile.userId);
  const universityId = String(profile.universityId);
  const integrations: Record<string, unknown> = {};

  if (filters.includeProjects) {
    const projects = await ProjectModel.find({
      universityId,
      ownerId: userId,
      status: "PUBLISHED",
      visibility: { $in: ["PUBLIC", "UNIVERSITY", "COLLEGE", "DEPARTMENT"] },
      deletedAt: null,
    })
      .sort({ featured: -1, starCount: -1, updatedAt: -1 })
      .limit(12)
      .select(
        "_id title slug shortDescription category techStack coverImage projectUrl repositoryUrl starCount viewCount",
      )
      .lean();
    integrations.projects = projects.map((project) => ({
      id: String(project._id),
      title: String(project.title),
      slug: String(project.slug),
      shortDescription:
        typeof project.shortDescription === "string"
          ? project.shortDescription
          : null,
      category: String(project.category ?? ""),
      techStack: Array.isArray(project.techStack)
        ? project.techStack.map(String)
        : [],
      coverImage:
        typeof project.coverImage === "string" ? project.coverImage : null,
      projectUrl:
        typeof project.projectUrl === "string" ? project.projectUrl : null,
      repositoryUrl:
        typeof project.repositoryUrl === "string"
          ? project.repositoryUrl
          : null,
      starCount: Number(project.starCount ?? 0),
      viewCount: Number(project.viewCount ?? 0),
    }));
  }

  if (filters.includeBadges) {
    const userBadges = await UserBadgeModel.find({ universityId, userId })
      .sort({ earnedAt: -1 })
      .limit(24)
      .lean();
    const badgeIds = userBadges.map((badge) => String(badge.badgeId));
    const badges = await BadgeModel.find({ _id: { $in: badgeIds } }).lean();
    const badgeById = new Map(
      badges.map((badge) => [String(badge._id), badge]),
    );
    integrations.badges = userBadges.map((userBadge) => {
      const badge = badgeById.get(String(userBadge.badgeId));

      return {
        id: String(userBadge.badgeId),
        name: badge ? String(badge.name) : null,
        category: badge ? String(badge.category) : null,
        iconUrl:
          badge && typeof badge.iconUrl === "string" ? badge.iconUrl : null,
        earnedAt: serializeDate(userBadge.earnedAt),
        source: typeof userBadge.source === "string" ? userBadge.source : null,
      };
    });
  }

  if (filters.includeAchievements) {
    const xpProfile = await UserXpProfileModel.findOne({
      universityId,
      userId,
    }).lean();
    integrations.achievements = {
      totalXp: Number(xpProfile?.totalXp ?? 0),
      level: Number(xpProfile?.level ?? 1),
      rank: typeof xpProfile?.rank === "number" ? Number(xpProfile.rank) : null,
      weeklyXp: Number(xpProfile?.weeklyXp ?? 0),
      monthlyXp: Number(xpProfile?.monthlyXp ?? 0),
    };
  }

  return integrations;
}

async function updateProfileWithAudit(input: {
  actor: AuthUser;
  before: Record<string, unknown>;
  update: Record<string, unknown>;
  action:
    | "CAREER_PROFILE_UPDATED"
    | "CAREER_PROFILE_CV_UPLOADED"
    | "CAREER_PROFILE_SKILL_ADDED"
    | "CAREER_PROFILE_CERTIFICATION_ADDED"
    | "CAREER_PROFILE_EXPERIENCE_ADDED"
    | "CAREER_PROFILE_PORTFOLIO_LINK_ADDED";
}) {
  const merged = { ...input.before, ...input.update };
  input.update.profileStrength = calculateProfileStrength(merged);
  input.update.updatedById = input.actor.id;

  const updated = await CareerProfileModel.findOneAndUpdate(
    { _id: input.before._id, userId: input.actor.id, ...deletedFilter },
    { $set: input.update },
    { new: true },
  ).lean();
  if (!updated) throw notFound("Career profile not found.");

  await writeAuditLog({
    actorId: input.actor.id,
    universityId: requireUniversity(input.actor),
    action: input.action,
    entityType: "career_profile",
    entityId: String(input.before._id),
    before: serializeCareerProfile(input.before),
    after: serializeCareerProfile(updated as Record<string, unknown>),
  });

  return serializeCareerProfile(updated as Record<string, unknown>);
}

export async function createCareerProfile(input: unknown) {
  const actor = await requireAuth();
  if (!canOwnCareerProfile(actor)) {
    throw forbidden("Only students and alumni can create career profiles.");
  }
  await connectMongo();
  const universityId = requireUniversity(actor);
  const existing = await CareerProfileModel.findOne({
    userId: actor.id,
    ...deletedFilter,
  }).lean();
  if (existing) throw forbidden("Career profile already exists.");
  const payload = createCareerProfileSchema.parse(input);
  const profileData = {
    _id: randomUUID(),
    universityId,
    userId: actor.id,
    headline: payload.headline ?? null,
    bio: payload.bio ?? null,
    skills: normalizeStringList(payload.skills),
    languages: normalizeStringList(payload.languages),
    certifications: payload.certifications,
    experience: payload.experience,
    education: payload.education,
    portfolioLinks: payload.portfolioLinks,
    cvUrl: payload.cvUrl ?? null,
    availabilityStatus: payload.availabilityStatus,
    preferredWorkType: payload.preferredWorkType,
    preferredIndustries: normalizeStringList(payload.preferredIndustries),
    graduationYear: payload.graduationYear ?? null,
    createdById: actor.id,
  };
  const profile = await CareerProfileModel.create({
    ...profileData,
    profileStrength: calculateProfileStrength(profileData),
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "CAREER_PROFILE_CREATED",
    entityType: "career_profile",
    entityId: String(profile._id),
    after: serializeCareerProfile(profile.toObject()),
  });

  return serializeCareerProfile(profile.toObject());
}

export async function getMyCareerProfile(query: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  const profile = await getProfileOrThrow(actor.id, actor);

  return {
    profile: serializeCareerProfile(profile as Record<string, unknown>),
    integrations: await getCareerProfileIntegrations(
      profile as Record<string, unknown>,
      query,
    ),
  };
}

export async function getCareerProfileByUserId(
  userId: string,
  query: unknown = {},
) {
  const actor = await requireAuth();
  await connectMongo();
  const profile = await getProfileOrThrow(userId, actor);

  return {
    profile: serializeCareerProfile(profile as Record<string, unknown>),
    integrations: await getCareerProfileIntegrations(
      profile as Record<string, unknown>,
      query,
    ),
  };
}

export async function updateMyCareerProfile(input: unknown) {
  const actor = await requireAuth();
  if (!canOwnCareerProfile(actor)) {
    throw forbidden("Only students and alumni can update career profiles.");
  }
  await connectMongo();
  const before = await getProfileOrThrow(actor.id, actor);
  const payload = updateCareerProfileSchema.parse(input);
  const update: Record<string, unknown> = {};

  if (payload.headline !== undefined)
    update.headline = payload.headline ?? null;
  if (payload.bio !== undefined) update.bio = payload.bio ?? null;
  if (payload.skills !== undefined)
    update.skills = normalizeStringList(payload.skills);
  if (payload.languages !== undefined)
    update.languages = normalizeStringList(payload.languages);
  if (payload.certifications !== undefined)
    update.certifications = payload.certifications;
  if (payload.experience !== undefined) update.experience = payload.experience;
  if (payload.education !== undefined) update.education = payload.education;
  if (payload.portfolioLinks !== undefined)
    update.portfolioLinks = payload.portfolioLinks;
  if (payload.cvUrl !== undefined) update.cvUrl = payload.cvUrl ?? null;
  if (payload.availabilityStatus !== undefined)
    update.availabilityStatus = payload.availabilityStatus;
  if (payload.preferredWorkType !== undefined)
    update.preferredWorkType = payload.preferredWorkType;
  if (payload.preferredIndustries !== undefined) {
    update.preferredIndustries = normalizeStringList(
      payload.preferredIndustries,
    );
  }
  if (payload.graduationYear !== undefined) {
    update.graduationYear = payload.graduationYear ?? null;
  }

  return updateProfileWithAudit({
    actor,
    before: before as Record<string, unknown>,
    update,
    action: "CAREER_PROFILE_UPDATED",
  });
}

export async function uploadCareerCv(input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const before = await getProfileOrThrow(actor.id, actor);
  const payload = uploadCareerCvSchema.parse(input);

  return updateProfileWithAudit({
    actor,
    before: before as Record<string, unknown>,
    update: { cvUrl: payload.cvUrl },
    action: "CAREER_PROFILE_CV_UPLOADED",
  });
}

export async function addCareerSkill(input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const before = await getProfileOrThrow(actor.id, actor);
  const payload = addCareerSkillSchema.parse(input);
  const skills = normalizeStringList([
    ...(Array.isArray(before.skills) ? before.skills.map(String) : []),
    payload.skill,
  ]);

  return updateProfileWithAudit({
    actor,
    before: before as Record<string, unknown>,
    update: { skills },
    action: "CAREER_PROFILE_SKILL_ADDED",
  });
}

export async function addCareerCertification(input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const before = await getProfileOrThrow(actor.id, actor);
  const payload = addCareerCertificationSchema.parse(input);

  return updateProfileWithAudit({
    actor,
    before: before as Record<string, unknown>,
    update: {
      certifications: [
        ...(Array.isArray(before.certifications) ? before.certifications : []),
        payload.certification,
      ],
    },
    action: "CAREER_PROFILE_CERTIFICATION_ADDED",
  });
}

export async function addCareerExperience(input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const before = await getProfileOrThrow(actor.id, actor);
  const payload = addCareerExperienceSchema.parse(input);

  return updateProfileWithAudit({
    actor,
    before: before as Record<string, unknown>,
    update: {
      experience: [
        ...(Array.isArray(before.experience) ? before.experience : []),
        payload.experience,
      ],
    },
    action: "CAREER_PROFILE_EXPERIENCE_ADDED",
  });
}

export async function addCareerPortfolioLink(input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const before = await getProfileOrThrow(actor.id, actor);
  const payload = addCareerPortfolioLinkSchema.parse(input);

  return updateProfileWithAudit({
    actor,
    before: before as Record<string, unknown>,
    update: {
      portfolioLinks: [
        ...(Array.isArray(before.portfolioLinks) ? before.portfolioLinks : []),
        payload.portfolioLink,
      ],
    },
    action: "CAREER_PROFILE_PORTFOLIO_LINK_ADDED",
  });
}
