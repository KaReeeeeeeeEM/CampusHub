import type { ReactNode } from "react";

export type KiboMood =
  | "happy"
  | "thinking"
  | "proud"
  | "sleepy"
  | "curious"
  | "celebrate";

export type KiboAnimation =
  | "idle"
  | "wave"
  | "celebrate"
  | "streak"
  | "badge"
  | "announcement"
  | "marketplace"
  | "projectStar"
  | "warning"
  | "sleeping"
  | "thinking";

export type KiboCategory =
  | "gamification"
  | "achievement"
  | "projects"
  | "marketplace"
  | "announcements"
  | "events"
  | "onboarding";

export type KiboPriority = "low" | "normal" | "high" | "critical";

export type KiboAssetSource = {
  webm?: string;
  mp4?: string;
  png?: string;
};

export type KiboEventDefinition = {
  animation: KiboAnimation;
  title: string;
  description: string;
  priority: KiboPriority;
  category: KiboCategory;
};

export type KiboModalPayload = {
  animation: KiboAnimation;
  title: string;
  description?: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  metadata?: Record<string, unknown> | null;
  children?: ReactNode;
};

export type KiboNotificationPayload = {
  animation: KiboAnimation;
  title: string;
  description?: string;
  category?: KiboCategory;
  priority?: KiboPriority;
  metadata?: Record<string, unknown> | null;
};

export type KiboTriggerPayload = {
  title?: string;
  description?: string;
  metadata?: Record<string, unknown> | null;
};

export type KiboRewardEvent = {
  id: string;
  trigger: string;
  title: string;
  description?: string | null;
  reward?: Record<string, unknown> | null;
  xp?: number;
  badge?: Record<string, unknown> | null;
  animationType?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type KiboContextValue = {
  showModal: (payload: KiboModalPayload) => void;
  showNotification: (payload: KiboNotificationPayload) => void;
  triggerEvent: (
    event: import("./events").KiboEvent,
    payload?: KiboTriggerPayload,
  ) => void;
  refreshRewardEvents: () => Promise<void>;
};
