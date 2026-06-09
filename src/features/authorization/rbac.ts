import {
  ROLE_PERMISSIONS,
  type Permission,
} from "@/features/authorization/permissions";
import type { RoleKey } from "@/features/authorization/roles";

export function normalizeUserRoles(
  userRole: RoleKey | undefined,
  userRoles?: RoleKey[],
) {
  return userRoles?.length ? userRoles : userRole ? [userRole] : [];
}

export function hasRole(
  userRole: RoleKey | undefined,
  allowedRoles: RoleKey[],
  userRoles?: RoleKey[],
) {
  return normalizeUserRoles(userRole, userRoles).some((role) =>
    allowedRoles.includes(role),
  );
}

export function hasPermission(
  userRole: RoleKey | undefined,
  requiredPermission: Permission,
  userRoles?: RoleKey[],
) {
  return normalizeUserRoles(userRole, userRoles).some((role) =>
    ROLE_PERMISSIONS[role].includes(requiredPermission),
  );
}

export function hasEveryPermission(
  userRole: RoleKey | undefined,
  requiredPermissions: Permission[],
  userRoles?: RoleKey[],
) {
  return requiredPermissions.every((permission) =>
    hasPermission(userRole, permission, userRoles),
  );
}

export function hasAnyPermission(
  userRole: RoleKey | undefined,
  requiredPermissions: Permission[],
  userRoles?: RoleKey[],
) {
  return requiredPermissions.some((permission) =>
    hasPermission(userRole, permission, userRoles),
  );
}
