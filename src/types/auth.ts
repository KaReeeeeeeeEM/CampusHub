import type { RoleKey } from "@/features/authorization/roles";
import type { TenantContextValue } from "@/types/tenant";

export type AuthUser = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  role: RoleKey;
  roles?: RoleKey[];
  universityId?: string | null;
};

export type AuthSession = {
  user: AuthUser;
  expiresAt: Date;
  tenant?: TenantContextValue | null;
};

export type RouteAccess = "public" | "protected" | "auth";
