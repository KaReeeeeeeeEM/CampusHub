export type ShowcaseVisibility = "Public" | "Private" | "Role-Based";
export type ShowcaseRoleAudience =
  | "Students"
  | "Teachers"
  | "Employers"
  | "Alumni";
export type ShowcaseStatus = "Idea" | "In Progress" | "Completed" | "Archived";
export type ShowcaseDocument = Record<string, unknown>;
export type ShowcaseProject = Record<string, unknown>;
export type ShowcaseBadge = Record<string, unknown>;

export const showcaseCategories = [
  "Software",
  "Research",
  "Design",
  "Hardware",
  "Business",
  "Health",
  "Agriculture",
  "Education",
] as const;

export const showcaseProjects: ShowcaseProject[] = [];
export const showcaseBadges: ShowcaseBadge[] = [];
export const xpSources: Array<Record<string, unknown>> = [];

export const showcaseProfile = {
  name: "Student",
  email: "",
  level: 0,
  xp: 0,
  badges: [] as string[],
};

export const showcaseLeaderboards = {
  mostViewed: [] as ShowcaseProject[],
  mostStarred: [] as ShowcaseProject[],
  trending: [] as ShowcaseProject[],
  mostClicked: [] as ShowcaseProject[],
  mostShared: [] as ShowcaseProject[],
  newestRising: [] as ShowcaseProject[],
  topInnovators: [] as Array<{ name: string; value: string; meta: string }>,
};
