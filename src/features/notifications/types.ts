export type NotificationChannel = "in_app" | "email" | "push";

export type NotificationPriority = "low" | "normal" | "high";

export type NotificationEnvelope<TPayload = Record<string, unknown>> = {
  id: string;
  tenantId?: string | null;
  recipientId: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  type: string;
  payload: TPayload;
  readAt?: Date | null;
  createdAt: Date;
};
