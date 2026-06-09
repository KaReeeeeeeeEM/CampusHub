import {
  Bell,
  BookOpen,
  CalendarDays,
  Compass,
  Home,
  Lightbulb,
  Map,
  MessageSquareText,
  PackageSearch,
  ShoppingBag,
  UsersRound,
} from "lucide-react";

export type StudentNavKey =
  | "dashboard"
  | "announcements"
  | "events"
  | "almanac"
  | "campus-map"
  | "forum"
  | "suggestions"
  | "opportunities"
  | "alumni"
  | "marketplace"
  | "lost-and-found";

export type StudentNavItem = {
  key: StudentNavKey;
  label: string;
  href: string;
  description: string;
  comingSoon: boolean;
  icon: React.ComponentType<{ className?: string }>;
};

export const studentNavigationItems: StudentNavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/student/dashboard",
    description: "Student portal overview and activity foundation.",
    comingSoon: false,
    icon: Home,
  },
  {
    key: "announcements",
    label: "Announcements",
    href: "/student/announcements",
    description: "Official university and college communication.",
    comingSoon: true,
    icon: Bell,
  },
  {
    key: "events",
    label: "Events",
    href: "/student/events",
    description: "Campus events, sessions, and student activities.",
    comingSoon: true,
    icon: CalendarDays,
  },
  {
    key: "almanac",
    label: "Almanac",
    href: "/student/almanac",
    description: "Academic dates, deadlines, and semester milestones.",
    comingSoon: true,
    icon: BookOpen,
  },
  {
    key: "campus-map",
    label: "Campus Map",
    href: "/student/campus-map",
    description: "Buildings, offices, labs, services, and campus places.",
    comingSoon: true,
    icon: Map,
  },
  {
    key: "forum",
    label: "Forum",
    href: "/student/forum",
    description: "Moderated academic and campus community discussions.",
    comingSoon: true,
    icon: MessageSquareText,
  },
  {
    key: "suggestions",
    label: "Suggestions",
    href: "/student/suggestions",
    description: "Structured feedback for representatives and leadership.",
    comingSoon: true,
    icon: Lightbulb,
  },
  {
    key: "opportunities",
    label: "Opportunities",
    href: "/student/opportunities",
    description: "Internships, scholarships, competitions, and programs.",
    comingSoon: true,
    icon: Compass,
  },
  {
    key: "alumni",
    label: "Alumni",
    href: "/student/alumni",
    description: "Mentorship, graduate stories, and network access.",
    comingSoon: true,
    icon: UsersRound,
  },
  {
    key: "marketplace",
    label: "Marketplace",
    href: "/student/marketplace",
    description: "Trusted campus commerce and partner services.",
    comingSoon: true,
    icon: ShoppingBag,
  },
  {
    key: "lost-and-found",
    label: "Lost & Found",
    href: "/student/lost-and-found",
    description: "Report, search, and recover lost campus items.",
    comingSoon: true,
    icon: PackageSearch,
  },
];

export const futureStudentNavigationItems = studentNavigationItems.filter(
  (item) => item.comingSoon,
);

export function getStudentNavItemByKey(key: string) {
  return studentNavigationItems.find((item) => item.key === key) ?? null;
}
