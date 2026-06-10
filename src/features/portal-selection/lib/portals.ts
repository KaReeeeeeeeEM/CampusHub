import {
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import type { RoleKey } from "@/features/authorization/roles";

export type PortalKey =
  | "student"
  | "teacher"
  | "campus-admin"
  | "alumni"
  | "employer";

export const PORTAL_KEYS = [
  "student",
  "teacher",
  "campus-admin",
  "alumni",
  "employer",
] as const satisfies PortalKey[];

export type PortalDefinition = {
  key: PortalKey;
  title: string;
  roleLabel: string;
  description: string;
  href: string;
  requiredRoles: RoleKey[];
  capabilities: string[];
  icon: React.ComponentType<{ className?: string }>;
};

export const portalDefinitions: PortalDefinition[] = [
  {
    key: "student",
    title: "Student",
    roleLabel: "Student",
    description:
      "Access academic life, campus engagement, leadership workspaces, opportunities, and student services.",
    href: "/student",
    requiredRoles: ["STUDENT"],
    capabilities: ["Academic profile", "Campus updates", "Opportunities"],
    icon: GraduationCap,
  },
  {
    key: "teacher",
    title: "Teacher",
    roleLabel: "Teacher",
    description:
      "Prepare academic staff workflows for departments, courses, students, and campus engagement.",
    href: "/portal/teacher",
    requiredRoles: ["TEACHER"],
    capabilities: [
      "Course context",
      "Department profile",
      "Student engagement",
    ],
    icon: UserRoundCheck,
  },
  {
    key: "campus-admin",
    title: "Campus Admin",
    roleLabel: "Campus Admin",
    description:
      "Manage institutional operations, tenant settings, user access, and governance workflows.",
    href: "/campus-admin/dashboard",
    requiredRoles: ["CAMPUS_ADMIN", "SUPER_ADMIN"],
    capabilities: [
      "Tenant governance",
      "User oversight",
      "Institution settings",
    ],
    icon: ShieldCheck,
  },
  {
    key: "alumni",
    title: "Alumni",
    roleLabel: "Alumni",
    description:
      "Reconnect with your university, mentor students, discover opportunities, and grow your network.",
    href: "/portal/alumni",
    requiredRoles: ["ALUMNI"],
    capabilities: ["Mentorship", "Career network", "Alumni community"],
    icon: Building2,
  },
  {
    key: "employer",
    title: "Employer",
    roleLabel: "Employer",
    description:
      "Build university partnerships, access talent pools, and prepare recruiting workflows.",
    href: "/portal/employer",
    requiredRoles: ["EMPLOYER"],
    capabilities: ["Talent pipeline", "Campus recruiting", "Company profile"],
    icon: BriefcaseBusiness,
  },
];

export function isPortalKey(value: unknown): value is PortalKey {
  return typeof value === "string" && PORTAL_KEYS.includes(value as PortalKey);
}

export function getPortalByKey(key: PortalKey | null | undefined) {
  if (!key) {
    return null;
  }

  return portalDefinitions.find((portal) => portal.key === key) ?? null;
}

export function canAccessPortal(
  userRoles: RoleKey[],
  portal: PortalDefinition,
) {
  return portal.requiredRoles.some((role) =>
    userRoles.includes(role),
  );
}
