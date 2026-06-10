export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  CAMPUS_ADMIN: "CAMPUS_ADMIN",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
  ALUMNI: "ALUMNI",
  EMPLOYER: "EMPLOYER"
} as const;

export type RoleKey = keyof typeof ROLES;

export const STUDENT_LEADERSHIP_POSITIONS = {
  REPRESENTATIVE: "REPRESENTATIVE",
  COMMITTEE_MEMBER: "COMMITTEE_MEMBER",
} as const;

export type StudentLeadershipPosition =
  keyof typeof STUDENT_LEADERSHIP_POSITIONS;

export const STUDENT_LEADERSHIP_LABELS: Record<
  StudentLeadershipPosition,
  string
> = {
  REPRESENTATIVE: "Student Representative",
  COMMITTEE_MEMBER: "Committee Member",
};

export const LEGACY_STUDENT_LEADERSHIP_ROLE_KEYS = [
  "REPRESENTATIVE",
  "COMMITTEE_MEMBER",
] as const;

export type LegacyStudentLeadershipRoleKey =
  (typeof LEGACY_STUDENT_LEADERSHIP_ROLE_KEYS)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  SUPER_ADMIN: "Super Admin",
  CAMPUS_ADMIN: "Campus Admin",
  TEACHER: "Teacher",
  STUDENT: "Student",
  ALUMNI: "Alumni",
  EMPLOYER: "Employer"
};

export const PLATFORM_ROLES: RoleKey[] = ["SUPER_ADMIN"];

export const TENANT_ROLES: RoleKey[] = [
  "CAMPUS_ADMIN",
  "TEACHER",
  "STUDENT",
  "ALUMNI",
  "EMPLOYER"
];

export function isRoleKey(value: unknown): value is RoleKey {
  return typeof value === "string" && value in ROLES;
}

export function isStudentLeadershipPosition(
  value: unknown,
): value is StudentLeadershipPosition {
  return typeof value === "string" && value in STUDENT_LEADERSHIP_POSITIONS;
}

export function isLegacyStudentLeadershipRoleKey(
  value: unknown,
): value is LegacyStudentLeadershipRoleKey {
  return (
    typeof value === "string" &&
    LEGACY_STUDENT_LEADERSHIP_ROLE_KEYS.includes(
      value as LegacyStudentLeadershipRoleKey,
    )
  );
}
