import {
  FiBell,
  FiBriefcase,
  FiCalendar,
  FiHome,
  FiStar,
  FiUser,
  FiUsers,
} from "react-icons/fi";

export type AlumniNavKey =
  | "dashboard"
  | "community"
  | "mentorship"
  | "students"
  | "showcase"
  | "events"
  | "opportunities"
  | "profile"
  | "notifications";

export type AlumniNavItem = {
  key: AlumniNavKey;
  label: string;
  href: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const alumniNavigationItems: AlumniNavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/alumni/dashboard",
    description: "Alumni network activity, mentorship, and campus updates.",
    icon: FiHome,
  },
  {
    key: "community",
    label: "Community",
    href: "/alumni/community",
    description: "Find alumni by graduation year, industry, and location.",
    icon: FiUsers,
  },
  {
    key: "mentorship",
    label: "Mentorship",
    href: "/alumni/mentorship",
    description: "Manage mentorships, requests, and student guidance.",
    icon: FiStar,
  },
  {
    key: "students",
    label: "Students",
    href: "/alumni/students",
    description: "Discover talented students and offer mentorship.",
    icon: FiUsers,
  },
  {
    key: "showcase",
    label: "Showcase",
    href: "/alumni/showcase",
    description: "Review student projects, research, and innovations.",
    icon: FiStar,
  },
  {
    key: "events",
    label: "Events",
    href: "/alumni/events",
    description: "Networking events, reunions, workshops, and career sessions.",
    icon: FiCalendar,
  },
  {
    key: "opportunities",
    label: "Opportunities",
    href: "/alumni/opportunities",
    description: "Share jobs, internships, scholarships, and funding.",
    icon: FiBriefcase,
  },
  {
    key: "profile",
    label: "Profile",
    href: "/alumni/profile",
    description: "Professional profile, education, and contributions.",
    icon: FiUser,
  },
  {
    key: "notifications",
    label: "Notifications",
    href: "/alumni/notifications",
    description: "Mentorship, event, opportunity, and showcase updates.",
    icon: FiBell,
  },
];

export function getAlumniNavItemByPath(pathname: string) {
  return (
    alumniNavigationItems.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? alumniNavigationItems[0]
  );
}
