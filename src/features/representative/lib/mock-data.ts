export type EntityStatus = "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED";

export type CommitteeMember = {
  id: string;
  photo: string;
  name: string;
  category: string;
  position: string;
  email: string;
  phone: string;
  status: EntityStatus;
  joinedAt: string;
  notes: string;
};

export type CollegeStudent = {
  id: string;
  photo: string;
  name: string;
  department: string;
  year: string;
  email: string;
  status: EntityStatus;
  joinedAt: string;
};

export type StudentInvitation = {
  id: string;
  name: string;
  department: string;
  usageCount: number;
  maxUsage: number;
  status: "ACTIVE" | "INACTIVE" | "EXPIRED";
  createdAt: string;
  expiresAt: string;
  link: string;
  description: string;
};

export type Announcement = {
  id: string;
  title: string;
  category: string;
  audience: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdAt: string;
  body: string;
};

export type CollegeEvent = {
  id: string;
  name: string;
  category: string;
  venue: string;
  date: string;
  attendees: number;
  status: "UPCOMING" | "LIVE" | "CANCELLED" | "COMPLETED";
  description: string;
};

export type ForumTopic = {
  id: string;
  topic: string;
  category: string;
  replies: number;
  views: number;
  createdBy: string;
  status: "OPEN" | "LOCKED" | "PINNED";
  createdAt: string;
  summary: string;
};

export type Suggestion = {
  id: string;
  subject: string;
  anonymous: boolean;
  category: string;
  status: "PENDING" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED";
  submittedAt: string;
  description: string;
};

export type Poll = {
  id: string;
  title: string;
  responses: number;
  endDate: string;
  status: "ACTIVE" | "DRAFT" | "CLOSED";
  question: string;
  options: string[];
};

export const committeeCategories = [
  "Academic Affairs",
  "Sports",
  "Media",
  "Technology",
  "Entertainment",
  "Student Welfare",
] as const;

export const eventCategories = [
  "Hackathon",
  "Workshop",
  "Sports",
  "Club Activity",
  "Conference",
  "Social Event",
] as const;

export const mockCommitteeMembers: CommitteeMember[] = [
  {
    id: "committee-neema",
    photo:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
    name: "Neema Sanga",
    category: "Academic Affairs",
    position: "Academic Secretary",
    email: "neema.sanga@coict.udsm.ac.tz",
    phone: "+255 713 442 901",
    status: "ACTIVE",
    joinedAt: "2026-01-12",
    notes: "Coordinates class representatives and academic feedback loops.",
  },
  {
    id: "committee-brian",
    photo:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80",
    name: "Brian Massawe",
    category: "Technology",
    position: "Technology Lead",
    email: "brian.massawe@coict.udsm.ac.tz",
    phone: "+255 754 210 448",
    status: "ACTIVE",
    joinedAt: "2026-01-15",
    notes: "Manages student technology programs and hackathon operations.",
  },
  {
    id: "committee-amina",
    photo:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=80",
    name: "Amina Rashid",
    category: "Student Welfare",
    position: "Welfare Coordinator",
    email: "amina.rashid@coict.udsm.ac.tz",
    phone: "+255 769 114 288",
    status: "ACTIVE",
    joinedAt: "2026-02-02",
    notes: "Leads student support, inclusion, and welfare escalation.",
  },
  {
    id: "committee-john",
    photo:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=160&q=80",
    name: "John Mwakyusa",
    category: "Sports",
    position: "Sports Captain",
    email: "john.mwakyusa@coict.udsm.ac.tz",
    phone: "+255 715 882 104",
    status: "INACTIVE",
    joinedAt: "2025-10-06",
    notes: "Former college sports coordinator.",
  },
];

export const mockStudents: CollegeStudent[] = [
  {
    id: "student-faith",
    photo:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=160&q=80",
    name: "Faith Joseph",
    department: "Computer Science",
    year: "Year 2",
    email: "faith.joseph@udsm.ac.tz",
    status: "ACTIVE",
    joinedAt: "2026-02-10",
  },
  {
    id: "student-emanuel",
    photo:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80",
    name: "Emanuel Peter",
    department: "Electronics and Telecommunications",
    year: "Year 3",
    email: "emanuel.peter@udsm.ac.tz",
    status: "ACTIVE",
    joinedAt: "2026-02-14",
  },
  {
    id: "student-lina",
    photo:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=80",
    name: "Lina Ally",
    department: "Computer Science",
    year: "Year 1",
    email: "lina.ally@udsm.ac.tz",
    status: "PENDING",
    joinedAt: "2026-03-01",
  },
  {
    id: "student-noah",
    photo:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80",
    name: "Noah Kimaro",
    department: "Information Systems",
    year: "Year 4",
    email: "noah.kimaro@udsm.ac.tz",
    status: "SUSPENDED",
    joinedAt: "2025-11-20",
  },
];

export const mockStudentInvitations: StudentInvitation[] = [
  {
    id: "invite-coict-2026",
    name: "CoICT 2026 Intake",
    department: "All Departments",
    usageCount: 418,
    maxUsage: 650,
    status: "ACTIVE",
    createdAt: "2026-02-01",
    expiresAt: "2026-09-30",
    link: "https://campushub.local/join/coict-2026-intake",
    description: "Primary intake link for verified CoICT first-year students.",
  },
  {
    id: "invite-cs",
    name: "Computer Science Intake",
    department: "Computer Science",
    usageCount: 186,
    maxUsage: 260,
    status: "ACTIVE",
    createdAt: "2026-02-04",
    expiresAt: "2026-08-15",
    link: "https://campushub.local/join/cs-2026",
    description: "Department-specific onboarding link for CS students.",
  },
  {
    id: "invite-electronics",
    name: "Electronics Intake",
    department: "Electronics and Telecommunications",
    usageCount: 102,
    maxUsage: 180,
    status: "EXPIRED",
    createdAt: "2025-09-12",
    expiresAt: "2026-01-31",
    link: "https://campushub.local/join/electronics-2026",
    description: "Legacy electronics onboarding link for the previous window.",
  },
];

export const mockAnnouncements: Announcement[] = [
  {
    id: "announcement-orientation",
    title: "CoICT Orientation Briefing",
    category: "Academic",
    audience: "Year 1 Students",
    status: "PUBLISHED",
    createdAt: "2026-03-04",
    body: "Orientation briefing for new CoICT students covering departmental expectations, representative channels, and academic support resources.",
  },
  {
    id: "announcement-hackathon",
    title: "Campus Innovation Hackathon",
    category: "Technology",
    audience: "All CoICT Students",
    status: "PUBLISHED",
    createdAt: "2026-03-08",
    body: "Registration is open for a weekend hackathon focused on university service innovation and employability projects.",
  },
  {
    id: "announcement-sports",
    title: "Inter-College Football Trials",
    category: "Sports",
    audience: "Sports Clubs",
    status: "DRAFT",
    createdAt: "2026-03-12",
    body: "Trial schedule draft for the upcoming inter-college football competition.",
  },
];

export const mockEvents: CollegeEvent[] = [
  {
    id: "event-ai-workshop",
    name: "Applied AI Workshop",
    category: "Workshop",
    venue: "CoICT Lecture Theatre 2",
    date: "2026-04-18",
    attendees: 220,
    status: "UPCOMING",
    description: "Hands-on workshop introducing practical AI tooling for student research and startups.",
  },
  {
    id: "event-hackathon",
    name: "UDSM Innovation Hackathon",
    category: "Hackathon",
    venue: "CoICT Innovation Lab",
    date: "2026-05-02",
    attendees: 340,
    status: "UPCOMING",
    description: "Forty-eight hour innovation sprint with employer mentors and alumni judges.",
  },
  {
    id: "event-career",
    name: "Technology Career Forum",
    category: "Conference",
    venue: "Nkrumah Hall",
    date: "2026-05-20",
    attendees: 480,
    status: "LIVE",
    description: "College-wide career forum with employers, alumni, and faculty speakers.",
  },
];

export const mockForumTopics: ForumTopic[] = [
  {
    id: "topic-lab-hours",
    topic: "Extending computer lab hours during project season",
    category: "Academic Affairs",
    replies: 42,
    views: 612,
    createdBy: "Faith Joseph",
    status: "PINNED",
    createdAt: "2026-03-01",
    summary: "Students are discussing extended lab access for final-year and group projects.",
  },
  {
    id: "topic-open-source",
    topic: "Open-source club proposal",
    category: "Technology",
    replies: 28,
    views: 391,
    createdBy: "Brian Massawe",
    status: "OPEN",
    createdAt: "2026-03-06",
    summary: "Proposal for a standing student club around open-source contribution.",
  },
  {
    id: "topic-transport",
    topic: "Transport schedule feedback",
    category: "Student Welfare",
    replies: 17,
    views: 204,
    createdBy: "Anonymous Student",
    status: "LOCKED",
    createdAt: "2026-02-20",
    summary: "Archived welfare discussion after recommendations were forwarded.",
  },
];

export const mockSuggestions: Suggestion[] = [
  {
    id: "suggestion-lab-equipment",
    subject: "Add more routers to the networking lab",
    anonymous: false,
    category: "Academic Affairs",
    status: "UNDER_REVIEW",
    submittedAt: "2026-03-05",
    description: "Networking classes need more router kits to reduce group sizes during practical sessions.",
  },
  {
    id: "suggestion-mental-health",
    subject: "Monthly student wellbeing office hours",
    anonymous: true,
    category: "Student Welfare",
    status: "PENDING",
    submittedAt: "2026-03-09",
    description: "Create confidential monthly office hours with welfare representatives and counselors.",
  },
  {
    id: "suggestion-media",
    subject: "Publish weekly college digest",
    anonymous: false,
    category: "Media",
    status: "RESOLVED",
    submittedAt: "2026-02-15",
    description: "The media committee should publish a weekly digest for announcements and event recaps.",
  },
];

export const mockPolls: Poll[] = [
  {
    id: "poll-hackathon-theme",
    title: "Preferred Hackathon Theme",
    responses: 728,
    endDate: "2026-04-05",
    status: "ACTIVE",
    question: "Which theme should lead the next CoICT hackathon?",
    options: ["Campus services", "AI for learning", "Fintech", "Health systems"],
  },
  {
    id: "poll-forum-time",
    title: "Best Time for Career Forum",
    responses: 412,
    endDate: "2026-03-30",
    status: "ACTIVE",
    question: "What time works best for the monthly career forum?",
    options: ["Morning", "Afternoon", "Evening"],
  },
  {
    id: "poll-sports-kit",
    title: "College Sports Kit Preference",
    responses: 289,
    endDate: "2026-02-28",
    status: "CLOSED",
    question: "Which sports kit style should represent CoICT?",
    options: ["Minimal", "Classic", "Modern"],
  },
];
