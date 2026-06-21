import type { KiboEventDefinition } from "./types";

export enum KiboEvent {
  STREAK_MILESTONE = "STREAK_MILESTONE",
  BADGE_UNLOCKED = "BADGE_UNLOCKED",
  PROJECT_STAR_RECEIVED = "PROJECT_STAR_RECEIVED",
  PROJECT_FEATURED = "PROJECT_FEATURED",
  MARKETPLACE_ORDER = "MARKETPLACE_ORDER",
  NEW_ANNOUNCEMENT = "NEW_ANNOUNCEMENT",
  NEW_EVENT = "NEW_EVENT",
  FIRST_LOGIN = "FIRST_LOGIN",
}

export const KIBO_EVENT_MAP: Record<KiboEvent, KiboEventDefinition> = {
  [KiboEvent.STREAK_MILESTONE]: {
    animation: "streak",
    title: "Streak Milestone",
    description: "You reached a new CampusHub streak milestone.",
    priority: "high",
    category: "gamification",
  },
  [KiboEvent.BADGE_UNLOCKED]: {
    animation: "badge",
    title: "Badge Unlocked",
    description: "You earned a new CampusHub badge.",
    priority: "high",
    category: "achievement",
  },
  [KiboEvent.PROJECT_STAR_RECEIVED]: {
    animation: "projectStar",
    title: "Project Star Received",
    description: "Someone appreciated your project.",
    priority: "normal",
    category: "projects",
  },
  [KiboEvent.PROJECT_FEATURED]: {
    animation: "projectStar",
    title: "Project Featured",
    description: "Your project has been featured.",
    priority: "high",
    category: "projects",
  },
  [KiboEvent.MARKETPLACE_ORDER]: {
    animation: "marketplace",
    title: "Marketplace Activity",
    description: "You have new marketplace activity.",
    priority: "normal",
    category: "marketplace",
  },
  [KiboEvent.NEW_ANNOUNCEMENT]: {
    animation: "announcement",
    title: "New Announcement",
    description: "A new university announcement has been published.",
    priority: "normal",
    category: "announcements",
  },
  [KiboEvent.NEW_EVENT]: {
    animation: "announcement",
    title: "New Event",
    description: "A new campus event is available.",
    priority: "normal",
    category: "events",
  },
  [KiboEvent.FIRST_LOGIN]: {
    animation: "wave",
    title: "Welcome to CampusHub",
    description: "Kibo will help highlight important milestones.",
    priority: "low",
    category: "onboarding",
  },
};

export function getKiboEventDefinition(event: KiboEvent) {
  return KIBO_EVENT_MAP[event];
}
