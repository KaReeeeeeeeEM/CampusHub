export type StudentAnnouncement = Record<string, unknown>;
export type StudentEvent = Record<string, unknown>;
export type AlmanacItem = Record<string, unknown>;
export type CampusLocation = Record<string, unknown>;
export type ForumTopic = Record<string, unknown>;
export type StudentSuggestion = Record<string, unknown>;
export type StudentNotification = Record<string, unknown>;

export const announcementCategories = [
  "Academics",
  "Sports",
  "Offers",
  "Clubs",
  "Leadership",
  "Career",
  "Health",
  "General",
  "Other",
] as const;

export const mockStudentProfile = {
  name: "",
  email: "",
  university: "",
  college: "",
  department: "",
  year: "",
  completion: 0,
  skills: [] as string[],
  interests: [] as string[],
  achievements: [] as string[],
};

export const mockAnnouncements: StudentAnnouncement[] = [];
export const mockEvents: StudentEvent[] = [];
export const mockAlmanacItems: AlmanacItem[] = [];
export const mockCampusLocations: CampusLocation[] = [];
export const mockForumTopics: ForumTopic[] = [];
export const mockSuggestions: StudentSuggestion[] = [];
export const mockNotifications: StudentNotification[] = [];
