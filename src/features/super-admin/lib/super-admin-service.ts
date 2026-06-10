import { randomBytes, randomUUID } from "node:crypto";

import { headers } from "next/headers";

import type { RoleKey } from "@/features/authorization/roles";
import type {
  CampusAdminActivationInput,
  CampusAdminInvitationInput,
  UniversityInput,
} from "@/features/super-admin/lib/schemas";
import {
  campusAdminActivationSchema,
  campusAdminInvitationInputSchema,
  universityInputSchema,
} from "@/features/super-admin/lib/schemas";
import { auth, getAcquisitionSecret } from "@/lib/auth/auth";
import { connectMongo } from "@/lib/db/mongodb";
import {
  CampusAdminInvitationModel,
  EmployerApplicationModel,
  UniversityModel,
  UserModel,
} from "@/lib/db/models";
import { forbidden, unauthorized } from "@/lib/api/response";
import type { AuthSession } from "@/types/auth";

const campusAdminInvitationTtlMs = 1000 * 60 * 60 * 24;

export type SerializedUniversity = {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  description: string | null;
  logo: string | null;
  coverImage: string | null;
  country: string | null;
  region: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE" | "ONBOARDING";
  createdAt: string | null;
  updatedAt: string | null;
};

export type SerializedCampusAdminInvitation = {
  id: string;
  universityId: string;
  universityName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  expiresAt: string;
  status: "PENDING" | "SENT" | "ACCEPTED" | "EXPIRED" | "DISABLED";
  invitationUrl: string;
  createdAt: string | null;
};

function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function createToken() {
  return randomBytes(32).toString("base64url");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function getRoles(session: AuthSession) {
  return session.user.roles?.length
    ? session.user.roles
    : ([session.user.role].filter(Boolean) as RoleKey[]);
}

export async function requireSuperAdminSession() {
  const session = (await auth.api.getSession({
    headers: await headers(),
    query: {
      disableCookieCache: true,
    },
  })) as AuthSession | null;

  if (!session) {
    throw unauthorized();
  }

  if (!getRoles(session).includes("SUPER_ADMIN")) {
    throw forbidden("Super Admin access is required.");
  }

  return session;
}

function serializeUniversity(university: Record<string, unknown>) {
  return {
    id: String(university._id),
    name: String(university.name),
    shortName: (university.shortName as string | null) ?? null,
    slug: String(university.slug),
    description: (university.description as string | null) ?? null,
    logo:
      (university.logo as string | null) ??
      (university.logoUrl as string | null) ??
      null,
    coverImage: (university.coverImage as string | null) ?? null,
    country: (university.country as string | null) ?? null,
    region: (university.region as string | null) ?? null,
    website: (university.website as string | null) ?? null,
    email: (university.email as string | null) ?? null,
    phone: (university.phone as string | null) ?? null,
    status: (university.status as SerializedUniversity["status"]) ?? "ACTIVE",
    createdAt: serializeDate(university.createdAt),
    updatedAt: serializeDate(university.updatedAt),
  } satisfies SerializedUniversity;
}

function serializeInvitation(
  invitation: Record<string, unknown>,
  universityName: string,
) {
  const token = String(invitation.token);

  return {
    id: String(invitation._id),
    universityId: String(invitation.universityId),
    universityName,
    firstName: String(invitation.firstName),
    lastName: String(invitation.lastName),
    email: String(invitation.email),
    phone: (invitation.phone as string | null) ?? null,
    expiresAt:
      invitation.expiresAt instanceof Date
        ? invitation.expiresAt.toISOString()
        : new Date(String(invitation.expiresAt)).toISOString(),
    status:
      (invitation.status as SerializedCampusAdminInvitation["status"]) ??
      "PENDING",
    invitationUrl: new URL(
      `/campus-admin/activate/${token}`,
      getAppBaseUrl(),
    ).toString(),
    createdAt: serializeDate(invitation.createdAt),
  } satisfies SerializedCampusAdminInvitation;
}

export async function getSuperAdminDashboard() {
  await requireSuperAdminSession();
  await connectMongo();

  const [
    universitiesCount,
    campusAdminCount,
    studentsCount,
    employersCount,
    pendingEmployerApplicationsCount,
  ] = await Promise.all([
    UniversityModel.countDocuments(),
    UserModel.countDocuments({ roles: "CAMPUS_ADMIN" }),
    UserModel.countDocuments({ roles: "STUDENT" }),
    UserModel.countDocuments({ roles: "EMPLOYER" }),
    EmployerApplicationModel.countDocuments({ status: "PENDING" }),
  ]);

  return {
    stats: {
      universitiesCount,
      campusAdminCount,
      studentsCount,
      employersCount,
      pendingEmployerApplicationsCount,
    },
    checklist: [
      {
        label: "Create First University",
        complete: universitiesCount > 0,
        href: "/super-admin/universities",
      },
      {
        label: "Create First Campus Admin",
        complete: campusAdminCount > 0,
        href: "/super-admin/campus-admins",
      },
      {
        label: "Configure Platform Settings",
        complete: false,
        href: "/super-admin/settings",
      },
      {
        label: "Review Employer Applications",
        complete: pendingEmployerApplicationsCount === 0,
        href: "/super-admin/employer-applications",
      },
    ],
    hasUniversities: universitiesCount > 0,
  };
}

export async function getUniversities() {
  await requireSuperAdminSession();
  await connectMongo();

  const universities = await UniversityModel.find()
    .sort({ createdAt: -1 })
    .lean();

  return universities.map((university) =>
    serializeUniversity(university as Record<string, unknown>),
  );
}

export async function createUniversity(input: UniversityInput) {
  await requireSuperAdminSession();
  await connectMongo();

  const payload = universityInputSchema.parse(input);
  const slug = slugify(payload.slug || payload.name);
  const existing = await UniversityModel.findOne({ slug }).lean();

  if (existing) {
    throw new Error("A university with this slug already exists.");
  }

  const university = await UniversityModel.create({
    _id: randomUUID(),
    ...payload,
    slug,
    logo: payload.logo || null,
    logoUrl: payload.logo || null,
    coverImage: payload.coverImage || null,
    website: payload.website || null,
    email: payload.email || null,
    phone: payload.phone || null,
    domain: payload.website ? new URL(payload.website).hostname : null,
  });

  return serializeUniversity(university.toObject());
}

export async function updateUniversity(
  universityId: string,
  input: UniversityInput,
) {
  await requireSuperAdminSession();
  await connectMongo();

  const payload = universityInputSchema.parse(input);
  const slug = slugify(payload.slug || payload.name);
  const duplicate = await UniversityModel.findOne({
    _id: { $ne: universityId },
    slug,
  }).lean();

  if (duplicate) {
    throw new Error("A university with this slug already exists.");
  }

  const university = await UniversityModel.findByIdAndUpdate(
    universityId,
    {
      $set: {
        ...payload,
        slug,
        logo: payload.logo || null,
        logoUrl: payload.logo || null,
        coverImage: payload.coverImage || null,
        website: payload.website || null,
        email: payload.email || null,
        phone: payload.phone || null,
        domain: payload.website ? new URL(payload.website).hostname : null,
      },
    },
    { new: true },
  ).lean();

  if (!university) {
    throw new Error("University not found.");
  }

  return serializeUniversity(university as Record<string, unknown>);
}

export async function deactivateUniversity(universityId: string) {
  await requireSuperAdminSession();
  await connectMongo();

  const university = await UniversityModel.findByIdAndUpdate(
    universityId,
    { $set: { status: "INACTIVE" } },
    { new: true },
  ).lean();

  if (!university) {
    throw new Error("University not found.");
  }

  return serializeUniversity(university as Record<string, unknown>);
}

export async function getCampusAdminInvitations() {
  await requireSuperAdminSession();
  await connectMongo();

  const [invitations, universities] = await Promise.all([
    CampusAdminInvitationModel.find().sort({ createdAt: -1 }).lean(),
    UniversityModel.find().select({ name: 1 }).lean(),
  ]);

  const universityNames = new Map(
    universities.map((university) => [
      String(university._id),
      String(university.name),
    ]),
  );

  return invitations.map((invitation) =>
    serializeInvitation(
      invitation as Record<string, unknown>,
      universityNames.get(String(invitation.universityId)) ??
        "Unknown university",
    ),
  );
}

export async function createCampusAdminInvitation(
  input: CampusAdminInvitationInput,
) {
  const session = await requireSuperAdminSession();
  await connectMongo();

  const payload = campusAdminInvitationInputSchema.parse(input);
  const university = await UniversityModel.findById(
    payload.universityId,
  ).lean();

  if (!university) {
    throw new Error("Selected university does not exist.");
  }

  const token = createToken();
  const invitation = await CampusAdminInvitationModel.create({
    _id: randomUUID(),
    token,
    universityId: payload.universityId,
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email.toLowerCase(),
    phone: payload.phone || null,
    expiresAt: new Date(
      Date.now() + payload.expiresInDays * campusAdminInvitationTtlMs,
    ),
    status: "SENT",
    invitedByUserId: session.user.id,
    sentAt: new Date(),
  });

  const serialized = serializeInvitation(
    invitation.toObject(),
    String(university.name),
  );

  console.info("CampusHub campus admin invitation generated", {
    universityId: payload.universityId,
    email: payload.email,
    invitationUrl: serialized.invitationUrl,
  });

  return serialized;
}

export async function resolveCampusAdminActivation(token: string) {
  await connectMongo();

  const invitation = await CampusAdminInvitationModel.findOne({
    token,
    status: { $in: ["SENT", "PENDING"] },
  }).lean();

  if (!invitation) {
    return { status: "invalid" as const };
  }

  if (invitation.expiresAt.getTime() < Date.now()) {
    await CampusAdminInvitationModel.updateOne(
      { _id: invitation._id },
      { $set: { status: "EXPIRED" } },
    );

    return { status: "expired" as const, invitation };
  }

  const university = await UniversityModel.findById(
    invitation.universityId,
  ).lean();

  if (!university) {
    return { status: "invalid" as const };
  }

  return {
    status: "valid" as const,
    invitation,
    university: serializeUniversity(university as Record<string, unknown>),
  };
}

export async function activateCampusAdminAccount(
  input: CampusAdminActivationInput,
) {
  const payload = campusAdminActivationSchema.parse(input);
  const resolution = await resolveCampusAdminActivation(payload.token);

  if (resolution.status !== "valid") {
    return {
      ok: false as const,
      status: resolution.status,
    };
  }

  const existingUser = await UserModel.findOne({
    email: resolution.invitation.email,
  }).lean();

  if (existingUser) {
    throw new Error("A CampusHub account already exists for this email.");
  }

  const response = await auth.api.signUpEmail({
    body: {
      name: `${resolution.invitation.firstName} ${resolution.invitation.lastName}`,
      email: resolution.invitation.email,
      password: payload.password,
      callbackURL: "/verification-success",
      intendedRole: "CAMPUS_ADMIN",
      universityId: resolution.invitation.universityId,
      acquisitionSource: "CAMPUS_ADMIN_INVITATION",
      acquisitionToken: getAcquisitionSecret(),
    },
  });

  await CampusAdminInvitationModel.updateOne(
    { _id: resolution.invitation._id, acceptedAt: null },
    {
      $set: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    },
  );

  return {
    ok: true as const,
    userId: response.user.id,
  };
}
