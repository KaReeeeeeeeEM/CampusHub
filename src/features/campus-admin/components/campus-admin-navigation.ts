import {
  FiBookOpen,
  FiCalendar,
  FiGrid,
  FiLayers,
  FiMap,
  FiSettings,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";

export const campusAdminNavItems = [
  {
    label: "Dashboard",
    href: "/campus-admin/dashboard",
    icon: FiGrid,
  },
  {
    label: "Colleges",
    href: "/campus-admin/colleges",
    icon: FiBookOpen,
  },
  {
    label: "Departments",
    href: "/campus-admin/departments",
    icon: FiLayers,
  },
  {
    label: "Representatives",
    href: "/campus-admin/representatives",
    icon: FiUserCheck,
  },
  {
    label: "Teachers",
    href: "/campus-admin/teachers",
    icon: FiUsers,
  },
  {
    label: "Campus Map",
    href: "/campus-admin/maps",
    icon: FiMap,
  },
  {
    label: "Almanac",
    href: "/campus-admin/almanac",
    icon: FiCalendar,
  },
  {
    label: "Settings",
    href: "/campus-admin/settings",
    icon: FiSettings,
  },
] as const;

export const campusAdminWorkspace = {
  label: "Campus Admin",
  icon: FiBookOpen,
};
