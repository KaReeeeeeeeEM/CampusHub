import {
  FiBarChart2,
  FiBell,
  FiCalendar,
  FiClipboard,
  FiMessageSquare,
  FiPieChart,
  FiSend,
  FiSettings,
  FiShield,
  FiUsers,
} from "react-icons/fi";

export const representativeWorkspace = {
  label: "College of ICT",
  description: "Representative portal",
  icon: FiShield,
};

export const representativeNavItems = [
  {
    label: "Dashboard",
    href: "/representative/dashboard",
    icon: FiBarChart2,
  },
  {
    label: "Committee",
    href: "/representative/committee",
    icon: FiUsers,
  },
  {
    label: "Students",
    href: "/representative/students",
    icon: FiShield,
  },
  {
    label: "Student Invitations",
    href: "/representative/invitations",
    icon: FiSend,
  },
  {
    label: "Announcements",
    href: "/representative/announcements",
    icon: FiBell,
  },
  {
    label: "Events",
    href: "/representative/events",
    icon: FiCalendar,
  },
  {
    label: "Forums",
    href: "/representative/forums",
    icon: FiMessageSquare,
  },
  {
    label: "Suggestions",
    href: "/representative/suggestions",
    icon: FiClipboard,
  },
  {
    label: "Polls",
    href: "/representative/polls",
    icon: FiPieChart,
  },
  {
    label: "Settings",
    href: "/representative/settings",
    icon: FiSettings,
  },
];
