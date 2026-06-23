import type { KiboAnimation, KiboCategory, KiboPriority } from "@/lib/kibo";

import type { NotificationPreferences } from "./notification-preferences";

export type EngagementEventType =
  | "announcement"
  | "event"
  | "marketplace_order"
  | "project_star"
  | "badge_unlock"
  | "streak_reminder"
  | "almanac_reminder";

export type EngagementChannel = "in_app" | "push";

export type EngagementCampaignDefinition = {
  type: EngagementEventType;
  label: string;
  preferenceKey: keyof NotificationPreferences;
  channels: EngagementChannel[];
  kiboAnimation: KiboAnimation;
  kiboCategory: KiboCategory;
  priority: KiboPriority;
  defaultTitle: string;
  defaultBody: string;
  defaultUrl: string;
};

export const ENGAGEMENT_CAMPAIGNS: Record<
  EngagementEventType,
  EngagementCampaignDefinition
> = {
  announcement: {
    type: "announcement",
    label: "Announcements",
    preferenceKey: "announcements",
    channels: ["in_app", "push"],
    kiboAnimation: "announcement",
    kiboCategory: "announcements",
    priority: "high",
    defaultTitle: "New Announcement",
    defaultBody: "A new CampusHub announcement has been published.",
    defaultUrl: "/student/announcements",
  },
  event: {
    type: "event",
    label: "Events",
    preferenceKey: "eventReminders",
    channels: ["in_app", "push"],
    kiboAnimation: "announcement",
    kiboCategory: "events",
    priority: "normal",
    defaultTitle: "Event Reminder",
    defaultBody: "A CampusHub event needs your attention.",
    defaultUrl: "/student/events",
  },
  marketplace_order: {
    type: "marketplace_order",
    label: "Marketplace Orders",
    preferenceKey: "marketplaceActivity",
    channels: ["in_app", "push"],
    kiboAnimation: "marketplace",
    kiboCategory: "marketplace",
    priority: "high",
    defaultTitle: "Marketplace Activity",
    defaultBody: "A marketplace order update is waiting for review.",
    defaultUrl: "/student/market/orders",
  },
  project_star: {
    type: "project_star",
    label: "Project Stars",
    preferenceKey: "projectActivity",
    channels: ["in_app", "push"],
    kiboAnimation: "projectStar",
    kiboCategory: "projects",
    priority: "normal",
    defaultTitle: "Project Star Received",
    defaultBody: "Someone appreciated your CampusHub project.",
    defaultUrl: "/student/showcase/my-projects",
  },
  badge_unlock: {
    type: "badge_unlock",
    label: "Badge Unlocks",
    preferenceKey: "badgeUnlocks",
    channels: ["in_app", "push"],
    kiboAnimation: "badge",
    kiboCategory: "achievement",
    priority: "high",
    defaultTitle: "Badge Unlocked",
    defaultBody: "You unlocked a new CampusHub badge.",
    defaultUrl: "/student/showcase/achievements",
  },
  streak_reminder: {
    type: "streak_reminder",
    label: "Streak Reminders",
    preferenceKey: "streakReminders",
    channels: ["in_app", "push"],
    kiboAnimation: "streak",
    kiboCategory: "gamification",
    priority: "normal",
    defaultTitle: "Keep Your Streak Alive",
    defaultBody: "Complete one meaningful CampusHub action today.",
    defaultUrl: "/student/dashboard",
  },
  almanac_reminder: {
    type: "almanac_reminder",
    label: "Almanac Reminders",
    preferenceKey: "almanacReminders",
    channels: ["in_app", "push"],
    kiboAnimation: "announcement",
    kiboCategory: "events",
    priority: "high",
    defaultTitle: "Academic Reminder",
    defaultBody: "An academic calendar deadline or milestone is coming up.",
    defaultUrl: "/student/almanac",
  },
};

export const engagementCampaigns = Object.values(ENGAGEMENT_CAMPAIGNS);

export function getEngagementCampaign(type: EngagementEventType) {
  return ENGAGEMENT_CAMPAIGNS[type];
}
