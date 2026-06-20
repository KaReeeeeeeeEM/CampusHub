import {
  FiBarChart2,
  FiBell,
  FiBookmark,
  FiBriefcase,
  FiGrid,
  FiSearch,
  FiStar,
  FiUser,
} from "react-icons/fi";

export type EmployerNavKey =
  | "dashboard"
  | "talent"
  | "showcase"
  | "saved-candidates"
  | "opportunities"
  | "analytics"
  | "profile"
  | "notifications";

export type EmployerNavItem = {
  key: EmployerNavKey;
  label: string;
  href: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const employerNavigationItems: EmployerNavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/employer/dashboard",
    description: "Talent pipeline, project signals, and recruiting activity.",
    icon: FiGrid,
  },
  {
    key: "talent",
    label: "Talent Discovery",
    href: "/employer/talent-discovery",
    description: "Advanced student search with skills, projects, and badges.",
    icon: FiSearch,
  },
  {
    key: "showcase",
    label: "Showcase",
    href: "/employer/showcase",
    description: "Discover projects, innovations, and featured creators.",
    icon: FiStar,
  },
  {
    key: "saved-candidates",
    label: "Talent Pool",
    href: "/employer/saved-candidates",
    description: "Manage saved talent, shortlists, and comparisons.",
    icon: FiBookmark,
  },
  {
    key: "opportunities",
    label: "Opportunities",
    href: "/employer/opportunities",
    description: "Create and manage internships, jobs, and competitions.",
    icon: FiBriefcase,
  },
  {
    key: "analytics",
    label: "Analytics",
    href: "/employer/analytics",
    description: "Recruitment reach, opportunity performance, and engagement.",
    icon: FiBarChart2,
  },
  {
    key: "profile",
    label: "Profile",
    href: "/employer/profile",
    description: "Company profile, interests, and activity statistics.",
    icon: FiUser,
  },
  {
    key: "notifications",
    label: "Notifications",
    href: "/employer/notifications",
    description: "Talent matches, project updates, and system alerts.",
    icon: FiBell,
  },
];

export function getEmployerNavItemByPath(pathname: string) {
  return (
    employerNavigationItems.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? employerNavigationItems[0]
  );
}
