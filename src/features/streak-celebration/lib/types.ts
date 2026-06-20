export type RewardEvent = {
  id: string;
  trigger:
    | "BADGE_EARNED"
    | "ACHIEVEMENT_UNLOCKED"
    | "LEVEL_UP"
    | "LEADERBOARD_PROMOTION"
    | "MILESTONE_REACHED";
  title: string;
  description: string | null;
  reward: Record<string, unknown> | null;
  xp: number;
  badge: Record<string, unknown> | null;
  animationType: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
};

export type CelebrationKind =
  | "streak"
  | "freeze"
  | "badge"
  | "achievement"
  | "level";

export type CelebrationViewModel = {
  kind: CelebrationKind;
  title: string;
  subtitle: string;
  heroIcon: string;
  fromCount: number | null;
  toCount: number | null;
  rewardLabel: string;
  rewardIcon: string;
  xp: number;
  nextMilestone: string | null;
  shareText: string;
};
