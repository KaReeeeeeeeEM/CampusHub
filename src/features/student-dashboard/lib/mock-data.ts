import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Compass,
  FileText,
  Lightbulb,
  Map,
  MessageSquareText,
  PackageSearch,
  ShoppingBag,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

type AnnouncementHighlight = {
  title: string;
  source: string;
  time: string;
  priority: string;
};

type UpcomingEvent = {
  title: string;
  date: string;
  location: string;
  category: string;
};

type AlmanacHighlight = {
  title: string;
  date: string;
  description: string;
};

type DashboardNotification = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const studentProfile = {
  name: "Student",
  university: "",
  college: "",
  department: "",
  yearOfStudy: "",
  completion: 0,
};

export const announcementHighlights: AnnouncementHighlight[] = [];
export const upcomingEvents: UpcomingEvent[] = [];
export const almanacHighlights: AlmanacHighlight[] = [];
export const notifications: DashboardNotification[] = [];

export const quickActions = [
  {
    label: "View almanac",
    description: "Academic dates",
    href: "/student/almanac",
    icon: CalendarDays,
  },
  {
    label: "Find campus office",
    description: "Map access",
    href: "/student/map",
    icon: Map,
  },
  {
    label: "Course resources",
    description: "Learning materials",
    href: "/student/almanac",
    icon: BookOpen,
  },
  {
    label: "Submit feedback",
    description: "Representative channel",
    href: "/student/suggestions",
    icon: FileText,
  },
];

export const futureModules = [
  { title: "Forum", description: "", icon: MessageSquareText },
  { title: "Suggestions", description: "", icon: Lightbulb },
  { title: "Opportunities", description: "", icon: BriefcaseBusiness },
  { title: "Alumni", description: "", icon: UsersRound },
  { title: "Marketplace", description: "", icon: ShoppingBag },
  { title: "Lost & Found", description: "", icon: PackageSearch },
];

export const campusMapQuickAccess = {
  title: "Campus Map",
  description: "Campus locations will appear when real map records exist.",
  landmarks: [] as string[],
  icon: Compass,
};
