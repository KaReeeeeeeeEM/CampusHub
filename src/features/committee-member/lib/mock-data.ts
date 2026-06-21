export const committeeCategory = "Committee";

export const committeeProfile = {
  name: "",
  email: "",
  role: "",
  category: committeeCategory,
  college: "",
  department: "",
};

export type CommitteeAnnouncement = Record<string, unknown>;
export type CommitteeEvent = Record<string, unknown>;
export type CommitteeTopic = Record<string, unknown>;
export type CommitteeTask = Record<string, unknown>;

export const mockCommitteeAnnouncements: CommitteeAnnouncement[] = [];
export const mockCommitteeEvents: CommitteeEvent[] = [];
export const mockCommitteeTopics: CommitteeTopic[] = [];
export const mockCommitteeTasks: CommitteeTask[] = [];
