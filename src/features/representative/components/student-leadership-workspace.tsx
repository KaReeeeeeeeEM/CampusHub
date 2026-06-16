"use client";

import { useMemo, useState } from "react";
import {
  FiBarChart2,
  FiBell,
  FiCalendar,
  FiMessageSquare,
  FiPieChart,
  FiSend,
  FiUsers,
  FiZap,
} from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
  AnnouncementsManagement,
  CommitteeManagement,
  EventsManagement,
  ForumsManagement,
  InvitationsManagement,
  PollsManagement,
  SuggestionsManagement,
} from "@/features/representative/components/representative-management";
import { RepresentativePageHeader } from "@/features/representative/components/representative-page-header";
import {
  mockAnnouncements,
  mockCommitteeMembers,
  mockEvents,
  mockForumTopics,
  mockPolls,
  mockStudentInvitations,
  mockSuggestions,
} from "@/features/representative/lib/mock-data";
import { cn } from "@/lib/utils";

const leadershipTabs = [
  {
    value: "committee",
    label: "Committee",
    icon: FiUsers,
  },
  {
    value: "invitations",
    label: "Invitations",
    icon: FiSend,
  },
  {
    value: "announcements",
    label: "Announcements",
    icon: FiBell,
  },
  {
    value: "events",
    label: "Events",
    icon: FiCalendar,
  },
  {
    value: "forums",
    label: "Forums",
    icon: FiMessageSquare,
  },
  {
    value: "suggestions",
    label: "Suggestions",
    icon: FiZap,
  },
  {
    value: "polls",
    label: "Polls",
    icon: FiPieChart,
  },
] as const;

type LeadershipTab = (typeof leadershipTabs)[number]["value"];

const tabTitles: Record<
  LeadershipTab,
  {
    title: string;
    description: string;
  }
> = {
  committee: {
    title: "Committee Management",
    description:
      "Manage executive and category leads for academic affairs, sports, media, technology, entertainment, and student welfare.",
  },
  invitations: {
    title: "Student Invitations",
    description:
      "Generate and manage invitation links that automatically associate students with the right university and college.",
  },
  announcements: {
    title: "College Announcements",
    description:
      "Create, publish, review, and archive college announcements for students and committee channels.",
  },
  events: {
    title: "College Events",
    description:
      "Manage hackathons, workshops, sports activities, conferences, clubs, and social events for the college.",
  },
  forums: {
    title: "Forums Management",
    description:
      "Moderate college discussion topics, review student engagement, and lock topics when conversations are complete.",
  },
  suggestions: {
    title: "Suggestions Management",
    description:
      "Review student suggestions, inspect anonymous feedback, and update the review status for committee follow-up.",
  },
  polls: {
    title: "Polls Management",
    description:
      "Create and manage structured polls that help the representative team make student-informed decisions.",
  },
};

export function StudentLeadershipWorkspace() {
  const [activeTab, setActiveTab] = useState<LeadershipTab>("committee");
  const activeContent = useMemo(() => {
    switch (activeTab) {
      case "committee":
        return <CommitteeManagement initialMembers={mockCommitteeMembers} />;
      case "invitations":
        return (
          <InvitationsManagement initialInvitations={mockStudentInvitations} />
        );
      case "announcements":
        return (
          <AnnouncementsManagement initialAnnouncements={mockAnnouncements} />
        );
      case "events":
        return <EventsManagement initialEvents={mockEvents} />;
      case "forums":
        return <ForumsManagement initialTopics={mockForumTopics} />;
      case "suggestions":
        return <SuggestionsManagement initialSuggestions={mockSuggestions} />;
      case "polls":
        return <PollsManagement initialPolls={mockPolls} />;
      default:
        return null;
    }
  }, [activeTab]);
  const activeTitle = tabTitles[activeTab];

  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      <RepresentativePageHeader
        eyebrow="Leadership"
        title="Student Leadership"
        description="Manage college leadership operations from one workspace. Use the tabs to switch between committees, invitations, announcements, events, forums, suggestions, and polls."
      />

      <section className="mt-6 rounded-xl border border-border bg-surface p-2">
        <div className="flex flex-wrap gap-2">
          {leadershipTabs.map((tab) => {
            const Icon = tab.icon;
            const selected = tab.value === activeTab;

            return (
              <Button
                key={tab.value}
                className={cn(
                  "h-9 gap-2 rounded-lg px-3 text-xs font-semibold transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground hover:bg-primary"
                    : "bg-transparent text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                )}
                type="button"
                variant="ghost"
                onClick={() => setActiveTab(tab.value)}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{tab.label}</span>
              </Button>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FiBarChart2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">{activeTitle.title}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              {activeTitle.description}
            </p>
          </div>
        </div>
        {activeContent}
      </section>
    </main>
  );
}
