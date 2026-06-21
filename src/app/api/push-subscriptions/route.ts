import { z } from "zod";

import {
  disablePushSubscription,
  registerPushSubscription,
} from "@/features/pwa/lib/pwa-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

const pushSubscriptionSchema = z.object({
  provider: z.enum(["native", "firebase", "onesignal"]).default("native"),
  endpoint: z.string().url(),
  keys: z
    .object({
      p256dh: z.string().nullable().optional(),
      auth: z.string().nullable().optional(),
    })
    .optional(),
  token: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
});

const disablePushSubscriptionSchema = z.object({
  endpoint: z.string().url().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = pushSubscriptionSchema.parse(await request.json());
    const subscription = await registerPushSubscription(payload);

    return apiSuccess({ subscription }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = disablePushSubscriptionSchema.parse(await request.json());
    const result = await disablePushSubscription(payload.endpoint);

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
