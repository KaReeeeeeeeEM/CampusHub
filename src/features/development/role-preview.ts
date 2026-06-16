import {
  ROLE_LABELS,
  ROLES,
  STUDENT_LEADERSHIP_LABELS,
  type RoleKey,
  type StudentLeadershipPosition,
  isRoleKey,
  isStudentLeadershipPosition,
} from "@/features/authorization/roles";

export const DEV_ROLE_PREVIEW_COOKIE = "campushub-dev-role-preview";

export type RolePreviewKey = RoleKey | StudentLeadershipPosition;

export const rolePreviewLabels: Record<RolePreviewKey, string> = {
  ...ROLE_LABELS,
  ...STUDENT_LEADERSHIP_LABELS,
};

export const rolePreviewDestinations: Record<RolePreviewKey, string> = {
  SUPER_ADMIN: "/super-admin/dashboard",
  CAMPUS_ADMIN: "/campus-admin/dashboard",
  REPRESENTATIVE: "/student/dashboard",
  COMMITTEE_MEMBER: "/student/dashboard",
  TEACHER: "/portal/teacher",
  STUDENT: "/student/dashboard",
  ALUMNI: "/portal/alumni",
  EMPLOYER: "/portal/employer",
};

export const rolePreviewKeys = [
  ...Object.values(ROLES),
  "REPRESENTATIVE",
  "COMMITTEE_MEMBER",
] as const satisfies RolePreviewKey[];

export function isRolePreviewKey(value: unknown): value is RolePreviewKey {
  return isRoleKey(value) || isStudentLeadershipPosition(value);
}

export function getRolePreviewDestination(role: RolePreviewKey) {
  return rolePreviewDestinations[role];
}
