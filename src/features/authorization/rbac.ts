import {
  ROLE_PERMISSIONS,
  STUDENT_LEADERSHIP_PERMISSIONS,
  type Permission,
} from "@/features/authorization/permissions";
import {
  isLegacyStudentLeadershipRoleKey,
  isRoleKey,
  isStudentLeadershipPosition,
  type RoleKey,
  type StudentLeadershipPosition,
} from "@/features/authorization/roles";

export function normalizeUserRoles(
  userRole: RoleKey | undefined,
  userRoles?: string[],
) {
  const roles = userRoles?.length ? userRoles : userRole ? [userRole] : [];

  return Array.from(new Set(roles.filter(isRoleKey)));
}

export function normalizeStudentLeadershipPositions(
  positions?: string[],
  userRoles?: string[],
) {
  const normalizedPositions = positions?.filter(isStudentLeadershipPosition) ?? [];
  const legacyPositions =
    userRoles
      ?.filter(isLegacyStudentLeadershipRoleKey)
      .filter(isStudentLeadershipPosition) ?? [];

  return Array.from(new Set([...normalizedPositions, ...legacyPositions]));
}

export function hasRole(
  userRole: RoleKey | undefined,
  allowedRoles: RoleKey[],
  userRoles?: string[],
) {
  return normalizeUserRoles(userRole, userRoles).some((role) =>
    allowedRoles.includes(role),
  );
}

export function hasPermission(
  userRole: RoleKey | undefined,
  requiredPermission: Permission,
  userRoles?: string[],
  studentLeadershipPositions?: StudentLeadershipPosition[],
) {
  const roleHasPermission = normalizeUserRoles(userRole, userRoles).some((role) =>
    ROLE_PERMISSIONS[role].includes(requiredPermission),
  );

  if (roleHasPermission) {
    return true;
  }

  return normalizeStudentLeadershipPositions(
    studentLeadershipPositions,
    userRoles,
  ).some((position) =>
    STUDENT_LEADERSHIP_PERMISSIONS[position].includes(requiredPermission),
  );
}

export function hasEveryPermission(
  userRole: RoleKey | undefined,
  requiredPermissions: Permission[],
  userRoles?: string[],
  studentLeadershipPositions?: StudentLeadershipPosition[],
) {
  return requiredPermissions.every((permission) =>
    hasPermission(userRole, permission, userRoles, studentLeadershipPositions),
  );
}

export function hasAnyPermission(
  userRole: RoleKey | undefined,
  requiredPermissions: Permission[],
  userRoles?: string[],
  studentLeadershipPositions?: StudentLeadershipPosition[],
) {
  return requiredPermissions.some((permission) =>
    hasPermission(userRole, permission, userRoles, studentLeadershipPositions),
  );
}
