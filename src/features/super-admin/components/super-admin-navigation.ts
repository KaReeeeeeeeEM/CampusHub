import {
  FiBookOpen,
  FiBriefcase,
  FiClock,
  FiGrid,
  FiSettings,
  FiShield,
  FiUsers,
} from "react-icons/fi";

export const superAdminNavItems = [
  {
    label: "Dashboard",
    href: "/super-admin/dashboard",
    icon: FiGrid,
  },
  {
    label: "Universities",
    href: "/super-admin/universities",
    icon: FiBookOpen,
  },
  {
    label: "Campus Admins",
    href: "/super-admin/campus-admins",
    icon: FiShield,
  },
  {
    label: "Employer Applications",
    href: "/super-admin/employer-applications",
    icon: FiBriefcase,
  },
  {
    label: "Users",
    href: "/super-admin/users",
    icon: FiUsers,
  },
  {
    label: "Settings",
    href: "/super-admin/settings",
    icon: FiSettings,
  },
  {
    label: "Audit Logs",
    href: "/super-admin/audit-logs",
    icon: FiClock,
  },
] as const;

export const superAdminWorkspace = {
  label: "Super Admin",
  icon: FiShield,
};
