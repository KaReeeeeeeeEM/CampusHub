import {
  FiArchive,
  FiBarChart2,
  FiFileText,
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
    label: "Lost & Found",
    href: "/representative/lost-found",
    icon: FiArchive,
  },
  {
    label: "Documents",
    href: "/representative/documents",
    icon: FiFileText,
  },
  {
    label: "Settings",
    href: "/representative/settings",
    icon: FiSettings,
  },
];
