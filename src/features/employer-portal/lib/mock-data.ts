export const mockEmployerProfile = {
  company: "Employer",
  email: "",
  industry: "",
  location: "",
  website: "",
  description: "",
  interests: [] as string[],
};

export const employerStats: Array<Record<string, unknown>> = [];
export type EmployerStudent = {
  name: string;
  department: string;
  skills: string[];
  saved?: boolean;
  xp?: number;
  shortlist?: string | null;
};
export const employerStudents: EmployerStudent[] = [];
export type EmployerProject = {
  name: string;
  owner: string;
  category: string;
  analytics?: {
    linkClicks?: number;
  };
};
export const employerProjects: EmployerProject[] = [];
export type EmployerOpportunity = {
  title: string;
  type: string;
  status: string;
};
export const employerOpportunities: EmployerOpportunity[] = [];
export const opportunityTabs = ["Active", "Draft", "Archived"] as const;
export type EmployerNotification = Record<string, unknown>;
export const employerNotifications: EmployerNotification[] = [];
export const employerAnalytics: Array<Record<string, unknown>> = [];
export const talentInsights: Array<Record<string, unknown>> = [];
