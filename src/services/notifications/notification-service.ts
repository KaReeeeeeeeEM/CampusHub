import type { NotificationEnvelope } from "@/features/notifications/types";

export interface NotificationService {
  publish(notification: NotificationEnvelope): Promise<void>;
  markRead(notificationId: string): Promise<void>;
}

export class NoopNotificationService implements NotificationService {
  async publish() {
    return Promise.resolve();
  }

  async markRead() {
    return Promise.resolve();
  }
}
