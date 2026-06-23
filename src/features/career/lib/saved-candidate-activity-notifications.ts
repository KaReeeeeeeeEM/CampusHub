import { createSystemNotification } from "@/features/notifications/lib/notification-engine";
import { connectMongo } from "@/lib/db/mongodb";
import { SavedCandidateModel } from "@/lib/db/models";

export type SavedCandidateActivityType =
  | "PROJECT_CREATED"
  | "SHOP_CREATED"
  | "MARKETPLACE_ORDER"
  | "ACHIEVEMENT_UNLOCKED";

type NotifySavedCandidateFollowersInput = {
  candidateUserId: string;
  universityId?: string | null;
  type: SavedCandidateActivityType;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  actionUrl?: string | null;
  metadata?: Record<string, unknown>;
};

export async function notifySavedCandidateFollowers(
  input: NotifySavedCandidateFollowersInput,
) {
  await connectMongo();

  const savedCandidates = await SavedCandidateModel.find({
    candidateUserId: input.candidateUserId,
    status: "ACTIVE",
  })
    .select("savedById")
    .lean();

  const recipientIds = [
    ...new Set(
      savedCandidates
        .map((item) => String(item.savedById ?? ""))
        .filter((id) => id && id !== input.candidateUserId),
    ),
  ];

  if (!recipientIds.length) return { created: 0, notifications: [] };

  return createSystemNotification({
    target: { recipientIds },
    senderId: input.candidateUserId,
    type:
      input.type === "PROJECT_CREATED"
        ? "PROJECT"
        : input.type === "MARKETPLACE_ORDER" || input.type === "SHOP_CREATED"
          ? "MARKETPLACE"
          : "BADGE",
    title: input.title,
    message: input.message,
    entityType: input.entityType,
    entityId: input.entityId,
    actionUrl: input.actionUrl ?? null,
    priority: "NORMAL",
    channels: { inApp: true, email: false, push: true, sms: false },
    metadata: {
      ...(input.metadata ?? {}),
      candidateUserId: input.candidateUserId,
      savedCandidateActivityType: input.type,
      universityId: input.universityId ?? null,
    },
  });
}
