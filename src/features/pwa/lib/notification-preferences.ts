import { z } from "zod";

export const notificationPreferenceSchema = z.object({
  streakReminders: z.boolean(),
  eventReminders: z.boolean(),
  communityUpdates: z.boolean(),
  marketplaceActivity: z.boolean(),
  projectActivity: z.boolean(),
  badgeUnlocks: z.boolean(),
  mentorshipActivity: z.boolean(),
  opportunityAlerts: z.boolean(),
  announcements: z.boolean(),
  pushEnabled: z.boolean(),
});

export type NotificationPreferences = z.infer<
  typeof notificationPreferenceSchema
>;

export const defaultNotificationPreferences: NotificationPreferences = {
  streakReminders: true,
  eventReminders: true,
  communityUpdates: true,
  marketplaceActivity: true,
  projectActivity: true,
  badgeUnlocks: true,
  mentorshipActivity: true,
  opportunityAlerts: true,
  announcements: true,
  pushEnabled: false,
};

export const notificationPreferenceItems: Array<{
  key: keyof NotificationPreferences;
  title: string;
  description: string;
}> = [
  {
    key: "streakReminders",
    title: "Streak reminders",
    description: "Daily reminders and streak recovery nudges.",
  },
  {
    key: "eventReminders",
    title: "Event reminders",
    description: "Event start times, RSVP changes, and attendance reminders.",
  },
  {
    key: "communityUpdates",
    title: "Community updates",
    description: "New posts, replies, and moderation updates in communities.",
  },
  {
    key: "marketplaceActivity",
    title: "Marketplace activity",
    description: "Orders, product interest, shop updates, and seller messages.",
  },
  {
    key: "projectActivity",
    title: "Project activity",
    description: "Project views, stars, comments, and collaboration updates.",
  },
  {
    key: "badgeUnlocks",
    title: "Badge unlocks",
    description: "Achievement rewards, XP moments, and badge celebrations.",
  },
  {
    key: "mentorshipActivity",
    title: "Mentorship activity",
    description: "Mentor requests, session updates, and networking activity.",
  },
  {
    key: "opportunityAlerts",
    title: "Opportunity alerts",
    description: "New jobs, internships, applications, and hiring updates.",
  },
  {
    key: "announcements",
    title: "Announcements",
    description: "Official campus, committee, and platform announcements.",
  },
];

export function normalizeNotificationPreferences(
  value: unknown,
): NotificationPreferences {
  const parsed = notificationPreferenceSchema.partial().safeParse(value);

  if (!parsed.success) {
    return defaultNotificationPreferences;
  }

  return {
    ...defaultNotificationPreferences,
    ...parsed.data,
  };
}
