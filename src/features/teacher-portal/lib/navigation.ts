import {
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiHome,
  FiPieChart,
  FiStar,
  FiUser,
  FiUsers,
} from "react-icons/fi";

export type TeacherNavKey =
  | "dashboard"
  | "announcements"
  | "almanac"
  | "events"
  | "showcase"
  | "students"
  | "polls"
  | "profile"
  | "notifications";

export type TeacherNavItem = {
  key: TeacherNavKey;
  label: string;
  href: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const teacherNavigationItems: TeacherNavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/teacher/dashboard",
    description: "Academic overview, talent signals, and campus activity.",
    icon: FiHome,
  },
  {
    key: "announcements",
    label: "Announcements",
    href: "/teacher/announcements",
    description: "University, academic, research, and department updates.",
    icon: FiBell,
  },
  {
    key: "almanac",
    label: "Almanac",
    href: "/teacher/almanac",
    description: "Academic dates, exams, deadlines, and university activities.",
    icon: FiBookOpen,
  },
  {
    key: "events",
    label: "Events",
    href: "/teacher/events",
    description: "Academic events, research seminars, and student programs.",
    icon: FiCalendar,
  },
  {
    key: "showcase",
    label: "Showcase",
    href: "/teacher/showcase",
    description: "Discover student projects, research, and innovations.",
    icon: FiStar,
  },
  {
    key: "students",
    label: "Students",
    href: "/teacher/students",
    description: "Find talented students, projects, achievements, and skills.",
    icon: FiUsers,
  },
  {
    key: "polls",
    label: "Polls",
    href: "/teacher/polls",
    description: "Create, vote on, and review academic feedback polls.",
    icon: FiPieChart,
  },
  {
    key: "profile",
    label: "Profile",
    href: "/teacher/profile",
    description: "Academic profile, participation, and contribution summary.",
    icon: FiUser,
  },
  {
    key: "notifications",
    label: "Notifications",
    href: "/teacher/notifications",
    description: "Announcements, events, polls, student, and showcase updates.",
    icon: FiBell,
  },
];

export function getTeacherNavItemByPath(pathname: string) {
  return (
    teacherNavigationItems.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? teacherNavigationItems[0]
  );
}
