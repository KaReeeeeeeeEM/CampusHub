export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  CAMPUS_ADMIN: "CAMPUS_ADMIN",
  REPRESENTATIVE: "REPRESENTATIVE",
  COMMITTEE_MEMBER: "COMMITTEE_MEMBER",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
  ALUMNI: "ALUMNI",
  EMPLOYER: "EMPLOYER"
} as const;

export type RoleKey = keyof typeof ROLES;

export const ROLE_LABELS: Record<RoleKey, string> = {
  SUPER_ADMIN: "Super Admin",
  CAMPUS_ADMIN: "Campus Admin",
  REPRESENTATIVE: "Campus Representative",
  COMMITTEE_MEMBER: "Committee Member",
  TEACHER: "Teacher",
  STUDENT: "Student",
  ALUMNI: "Alumni",
  EMPLOYER: "Employer"
};

export const PLATFORM_ROLES: RoleKey[] = ["SUPER_ADMIN"];

export const TENANT_ROLES: RoleKey[] = [
  "CAMPUS_ADMIN",
  "REPRESENTATIVE",
  "COMMITTEE_MEMBER",
  "TEACHER",
  "STUDENT",
  "ALUMNI",
  "EMPLOYER"
];
