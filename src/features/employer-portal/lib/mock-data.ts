export const mockEmployerProfile = {
  company: "",
  email: "",
  industry: "",
  location: "",
  website: "",
  description: "",
  interests: [] as string[],
};

export const employerStats: Array<Record<string, unknown>> = [];
export type EmployerStudent = {
  id?: string;
  name: string;
  photo?: string;
  email?: string;
  phone?: string;
  university?: string;
  college?: string;
  department: string;
  skills: string[];
  badges?: string[];
  saved?: boolean;
  xp?: number;
  shortlist?: string | null;
  availability?: string;
  graduationYear?: string;
  bio?: string;
  projects?: number;
  profileCompletion?: number;
  activity?: string;
  tags?: string[];
  notes?: string;
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
