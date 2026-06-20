export type EntityStatus = "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED";
export type CommitteeMember = Record<string, unknown>;
export type CollegeStudent = Record<string, unknown>;
export type StudentInvitation = Record<string, unknown>;
export type Announcement = Record<string, unknown>;
export type CollegeEvent = Record<string, unknown>;
export type ForumTopic = Record<string, unknown>;
export type Suggestion = Record<string, unknown>;
export type Poll = Record<string, unknown>;

export const committeeCategories = [
  "Academic",
  "Technology",
  "Sports",
  "Welfare",
  "Finance",
  "Events",
  "Health",
  "General",
] as const;

export const eventCategories = [
  "ACADEMIC",
  "SPORTS",
  "CLUB",
  "WORKSHOP",
  "HACKATHON",
  "SEMINAR",
  "CAREER",
  "SOCIAL",
] as const;

export const mockCommitteeMembers: CommitteeMember[] = [];
export const mockStudents: CollegeStudent[] = [];
export const mockStudentInvitations: StudentInvitation[] = [];
export const mockAnnouncements: Announcement[] = [];
export const mockEvents: CollegeEvent[] = [];
export const mockForumTopics: ForumTopic[] = [];
export const mockSuggestions: Suggestion[] = [];
export const mockPolls: Poll[] = [];
