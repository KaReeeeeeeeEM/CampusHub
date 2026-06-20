import type { AuthSession, AuthUser } from "@/types/auth";
import {
  isLegacyStudentLeadershipRoleKey,
  isStudentLeadershipPosition,
} from "@/features/authorization/roles";

type RedirectUser = Pick<
  AuthUser,
  "role" | "roles" | "studentLeadershipPositions" | "universityId"
>;

function getRoles(user: RedirectUser) {
  return new Set([user.role, ...(user.roles ?? [])].filter(Boolean));
}

function getStudentLeadershipPositions(user: RedirectUser) {
  const explicit =
    user.studentLeadershipPositions?.filter(isStudentLeadershipPosition) ?? [];
  const legacy = [user.role, ...(user.roles ?? [])]
    .filter(isLegacyStudentLeadershipRoleKey)
    .filter(isStudentLeadershipPosition);

  return new Set([...explicit, ...legacy]);
}

export function getRoleLandingPath(user: RedirectUser) {
  const roles = getRoles(user);

  if (roles.has("SUPER_ADMIN")) return "/super-admin/dashboard";
  if (roles.has("CAMPUS_ADMIN")) return "/campus-admin/dashboard";
  if (roles.has("EMPLOYER")) return "/employer/dashboard";
  if (roles.has("ALUMNI")) return "/alumni/dashboard";
  if (roles.has("TEACHER")) return "/teacher/dashboard";

  const leadershipPositions = getStudentLeadershipPositions(user);

  if (leadershipPositions.has("COMMITTEE_MEMBER")) {
    return "/committee-member/dashboard";
  }

  if (leadershipPositions.has("REPRESENTATIVE")) {
    return "/student/dashboard";
  }

  return "/student/dashboard";
}

export function getSessionLandingPath(session: AuthSession) {
  return getRoleLandingPath(session.user);
}
