export const ONBOARDING_ROLES = [
  "STUDENT",
  "TEACHER",
  "REPRESENTATIVE",
  "CAMPUS_ADMIN",
  "ALUMNI",
  "EMPLOYER"
] as const;

export type OnboardingRole = (typeof ONBOARDING_ROLES)[number];

export type StudentOnboardingData = {
  university: string;
  college: string;
  department: string;
  yearOfStudy: string;
};

export type TeacherOnboardingData = {
  department: string;
  courses: string;
};

export type RepresentativeOnboardingData = {
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
  careerTitle: string;
  organization: string;
  industry: string;
};

export type EmployerOnboardingData = {
  companyName: string;
  companyWebsite: string;
  industry: string;
  hiringInterest: string;
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
  REPRESENTATIVE: "Representative",
  CAMPUS_ADMIN: "Campus Admin",
  ALUMNI: "Alumni",
  EMPLOYER: "Employer"
};

export const defaultOnboardingData: OnboardingData = {
  STUDENT: {
    university: "",
    college: "",
    department: "",
    yearOfStudy: ""
  },
  TEACHER: {
    department: "",
    courses: ""
  },
  REPRESENTATIVE: {
    college: "",
    committeeCategory: ""
  },
  CAMPUS_ADMIN: {
    university: "",
    administrativeUnit: "",
    position: ""
  },
  ALUMNI: {
    graduationYear: "",
    careerTitle: "",
    organization: "",
    industry: ""
  },
  EMPLOYER: {
    companyName: "",
    companyWebsite: "",
    industry: "",
    hiringInterest: ""
  }
};
