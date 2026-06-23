import {
  FiArchive,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiCheckSquare,
  FiFileText,
  FiHome,
  FiMap,
  FiMessageSquare,
  FiPieChart,
  FiSend,
  FiShoppingBag,
  FiStar,
  FiUser,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import type { StudentLeadershipPosition } from "@/features/authorization/roles";

export type StudentNavKey =
  | "dashboard"
  | "announcements"
  | "events"
  | "almanac"
  | "map"
  | "forum"
  | "polls"
  | "suggestions"
  | "lost-found"
  | "documents"
  | "market"
  | "showcase"
  | "profile"
  | "notifications";

export type StudentNavItem = {
  key: StudentNavKey;
  label: string;
  href: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

export type StudentLeadershipNavItem = {
  key: string;
  label: string;
  href: string;
  description: string;
  section: "Leadership" | "My Committee";
  requiredPosition: StudentLeadershipPosition;
  icon: React.ComponentType<{ className?: string }>;
};

export const studentNavigationItems: StudentNavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/student/dashboard",
    description: "Daily feed, campus updates, and quick access.",
    icon: FiHome,
  },
  {
    key: "announcements",
    label: "Announcements",
    href: "/student/announcements",
    description: "Official academic and college updates.",
    icon: FiBell,
  },
  {
    key: "events",
    label: "Events",
    href: "/student/events",
    description: "Campus activities, workshops, sports, and conferences.",
    icon: FiCalendar,
  },
  {
    key: "almanac",
    label: "Almanac",
    href: "/student/almanac",
    description: "Academic dates, exams, and semester milestones.",
    icon: FiBookOpen,
  },
  {
    key: "map",
    label: "Campus Map",
    href: "/student/map",
    description: "Find lecture halls, libraries, services, and student spaces.",
    icon: FiMap,
  },
  {
    key: "forum",
    label: "Forum",
    href: "/student/forum",
    description: "Student discussions and moderated campus communities.",
    icon: FiMessageSquare,
  },
  {
    key: "polls",
    label: "Polls",
    href: "/student/polls",
    description: "Vote on active polls and review student feedback results.",
    icon: FiPieChart,
  },
  {
    key: "suggestions",
    label: "Suggestions",
    href: "/student/suggestions",
    description: "Submit and track feedback for representatives.",
    icon: FiZap,
  },
  {
    key: "lost-found",
    label: "Lost & Found",
    href: "/student/lost-found",
    description: "Report, search, and recover lost campus items.",
    icon: FiArchive,
  },
  {
    key: "documents",
    label: "Documents",
    href: "/student/documents",
    description: "Upload and manage CVs, IDs, certificates, and records.",
    icon: FiFileText,
  },
  {
    key: "market",
    label: "Market",
    href: "/student/market",
    description: "Buy, sell, and discover campus products and student shops.",
    icon: FiShoppingBag,
  },
  {
    key: "showcase",
    label: "Showcase",
    href: "/student/showcase",
    description: "Publish projects, achievements, research, and portfolios.",
    icon: FiStar,
  },
  {
    key: "profile",
    label: "Profile",
    href: "/student/profile",
    description: "Academic profile, skills, interests, and achievements.",
    icon: FiUser,
  },
  {
    key: "notifications",
    label: "Notifications",
    href: "/student/notifications",
    description: "Announcement, event, forum, suggestion, and system alerts.",
    icon: FiBell,
  },
];

export const futureStudentNavigationItems: StudentNavItem[] = [];

export const studentLeadershipNavigationItems: StudentLeadershipNavItem[] = [
  {
    key: "representative-committee",
    label: "Committee",
    href: "/student/leadership/committee",
    description: "Create committees and coordinate student leadership workflows.",
    section: "Leadership",
    requiredPosition: "REPRESENTATIVE",
    icon: FiUsers,
  },
  {
    key: "representative-invitations",
    label: "Invitations",
    href: "/student/leadership/invitations",
    description: "Generate and manage student invitation links.",
    section: "Leadership",
    requiredPosition: "REPRESENTATIVE",
    icon: FiSend,
  },
  {
    key: "committee-tasks",
    label: "Tasks",
    href: "/student/my-committee/tasks",
    description: "Track committee tasks and follow-ups.",
    section: "My Committee",
    requiredPosition: "COMMITTEE_MEMBER",
    icon: FiCheckSquare,
  },
];

export function getVisibleStudentLeadershipNavigationItems(
  positions: StudentLeadershipPosition[],
) {
  return studentLeadershipNavigationItems.filter((item) =>
    positions.includes(item.requiredPosition),
  );
}

export function getStudentNavItemByKey(key: string) {
  return studentNavigationItems.find((item) => item.key === key) ?? null;
}
