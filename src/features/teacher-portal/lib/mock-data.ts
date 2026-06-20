export const mockTeacherProfile = {
  name: "Teacher",
  title: "",
  department: "",
  college: "",
  office: "",
  email: "",
  avatar: "",
  interests: [] as string[],
};

export const teacherStats: Array<Record<string, unknown>> = [];

export type TeacherAnnouncement = Record<string, unknown>;
export const teacherAnnouncements: TeacherAnnouncement[] = [];

export type TeacherEvent = Record<string, unknown>;
export const teacherEvents: TeacherEvent[] = [];

export type TeacherAlmanacItem = Record<string, unknown>;
export const teacherAlmanacItems: TeacherAlmanacItem[] = [];

export type TeacherProject = Record<string, unknown>;
export const teacherProjects: TeacherProject[] = [];

export type TeacherStudent = Record<string, unknown>;
export const teacherStudents: TeacherStudent[] = [];

export type TeacherForumTopic = Record<string, unknown>;
export const teacherForumTopics: TeacherForumTopic[] = [];

export type TeacherPoll = Record<string, unknown>;
export const teacherPolls: TeacherPoll[] = [];

export type TeacherNotification = Record<string, unknown>;
export const teacherNotifications: TeacherNotification[] = [];
