import {
  FiArchive,
  FiCheckSquare,
  FiHome,
  FiUser,
} from "react-icons/fi";

export const committeeNavItems = [
  {
    label: "Dashboard",
    href: "/committee-member/dashboard",
    icon: FiHome,
  },
  {
    label: "Tasks",
    href: "/committee-member/tasks",
    icon: FiCheckSquare,
  },
  {
    label: "Lost & Found",
    href: "/committee-member/lost-found",
    icon: FiArchive,
  },
  {
    label: "Profile",
    href: "/committee-member/profile",
    icon: FiUser,
  },
];
