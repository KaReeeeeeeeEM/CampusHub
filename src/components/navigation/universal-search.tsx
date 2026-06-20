"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiArrowRight,
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiCommand,
  FiGrid,
  FiMapPin,
  FiPieChart,
  FiSearch,
  FiSettings,
  FiShield,
  FiUsers,
} from "react-icons/fi";

import { CampusInput } from "@/components/campushub";
import { Modal } from "@/components/shared/modal";
import {
  type RoleKey,
  type StudentLeadershipPosition,
  isRoleKey,
  isStudentLeadershipPosition,
} from "@/features/authorization/roles";
import { useAuth } from "@/features/auth/auth-provider";
import { useNavigationStore } from "@/store/navigation-store";

type SearchItem = {
  title: string;
  description: string;
  href: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: RoleKey[];
  leadershipPositions?: StudentLeadershipPosition[];
};

function normalizeLeadershipPositions(
  positions?: string[],
  roles?: string[],
): StudentLeadershipPosition[] {
  return Array.from(
    new Set([
      ...(positions ?? []).filter(isStudentLeadershipPosition),
      ...(roles ?? []).filter(isStudentLeadershipPosition),
    ]),
  );
}

function hasAccess(
  item: SearchItem,
  roles: RoleKey[],
  leadershipPositions: StudentLeadershipPosition[],
) {
  if (!item.roles.some((role) => roles.includes(role))) {
    return false;
  }

  if (!item.leadershipPositions?.length) {
    return true;
  }

  return item.leadershipPositions.some((position) =>
    leadershipPositions.includes(position),
  );
}

const searchItems: SearchItem[] = [
  {
    title: "Super Admin Dashboard",
    description: "Platform overview, onboarding checklist, and key metrics.",
    href: "/super-admin/dashboard",
    group: "Super Admin",
    icon: FiShield,
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "Universities",
    description: "Manage universities, status, and tenant records.",
    href: "/super-admin/universities",
    group: "Super Admin",
    icon: FiBookOpen,
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "Campus Admins",
    description: "Create and track campus admin invitations.",
    href: "/super-admin/campus-admins",
    group: "Super Admin",
    icon: FiUsers,
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "Employer Applications",
    description: "Review employer applications and approval workflow.",
    href: "/super-admin/employer-applications",
    group: "Super Admin",
    icon: FiBriefcase,
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "Platform Users",
    description: "Review user accounts and access status.",
    href: "/super-admin/users",
    group: "Super Admin",
    icon: FiUsers,
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "Audit Logs",
    description: "Review platform-level security and activity logs.",
    href: "/super-admin/audit-logs",
    group: "Super Admin",
    icon: FiShield,
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "Campus Admin Dashboard",
    description: "University operations overview and activity summary.",
    href: "/campus-admin/dashboard",
    group: "Campus Admin",
    icon: FiShield,
    roles: ["CAMPUS_ADMIN"],
  },
  {
    title: "Colleges",
    description: "Create and manage college structures.",
    href: "/campus-admin/colleges",
    group: "Campus Admin",
    icon: FiBookOpen,
    roles: ["CAMPUS_ADMIN"],
  },
  {
    title: "Departments",
    description: "Manage departments under colleges.",
    href: "/campus-admin/departments",
    group: "Campus Admin",
    icon: FiBookOpen,
    roles: ["CAMPUS_ADMIN"],
  },
  {
    title: "Teachers",
    description: "Invite and manage teacher access.",
    href: "/campus-admin/teachers",
    group: "Campus Admin",
    icon: FiUsers,
    roles: ["CAMPUS_ADMIN"],
  },
  {
    title: "Representatives",
    description: "Invite and manage student representatives.",
    href: "/campus-admin/representatives",
    group: "Campus Admin",
    icon: FiUsers,
    roles: ["CAMPUS_ADMIN"],
  },
  {
    title: "Campus Map",
    description: "Manage campus locations and map points.",
    href: "/campus-admin/maps",
    group: "Campus Admin",
    icon: FiMapPin,
    roles: ["CAMPUS_ADMIN"],
  },
  {
    title: "Almanac",
    description: "Manage academic dates, deadlines, and calendar events.",
    href: "/campus-admin/almanac",
    group: "Campus Admin",
    icon: FiCalendar,
    roles: ["CAMPUS_ADMIN"],
  },
  {
    title: "Settings",
    description: "Configure university information and portal preferences.",
    href: "/campus-admin/settings",
    group: "Campus Admin",
    icon: FiSettings,
    roles: ["CAMPUS_ADMIN"],
  },
  {
    title: "Student Dashboard",
    description: "Student daily overview and campus activity feed.",
    href: "/student/dashboard",
    group: "Student",
    icon: FiGrid,
    roles: ["STUDENT"],
  },
  {
    title: "Student Announcements",
    description: "Official academic and college updates.",
    href: "/student/announcements",
    group: "Student",
    icon: FiBookOpen,
    roles: ["STUDENT"],
  },
  {
    title: "Student Events",
    description: "Browse campus events, workshops, and activities.",
    href: "/student/events",
    group: "Student",
    icon: FiCalendar,
    roles: ["STUDENT"],
  },
  {
    title: "Student Almanac",
    description: "Academic calendar, deadlines, and exams.",
    href: "/student/almanac",
    group: "Student",
    icon: FiCalendar,
    roles: ["STUDENT"],
  },
  {
    title: "Student Campus Map",
    description: "Find lecture halls, libraries, services, and student spaces.",
    href: "/student/map",
    group: "Student",
    icon: FiMapPin,
    roles: ["STUDENT"],
  },
  {
    title: "Student Forum",
    description: "Campus discussions and community topics.",
    href: "/student/forum",
    group: "Student",
    icon: FiUsers,
    roles: ["STUDENT"],
  },
  {
    title: "Student Polls",
    description: "Vote on active polls and review student feedback results.",
    href: "/student/polls",
    group: "Student",
    icon: FiPieChart,
    roles: ["STUDENT"],
  },
  {
    title: "Student Suggestions",
    description: "Submit and track feedback for student leadership.",
    href: "/student/suggestions",
    group: "Student",
    icon: FiBookOpen,
    roles: ["STUDENT"],
  },
  {
    title: "Student Profile",
    description: "Academic profile, interests, skills, and achievements.",
    href: "/student/profile",
    group: "Student",
    icon: FiUsers,
    roles: ["STUDENT"],
  },
  {
    title: "Student Notifications",
    description: "Announcement, event, forum, and system updates.",
    href: "/student/notifications",
    group: "Student",
    icon: FiBookOpen,
    roles: ["STUDENT"],
  },
  {
    title: "Committee Management",
    description: "Manage committee members and leadership coordination.",
    href: "/student/leadership",
    group: "Student Leadership",
    icon: FiUsers,
    roles: ["STUDENT"],
    leadershipPositions: ["REPRESENTATIVE"],
  },
  {
    title: "Student Invitations",
    description: "Generate invitation links and track joined students.",
    href: "/student/leadership",
    group: "Student Leadership",
    icon: FiUsers,
    roles: ["STUDENT"],
    leadershipPositions: ["REPRESENTATIVE"],
  },
  {
    title: "College Announcements",
    description: "Manage college-level announcements and audience targeting.",
    href: "/student/leadership",
    group: "Student Leadership",
    icon: FiBookOpen,
    roles: ["STUDENT"],
    leadershipPositions: ["REPRESENTATIVE"],
  },
  {
    title: "College Events",
    description: "Manage college events, venues, attendees, and status.",
    href: "/student/leadership",
    group: "Student Leadership",
    icon: FiCalendar,
    roles: ["STUDENT"],
    leadershipPositions: ["REPRESENTATIVE"],
  },
  {
    title: "Forums Management",
    description: "Moderate college discussion topics and community activity.",
    href: "/student/leadership",
    group: "Student Leadership",
    icon: FiUsers,
    roles: ["STUDENT"],
    leadershipPositions: ["REPRESENTATIVE"],
  },
  {
    title: "Suggestions Management",
    description: "Review and update student feedback status.",
    href: "/student/leadership",
    group: "Student Leadership",
    icon: FiBookOpen,
    roles: ["STUDENT"],
    leadershipPositions: ["REPRESENTATIVE"],
  },
  {
    title: "Polls Management",
    description: "Create and manage polls for student decisions.",
    href: "/student/leadership",
    group: "Student Leadership",
    icon: FiGrid,
    roles: ["STUDENT"],
    leadershipPositions: ["REPRESENTATIVE"],
  },
  {
    title: "Committee Tasks",
    description: "Track assigned committee work and task progress.",
    href: "/student/my-committee/tasks",
    group: "My Committee",
    icon: FiGrid,
    roles: ["STUDENT"],
    leadershipPositions: ["COMMITTEE_MEMBER"],
  },
  {
    title: "Category Announcements",
    description: "Manage announcements for your committee category.",
    href: "/student/my-committee/announcements",
    group: "My Committee",
    icon: FiBookOpen,
    roles: ["STUDENT"],
    leadershipPositions: ["COMMITTEE_MEMBER"],
  },
  {
    title: "Category Events",
    description: "Manage category-specific events and activities.",
    href: "/student/my-committee/events",
    group: "My Committee",
    icon: FiCalendar,
    roles: ["STUDENT"],
    leadershipPositions: ["COMMITTEE_MEMBER"],
  },
  {
    title: "Category Discussions",
    description: "Manage category-specific committee discussions.",
    href: "/student/my-committee/discussions",
    group: "My Committee",
    icon: FiUsers,
    roles: ["STUDENT"],
    leadershipPositions: ["COMMITTEE_MEMBER"],
  },
  {
    title: "Teacher Portal",
    description: "Search academic updates, student talent, projects, polls, and forums.",
    href: "/teacher/dashboard",
    group: "Teacher",
    icon: FiBookOpen,
    roles: ["TEACHER"],
  },
  {
    title: "Alumni Portal",
    description: "Alumni networking, mentorship, and university updates.",
    href: "/alumni/dashboard",
    group: "Alumni",
    icon: FiUsers,
    roles: ["ALUMNI"],
  },
  {
    title: "Alumni Community",
    description: "Find fellow alumni by department, class year, location, and industry.",
    href: "/alumni/community",
    group: "Alumni",
    icon: FiUsers,
    roles: ["ALUMNI"],
  },
  {
    title: "Alumni Mentorship",
    description: "Manage mentorship requests, active mentees, and mentorship history.",
    href: "/alumni/mentorship",
    group: "Alumni",
    icon: FiUsers,
    roles: ["ALUMNI"],
  },
  {
    title: "Alumni Students",
    description: "Discover talented students, projects, skills, and achievements.",
    href: "/alumni/students",
    group: "Alumni",
    icon: FiUsers,
    roles: ["ALUMNI"],
  },
  {
    title: "Alumni Showcase",
    description: "Explore student projects, innovators, and university research.",
    href: "/alumni/showcase",
    group: "Alumni",
    icon: FiGrid,
    roles: ["ALUMNI"],
  },
  {
    title: "Alumni Events",
    description: "Browse reunions, networking events, workshops, and university activities.",
    href: "/alumni/events",
    group: "Alumni",
    icon: FiCalendar,
    roles: ["ALUMNI"],
  },
  {
    title: "Alumni Opportunities",
    description: "Share and discover jobs, internships, funding, and competitions.",
    href: "/alumni/opportunities",
    group: "Alumni",
    icon: FiBriefcase,
    roles: ["ALUMNI"],
  },
  {
    title: "Alumni Notifications",
    description: "Review mentorship, event, opportunity, showcase, and university updates.",
    href: "/alumni/notifications",
    group: "Alumni",
    icon: FiBookOpen,
    roles: ["ALUMNI"],
  },
  {
    title: "Employer Portal",
    description: "Talent discovery, showcase projects, opportunities, and recruiting analytics.",
    href: "/employer/dashboard",
    group: "Employer",
    icon: FiBriefcase,
    roles: ["EMPLOYER"],
  },
];

export function UniversalSearch() {
  const { user } = useAuth();
  const open = useNavigationStore((state) => state.commandOpen);
  const setOpen = useNavigationStore((state) => state.setCommandOpen);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    window.setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  const roleAccess = useMemo(() => {
    const roles = Array.from(
      new Set(
        [...(user?.roles ?? []), user?.role].filter((role): role is RoleKey =>
          isRoleKey(role),
        ),
      ),
    );

    return {
      roles: roles.length ? roles : ([] satisfies RoleKey[]),
      leadershipPositions: normalizeLeadershipPositions(
        user?.studentLeadershipPositions,
        user?.roles,
      ),
    };
  }, [user?.role, user?.roles, user?.studentLeadershipPositions]);

  const roleItems = useMemo(
    () =>
      searchItems.filter((item) =>
        hasAccess(item, roleAccess.roles, roleAccess.leadershipPositions),
      ),
    [roleAccess.leadershipPositions, roleAccess.roles],
  );

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return roleItems;

    return roleItems.filter((item) =>
      [item.title, item.description, item.group, item.href]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, roleItems]);

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="Universal Search"
      description="Search across CampusHub pages, modules, and workflows."
      className="p-0"
    >
      <div className="border-b border-border px-6 pb-5">
        <label className="flex h-12 items-center gap-3 rounded-lg border border-border bg-surface-muted px-4 text-muted-foreground focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/25">
          <FiSearch className="h-4 w-4 shrink-0" aria-hidden="true" />
          <CampusInput
            ref={inputRef}
            aria-label="Universal search"
            className="h-full border-0 bg-transparent px-0 focus:ring-0"
            placeholder="Search pages, people, modules..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <kbd className="hidden shrink-0 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-semibold text-muted-foreground sm:inline-flex">
            Ctrl K / ⌘ K
          </kbd>
        </label>
      </div>

      <div className="max-h-[56vh] overflow-y-auto px-3 py-3">
        {results.length > 0 ? (
          <div className="space-y-1">
            {results.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  className="group flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-surface-muted focus:bg-surface-muted focus:outline-none"
                  href={item.href}
                  onClick={() => setOpen(false)}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {item.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {item.group} · {item.description}
                    </span>
                  </span>
                  <FiArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <FiCommand className="h-8 w-8 text-muted-foreground" />
            <p className="mt-4 text-sm font-semibold">No results found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try searching within your available portal, module, or workflow.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
