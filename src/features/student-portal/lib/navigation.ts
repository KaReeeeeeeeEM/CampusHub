import {
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiClipboard,
  FiHome,
  FiMap,
  FiMessageSquare,
  FiPieChart,
  FiSend,
  FiShield,
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
  | "suggestions"
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
    key: "suggestions",
    label: "Suggestions",
    href: "/student/suggestions",
    description: "Submit and track feedback for representatives.",
    icon: FiZap,
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
    label: "Committee Management",
    href: "/student/leadership/committee",
    description: "College coordination and student leadership workflows.",
    section: "Leadership",
    requiredPosition: "REPRESENTATIVE",
    icon: FiUsers,
  },
  {
    key: "representative-invitations",
    label: "Student Invitations",
    href: "/student/leadership/invitations",
    description: "Invitation links and student enrollment tracking.",
    section: "Leadership",
    requiredPosition: "REPRESENTATIVE",
    icon: FiSend,
  },
  {
    key: "representative-announcements",
    label: "College Announcements",
    href: "/student/leadership/announcements",
    description: "College-level announcements and communication.",
    section: "Leadership",
    requiredPosition: "REPRESENTATIVE",
    icon: FiBell,
  },
  {
    key: "representative-events",
    label: "College Events",
    href: "/student/leadership/events",
    description: "College events, workshops, and community activities.",
    section: "Leadership",
    requiredPosition: "REPRESENTATIVE",
    icon: FiCalendar,
  },
  {
    key: "representative-forums",
    label: "Forums Management",
    href: "/student/leadership/forums",
    description: "Moderate college community discussions.",
    section: "Leadership",
    requiredPosition: "REPRESENTATIVE",
    icon: FiMessageSquare,
  },
  {
    key: "representative-suggestions",
    label: "Suggestions Management",
    href: "/student/leadership/suggestions",
    description: "Review and track student feedback.",
    section: "Leadership",
    requiredPosition: "REPRESENTATIVE",
    icon: FiZap,
  },
  {
    key: "representative-polls",
    label: "Polls Management",
    href: "/student/leadership/polls",
    description: "Structured polls for student-informed decisions.",
    section: "Leadership",
    requiredPosition: "REPRESENTATIVE",
    icon: FiPieChart,
  },
  {
    key: "committee-tasks",
    label: "Tasks",
    href: "/student/my-committee/tasks",
    description: "Assigned committee tasks and progress.",
    section: "My Committee",
    requiredPosition: "COMMITTEE_MEMBER",
    icon: FiClipboard,
  },
  {
    key: "committee-announcements",
    label: "Category Announcements",
    href: "/student/my-committee/announcements",
    description: "Category-specific announcements.",
    section: "My Committee",
    requiredPosition: "COMMITTEE_MEMBER",
    icon: FiBell,
  },
  {
    key: "committee-events",
    label: "Category Events",
    href: "/student/my-committee/events",
    description: "Category-specific events and calendar work.",
    section: "My Committee",
    requiredPosition: "COMMITTEE_MEMBER",
    icon: FiCalendar,
  },
  {
    key: "committee-discussions",
    label: "Category Discussions",
    href: "/student/my-committee/discussions",
    description: "Category-specific committee operations.",
    section: "My Committee",
    requiredPosition: "COMMITTEE_MEMBER",
    icon: FiShield,
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
