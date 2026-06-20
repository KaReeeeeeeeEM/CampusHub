import type { Permission } from "@/features/authorization/permissions";
import {
  authorizeResourceAction,
  hasAllPermissions,
  hasAnyPermission,
  hasRole,
  type AuthorizationActor,
  type ResourceScope,
} from "@/features/authorization/rbac";
import type { RoleKey } from "@/features/authorization/roles";
import { writeAuthAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";

async function auditAuthorizationFailure({
  actor,
  permission,
  reason,
  resource,
}: {
  actor: AuthorizationActor | null;
  permission?: Permission | string;
  reason: string;
  resource?: ResourceScope;
}) {
  await writeAuthAuditLog({
    actorId: actor?.id ?? null,
    universityId: resource?.universityId ?? actor?.universityId ?? null,
    action: actor ? "PERMISSION_DENIED" : "UNAUTHORIZED_ACCESS",
    entityType: "authorization",
    entityId: actor?.id ?? null,
    metadata: {
      permission,
      reason,
      resource,
    },
  });
}

export async function requirePermission(permission: Permission | string) {
  const actor = await requireAuth();

  if (!hasAllPermissions(actor, [permission])) {
    await auditAuthorizationFailure({
      actor,
      permission,
      reason: "MISSING_PERMISSION",
    });
    throw forbidden("Required permission is missing.");
  }

  return actor;
}

export async function requireAnyPermission(
  permissions: Array<Permission | string>,
) {
  const actor = await requireAuth();

  if (!hasAnyPermission(actor, permissions)) {
    await auditAuthorizationFailure({
      actor,
      permission: permissions.join(","),
      reason: "MISSING_ANY_PERMISSION",
    });
    throw forbidden("Required permission is missing.");
  }

  return actor;
}

export async function requireAllPermissions(
  permissions: Array<Permission | string>,
) {
  const actor = await requireAuth();

  if (!hasAllPermissions(actor, permissions)) {
    await auditAuthorizationFailure({
      actor,
      permission: permissions.join(","),
      reason: "MISSING_ALL_PERMISSIONS",
    });
    throw forbidden("Required permissions are missing.");
  }

  return actor;
}

export async function requireAuthorizedResource(input: {
  permission: Permission | string;
  resource?: ResourceScope;
  requireOwnership?: boolean;
}) {
  const actor = await requireAuth();
  const decision = authorizeResourceAction({
    actor,
    permission: input.permission,
    resource: input.resource,
    requireOwnership: input.requireOwnership,
  });

  if (!decision.allowed) {
    await auditAuthorizationFailure({
      actor,
      permission: input.permission,
      reason: decision.reason,
      resource: input.resource,
    });
    throw forbidden("You do not have access to this resource.");
  }

  return actor;
}

export async function requireUniversityScope(universityId: string) {
  return requireAuthorizedResource({
    permission: "TENANT_READ",
    resource: { universityId },
  });
}

export async function requireOwnership(resource: ResourceScope) {
  return requireAuthorizedResource({
    permission: "TENANT_READ",
    resource,
    requireOwnership: true,
  });
}

export async function requireApiRole(allowedRoles: RoleKey[]) {
  const actor = await requireAuth();

  if (!hasRole(actor.role, allowedRoles, actor.roles)) {
    await auditAuthorizationFailure({
      actor,
      reason: "ROLE_NOT_ALLOWED",
    });
    throw forbidden("Required role is missing.");
  }

  return actor;
}

export function withPermission<TArgs extends unknown[], TResult>(
  permission: Permission | string,
  handler: (actor: AuthorizationActor, ...args: TArgs) => Promise<TResult>,
) {
  return async (...args: TArgs) => {
    const actor = await requirePermission(permission);
    return handler(actor, ...args);
  };
}

export function withAnyPermission<TArgs extends unknown[], TResult>(
  permissions: Array<Permission | string>,
  handler: (actor: AuthorizationActor, ...args: TArgs) => Promise<TResult>,
) {
  return async (...args: TArgs) => {
    const actor = await requireAnyPermission(permissions);
    return handler(actor, ...args);
  };
}

export function withResourceAuthorization<TArgs extends unknown[], TResult>(
  input: {
    permission: Permission | string;
    resource: ResourceScope;
    requireOwnership?: boolean;
  },
  handler: (actor: AuthorizationActor, ...args: TArgs) => Promise<TResult>,
) {
  return async (...args: TArgs) => {
    const actor = await requireAuthorizedResource(input);
    return handler(actor, ...args);
  };
}
