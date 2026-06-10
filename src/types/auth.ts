import type {
  RoleKey,
  StudentLeadershipPosition,
} from "@/features/authorization/roles";
import type { TenantContextValue } from "@/types/tenant";

export type AuthUser = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  role: RoleKey;
  roles?: string[];
  studentLeadershipPositions?: StudentLeadershipPosition[];
  universityId?: string | null;
  collegeId?: string | null;
  onboardingCompleted?: boolean;
};

export type AuthSession = {
  user: AuthUser;
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
  };
  tenant?: TenantContextValue | null;
};

export type RouteAccess = "public" | "protected" | "auth";
