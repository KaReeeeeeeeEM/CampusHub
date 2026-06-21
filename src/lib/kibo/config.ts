export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const;

export const STREAK_MILESTONE_REWARDS = STREAK_MILESTONES.map((days) => ({
  days,
  badgeSlug: `streak-${days}-days`,
  xpReward: days >= 100 ? 500 : days >= 60 ? 250 : days >= 30 ? 150 : days * 5,
}));

export const KIBO_CONFIG = {
  rewardEventPollIntervalMs: 45_000,
  maxRewardEventsPerPoll: 10,
  assistantStorageKey: "campushub:kibo-assistant",
  videoVisibilityThreshold: 0.2,
} as const;

export type StreakMilestone = (typeof STREAK_MILESTONES)[number];
