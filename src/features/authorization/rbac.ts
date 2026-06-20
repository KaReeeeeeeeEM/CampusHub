import {
  ROLE_PERMISSIONS,
  STUDENT_LEADERSHIP_PERMISSIONS,
  isPermission,
  type Permission,
} from "@/features/authorization/permissions";
import {
  isLegacyStudentLeadershipRoleKey,
  isRoleKey,
  isStudentLeadershipPosition,
  type RoleKey,
  type StudentLeadershipPosition,
} from "@/features/authorization/roles";
import type { AuthUser } from "@/types/auth";

export type AuthorizationActor = Pick<
  AuthUser,
  | "id"
  | "role"
  | "roles"
  | "position"
  | "studentLeadershipPositions"
  | "universityId"
  | "collegeId"
  | "departmentId"
> & {
  permissions?: string[];
};

export type ResourceScope = {
  ownerId?: string | null;
  universityId?: string | null;
  collegeId?: string | null;
  departmentId?: string | null;
  allowedUserIds?: string[];
  allowedCollegeIds?: string[];
  allowedDepartmentIds?: string[];
};

export type AuthorizationDecision = {
  allowed: boolean;
  reason:
    | "ALLOWED"
    | "MISSING_PERMISSION"
    | "UNIVERSITY_SCOPE_MISMATCH"
    | "COLLEGE_SCOPE_MISMATCH"
    | "DEPARTMENT_SCOPE_MISMATCH"
    | "OWNER_SCOPE_MISMATCH";
};

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
  explicitPosition?: string | null,
) {
  const normalizedPositions =
    positions?.filter(isStudentLeadershipPosition) ?? [];
  const currentPosition = isStudentLeadershipPosition(explicitPosition)
    ? [explicitPosition]
    : [];
  const legacyPositions =
    userRoles
      ?.filter(isLegacyStudentLeadershipRoleKey)
      .filter(isStudentLeadershipPosition) ?? [];

  return Array.from(
    new Set([...normalizedPositions, ...currentPosition, ...legacyPositions]),
  );
}

export function getRolePermissions(role: RoleKey | undefined) {
  return role ? (ROLE_PERMISSIONS[role] ?? []) : [];
}

export function getPositionPermissions(
  position: StudentLeadershipPosition | undefined,
) {
  return position ? (STUDENT_LEADERSHIP_PERMISSIONS[position] ?? []) : [];
}

export function getEffectivePermissions(actor: AuthorizationActor) {
  const permissions = new Set<string>();

  normalizeUserRoles(actor.role, actor.roles).forEach((role) => {
    getRolePermissions(role).forEach((permission) =>
      permissions.add(permission),
    );
  });

  normalizeStudentLeadershipPositions(
    actor.studentLeadershipPositions,
    actor.roles,
    actor.position,
  ).forEach((position) => {
    getPositionPermissions(position).forEach((permission) =>
      permissions.add(permission),
    );
  });

  actor.permissions?.forEach((permission) => permissions.add(permission));

  return Array.from(permissions);
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

export function actorHasPermission(
  actor: AuthorizationActor,
  requiredPermission: Permission | string,
) {
  return getEffectivePermissions(actor).includes(requiredPermission);
}

export function hasPermission(
  userRoleOrActor: RoleKey | AuthorizationActor | undefined,
  requiredPermission: Permission | string,
  userRoles?: string[],
  studentLeadershipPositions?: StudentLeadershipPosition[],
) {
  if (typeof userRoleOrActor === "object" && userRoleOrActor) {
    return actorHasPermission(userRoleOrActor, requiredPermission);
  }

  const roleHasPermission = normalizeUserRoles(userRoleOrActor, userRoles).some(
    (role) => ROLE_PERMISSIONS[role].includes(requiredPermission as never),
  );

  if (roleHasPermission) {
    return true;
  }

  return normalizeStudentLeadershipPositions(
    studentLeadershipPositions,
    userRoles,
  ).some((position) =>
    STUDENT_LEADERSHIP_PERMISSIONS[position].includes(
      requiredPermission as never,
    ),
  );
}

export function hasAllPermissions(
  actor: AuthorizationActor,
  requiredPermissions: Array<Permission | string>,
) {
  return requiredPermissions.every((permission) =>
    actorHasPermission(actor, permission),
  );
}

export function hasEveryPermission(
  userRoleOrActor: RoleKey | AuthorizationActor | undefined,
  requiredPermissions: Array<Permission | string>,
  userRoles?: string[],
  studentLeadershipPositions?: StudentLeadershipPosition[],
) {
  if (typeof userRoleOrActor === "object" && userRoleOrActor) {
    return hasAllPermissions(userRoleOrActor, requiredPermissions);
  }

  return requiredPermissions.every((permission) =>
    hasPermission(
      userRoleOrActor,
      permission,
      userRoles,
      studentLeadershipPositions,
    ),
  );
}

export function hasAnyPermission(
  userRoleOrActor: RoleKey | AuthorizationActor | undefined,
  requiredPermissions: Array<Permission | string>,
  userRoles?: string[],
  studentLeadershipPositions?: StudentLeadershipPosition[],
) {
  if (typeof userRoleOrActor === "object" && userRoleOrActor) {
    return requiredPermissions.some((permission) =>
      actorHasPermission(userRoleOrActor, permission),
    );
  }

  return requiredPermissions.some((permission) =>
    hasPermission(
      userRoleOrActor,
      permission,
      userRoles,
      studentLeadershipPositions,
    ),
  );
}

export function canAccessUniversityScope(
  actor: AuthorizationActor,
  universityId?: string | null,
) {
  return (
    !universityId ||
    hasRole(actor.role, ["SUPER_ADMIN"], actor.roles) ||
    actor.universityId === universityId
  );
}

export function canAccessCollegeScope(
  actor: AuthorizationActor,
  scope: ResourceScope,
) {
  if (hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles)) {
    return true;
  }

  if (scope.allowedCollegeIds?.includes(actor.collegeId ?? "")) {
    return true;
  }

  return !scope.collegeId || actor.collegeId === scope.collegeId;
}

export function canAccessDepartmentScope(
  actor: AuthorizationActor,
  scope: ResourceScope,
) {
  if (hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles)) {
    return true;
  }

  if (scope.allowedDepartmentIds?.includes(actor.departmentId ?? "")) {
    return true;
  }

  return !scope.departmentId || actor.departmentId === scope.departmentId;
}

export function isResourceOwner(
  actor: AuthorizationActor,
  scope: ResourceScope,
) {
  return (
    scope.ownerId === actor.id ||
    scope.allowedUserIds?.includes(actor.id) ||
    false
  );
}

export function authorizeResourceAction({
  actor,
  permission,
  resource,
  requireOwnership = false,
}: {
  actor: AuthorizationActor;
  permission: Permission | string;
  resource?: ResourceScope;
  requireOwnership?: boolean;
}): AuthorizationDecision {
  if (!actorHasPermission(actor, permission)) {
    return { allowed: false, reason: "MISSING_PERMISSION" };
  }

  if (!resource) {
    return { allowed: true, reason: "ALLOWED" };
  }

  if (!canAccessUniversityScope(actor, resource.universityId)) {
    return { allowed: false, reason: "UNIVERSITY_SCOPE_MISMATCH" };
  }

  if (!canAccessCollegeScope(actor, resource)) {
    return { allowed: false, reason: "COLLEGE_SCOPE_MISMATCH" };
  }

  if (!canAccessDepartmentScope(actor, resource)) {
    return { allowed: false, reason: "DEPARTMENT_SCOPE_MISMATCH" };
  }

  if (requireOwnership && !isResourceOwner(actor, resource)) {
    return { allowed: false, reason: "OWNER_SCOPE_MISMATCH" };
  }

  return { allowed: true, reason: "ALLOWED" };
}

export function normalizePermission(value: string) {
  return isPermission(value) ? value : value;
}
