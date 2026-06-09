import { ROLE_PERMISSIONS, type Permission } from "@/features/authorization/permissions";
import type { RoleKey } from "@/features/authorization/roles";

export function hasRole(userRole: RoleKey | undefined, allowedRoles: RoleKey[]) {
  return Boolean(userRole && allowedRoles.includes(userRole));
}

export function hasPermission(
  userRole: RoleKey | undefined,
  requiredPermission: Permission
) {
  if (!userRole) {
    return false;
  }

  return ROLE_PERMISSIONS[userRole].includes(requiredPermission);
}

export function hasEveryPermission(
  userRole: RoleKey | undefined,
  requiredPermissions: Permission[]
) {
  return requiredPermissions.every((permission) =>
    hasPermission(userRole, permission)
  );
}

export function hasAnyPermission(
  userRole: RoleKey | undefined,
  requiredPermissions: Permission[]
) {
  return requiredPermissions.some((permission) =>
    hasPermission(userRole, permission)
  );
}
