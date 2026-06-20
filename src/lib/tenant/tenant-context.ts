import { headers } from "next/headers";

import { hasRole } from "@/features/authorization/rbac";
import { TENANT_HEADER } from "@/features/tenant/tenant-utils";
import { forbidden, notFound, unauthorized } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import { UniversityModel } from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

export type CurrentUniversity = {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  logo: string | null;
  description: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
};

function serializeUniversity(
  university: Record<string, unknown>,
): CurrentUniversity {
  return {
    id: String(university._id),
    name: String(university.name),
    shortName: (university.shortName as string | null) ?? null,
    slug: String(university.slug),
    logo:
      (university.logo as string | null) ??
      (university.logoUrl as string | null) ??
      null,
    description: (university.description as string | null) ?? null,
    website: (university.website as string | null) ?? null,
    email: (university.email as string | null) ?? null,
    phone: (university.phone as string | null) ?? null,
    status: (university.status as CurrentUniversity["status"]) ?? "PENDING",
  };
}

async function getRequestedUniversitySlug() {
  return (await headers()).get(TENANT_HEADER);
}

export async function validateUniversityAccess(
  universityId: string,
  actor?: AuthUser | null,
) {
  const user = actor ?? (await getCurrentUser());

  if (!user) {
    throw unauthorized();
  }

  if (hasRole(user.role, ["SUPER_ADMIN"], user.roles)) {
    return true;
  }

  if (user.universityId !== universityId) {
    throw forbidden("You do not have access to this university.");
  }

  return true;
}

export async function getCurrentUniversity() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  await connectMongo();

  const requestedSlug = await getRequestedUniversitySlug();
  const isSuperAdmin = hasRole(user.role, ["SUPER_ADMIN"], user.roles);

  if (isSuperAdmin && requestedSlug) {
    const university = await UniversityModel.findOne({
      slug: requestedSlug,
    }).lean();

    return university
      ? serializeUniversity(university as Record<string, unknown>)
      : null;
  }

  if (!user.universityId) {
    return null;
  }

  const university = await UniversityModel.findById(user.universityId).lean();

  if (!university) {
    return null;
  }

  await validateUniversityAccess(String(university._id), user);

  return serializeUniversity(university as Record<string, unknown>);
}

export async function requireUniversity() {
  const university = await getCurrentUniversity();

  if (!university) {
    throw notFound("University context was not resolved.");
  }

  if (university.status === "INACTIVE") {
    throw forbidden("This university is inactive.");
  }

  return university;
}
