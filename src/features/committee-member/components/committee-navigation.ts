import {
  FiBell,
  FiCalendar,
  FiCheckSquare,
  FiHome,
  FiMessageSquare,
  FiUser,
} from "react-icons/fi";

export const committeeNavItems = [
  {
    label: "Dashboard",
    href: "/committee-member/dashboard",
    icon: FiHome,
  },
  {
    label: "Announcements",
    href: "/committee-member/announcements",
    icon: FiBell,
  },
  {
    label: "Events",
    href: "/committee-member/events",
    icon: FiCalendar,
  },
  {
    label: "Forum",
    href: "/committee-member/forum",
    icon: FiMessageSquare,
  },
  {
    label: "Tasks",
    href: "/committee-member/tasks",
    icon: FiCheckSquare,
  },
  {
    label: "Profile",
    href: "/committee-member/profile",
    icon: FiUser,
  },
];
