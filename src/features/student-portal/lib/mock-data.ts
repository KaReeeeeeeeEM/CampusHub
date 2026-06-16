export type StudentAnnouncement = {
  id: string;
  title: string;
  category:
    | "Academic"
    | "Sports"
    | "Technology"
    | "Entertainment"
    | "Media"
    | "Student Welfare";
  audience: string;
  date: string;
  pinned: boolean;
  body: string;
};

export type StudentEvent = {
  id: string;
  title: string;
  category:
    | "Hackathons"
    | "Workshops"
    | "Sports"
    | "Club Activities"
    | "Conferences"
    | "Social Events";
  banner: string;
  date: string;
  time: string;
  venue: string;
  expectedAttendees: number;
  status: "Open" | "Almost Full" | "Registered" | "Closed";
  description: string;
};

export type AlmanacItem = {
  id: string;
  title: string;
  type: "Academic Activity" | "Deadline" | "Exam" | "Registration";
  date: string;
  time: string;
  location: string;
  description: string;
};

export type CampusLocation = {
  id: string;
  name: string;
  category:
    | "Library"
    | "Lecture Hall"
    | "Hostels"
    | "Administration"
    | "Sports"
    | "Medical"
    | "Dining";
  code: string;
  distance: string;
  openNow: boolean;
  coordinates: string;
  description: string;
};

export type ForumTopic = {
  id: string;
  title: string;
  category: string;
  replies: number;
  views: number;
  author: string;
  pinned: boolean;
  trending: boolean;
  createdAt: string;
  summary: string;
};

export type StudentSuggestion = {
  id: string;
  subject: string;
  category: string;
  anonymous: boolean;
  status: "Pending" | "Under Review" | "Resolved" | "Rejected";
  submittedAt: string;
  response: string;
  description: string;
};

export type StudentNotification = {
  id: string;
  type:
    | "Announcement"
    | "Event"
    | "Forum Activity"
    | "Poll"
    | "Suggestion Update"
    | "System";
  title: string;
  description: string;
  time: string;
  unread: boolean;
};

export const announcementCategories = [
  "All",
  "Academic",
  "Sports",
  "Technology",
  "Entertainment",
  "Media",
  "Student Welfare",
] as const;

export const mockStudentProfile = {
  name: "Faith Joseph",
  email: "faith.joseph@udsm.ac.tz",
  university: "University of Dar es Salaam",
  college: "College of ICT",
  department: "Computer Science",
  year: "Year 2",
  completion: 78,
  skills: ["React", "Python", "Data Analysis", "Public Speaking"],
  interests: ["AI for Education", "Hackathons", "Product Design"],
  achievements: [
    "Dean's List 2025",
    "CoICT Innovation Hackathon finalist",
    "Google Developer Student Club contributor",
  ],
  socials: ["linkedin.com/in/faith-joseph", "github.com/faithjoseph"],
};

export const mockAnnouncements: StudentAnnouncement[] = [
  {
    id: "ann-registration",
    title: "Semester II registration closes Friday",
    category: "Academic",
    audience: "All CoICT students",
    date: "2026-06-12",
    pinned: true,
    body: "Students must complete Semester II registration before Friday at 4:00 PM. Visit the academic office if your course list is incomplete.",
  },
  {
    id: "ann-hackathon",
    title: "Innovation Hackathon teams now open",
    category: "Technology",
    audience: "Technology clubs",
    date: "2026-06-09",
    pinned: true,
    body: "Team formation is open for the UDSM Innovation Hackathon. Students may register in teams of three to five members.",
  },
  {
    id: "ann-welfare",
    title: "Student wellbeing office hours",
    category: "Student Welfare",
    audience: "All students",
    date: "2026-06-08",
    pinned: false,
    body: "The student welfare committee will host confidential office hours every Wednesday afternoon at the CoICT representative office.",
  },
  {
    id: "ann-sports",
    title: "Inter-college football trials",
    category: "Sports",
    audience: "Sports clubs",
    date: "2026-06-07",
    pinned: false,
    body: "Football trials start at the main sports complex this Saturday. Bring your student ID and training gear.",
  },
  {
    id: "ann-media",
    title: "Media team opens photography sign-ups",
    category: "Media",
    audience: "Student creators",
    date: "2026-06-02",
    pinned: false,
    body: "Students interested in campus photography, event coverage, and short-form video production can register with the media committee this week.",
  },
  {
    id: "ann-entertainment",
    title: "Cultural night performance auditions",
    category: "Entertainment",
    audience: "Arts and culture groups",
    date: "2026-05-20",
    pinned: false,
    body: "Auditions for music, spoken word, dance, and theatre performances will be held at the student centre auditorium.",
  },
  {
    id: "ann-library",
    title: "Library quiet-study wing extended hours",
    category: "Academic",
    audience: "All students",
    date: "2026-04-25",
    pinned: false,
    body: "The quiet-study wing will remain open until 10:00 PM on weekdays during the assessment preparation period.",
  },
];

export const mockEvents: StudentEvent[] = [
  {
    id: "event-ai",
    title: "Applied AI Workshop",
    category: "Workshops",
    banner:
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80",
    date: "2026-06-18",
    time: "10:00 AM",
    venue: "CoICT Lecture Theatre 2",
    expectedAttendees: 220,
    status: "Open",
    description:
      "A practical session on using modern AI tools for research, learning workflows, and campus innovation projects.",
  },
  {
    id: "event-hackathon",
    title: "UDSM Innovation Hackathon",
    category: "Hackathons",
    banner:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
    date: "2026-06-27",
    time: "8:30 AM",
    venue: "CoICT Innovation Lab",
    expectedAttendees: 340,
    status: "Almost Full",
    description:
      "A forty-eight-hour build sprint with alumni mentors and employer judges focused on campus services.",
  },
  {
    id: "event-career",
    title: "Technology Career Forum",
    category: "Conferences",
    banner:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80",
    date: "2026-07-04",
    time: "2:00 PM",
    venue: "Nkrumah Hall",
    expectedAttendees: 480,
    status: "Registered",
    description:
      "Meet employers, alumni, and faculty speakers discussing early career pathways in technology.",
  },
];

export const mockAlmanacItems: AlmanacItem[] = [
  {
    id: "alm-registration",
    title: "Course Add/Drop Deadline",
    type: "Deadline",
    date: "2026-06-13",
    time: "4:00 PM",
    location: "Academic Office",
    description: "Last day to update Semester II course registration.",
  },
  {
    id: "alm-midsemester",
    title: "Mid-Semester Examination Week",
    type: "Exam",
    date: "2026-06-22",
    time: "8:00 AM",
    location: "Department noticeboards",
    description: "Mid-semester assessment period for undergraduate modules.",
  },
  {
    id: "alm-research",
    title: "Final Year Project Proposal Review",
    type: "Academic Activity",
    date: "2026-07-01",
    time: "9:00 AM",
    location: "CoICT Seminar Rooms",
    description: "Proposal review panels for final-year project teams.",
  },
];

export const mockCampusLocations: CampusLocation[] = [
  {
    id: "loc-library",
    name: "Dr. Wilbert Chagula Library",
    category: "Library",
    code: "LIB-01",
    distance: "6 min walk",
    openNow: true,
    coordinates: "-6.7786, 39.2054",
    description:
      "Main study space with digital resources and quiet reading areas.",
  },
  {
    id: "loc-theatre",
    name: "CoICT Lecture Theatre 2",
    category: "Lecture Hall",
    code: "COICT-LT2",
    distance: "2 min walk",
    openNow: true,
    coordinates: "-6.7768, 39.2041",
    description:
      "Large lecture theatre used for workshops, seminars, and core courses.",
  },
  {
    id: "loc-medical",
    name: "University Health Centre",
    category: "Medical",
    code: "MED-01",
    distance: "11 min walk",
    openNow: true,
    coordinates: "-6.7802, 39.2063",
    description: "Primary medical service point for students and staff.",
  },
  {
    id: "loc-dining",
    name: "Main Student Cafeteria",
    category: "Dining",
    code: "DIN-03",
    distance: "8 min walk",
    openNow: false,
    coordinates: "-6.7794, 39.2032",
    description: "Dining hall serving lunch, snacks, and evening meals.",
  },
];

export const mockForumTopics: ForumTopic[] = [
  {
    id: "forum-labs",
    title: "Can computer labs stay open later during project season?",
    category: "Academic",
    replies: 42,
    views: 612,
    author: "Faith Joseph",
    pinned: true,
    trending: true,
    createdAt: "2026-06-10",
    summary: "Students are coordinating feedback on extended lab access.",
  },
  {
    id: "forum-open-source",
    title: "Starting an open-source contribution circle",
    category: "Technology",
    replies: 28,
    views: 391,
    author: "Brian Massawe",
    pinned: false,
    trending: true,
    createdAt: "2026-06-08",
    summary: "A weekly group for contributing to real open-source projects.",
  },
  {
    id: "forum-cafeteria",
    title: "Best affordable lunch options near CoICT",
    category: "Campus Life",
    replies: 19,
    views: 220,
    author: "Lina Ally",
    pinned: false,
    trending: false,
    createdAt: "2026-06-06",
    summary: "Students are sharing affordable and reliable lunch spots.",
  },
];

export const mockSuggestions: StudentSuggestion[] = [
  {
    id: "sug-routers",
    subject: "Add more routers to networking lab",
    category: "Academic",
    anonymous: false,
    status: "Under Review",
    submittedAt: "2026-06-03",
    response: "Forwarded to the department practical coordinator.",
    description:
      "Networking practical sessions need more router kits to reduce group sizes.",
  },
  {
    id: "sug-wellbeing",
    subject: "Monthly wellbeing office hours",
    category: "Student Welfare",
    anonymous: true,
    status: "Pending",
    submittedAt: "2026-06-09",
    response: "Awaiting committee review.",
    description:
      "Create confidential office hours with welfare representatives and counselors.",
  },
  {
    id: "sug-digest",
    subject: "Weekly college digest",
    category: "Media",
    anonymous: false,
    status: "Resolved",
    submittedAt: "2026-05-28",
    response: "The media committee will pilot this next month.",
    description:
      "A weekly summary would reduce missed announcements and event updates.",
  },
];

export const mockNotifications: StudentNotification[] = [
  {
    id: "not-ann",
    type: "Announcement",
    title: "Semester II registration reminder",
    description: "Registration closes Friday at 4:00 PM.",
    time: "12 min ago",
    unread: true,
  },
  {
    id: "not-event",
    type: "Event",
    title: "Applied AI Workshop RSVP confirmed",
    description: "Your seat is reserved for April 18.",
    time: "2 hours ago",
    unread: true,
  },
  {
    id: "not-forum",
    type: "Forum Activity",
    title: "New reply in lab hours discussion",
    description: "A representative replied with next steps.",
    time: "Yesterday",
    unread: false,
  },
  {
    id: "not-poll",
    type: "Poll",
    title: "New Poll Available",
    description:
      "Technology Committee has created a new poll: Should CampusHub launch a mobile app?",
    time: "Yesterday",
    unread: false,
  },
  {
    id: "not-suggestion",
    type: "Suggestion Update",
    title: "Networking lab suggestion under review",
    description: "The department practical coordinator has received it.",
    time: "Mar 12",
    unread: false,
  },
];
