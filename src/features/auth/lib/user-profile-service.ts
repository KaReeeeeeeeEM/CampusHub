import { calculateProfileCompletionPercentage } from "@/features/auth/lib/profile-completion";
import {
  userProfileUpdateSchema,
  type UserProfileUpdateInput,
} from "@/features/auth/lib/schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import { UserModel } from "@/lib/db/models";
import { notFound } from "@/lib/api/response";
import { ApiError } from "@/lib/errors/api-error";

function buildName(firstName?: string | null, lastName?: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

function serializeUser(user: Record<string, unknown>) {
  return {
    id: String(user._id),
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    otherNames: user.otherNames,
    nickname: user.nickname,
    avatar: user.avatar,
    phoneNumber: user.phoneNumber,
    role: user.role,
    position: user.position,
    status: user.status,
    isVerified: Boolean(user.isVerified ?? user.emailVerified),
    profileCompletionPercentage: user.profileCompletionPercentage,
    universityId: user.universityId,
    collegeId: user.collegeId,
    departmentId: user.departmentId,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function getAuthenticatedUserProfile() {
  const actor = await requireAuth();

  await connectMongo();

  const user = await UserModel.findById(actor.id).lean();

  if (!user) {
    throw notFound("User profile not found.");
  }

  return serializeUser(user);
}

export async function updateAuthenticatedUserProfile(
  input: UserProfileUpdateInput,
) {
  const actor = await requireAuth();
  const payload = userProfileUpdateSchema.parse(input);

  await connectMongo();

  const existing = await UserModel.findById(actor.id).lean();

  if (!existing) {
    throw notFound("User profile not found.");
  }

  if (payload.username && payload.username !== existing.username) {
    const duplicate = await UserModel.exists({
      _id: { $ne: actor.id },
      username: payload.username.toLowerCase(),
    });

    if (duplicate) {
      throw new ApiError({
        statusCode: 409,
        code: "USERNAME_TAKEN",
        message: "Username is already in use.",
      });
    }
  }

  const nextUser = {
    ...existing,
    ...payload,
    avatar: payload.avatar === undefined ? existing.avatar : payload.avatar,
    phoneNumber:
      payload.phoneNumber === undefined
        ? existing.phoneNumber
        : payload.phoneNumber,
  };
  const profileCompletionPercentage = calculateProfileCompletionPercentage({
    email: nextUser.email,
    username: nextUser.username,
    firstName: nextUser.firstName,
    lastName: nextUser.lastName,
    avatar: nextUser.avatar,
    phoneNumber: nextUser.phoneNumber,
    role: nextUser.role,
    position: nextUser.position,
    isVerified: Boolean(nextUser.isVerified ?? nextUser.emailVerified),
  });
  const name = buildName(
    String(nextUser.firstName ?? ""),
    String(nextUser.lastName ?? ""),
  );

  await UserModel.updateOne(
    { _id: actor.id },
    {
      $set: {
        ...payload,
        name: name || existing.name,
        image: nextUser.avatar ?? existing.image ?? null,
        phone: nextUser.phoneNumber ?? null,
        profileCompletionPercentage,
      },
    },
  );

  const updated = await UserModel.findById(actor.id).lean();

  if (!updated) {
    throw notFound("User profile not found.");
  }

  await writeAuditLog({
    actorId: actor.id,
    universityId: actor.universityId ?? null,
    action: "PROFILE_UPDATE",
    entityType: "user",
    entityId: actor.id,
    before: {
      username: existing.username,
      firstName: existing.firstName,
      lastName: existing.lastName,
      otherNames: existing.otherNames,
      nickname: existing.nickname,
      avatar: existing.avatar,
      phoneNumber: existing.phoneNumber,
      profileCompletionPercentage: existing.profileCompletionPercentage,
    },
    after: {
      username: updated.username,
      firstName: updated.firstName,
      lastName: updated.lastName,
      otherNames: updated.otherNames,
      nickname: updated.nickname,
      avatar: updated.avatar,
      phoneNumber: updated.phoneNumber,
      profileCompletionPercentage: updated.profileCompletionPercentage,
    },
  });

  return serializeUser(updated);
}
