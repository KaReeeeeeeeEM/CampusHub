export const ONBOARDING_ROLES = [
  "STUDENT",
  "TEACHER",
  "CAMPUS_ADMIN",
  "ALUMNI",
  "EMPLOYER",
] as const;

export type OnboardingRole = (typeof ONBOARDING_ROLES)[number];

export type StudentOnboardingData = {
  university: string;
  college: string;
  department: string;
  year: string;
};

export type TeacherOnboardingData = {
  university: string;
  department: string;
};

export type RepresentativeOnboardingData = {
  university: string;
  college: string;
  committeeCategory: string;
};

export type CampusAdminOnboardingData = {
  university: string;
  administrativeUnit: string;
  position: string;
};

export type AlumniOnboardingData = {
  graduationYear: string;
  currentEmployer: string;
  position: string;
};

export type EmployerOnboardingData = {
  company: string;
  industry: string;
  companySize: string;
};

export type OnboardingData = {
  STUDENT: StudentOnboardingData;
  TEACHER: TeacherOnboardingData;
  REPRESENTATIVE: RepresentativeOnboardingData;
  CAMPUS_ADMIN: CampusAdminOnboardingData;
  ALUMNI: AlumniOnboardingData;
  EMPLOYER: EmployerOnboardingData;
};

export type OnboardingStep = "role" | "details" | "review" | "complete";

export const roleLabels: Record<OnboardingRole, string> = {
  STUDENT: "Student",
  TEACHER: "Teacher",
  CAMPUS_ADMIN: "Campus Admin",
  ALUMNI: "Alumni",
  EMPLOYER: "Employer",
};

export const defaultOnboardingData: OnboardingData = {
  STUDENT: {
    university: "",
    college: "",
    department: "",
    year: "",
  },
  TEACHER: {
    university: "",
    department: "",
  },
  REPRESENTATIVE: {
    university: "",
    college: "",
    committeeCategory: "",
  },
  CAMPUS_ADMIN: {
    university: "",
    administrativeUnit: "",
    position: "",
  },
  ALUMNI: {
    graduationYear: "",
    currentEmployer: "",
    position: "",
  },
  EMPLOYER: {
    company: "",
    industry: "",
    companySize: "",
  },
};
