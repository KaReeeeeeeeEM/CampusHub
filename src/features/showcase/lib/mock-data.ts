export type ShowcaseVisibility = "Public" | "Private" | "Role-Based";
export type ShowcaseRoleAudience = "Students" | "Teachers" | "Employers" | "Alumni";
export type ShowcaseStatus =
  | "Published"
  | "In Review"
  | "Prototype"
  | "Research"
  | "Archived";

export type ShowcaseDocument = {
  title: string;
  description: string;
  url: string;
  type:
    | "Project Proposal"
    | "Research Paper"
    | "Technical Documentation"
    | "Business Plan"
    | "Presentation Slides"
    | "Requirements Document"
    | "User Manual";
};

export type ShowcaseProject = {
  id: string;
  name: string;
  shortDescription: string;
  detailedDescription: string;
  owner: string;
  ownerRole: string;
  category: string;
  coverImage: string;
  gallery: string[];
  tags: string[];
  status: ShowcaseStatus;
  visibility: ShowcaseVisibility;
  roleVisibility: ShowcaseRoleAudience[];
  views: number;
  uniqueVisitors: number;
  stars: number;
  linkClicks: number;
  githubClicks: number;
  websiteClicks: number;
  videoClicks: number;
  teamMembers: string[];
  demoLink: string;
  websiteLink: string;
  githubLink: string;
  videoLink: string;
  trafficSources: { source: string; value: number }[];
  activityGraph: { label: string; views: number; stars: number }[];
  documents: ShowcaseDocument[];
  featured?: boolean;
  trending?: boolean;
  newest?: boolean;
};

export type ShowcaseBadge = {
  id: string;
  name: string;
  description: string;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  color: string;
  status: "Shown" | "Hidden" | "Featured";
  unlocked: boolean;
  xp: number;
};

export const showcaseCategories = [
  "AI & Data",
  "Health Innovation",
  "Climate Tech",
  "FinTech",
  "Education Tech",
  "Creative Media",
  "Agriculture",
  "Social Impact",
];

export const showcaseProjects: ShowcaseProject[] = [
  {
    id: "project-1",
    name: "AfyaTrack AI",
    shortDescription:
      "A lightweight AI assistant that helps campus clinics triage student health concerns.",
    detailedDescription:
      "AfyaTrack AI combines symptom intake, appointment routing, and anonymized clinic trend reporting for university medical teams. The prototype focuses on privacy-first student care and faster clinic queue management.",
    owner: "Aisha Mrema",
    ownerRole: "Computer Science Student",
    category: "Health Innovation",
    coverImage:
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1581093458791-9d42cc030a45?auto=format&fit=crop&w=1200&q=80",
    ],
    tags: ["AI", "Health", "Triage", "Student Services"],
    status: "Prototype",
    visibility: "Public",
    roleVisibility: ["Students", "Teachers", "Employers"],
    views: 8240,
    uniqueVisitors: 3910,
    stars: 612,
    linkClicks: 1280,
    githubClicks: 410,
    websiteClicks: 642,
    videoClicks: 228,
    teamMembers: ["Aisha Mrema", "Kelvin Mushi", "Dr. Irene Paulo"],
    demoLink: "https://demo.campushub.local/afyatrack",
    websiteLink: "https://afyatrack.example.com",
    githubLink: "https://github.com/campushub/afyatrack",
    videoLink: "https://video.example.com/afyatrack",
    trafficSources: [
      { source: "CampusHub", value: 44 },
      { source: "LinkedIn", value: 22 },
      { source: "GitHub", value: 18 },
      { source: "Direct", value: 16 },
    ],
    activityGraph: [
      { label: "Mon", views: 420, stars: 32 },
      { label: "Tue", views: 610, stars: 44 },
      { label: "Wed", views: 520, stars: 38 },
      { label: "Thu", views: 770, stars: 59 },
      { label: "Fri", views: 840, stars: 71 },
    ],
    documents: [
      {
        title: "AfyaTrack Project Proposal",
        description: "Problem statement, clinical workflow, and implementation plan.",
        url: "https://docs.example.com/afyatrack-proposal",
        type: "Project Proposal",
      },
      {
        title: "Privacy Architecture",
        description: "Technical documentation for anonymized student health records.",
        url: "https://docs.example.com/afyatrack-privacy",
        type: "Technical Documentation",
      },
    ],
    featured: true,
    trending: true,
  },
  {
    id: "project-2",
    name: "MtaaPay Campus",
    shortDescription:
      "A student-led wallet concept for cash-light campus services and verified sellers.",
    detailedDescription:
      "MtaaPay Campus explores escrow-free buyer-seller coordination, wallet readiness, and student merchant verification for future university commerce ecosystems.",
    owner: "Daniel Rweikiza",
    ownerRole: "Business Information Systems Student",
    category: "FinTech",
    coverImage:
      "https://images.unsplash.com/photo-1559526324-593bc073d938?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80",
    ],
    tags: ["FinTech", "Market", "Wallet", "Campus Commerce"],
    status: "In Review",
    visibility: "Role-Based",
    roleVisibility: ["Students", "Employers", "Alumni"],
    views: 6360,
    uniqueVisitors: 2840,
    stars: 478,
    linkClicks: 940,
    githubClicks: 120,
    websiteClicks: 590,
    videoClicks: 230,
    teamMembers: ["Daniel Rweikiza", "Grace Kimaro", "Nuru Ally"],
    demoLink: "https://demo.campushub.local/mtaapay",
    websiteLink: "https://mtaapay.example.com",
    githubLink: "https://github.com/campushub/mtaapay-campus",
    videoLink: "https://video.example.com/mtaapay",
    trafficSources: [
      { source: "CampusHub", value: 52 },
      { source: "Employer Network", value: 24 },
      { source: "Direct", value: 14 },
      { source: "Alumni", value: 10 },
    ],
    activityGraph: [
      { label: "Mon", views: 310, stars: 22 },
      { label: "Tue", views: 430, stars: 31 },
      { label: "Wed", views: 580, stars: 49 },
      { label: "Thu", views: 620, stars: 51 },
      { label: "Fri", views: 710, stars: 66 },
    ],
    documents: [
      {
        title: "Business Plan",
        description: "Campus merchant model, risks, and go-to-market assumptions.",
        url: "https://docs.example.com/mtaapay-business-plan",
        type: "Business Plan",
      },
    ],
    featured: true,
    trending: true,
  },
  {
    id: "project-3",
    name: "Smart Almanac Engine",
    shortDescription:
      "A scheduling intelligence layer for academic dates, exams, and student reminders.",
    detailedDescription:
      "Smart Almanac Engine models academic calendars as structured events that can power notifications, conflict checks, and future AI assistant workflows for students and campus administrators.",
    owner: "Brian Macha",
    ownerRole: "Software Engineering Student",
    category: "Education Tech",
    coverImage:
      "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
    ],
    tags: ["Calendar", "AI", "Academic Planning"],
    status: "Published",
    visibility: "Public",
    roleVisibility: ["Students", "Teachers"],
    views: 4980,
    uniqueVisitors: 2404,
    stars: 355,
    linkClicks: 712,
    githubClicks: 286,
    websiteClicks: 310,
    videoClicks: 116,
    teamMembers: ["Brian Macha", "Faith Joseph"],
    demoLink: "https://demo.campushub.local/almanac",
    websiteLink: "https://smartalmanac.example.com",
    githubLink: "https://github.com/campushub/smart-almanac",
    videoLink: "https://video.example.com/smart-almanac",
    trafficSources: [
      { source: "CampusHub", value: 60 },
      { source: "GitHub", value: 18 },
      { source: "Direct", value: 12 },
      { source: "Faculty", value: 10 },
    ],
    activityGraph: [
      { label: "Mon", views: 240, stars: 17 },
      { label: "Tue", views: 330, stars: 24 },
      { label: "Wed", views: 420, stars: 30 },
      { label: "Thu", views: 460, stars: 35 },
      { label: "Fri", views: 510, stars: 39 },
    ],
    documents: [
      {
        title: "Technical Documentation",
        description: "Calendar domain model, data structures, and event lifecycle.",
        url: "https://docs.example.com/smart-almanac-tech",
        type: "Technical Documentation",
      },
      {
        title: "User Manual",
        description: "Student-facing workflows and event discovery patterns.",
        url: "https://docs.example.com/smart-almanac-manual",
        type: "User Manual",
      },
    ],
    newest: true,
  },
  {
    id: "project-4",
    name: "AgriSense Lab",
    shortDescription:
      "Low-cost soil monitoring kit for student farms and climate research groups.",
    detailedDescription:
      "AgriSense Lab uses affordable sensors and a simple web dashboard to help agriculture students track soil moisture, temperature, and field experiment conditions.",
    owner: "Rehema Kileo",
    ownerRole: "Agricultural Engineering Student",
    category: "Agriculture",
    coverImage:
      "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
    ],
    tags: ["IoT", "Agriculture", "Climate", "Sensors"],
    status: "Research",
    visibility: "Public",
    roleVisibility: ["Students", "Teachers", "Employers"],
    views: 3790,
    uniqueVisitors: 1802,
    stars: 282,
    linkClicks: 604,
    githubClicks: 190,
    websiteClicks: 320,
    videoClicks: 94,
    teamMembers: ["Rehema Kileo", "Samwel John", "Dr. Peter Maro"],
    demoLink: "https://demo.campushub.local/agrisense",
    websiteLink: "https://agrisense.example.com",
    githubLink: "https://github.com/campushub/agrisense",
    videoLink: "https://video.example.com/agrisense",
    trafficSources: [
      { source: "CampusHub", value: 45 },
      { source: "Research Forum", value: 25 },
      { source: "Direct", value: 20 },
      { source: "Employer Network", value: 10 },
    ],
    activityGraph: [
      { label: "Mon", views: 210, stars: 12 },
      { label: "Tue", views: 280, stars: 19 },
      { label: "Wed", views: 360, stars: 21 },
      { label: "Thu", views: 390, stars: 27 },
      { label: "Fri", views: 430, stars: 33 },
    ],
    documents: [
      {
        title: "Research Paper",
        description: "Initial field results and sensor calibration methodology.",
        url: "https://docs.example.com/agrisense-paper",
        type: "Research Paper",
      },
    ],
    newest: true,
  },
];

export const showcaseBadges: ShowcaseBadge[] = [
  {
    id: "badge-1",
    name: "Innovator",
    description: "Published a project with real campus impact.",
    rarity: "Epic",
    color: "#8B5CF6",
    status: "Featured",
    unlocked: true,
    xp: 1200,
  },
  {
    id: "badge-2",
    name: "Rising Innovator",
    description: "Earned 100+ project stars across the showcase.",
    rarity: "Rare",
    color: "#3B82F6",
    status: "Shown",
    unlocked: true,
    xp: 850,
  },
  {
    id: "badge-3",
    name: "Top Creator",
    description: "Ranked among the top creators this month.",
    rarity: "Legendary",
    color: "#D4A017",
    status: "Shown",
    unlocked: true,
    xp: 700,
  },
  {
    id: "badge-4",
    name: "Entrepreneur",
    description: "Connected a project to a startup or market opportunity.",
    rarity: "Epic",
    color: "#EC4899",
    status: "Hidden",
    unlocked: true,
    xp: 640,
  },
  {
    id: "badge-5",
    name: "Community Voice",
    description: "Created helpful forum and suggestion activity.",
    rarity: "Common",
    color: "#10B981",
    status: "Shown",
    unlocked: true,
    xp: 420,
  },
  {
    id: "badge-6",
    name: "Project Star",
    description: "Receive 500 stars on a single project.",
    rarity: "Rare",
    color: "#F59E0B",
    status: "Hidden",
    unlocked: false,
    xp: 500,
  },
];

export const xpSources = [
  { source: "Project Creation", xp: 900 },
  { source: "Project Views", xp: 720 },
  { source: "Project Stars", xp: 650 },
  { source: "Marketplace Activity", xp: 260 },
  { source: "Forum Activity", xp: 340 },
  { source: "Event Participation", xp: 410 },
  { source: "Daily Streaks", xp: 280 },
  { source: "Profile Completion", xp: 200 },
];

export const showcaseProfile = {
  level: 12,
  currentXp: 4280,
  nextLevelXp: 5000,
  streak: 17,
  topProject: showcaseProjects[0],
  featuredProjects: showcaseProjects.slice(0, 3),
};

export const showcaseLeaderboards = {
  topProjects: showcaseProjects,
  trendingThisWeek: [...showcaseProjects].sort((a, b) => b.views - a.views),
  mostViewed: [...showcaseProjects].sort((a, b) => b.views - a.views),
  mostStarred: [...showcaseProjects].sort((a, b) => b.stars - a.stars),
  mostActiveCreators: [
    { name: "Aisha Mrema", value: "18 updates", meta: "Health Innovation" },
    { name: "Daniel Rweikiza", value: "15 updates", meta: "FinTech" },
    { name: "Brian Macha", value: "12 updates", meta: "Education Tech" },
    { name: "Rehema Kileo", value: "9 updates", meta: "Agriculture" },
  ],
  topInnovators: [
    { name: "Aisha Mrema", value: "4,280 XP", meta: "Level 12" },
    { name: "Daniel Rweikiza", value: "3,940 XP", meta: "Level 11" },
    { name: "Rehema Kileo", value: "3,360 XP", meta: "Level 10" },
    { name: "Brian Macha", value: "3,110 XP", meta: "Level 9" },
  ],
};
