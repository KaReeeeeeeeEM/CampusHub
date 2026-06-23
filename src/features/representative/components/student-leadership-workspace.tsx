"use client";

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
  mockSuggestions,
} from "@/features/representative/lib/mock-data";
import type { RepresentativeInvitationPageData } from "@/features/enrollment/lib/invitation-service";

export function StudentLeadershipWorkspace() {
  return <StudentLeadershipCommitteePageView />;
}

function StudentLeadershipRoutePage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      <RepresentativePageHeader
        eyebrow="Leadership"
        title={title}
        description={description}
      />
      <section className="mt-6">{children}</section>
    </main>
  );
}

export function StudentLeadershipCommitteePageView() {
  return (
    <StudentLeadershipRoutePage
      title="Committee"
      description="Manage executive and category leads for academic affairs, sports, media, technology, entertainment, and student welfare."
    >
      <CommitteeManagement initialMembers={mockCommitteeMembers} />
    </StudentLeadershipRoutePage>
  );
}

export function StudentLeadershipInvitationsPageView({
  invitationData,
}: {
  invitationData: RepresentativeInvitationPageData;
}) {
  return (
    <StudentLeadershipRoutePage
      title="Invitations"
      description="Generate and manage invitation links that automatically associate students with the right university and college."
    >
      <InvitationsManagement
        invitationScope={invitationData.scope}
        courses={invitationData.courses}
        initialInvitations={invitationData.invitations}
      />
    </StudentLeadershipRoutePage>
  );
}

export function StudentLeadershipAnnouncementsPageView() {
  return (
    <StudentLeadershipRoutePage
      title="Announcements"
      description="Create, publish, review, and archive college announcements for students and committee channels."
    >
      <AnnouncementsManagement initialAnnouncements={mockAnnouncements} />
    </StudentLeadershipRoutePage>
  );
}

export function StudentLeadershipEventsPageView() {
  return (
    <StudentLeadershipRoutePage
      title="Events"
      description="Manage hackathons, workshops, sports activities, conferences, clubs, and social events for the college."
    >
      <EventsManagement initialEvents={mockEvents} />
    </StudentLeadershipRoutePage>
  );
}

export function StudentLeadershipForumsPageView() {
  return (
    <StudentLeadershipRoutePage
      title="Forums"
      description="Moderate college discussion topics, review student engagement, and lock topics when conversations are complete."
    >
      <ForumsManagement initialTopics={mockForumTopics} />
    </StudentLeadershipRoutePage>
  );
}

export function StudentLeadershipSuggestionsPageView() {
  return (
    <StudentLeadershipRoutePage
      title="Suggestions"
      description="Review student suggestions, inspect anonymous feedback, and update the review status for committee follow-up."
    >
      <SuggestionsManagement initialSuggestions={mockSuggestions} />
    </StudentLeadershipRoutePage>
  );
}

export function StudentLeadershipPollsPageView() {
  return (
    <StudentLeadershipRoutePage
      title="Polls"
      description="Create and manage structured polls that help the representative team make student-informed decisions."
    >
      <PollsManagement initialPolls={mockPolls} />
    </StudentLeadershipRoutePage>
  );
}
