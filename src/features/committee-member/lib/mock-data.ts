export const committeeCategory = "Technology Committee";

export const committeeProfile = {
  name: "Brian Massawe",
  email: "brian.massawe@coict.udsm.ac.tz",
  phone: "+255 754 210 448",
  role: "Technology Lead",
  category: committeeCategory,
  college: "College of ICT",
  university: "University of Dar es Salaam",
  achievements: [
    "Coordinated UDSM Innovation Hackathon",
    "Launched peer coding circles",
    "Supported 14 student project teams",
  ],
  activitySummary: [
    ["Announcements published", "8"],
    ["Events coordinated", "5"],
    ["Forum replies", "126"],
    ["Tasks completed", "18"],
  ],
};

export type CommitteeAnnouncement = {
  id: string;
  title: string;
  status: "Draft" | "Published" | "Archived";
  audience: string;
  date: string;
  body: string;
};

export type CommitteeEvent = {
  id: string;
  title: string;
  venue: string;
  date: string;
  time: string;
  attendees: number;
  status: "Upcoming" | "Completed" | "Cancelled";
  description: string;
};

export type CommitteeTopic = {
  id: string;
  title: string;
  replies: number;
  views: number;
  pinned: boolean;
  trending: boolean;
  createdAt: string;
  summary: string;
};

export type CommitteeTask = {
  id: string;
  task: string;
  priority: "Low" | "Medium" | "High";
  dueDate: string;
  status: "Pending" | "In Progress" | "Completed" | "Overdue";
  assignedBy: string;
  notes: string;
};

export const mockCommitteeAnnouncements: CommitteeAnnouncement[] = [
  {
    id: "ann-hackathon",
    title: "Innovation Hackathon registration is open",
    status: "Published",
    audience: "Technology clubs",
    date: "2026-06-09",
    body: "Registration is open for teams joining the UDSM Innovation Hackathon. Students may register in groups of three to five.",
  },
  {
    id: "ann-open-source",
    title: "Open-source contribution circle starts Friday",
    status: "Draft",
    audience: "Computer Science students",
    date: "2026-06-11",
    body: "The Technology Committee is preparing a weekly open-source contribution circle for students interested in real-world software collaboration.",
  },
  {
    id: "ann-lab-hours",
    title: "Extended lab access pilot",
    status: "Published",
    audience: "Final year students",
    date: "2026-06-07",
    body: "Computer lab access will be extended during final-year project season. Students should sign in with their university ID.",
  },
];

export const mockCommitteeEvents: CommitteeEvent[] = [
  {
    id: "event-ai",
    title: "Applied AI Workshop",
    venue: "CoICT Lecture Theatre 2",
    date: "2026-06-18",
    time: "10:00 AM",
    attendees: 220,
    status: "Upcoming",
    description:
      "Hands-on workshop for students learning practical AI tools for research and campus innovation.",
  },
  {
    id: "event-hackathon",
    title: "UDSM Innovation Hackathon",
    venue: "CoICT Innovation Lab",
    date: "2026-06-27",
    time: "8:30 AM",
    attendees: 340,
    status: "Upcoming",
    description:
      "Technology build sprint with alumni mentors and employer reviewers.",
  },
  {
    id: "event-git",
    title: "Git and Collaboration Clinic",
    venue: "Computer Lab 4",
    date: "2026-05-29",
    time: "2:00 PM",
    attendees: 86,
    status: "Completed",
    description:
      "Practical clinic on Git workflows, branching, pull requests, and project collaboration.",
  },
];

export const mockCommitteeTopics: CommitteeTopic[] = [
  {
    id: "topic-lab-hours",
    title: "Computer lab opening hours during project season",
    replies: 42,
    views: 612,
    pinned: true,
    trending: true,
    createdAt: "2026-06-10",
    summary:
      "Students are requesting extended lab access while final-year teams finish project work.",
  },
  {
    id: "topic-open-source",
    title: "Open-source project ideas for beginners",
    replies: 28,
    views: 391,
    pinned: false,
    trending: true,
    createdAt: "2026-06-08",
    summary:
      "A discussion collecting beginner-friendly contribution ideas for the weekly coding circle.",
  },
  {
    id: "topic-wifi",
    title: "Wi-Fi reliability around CoICT labs",
    replies: 19,
    views: 238,
    pinned: false,
    trending: false,
    createdAt: "2026-06-04",
    summary:
      "Students are reporting unstable Wi-Fi coverage in some lab corridors.",
  },
];

export const mockCommitteeTasks: CommitteeTask[] = [
  {
    id: "task-judges",
    task: "Confirm alumni judges for the hackathon",
    priority: "High",
    dueDate: "2026-06-14",
    status: "In Progress",
    assignedBy: "College Representative",
    notes: "Reach out to three alumni mentors and confirm judging availability.",
  },
  {
    id: "task-lab",
    task: "Collect extended lab access requests",
    priority: "Medium",
    dueDate: "2026-06-13",
    status: "Pending",
    assignedBy: "Academic Affairs",
    notes: "Prepare a summary of students who need evening lab access.",
  },
  {
    id: "task-posters",
    task: "Review workshop media assets",
    priority: "Low",
    dueDate: "2026-06-09",
    status: "Completed",
    assignedBy: "Media Committee",
    notes: "Confirm workshop poster, social card, and announcement image.",
  },
  {
    id: "task-volunteers",
    task: "Assign hackathon volunteer shifts",
    priority: "High",
    dueDate: "2026-06-08",
    status: "Overdue",
    assignedBy: "College Representative",
    notes: "Create a shift rota for registration, rooms, and mentor support.",
  },
];
