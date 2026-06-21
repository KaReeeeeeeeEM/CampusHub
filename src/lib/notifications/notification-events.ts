import { createSystemNotification } from "@/features/notifications/lib/notification-engine";
import type { CreateNotificationInput } from "@/features/notifications/lib/schemas";

export type NotificationEventType =
  | "INVITATION_CREATED"
  | "INVITATION_ACCEPTED"
  | "EMPLOYER_APPROVED"
  | "EMPLOYER_REJECTED"
  | "ANNOUNCEMENT_PUBLISHED"
  | "ANNOUNCEMENT_UPDATED"
  | "URGENT_ANNOUNCEMENT_CREATED"
  | "EVENT_CREATED"
  | "EVENT_REMINDER"
  | "EVENT_REGISTRATION_CONFIRMATION"
  | "EVENT_JOINED"
  | "EVENT_WAITLISTED"
  | "EVENT_LEFT"
  | "EVENT_CHECKED_IN"
  | "EVENT_FULL"
  | "EVENT_CANCELLED"
  | "ALMANAC_UPCOMING_EVENT_REMINDER"
  | "ALMANAC_SEMESTER_START_REMINDER"
  | "ALMANAC_EXAMINATION_REMINDER"
  | "ALMANAC_REGISTRATION_REMINDER";

export type NotificationEvent = {
  type: NotificationEventType;
  universityId?: string | null;
  actorId?: string | null;
  recipientId?: string | null;
  roles?: Array<
    "SUPER_ADMIN" | "CAMPUS_ADMIN" | "STUDENT" | "TEACHER" | "EMPLOYER" | "ALUMNI"
  >;
  recipientEmail?: string | null;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};

function eventNotificationType(
  type: NotificationEventType,
): CreateNotificationInput["type"] {
  if (
    type.startsWith("ANNOUNCEMENT") ||
    type === "URGENT_ANNOUNCEMENT_CREATED"
  ) {
    return "ANNOUNCEMENT";
  }
  if (type === "EVENT_REMINDER" || type.startsWith("ALMANAC_")) {
    return "EVENT_REMINDER";
  }
  if (type.startsWith("EVENT_")) return "EVENT";
  return "SYSTEM";
}

function eventTitle(event: NotificationEvent) {
  if (typeof event.metadata?.notificationTitle === "string") {
    return event.metadata.notificationTitle;
  }

  if (typeof event.metadata?.title === "string") return event.metadata.title;

  return event.type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function eventMessage(event: NotificationEvent) {
  if (typeof event.metadata?.notificationMessage === "string") {
    return event.metadata.notificationMessage;
  }

  switch (event.type) {
    case "ANNOUNCEMENT_PUBLISHED":
      return "A new announcement has been published.";
    case "ANNOUNCEMENT_UPDATED":
      return "An announcement has been updated.";
    case "URGENT_ANNOUNCEMENT_CREATED":
      return "An urgent announcement requires attention.";
    case "EVENT_CREATED":
      return "A new campus event is available.";
    case "EVENT_REMINDER":
      return "You have an upcoming event reminder.";
    case "EVENT_REGISTRATION_CONFIRMATION":
      return "Your event registration has been confirmed.";
    case "EVENT_JOINED":
      return "A user registered for an event.";
    case "EVENT_WAITLISTED":
      return "A user joined an event waitlist.";
    case "EVENT_LEFT":
      return "A user cancelled an event registration.";
    case "EVENT_CHECKED_IN":
      return "A user checked in to an event.";
    case "EVENT_FULL":
      return "An event has reached full capacity.";
    case "EVENT_CANCELLED":
      return "An event has been cancelled.";
    case "ALMANAC_UPCOMING_EVENT_REMINDER":
    case "ALMANAC_SEMESTER_START_REMINDER":
    case "ALMANAC_EXAMINATION_REMINDER":
    case "ALMANAC_REGISTRATION_REMINDER":
      return "An academic calendar reminder is available.";
    case "EMPLOYER_APPROVED":
      return "An employer application has been approved.";
    case "EMPLOYER_REJECTED":
      return "An employer application has been rejected.";
    case "INVITATION_CREATED":
      return "A CampusHub invitation has been created.";
    case "INVITATION_ACCEPTED":
      return "A CampusHub invitation has been accepted.";
    default:
      return "A CampusHub notification is available.";
  }
}

export async function emitNotificationEvent(event: NotificationEvent) {
  const target =
    event.recipientId || event.roles?.length || event.universityId
      ? {
          ...(event.recipientId ? { recipientId: event.recipientId } : {}),
          ...(event.roles?.length ? { roles: event.roles } : {}),
          ...(event.universityId ? { universityId: event.universityId } : {}),
        }
      : null;

  if (!target) {
    console.info("CampusHub notification event prepared", event);
    return;
  }

  await createSystemNotification({
    target,
    senderId: event.actorId ?? null,
    type: eventNotificationType(event.type),
    title: eventTitle(event),
    message: eventMessage(event),
    entityType: event.entityType,
    entityId: event.entityId,
    priority:
      event.type === "URGENT_ANNOUNCEMENT_CREATED" ? "URGENT" : "NORMAL",
    channels: {
      inApp: true,
      email: false,
      push: false,
      sms: false,
    },
    metadata: {
      ...event.metadata,
      eventType: event.type,
      recipientEmail: event.recipientEmail ?? null,
    },
  });
}
