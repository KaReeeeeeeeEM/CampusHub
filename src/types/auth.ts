import type {
  RoleKey,
  StudentLeadershipPosition,
} from "@/features/authorization/roles";
import type {
  UserPositionInput,
  UserStatusInput,
} from "@/features/auth/lib/schemas";
import type { TenantContextValue } from "@/types/tenant";

export type AuthUser = {
  id: string;
  name: string | null;
  email: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  otherNames?: string | null;
  nickname?: string | null;
  image?: string | null;
  avatar?: string | null;
  phoneNumber?: string | null;
  role: RoleKey;
  roles?: string[];
  permissions?: string[];
  position?: UserPositionInput | string;
  studentLeadershipPositions?: StudentLeadershipPosition[];
  status?: UserStatusInput | string;
  isVerified?: boolean;
  profileCompletionPercentage?: number;
  universityId?: string | null;
  collegeId?: string | null;
  departmentId?: string | null;
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
